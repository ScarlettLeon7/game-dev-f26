import unittest
from controller.players import Baseline, decide, validate_response

OBS = {'player': {'position': [0, 0], 'grounded': True}, 'terrain': [], 'objects': []}
LEGAL = ['RIGHT', 'RIGHT_JUMP', 'WAIT']


class PlayerTests(unittest.TestCase):
    def test_strict_actions(self):
        for raw in ['{}', 'null', '[]', '{"action":42}', '{"action":"TELEPORT"}',
                    '{"action":"RIGHT","tool":"read"}', 'RIGHT']:
            self.assertIsNone(validate_response(raw, LEGAL))
        self.assertEqual(validate_response('{"action":"RIGHT"}', LEGAL), 'RIGHT')

    def test_gap_and_jump_release(self):
        baseline = Baseline()
        self.assertEqual(baseline.choose(OBS, LEGAL), 'RIGHT_JUMP')
        self.assertEqual(baseline.choose(OBS, LEGAL), 'RIGHT')

    def test_fallback_records_invalid(self):
        class Invalid:
            def request(self, observation, legal):
                return '{"action":"FLY"}', {'totalTokenCount': 3}
        result = decide(Invalid(), OBS, LEGAL, Baseline())
        self.assertTrue(result['fallback'])
        self.assertFalse(result['valid_proposal'])
        self.assertIn(result['action'], LEGAL)
        self.assertEqual(result['raw_response'], '{"action":"FLY"}')

    def test_timeout_fallback(self):
        class Failed:
            def request(self, observation, legal):
                raise TimeoutError()
        result = decide(Failed(), OBS, LEGAL, Baseline())
        self.assertEqual(result['error'], 'TimeoutError')
        self.assertIsNone(result['usage'])
        self.assertTrue(result['fallback'])


class EpisodeRegressionTests(unittest.TestCase):
    def run_episode(self, folder, failure):
        import argparse
        from unittest.mock import patch
        from controller.run import episode
        class FakeGame:
            def __init__(self, *args):
                pass
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def rpc(self, op, **kwargs):
                if op == 'reset':
                    return OBS
                if op == 'legal_actions':
                    return LEGAL
                if op == 'outcome':
                    return {'status': 'ongoing', 'reason': 'playing', 'score': 5}
                if op == 'begin_model_call':
                    return True
                if op == 'step':
                    raise failure
        class SlowPlayer:
            def __init__(self, *args):
                pass
            def request(self, *args):
                raise TimeoutError()
        args = argparse.Namespace(request_timeout=1)
        with patch('controller.run.Game', FakeGame), patch('controller.run.BoundedVertex', SlowPlayer):
            return episode(args, {}, {'name': 'slow', 'seed': 7, 'prefix': []}, 'model', 1, folder)

    def test_timeout_between_decision_and_step(self):
        import tempfile
        import json
        from pathlib import Path
        from controller.run import EngineError
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            report = self.run_episode(folder, EngineError({'error': 'terminal', 'outcome': {
                'status': 'episode_limit', 'reason': 'wall_timeout', 'score': 5}}))
            self.assertEqual((report['status'], report['terminal_reason'], report['score']),
                             ('episode_limit', 'wall_timeout', 5))
            self.assertEqual(report['model_calls'], 1)  # Failed call still counts.
            self.assertEqual(report['fallback_actions'], 1)
            self.assertEqual(report['steps'], 0)
            self.assertTrue(report['trace_complete'])
            records = [json.loads(line) for line in Path(report['trace']).read_text().splitlines()]
            self.assertEqual(records[-2]['event'], 'action_not_executed')
            with self.assertRaises(FileExistsError):
                self.run_episode(folder, RuntimeError())

    def test_transport_failure_keeps_partial_trace(self):
        import tempfile
        import json
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            report = self.run_episode(Path(directory), RuntimeError('disconnected'))
            self.assertEqual(report['status'], 'unavailable')
            self.assertFalse(report['trace_complete'])
            self.assertEqual(report['last_outcome']['score'], 5)
            records = [json.loads(line) for line in Path(report['trace']).read_text().splitlines()]
            self.assertTrue(records[-2]['partial_trace'])
            self.assertEqual(records[-3]['event'], 'decision')

    def test_process_margin(self):
        import argparse
        from controller.run import process_budget
        self.assertEqual(process_budget(argparse.Namespace(
            wall=600, request_timeout=30, rpc_timeout=30)), 695)


class ProtocolTests(unittest.TestCase):
    @unittest.skipUnless(__import__('os').environ.get('SUPERTUX_INTEGRATION') == '1',
                         'opt in to real Godot with SUPERTUX_INTEGRATION=1')
    def test_real_protocol_and_termination(self):
        import argparse
        import tempfile
        from controller.run import Game
        args = argparse.Namespace(godot='/Applications/Godot.app/Contents/MacOS/Godot',
                                  steps=1, calls=1, wall=30, rpc_timeout=20, process_timeout=35)
        with tempfile.TemporaryFile(mode='w+') as log, Game(args, log) as game:
            observation = game.rpc('reset', seed=7)
            self.assertEqual(observation['physics_frames'], 0)
            self.assertEqual(len(game.rpc('legal_actions')), 6)
            self.assertEqual(game.rpc('legal_actions', player_id='other'), [])
            for request in [('step', {'action': 'FLY'}), ('invalid', {}), ('reset', {'seed': '7'})]:
                with self.assertRaises(RuntimeError):
                    game.rpc(request[0], **request[1])
            self.assertEqual(game.rpc('observe')['physics_frames'], 0)
            result = game.rpc('step', action='RIGHT')
            self.assertEqual(result['observation']['physics_frames'], 6)
            self.assertEqual(result['outcome']['reason'], 'step_limit')
            with self.assertRaises(RuntimeError):
                game.rpc('step', action='RIGHT')
            game.rpc('reset', seed=7)
            self.assertTrue(game.rpc('begin_model_call'))
            self.assertFalse(game.rpc('begin_model_call'))
            self.assertEqual(game.rpc('outcome')['reason'], 'model_call_limit')
            # A slow provider can return after the engine deadline, while the
            # external process remains healthy and can explain termination.
            import time
            from controller.run import execute_step
        args.wall = 1
        with tempfile.TemporaryFile(mode='w+') as log, Game(args, log) as game:
            game.rpc('reset', seed=7)
            self.assertTrue(game.rpc('begin_model_call'))
            time.sleep(1.1)
            result, executed = execute_step(game, 'RIGHT')
            self.assertFalse(executed)
            self.assertEqual(result['outcome']['reason'], 'wall_timeout')
            self.assertEqual(game.rpc('observe')['physics_frames'], 0)
            self.assertIsNone(game.process.poll())


if __name__ == '__main__':
    unittest.main()
