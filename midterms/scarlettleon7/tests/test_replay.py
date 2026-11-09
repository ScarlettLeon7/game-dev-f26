import argparse
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from controller.replay import load_trace, replay

ROOT = Path(__file__).resolve().parents[1]
OBS = {'player': {'position': [0, 0], 'velocity': [0, 0], 'grounded': True}, 'physics_frames': 0}
OUTCOME = {'status': 'ongoing', 'reason': 'playing', 'score': 0}


def trace_rows():
    return [
        {'event': 'reset', 'observation': OBS, 'outcome': OUTCOME, 'legal_actions': ['RIGHT', 'WAIT']},
        {'event': 'setup', 'action': 'WAIT', 'observation': OBS, 'outcome': OUTCOME},
        {'event': 'decision', 'action': 'RIGHT', 'fallback': True, 'raw_response': '{"action":"FLY"}'},
        {'event': 'step', 'observation': OBS, 'outcome': OUTCOME},
        {'event': 'decision', 'action': 'RIGHT'},
        {'event': 'action_not_executed', 'error': 'terminal'},
        {'event': 'summary', 'player': 'model', 'situation': {'seed': 7}, 'status': 'episode_limit'}]


class ReplayTests(unittest.TestCase):
    def load_rows(self, rows):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'trace.jsonl'
            path.write_text(''.join(json.dumps(row)+'\n' for row in rows))
            return load_trace(path)

    def test_saved_model_and_setup_actions(self):
        opening = load_trace(ROOT/'traces/evaluation-02/opening-model-1.jsonl')
        self.assertEqual((opening.seed, len(opening.actions)), (7, 79))
        held_out = load_trace(ROOT/'traces/evaluation-02/held-out-jump-model-1.jsonl')
        self.assertEqual(len(held_out.actions), 69)
        self.assertEqual([a.source for a in held_out.actions[:5]], ['setup']*5)
        self.assertEqual([a.action for a in held_out.actions[:5]], held_out.summary['situation']['prefix'])

    def test_only_executed_actions_and_fallback(self):
        plan = self.load_rows(trace_rows())
        self.assertEqual([a.action for a in plan.actions], ['WAIT', 'RIGHT'])
        self.assertEqual(plan.actions[-1].source, 'recorded fallback')
        self.assertEqual(plan.omitted_decisions, 1)

    def test_reject_missing_seed_or_illegal_action(self):
        for change in ('seed', 'action', 'unpaired'):
            rows = trace_rows()
            if change == 'seed':
                rows[-1]['situation'] = {}
            elif change == 'action':
                rows[2]['action'] = 'FLY'
            else:
                rows.pop(2)
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.load_rows(rows)

    def test_replay_uses_only_game_operations_and_reports_divergence(self):
        plan = self.load_rows(trace_rows())
        operations = []

        class FakeGame:
            def __init__(self, *args):
                pass
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def rpc(self, op, **kwargs):
                operations.append((op, kwargs))
                if op == 'reset':
                    return OBS
                if op == 'legal_actions':
                    return ['RIGHT', 'WAIT']
                if op == 'outcome':
                    return OUTCOME
                if op == 'step':
                    return {'observation': dict(OBS, physics_frames=6), 'outcome': OUTCOME}
                raise AssertionError('unexpected operation: '+op)

        args = argparse.Namespace(max_actions=None, start_hold=0, end_hold=0, delay=0)
        with patch('controller.replay.Game', FakeGame), contextlib.redirect_stdout(io.StringIO()) as output:
            result = replay(plan, args, None)
        self.assertEqual([op for op, _ in operations], ['reset', 'legal_actions', 'outcome', 'step', 'step'])
        self.assertEqual([kw['action'] for op, kw in operations if op == 'step'], ['WAIT', 'RIGHT'])
        self.assertEqual(result['differences'], 2)
        self.assertIn('no live inference', output.getvalue())


if __name__ == '__main__':
    unittest.main()
