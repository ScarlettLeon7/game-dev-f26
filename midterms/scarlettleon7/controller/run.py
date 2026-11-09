"""Run with python3 -m controller.run. Python 3.10+, standard library only."""
import argparse
import json
import math
import multiprocessing
import os
from pathlib import Path
import socket
import subprocess
import threading
import time

from .players import Baseline, Vertex, decide

ROOT = Path(__file__).resolve().parents[1]


class EngineError(RuntimeError):
    """A structured engine rejection, kept separate from transport failures."""
    def __init__(self, response):
        self.response = response
        super().__init__('engine: ' + str(response['error']))


def process_budget(args):
    # Startup RPC + engine wall + in-flight provider cleanup + terminal RPC.
    return args.wall + args.request_timeout + 2 * args.rpc_timeout + 5


def execute_step(game, action):
    try:
        return game.rpc('step', action=action), True
    except EngineError as exc:
        result = exc.response
        if result.get('error') == 'terminal' and result.get('outcome', {}).get('status') in (
                'episode_limit', 'victory', 'defeat'):
            return result, False
        raise


class Game:
    def __init__(self, args, log):
        self.args = args
        self.log = log
        self.process = None
        self.sock = None
        self.reader = None
        self.watchdog = None

    def __enter__(self):
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', 0))
            port = reservation.getsockname()[1]
        env = dict(os.environ, SUPERTUX_PORT=str(port), SUPERTUX_STEPS=str(self.args.steps),
                   SUPERTUX_CALLS=str(self.args.calls), SUPERTUX_TIMEOUT_MS=str(int(self.args.wall*1000)))
        env['SUPERTUX_REPLAY'] = '1' if getattr(self.args, 'replay', False) else '0'
        window_args = [] if getattr(self.args, 'visible', False) else ['--no-window']
        self.process = subprocess.Popen([self.args.godot, *window_args, '--path', str(ROOT),
                                         'res://ai/external.tscn'], env=env, stdout=self.log, stderr=self.log)
        self.watchdog = threading.Timer(self.args.process_timeout, self.process.kill)
        self.watchdog.start()
        try:
            deadline = time.monotonic()+self.args.rpc_timeout
            while True:
                try:
                    self.sock = socket.create_connection(('127.0.0.1', port), timeout=self.args.rpc_timeout)
                    break
                except ConnectionRefusedError:
                    if self.process.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError('Godot startup failed; see engine log')
                    time.sleep(.05)
            self.reader = self.sock.makefile('rb')
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def rpc(self, op, **kwargs):
        self.sock.sendall((json.dumps(dict(op=op, **kwargs))+'\n').encode())
        line = self.reader.readline(4*1024*1024)
        if not line.endswith(b'\n'):
            raise RuntimeError('engine disconnected or oversized response')
        result = json.loads(line)
        if isinstance(result, dict) and 'error' in result:
            raise EngineError(result)
        return result

    def __exit__(self, *_):
        if self.watchdog:
            self.watchdog.cancel()
        if self.reader:
            self.reader.close()
        if self.sock:
            self.sock.close()
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()


def _vertex_worker(pipe, config, timeout, observation, legal):
    try:
        pipe.send(('ok', Vertex(config, timeout).request(observation, legal)))
    except Exception as exc:
        pipe.send(('error', type(exc).__name__))
    finally:
        pipe.close()


class BoundedVertex:
    def __init__(self, config, timeout):
        if config.get('provider') != 'vertex':
            raise ValueError('only explicitly selected Vertex is supported')
        Vertex(config, timeout)  # Validate before starting an episode.
        self.config, self.timeout = config, timeout

    def request(self, observation, legal):
        context = multiprocessing.get_context('spawn')
        parent, child = context.Pipe(duplex=False)
        process = context.Process(target=_vertex_worker, args=(child, self.config, self.timeout, observation, legal))
        process.start()
        child.close()
        try:
            if not parent.poll(self.timeout):
                raise TimeoutError()
            status, value = parent.recv()
            if status != 'ok':
                raise RuntimeError(value)
            return value
        finally:
            if process.is_alive():
                process.terminate()
            process.join(timeout=2)
            if process.is_alive():
                process.kill()
                process.join()
            parent.close()


def episode(args, config, situation, kind, trial, folder):
    folder.mkdir(parents=True, exist_ok=True)
    stem = f"{situation['name']}-{kind}-{trial}"
    report = dict(situation=situation, player=kind, trial=trial, model=config.get('model') if kind == 'model' else None,
                  status='unavailable', terminal_reason=None, win=None, score=None, steps=0, setup_steps=0,
                  valid_actions=0, invalid_actions=0, fallback_actions=0, model_calls=0,
                  latency_seconds=[], tokens=None, estimated_api_cost_usd=None, measurements_complete=False,
                  trace=str(folder / (stem+'.jsonl')), trace_complete=False, last_outcome=None)
    usage = []
    started = time.monotonic()
    with (folder/(stem+'.jsonl')).open('x') as trace, (folder/(stem+'.engine.log')).open('x') as log:
        def record(data):
            trace.write(json.dumps(data)+'\n')
            trace.flush()
        try:
            player = BoundedVertex(config, args.request_timeout) if kind == 'model' else None
            baseline = Baseline()
            with Game(args, log) as game:
                observation = game.rpc('reset', seed=situation['seed'])
                legal = game.rpc('legal_actions')
                outcome = game.rpc('outcome')
                report['last_outcome'] = outcome
                record(dict(event='reset', observation=observation, legal_actions=legal, outcome=outcome))
                for action in situation['prefix']:
                    if outcome['status'] != 'ongoing':
                        break
                    result, executed = execute_step(game, action)
                    observation, outcome = result.get('observation', observation), result['outcome']
                    report['last_outcome'] = outcome
                    report['setup_steps'] += int(executed)
                    record(dict(event='setup', action=action, **result))
                while outcome['status'] == 'ongoing':
                    if kind == 'model':
                        if not game.rpc('begin_model_call'):
                            outcome = game.rpc('outcome')
                            break
                        report['model_calls'] += 1
                        decision = decide(player, observation, legal, baseline)
                        report['invalid_actions'] += int(not decision['valid_proposal'])
                        report['fallback_actions'] += int(decision['fallback'])
                        report['latency_seconds'].append(decision['latency_seconds'])
                        usage.append(decision['usage'])
                    else:
                        decision = dict(action=baseline.choose(observation, legal))
                    if decision['action'] not in legal:
                        raise ValueError('controller proposed illegal fallback')
                    record(dict(event='decision', **decision))
                    result, executed = execute_step(game, decision['action'])
                    report['valid_actions'] += int(executed)
                    report['steps'] += int(executed)
                    observation, outcome = result.get('observation', observation), result['outcome']
                    report['last_outcome'] = outcome
                    record(dict(event='step' if executed else 'action_not_executed', **result))
                report.update(status=outcome['status'], terminal_reason=outcome['reason'], score=outcome['score'],
                              win=outcome['status'] == 'victory', measurements_complete=True, trace_complete=True, last_outcome=outcome)
        except Exception as exc:
            report['terminal_reason'] = 'infrastructure_or_configuration:'+type(exc).__name__
            record(dict(event='error', reason=report['terminal_reason'], partial_trace=True,
                        engine_response=exc.response if isinstance(exc, EngineError) else None,
                        last_outcome=report['last_outcome']))
        if kind == 'baseline':
            report.update(tokens=0, estimated_api_cost_usd=0)
        elif usage and all(u is not None and 'totalTokenCount' in u for u in usage):
            report['tokens'] = sum(u['totalTokenCount'] for u in usage)
            rates = (config.get('input_usd_per_million'), config.get('output_usd_per_million'))
            if all(r is not None for r in rates) and all('promptTokenCount' in u and 'candidatesTokenCount' in u for u in usage):
                report['estimated_api_cost_usd'] = sum(u['promptTokenCount']*rates[0]+(u['totalTokenCount']-u['promptTokenCount'])*rates[1] for u in usage)/1e6
        report['elapsed_seconds'] = time.monotonic()-started
        record(dict(event='summary', **report))
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--player', choices=['baseline', 'model'], default='baseline')
    p.add_argument('--evaluate', action='store_true')
    p.add_argument('--live', action='store_true', help='authorize real Vertex requests')
    p.add_argument('--config', default=str(ROOT/'agent-config.json'))
    p.add_argument('--output', default=str(ROOT/'traces'/'autonomous'))
    p.add_argument('--godot', default='/Applications/Godot.app/Contents/MacOS/Godot')
    for name, default, kind in [('steps', 600, int), ('calls', 100, int), ('wall', 120, float),
                                ('request-timeout', 15, float), ('rpc-timeout', 30, float), ('process-timeout', None, float)]:
        p.add_argument('--'+name, type=kind, default=default)
    args = p.parse_args()
    if args.process_timeout is None:
        args.process_timeout = process_budget(args)
    if any(not math.isfinite(getattr(args, key)) or getattr(args, key) <= 0 for key in ('steps', 'calls', 'wall', 'request_timeout', 'rpc_timeout', 'process_timeout')):
        p.error('all limits must be positive and finite')
    if args.process_timeout < process_budget(args):
        p.error('--process-timeout must be at least wall + request-timeout + 2*rpc-timeout + 5 seconds')
    if args.player == 'model' and not args.live:
        p.error('model episodes require --live')
    config = json.loads(Path(args.config).read_text())
    for key, env in [('project', 'GOOGLE_CLOUD_PROJECT'), ('location', 'GOOGLE_CLOUD_LOCATION'), ('model', 'VERTEX_MODEL')]:
        config[key] = config.get(key) or os.environ.get(env)
    situations = config['situations'] if args.evaluate else config['situations'][:1]
    output = Path(args.output)
    if output.exists():
        p.error('output directory exists; choose a fresh --output to preserve traces')
    reports = []
    for situation in situations:
        reports.append(episode(args, config, situation, 'baseline' if args.evaluate else args.player, 1, output))
        if args.evaluate:
            for trial in (1, 2):
                if args.live:
                    reports.append(episode(args, config, situation, 'model', trial, output))
                else:
                    reports.append(dict(situation=situation, player='model', trial=trial, model=config.get('model'),
                                        status='not_run', terminal_reason='--live not supplied', win=None, score=None,
                                        steps=None, setup_steps=None, valid_actions=None, invalid_actions=None,
                                        fallback_actions=None, model_calls=0, latency_seconds=None, tokens=None,
                                        estimated_api_cost_usd=None, trace=None, measurements_complete=False))
    (output/'report.json').write_text(json.dumps(reports, indent=2)+'\n')
    print(json.dumps(reports, indent=2))


if __name__ == '__main__':
    main()
