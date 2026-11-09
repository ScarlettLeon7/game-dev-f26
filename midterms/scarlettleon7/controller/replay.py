"""Offline visual re-simulation of saved model actions; never invokes a provider."""
import argparse
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import tempfile
import time

from .run import Game, execute_step


@dataclass
class RecordedAction:
    action: str
    source: str
    observation: dict
    outcome: dict


@dataclass
class ReplayPlan:
    seed: int
    reset: dict
    summary: dict
    actions: list
    omitted_decisions: int


def load_trace(path):
    """Pair decisions only with executed steps; never replay an unexecuted proposal."""
    with Path(path).open() as stream:
        rows = [json.loads(line) for line in stream if line.strip()]
    if (not rows or any(not isinstance(row, dict) for row in rows)
            or rows[0].get('event') != 'reset' or rows[-1].get('event') != 'summary'):
        raise ValueError('expected one reset, action events, and a final summary')
    reset, summary = rows[0], rows[-1]
    if summary.get('player') != 'model':
        raise ValueError('expected a saved model trial')
    situation = summary.get('situation')
    if not isinstance(situation, dict):
        raise ValueError('trace summary must contain its situation')
    seed = situation.get('seed')
    if type(seed) is not int or abs(seed) > 2147483647:
        raise ValueError('trace summary must contain a valid integer situation seed')
    legal = reset.get('legal_actions', [])
    if not isinstance(legal, list) or not legal or any(not isinstance(a, str) for a in legal):
        raise ValueError('reset must contain a nonempty legal-action list')
    actions, pending, decisions, executed = [], None, 0, 0
    for row in rows[1:-1]:
        event = row.get('event')
        if event == 'decision':
            if pending is not None:
                raise ValueError('decision without a preceding step result')
            pending = row
            decisions += 1
        elif event in ('setup', 'step'):
            if event == 'step' and pending is None:
                raise ValueError('executed step has no recorded decision')
            proposal = pending if event == 'step' else row
            # A terminal-rejected setup action is recorded but did not execute.
            if row.get('error'):
                if event == 'step':
                    raise ValueError('step marked executed contains an error')
                continue
            action = proposal.get('action')
            if not isinstance(action, str) or action not in legal:
                raise ValueError('recorded action is not in the trace legal actions')
            if not isinstance(row.get('observation'), dict) or not isinstance(row.get('outcome'), dict):
                raise ValueError('executed action missing its observation/outcome')
            source = 'setup' if event == 'setup' else ('recorded fallback' if pending.get('fallback') else 'recorded model action')
            actions.append(RecordedAction(action, source, row['observation'], row['outcome']))
            if event == 'step':
                pending = None
                executed += 1
        elif event == 'action_not_executed':
            pending = None
        elif event != 'error':
            raise ValueError('unexpected trace event: '+str(event))
    if not actions or len(actions) > 600:
        raise ValueError('trace must contain 1..600 executed actions')
    return ReplayPlan(seed, reset, summary, actions, decisions-executed)


def matches_recording(observation, outcome, expected_observation, expected_outcome):
    """Compare motion/outcomes, without ever correcting the simulation from the trace."""
    for key in ('position', 'velocity'):
        actual = observation['player'][key]
        expected = expected_observation['player'][key]
        if len(actual) != 2 or len(expected) != 2 or any(
                not math.isclose(a, b, rel_tol=0, abs_tol=.001) for a, b in zip(actual, expected)):
            return False
    return (observation['player']['grounded'] == expected_observation['player']['grounded']
            and observation['physics_frames'] == expected_observation['physics_frames']
            and outcome == expected_outcome)


def replay(plan, args, log):
    print('OFFLINE TRACE REPLAY: recorded actions only; no live inference or API calls.', flush=True)
    print('Recorded result:', plan.summary.get('status'), plan.summary.get('terminal_reason'),
          'score', plan.summary.get('score'), '| model:', plan.summary.get('model'), flush=True)
    print('Unexecuted recorded decisions omitted:', plan.omitted_decisions, flush=True)
    actions = plan.actions if args.max_actions is None else plan.actions[:args.max_actions]
    differences, completed = 0, 0
    with Game(args, log) as game:
        observation = game.rpc('reset', seed=plan.seed)
        legal = game.rpc('legal_actions')
        outcome = game.rpc('outcome')
        if not matches_recording(observation, outcome, plan.reset['observation'], plan.reset['outcome']):
            differences += 1
            print('DIVERGENCE at reset; simulation will not be corrected.', flush=True)
        time.sleep(args.start_hold)
        for index, entry in enumerate(actions, 1):
            if outcome['status'] != 'ongoing':
                print('Replay reached terminal before the next saved action.', flush=True)
                break
            if entry.action not in legal:
                raise ValueError('saved action is not legal in this engine')
            result, executed = execute_step(game, entry.action)
            outcome = result['outcome']
            if not executed:
                break
            observation = result['observation']
            completed += 1
            same = matches_recording(observation, outcome, entry.observation, entry.outcome)
            differences += int(not same)
            print(f'{index}/{len(plan.actions)} {entry.source}: {entry.action}'
                  + (' | DIVERGENCE' if not same else ''), flush=True)
            time.sleep(args.delay)
        print('Replay result:', json.dumps(outcome), flush=True)
        print(f'Executed {completed}/{len(plan.actions)} saved actions; '
              f'{differences} reset/step motion-or-outcome differences.', flush=True)
        if completed < len(plan.actions) or plan.summary.get('status') == 'unavailable':
            print('Partial playback; this does not establish the original trial outcome.', flush=True)
        print('Recorded results and source trace are unchanged. Window closes after end hold.', flush=True)
        time.sleep(args.end_hold)
    return {'executed': completed, 'differences': differences, 'outcome': outcome}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('trace', type=Path)
    parser.add_argument('--godot', default=os.environ.get('GODOT', '/Applications/Godot.app/Contents/MacOS/Godot'))
    parser.add_argument('--delay', type=float, default=.2, help='extra real seconds paused between actions')
    parser.add_argument('--start-hold', type=float, default=3)
    parser.add_argument('--end-hold', type=float, default=8)
    parser.add_argument('--timeout', type=float, default=300, help='engine wall-clock budget in seconds')
    parser.add_argument('--max-actions', type=int, help='explicit partial-playback limit for smoke checks')
    args = parser.parse_args()
    for name in ('delay', 'start_hold', 'end_hold', 'timeout'):
        if not math.isfinite(getattr(args, name)) or getattr(args, name) < 0:
            parser.error('timing values must be finite and nonnegative')
    if args.timeout <= args.start_hold+args.end_hold or (args.max_actions is not None and args.max_actions <= 0):
        parser.error('timeout must exceed holds; max-actions must be positive')
    try:
        plan = load_trace(args.trace)
    except (OSError, ValueError, TypeError, KeyError) as exc:
        parser.error(str(exc))
    # Presentation pacing only: every step still advances six real physics ticks.
    args.visible, args.replay = True, True
    args.steps, args.calls, args.wall = 600, 1, args.timeout
    args.rpc_timeout, args.process_timeout = 30, args.timeout+65
    with tempfile.NamedTemporaryFile(prefix='supertux-replay-', suffix='.log', mode='w', delete=False) as log:
        print('Engine log:', log.name, flush=True)
        try:
            replay(plan, args, log)
        except (OSError, RuntimeError, ValueError, KeyError) as exc:
            parser.exit(1, f'Replay failed: {exc}; inspect {log.name}\n')


if __name__ == '__main__':
    main()
