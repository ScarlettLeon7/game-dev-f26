# Codex conversation

## User

I need an independent, read-only review of my completed AI in Games midterm.

This project adapts SuperTux Classic (Godot 3.5.2) with:
- Programmatic AI controls
- A five-operation bounded game interface
- A Python controller and scripted baseline
- A real Google Vertex AI player
- Three baseline evaluations and six live model trials
- Automated tests and a GitHub Actions workflow

You are acting ONLY as an independent reviewer, not an implementation agent.

Do not edit, create, delete, commit, or push any files. Do not run live provider calls.

Review:
- ai/EpisodeRunner.gd
- ai/external.gd
- controller/
- tests/
- agent-config.json
- EVALUATION.md
- README.md
- ../../.github/workflows/midterm-scarlettleon7.yml

Identify potential bugs, hidden-state leaks, terminal-state errors, missing tests, security issues, reproducibility risks, and rubric compliance gaps.

Rank findings by severity and include file/line references.

Explicitly distinguish verified findings from unverified concerns.

Provide a final review summary that I can use to document my response in AGENT-TEAM.md.

## Assistant

I’ll review the interface, controller, tests, evaluation evidence, and CI configuration read-only, without live provider calls. I’ll separate verified findings from concerns that need further testing and provide a summary for `AGENT-TEAM.md`.

## Activity

    $ pwd; rg --files -g 'AGENTS.md' -g 'EpisodeRunner.gd' -g 'external.gd' -g 'agent-config.json' -g 'EVALUATION.md' -g 'README.md' -g 'AGENT-TEAM.md' -g 'controller/**' -g 'tests/**'
    /Users/scarlettleon/game-dev-f26/midterms/scarlettleon7
    README.md
    AGENTS.md
    tests/test_controller.py
    tests/test_ai_level.gd
    tests/test_ai_controls.gd
    tests/test_episode.gd
    tests/test_episode.tscn
    tests/test_ai_level.tscn
    ai/EpisodeRunner.gd
    ai/external.gd
    agent-config.json
    EVALUATION.md
    controller/__init__.py
    controller/run.py
    controller/players.py
    controller/__pycache__/__init__.cpython-314.pyc
    controller/__pycache__/run.cpython-314.pyc
    controller/__pycache__/players.cpython-314.pyc
    tests/__pycache__/test_controller.cpython-314.pyc
    ✓ • 0ms

## Activity

    $ git status --short; ls -l ../../.github/workflows/midterm-scarlettleon7.yml ../../../.github/workflows/midterm-scarlettleon7.yml
    git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
    git: error: couldn't create cache file '/tmp/xcrun_db-JHWlXny7' (errno=Operation not permitted)
    2026-11-07 22:26:58.235 xcodebuild[59279:20243868]  DVTFilePathFSEvents: Failed to start fs event stream.
    2026-11-07 22:26:58.469 xcodebuild[59279:20243866] [MT] DVTDeveloperPaths: Failed to get length of DARWIN_USER_CACHE_DIR from confstr(3), error = Error Domain=NSPOSIXErrorDomain Code=5 "Input/output error". Using NSCachesDirectory instead.
    git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
    git: error: couldn't create cache file '/tmp/xcrun_db-hYzrqYho' (errno=Operation not permitted)
    2026-11-07 22:26:59.148 xcodebuild[59281:20243885]  DVTFilePathFSEvents: Failed to start fs event stream.
    2026-11-07 22:26:59.279 xcodebuild[59281:20243884] [MT] DVTDeveloperPaths: Failed to get length of DARWIN_USER_CACHE_DIR from confstr(3), error = Error Domain=NSPOSIXErrorDomain Code=5 "Input/output error". Using NSCachesDirectory instead.
    ls: ../../../.github/workflows/midterm-scarlettleon7.yml: No such file or directory
    -rw-r--r--  1 scarlettleon  staff  2559 Nov  7 21:20 ../../.github/workflows/midterm-scarlettleon7.yml
    ✗ (1) • 3.23s

## Activity

    $ nl -ba ai/EpisodeRunner.gd; nl -ba ai/external.gd; nl -ba controller/run.py; nl -ba controller/players.py
         1    extends Node
         2    # Trusted, opt-in controller. Never pass this Node to an untrusted player.
         3    const LEVEL = "res://scenes/levels/world1/level1.tscn"
         4    const ACTIONS = ["LEFT", "RIGHT", "JUMP", "LEFT_JUMP", "RIGHT_JUMP", "WAIT"]
         5    const FRAMES_PER_ACTION = 6
         6    const PLAYER_ID = "tux"
         7    var max_steps = 600
         8    var max_model_calls = 100
         9    var timeout_ms = 120000
        10    var steps = 0
        11    var frames = 0
        12    var model_calls = 0
        13    var level = null
        14    var _player = null
        15    var _busy = false
        16    var _active = false
        17    var _level_ready = false
        18    var _started_ms = 0
        19    var _terminal = {"status": "episode_limit", "reason": "not_reset", "score": 0}
        20    var _old_auto_run = true
        21    var _old_scoreboard_pause = 0
        22    var _old_physics_fps = 60
        23    var _old_time_scale = 1.0
        24
        25    func _ready():
        26        pause_mode = PAUSE_MODE_PROCESS
        27        _old_auto_run = Global.auto_run
        28        _old_scoreboard_pause = Scoreboard.pause_mode
        29        _old_physics_fps = Engine.iterations_per_second
        30        _old_time_scale = Engine.time_scale
        31
        32    func reset(episode_seed):
        33        # Always asynchronous, including rejected requests.
        34        yield(get_tree(), "idle_frame")
        35        if _busy:
        36            return {"error": "busy"}
        37        if typeof(episode_seed) != TYPE_INT:
        38            return {"error": "invalid_seed"}
        39        _busy = true
        40        _active = false
        41        get_tree().paused = true
        42        if is_instance_valid(level):
        43            level.free()
        44        Global.player = null
        45        Global.current_level = null
        46        Global.spawn_position = null
        47        Global.fireballs_on_screen = 0
        48        Global.can_pause = false
        49        Global.auto_run = true
        50        Scoreboard.reset_player_values()
        51        Scoreboard.number_of_deaths = 0
        52        Scoreboard.pause_mode = PAUSE_MODE_STOP
        53        Engine.iterations_per_second = 60
        54        Engine.time_scale = 1.0
        55        seed(episode_seed)
        56        steps = 0
        57        frames = 0
        58        model_calls = 0
        59        _started_ms = OS.get_ticks_msec()
        60        _terminal = {"status": "ongoing", "reason": "playing", "score": 0}
        61        level = load(LEVEL).instance()
        62        # Keep current_scene as this harness: prevents automatic scene replacement.
        63        Global.current_scene = self
        64        Global.current_level_path = LEVEL
        65        add_child(level)
        66        # Existing editor startup bypasses title/pause UI but uses real objects,
        67        # player, collisions, gravity and level clock. No engine rules are replaced.
        68        _level_ready = false
        69        level.connect("level_ready", self, "_on_level_ready")
        70        level.start_level(true)
        71        while !_level_ready:
        72            if OS.get_ticks_msec() - _started_ms >= timeout_ms:
        73                _end("episode_limit", "wall_timeout")
        74                _busy = false
        75                return {"error": "startup_timeout", "outcome": outcome()}
        76            yield(get_tree(), "idle_frame")
        77        _player = Global.player
        78        _player.set_ai_control_enabled(true)
        79        _player.set_ai_action("WAIT")
        80        for node in Global.get_all_children(level):
        81            if node is Timer:
        82                node.process_mode = Timer.TIMER_PROCESS_PHYSICS
        83        Scoreboard.level_timer.process_mode = Timer.TIMER_PROCESS_PHYSICS
        84        _active = true
        85        _busy = false
        86        get_tree().paused = true
        87        return observe(PLAYER_ID)
        88
        89    func _on_level_ready():
        90        _level_ready = true
        91
        92    func legal_actions(player_id):
        93        if player_id != PLAYER_ID:
        94            return []
        95        return ACTIONS.duplicate()
        96
        97    func step(player_id, action):
        98        yield(get_tree(), "idle_frame")
        99        if _busy:
       100            return {"error": "busy"}
       101        if player_id != PLAYER_ID:
       102            return {"error": "unknown_player"}
       103        if typeof(action) != TYPE_STRING or !ACTIONS.has(action):
       104            return {"error": "invalid_action"}
       105        if outcome().status != "ongoing":
       106            return {"error": "terminal", "outcome": outcome()}
       107        _busy = true
       108        steps += 1
       109        _player.set_ai_action(action)
       110        # physics_frame fires BEFORE node physics processing. Start at one boundary
       111        # and stop at the seventh, so exactly six node ticks run (unless terminal).
       112        yield(get_tree(), "physics_frame")
       113        for _i in range(FRAMES_PER_ACTION):
       114            if outcome().status != "ongoing":
       115                break
       116            get_tree().paused = false
       117            yield(get_tree(), "physics_frame")
       118            frames += 1
       119            get_tree().paused = true
       120            _detect_game_end()
       121        if is_instance_valid(_player):
       122            _player.set_ai_action("WAIT")
       123        _busy = false
       124        if _terminal.status == "ongoing" and steps >= max_steps:
       125            _end("episode_limit", "step_limit")
       126        return {"observation": observe(PLAYER_ID), "outcome": outcome()}
       127
       128    # Call BEFORE dispatch to provider. Failures/timeouts are never refunded.
       129    # The final reserved call may submit an action; the next reservation terminates.
       130    func begin_model_call():
       131        if _busy or outcome().status != "ongoing":
       132            return false
       133        if model_calls >= max_model_calls:
       134            _end("episode_limit", "model_call_limit")
       135            return false
       136        model_calls += 1
       137        return true
       138
       139    func _process(_delta):
       140        if _active:
       141            outcome()
       142            if !_busy or _terminal.status != "ongoing":
       143                get_tree().paused = true
       144
       145    func _detect_game_end():
       146        if !_active or _terminal.status != "ongoing":
       147            return
       148        if !is_instance_valid(_player) or Global.player != _player:
       149            _end("defeat", "player_lost")
       150            return
       151        var state = _player.state_machine.state
       152        if state == "dead":
       153            _end("defeat", "death")
       154        elif state == "win" or state == "win_inside_igloo":
       155            _end("victory", "goal_reached")
       156
       157    func outcome():
       158        _detect_game_end()
       159        if _active and _terminal.status == "ongoing" and OS.get_ticks_msec() - _started_ms >= timeout_ms:
       160            _end("episode_limit", "wall_timeout")
       161        var result = _terminal.duplicate(true)
       162        if result.status == "ongoing":
       163            result.score = Scoreboard.coins - Scoreboard.initial_coins
       164        return result
       165
       166    func _end(status, reason):
       167        if _terminal.status != "ongoing":
       168            return
       169        _terminal = {"status": status, "reason": reason,
       170            "score": Scoreboard.coins - Scoreboard.initial_coins + (100 if status == "victory" else 0)}
       171        get_tree().paused = true
       172
       173    func observe(player_id):
       174        if player_id != PLAYER_ID:
       175            return {"error": "unknown_player"}
       176        if !_active or !is_instance_valid(_player):
       177            return {"error": "not_ready"}
       178        var p = _player.global_position
       179        # Fixed player-centered observation viewport, independent of camera smoothing.
       180        var view = Rect2(p - Vector2(160, 128), Vector2(320, 256))
       181        var terrain = []
       182        var objects = []
       183        for node in Global.get_all_children(level):
       184            if node is TileMap and !node.is_in_group("objectmaps") and node.is_visible_in_tree():
       185                # Query only the local grid, never export full maps or collision data.
       186                var lo = node.world_to_map(node.to_local(view.position))
       187                var hi = node.world_to_map(node.to_local(view.end))
       188                for y in range(int(lo.y), int(hi.y) + 1):
       189                    for x in range(int(lo.x), int(hi.x) + 1):
       190                        var id = node.get_cell(x, y)
       191                        if id < 0:
       192                            continue
       193                        var tile_name = node.tile_set.tile_get_name(id)
       194                        if tile_name.begins_with("Invisible"):
       195                            continue
       196                        var pos = node.to_global(node.map_to_world(Vector2(x, y)) + node.cell_size / 2)
       197                        if view.has_point(pos):
       198                            terrain.append({"position": _xy(pos), "appearance": tile_name})
       199            elif node is Node2D and node != _player and node.is_visible_in_tree() and view.has_point(node.global_position):
       200                var kind = ""
       201                if node.is_in_group("enemies"):
       202                    kind = "hazard"
       203                elif node.is_in_group("blocks"):
       204                    if "invisible" in node and node.invisible:
       205                        continue
       206                    kind = "block"
       207                elif node.is_in_group("coins"):
       208                    kind = "coin"
       209                elif node.filename in ["res://scenes/objects/EndGoalPosts.tscn", "res://scenes/objects/EndGoalIgloo.tscn"]:
       210                    kind = "goal"
       211                if kind != "":
       212                    objects.append({"kind": kind, "position": _xy(node.global_position)})
       213        return {"player_id": PLAYER_ID, "player": {"position": _xy(p),
       214            "velocity": _xy(_player.velocity), "grounded": _player.grounded},
       215            "view": {"position": _xy(view.position), "size": _xy(view.size)},
       216            "terrain": terrain, "objects": objects, "steps": steps, "physics_frames": frames}
       217
       218    func _xy(v):
       219        return [v.x, v.y]
       220
       221    func _exit_tree():
       222        Global.auto_run = _old_auto_run
       223        Scoreboard.pause_mode = _old_scoreboard_pause
       224        Engine.iterations_per_second = _old_physics_fps
       225        Engine.time_scale = _old_time_scale
       226        # Dedicated episode process exits after use; do not unpause during teardown.
         1    extends Node
         2    # Trusted transport only. No generic object/method access is exposed.
         3    var server = TCP_Server.new()
         4    var peer = null
         5    var buffer = ""
         6    var busy = false
         7    var runner
         8
         9    func _ready():
        10        pause_mode = PAUSE_MODE_PROCESS
        11        runner = load("res://ai/EpisodeRunner.gd").new()
        12        add_child(runner)
        13        var port = int(OS.get_environment("SUPERTUX_PORT"))
        14        runner.max_steps = int(OS.get_environment("SUPERTUX_STEPS"))
        15        runner.max_model_calls = int(OS.get_environment("SUPERTUX_CALLS"))
        16        runner.timeout_ms = int(OS.get_environment("SUPERTUX_TIMEOUT_MS"))
        17        if port <= 0 or server.listen(port, "127.0.0.1") != OK:
        18            get_tree().quit(2)
        19
        20    func _process(_delta):
        21        if peer == null and server.is_connection_available():
        22            peer = server.take_connection()
        23            server.stop()
        24        if peer == null:
        25            return
        26        if peer.get_status() == StreamPeerTCP.STATUS_NONE:
        27            get_tree().quit()
        28            return
        29        var count = peer.get_available_bytes()
        30        if count > 0:
        31            buffer += peer.get_utf8_string(count)
        32        if buffer.length() > 65536:
        33            get_tree().quit(2)
        34        if !busy and buffer.find("\n") >= 0:
        35            var end = buffer.find("\n")
        36            var line = buffer.substr(0, end)
        37            buffer = buffer.substr(end + 1)
        38            busy = true
        39            call_deferred("dispatch", line)
        40
        41    func dispatch(line):
        42        # Always coroutine: reset/step retain their asynchronous semantics.
        43        yield(get_tree(), "idle_frame")
        44        var parsed = JSON.parse(line)
        45        var result = {"error": "invalid_request"}
        46        if parsed.error == OK and typeof(parsed.result) == TYPE_DICTIONARY:
        47            var request = parsed.result
        48            var role = request.get("player_id", "tux")
        49            match request.get("op", ""):
        50                "reset":
        51                    var value = request.get("seed", null)
        52                    # JSON numbers decode as real values in Godot 3.
        53                    if (typeof(value) == TYPE_INT or typeof(value) == TYPE_REAL) and value == floor(value) and abs(value) <= 2147483647:
        54                        result = yield(runner.reset(int(value)), "completed")
        55                    else:
        56                        result = {"error": "invalid_seed"}
        57                "observe":
        58                    result = runner.observe(role)
        59                "legal_actions":
        60                    result = runner.legal_actions(role)
        61                "step":
        62                    result = yield(runner.step(role, request.get("action", null)), "completed")
        63                "outcome":
        64                    result = runner.outcome()
        65                "begin_model_call":
        66                    result = runner.begin_model_call()
        67        peer.put_data((JSON.print(result) + "\n").to_utf8())
        68        busy = false
         1    """Run with python3 -m controller.run. Python 3.10+, standard library only."""
         2    import argparse
         3    import json
         4    import math
         5    import multiprocessing
         6    import os
         7    from pathlib import Path
         8    import socket
         9    import subprocess
        10    import threading
        11    import time
        12
        13    from .players import Baseline, Vertex, decide
        14
        15    ROOT = Path(__file__).resolve().parents[1]
        16
        17
        18    class EngineError(RuntimeError):
        19        """A structured engine rejection, kept separate from transport failures."""
        20        def __init__(self, response):
        21            self.response = response
        22            super().__init__('engine: ' + str(response['error']))
        23
        24
        25    def process_budget(args):
        26        # Startup RPC + engine wall + in-flight provider cleanup + terminal RPC.
        27        return args.wall + args.request_timeout + 2 * args.rpc_timeout + 5
        28
        29
        30    def execute_step(game, action):
        31        try:
        32            return game.rpc('step', action=action), True
        33        except EngineError as exc:
        34            result = exc.response
        35            if result.get('error') == 'terminal' and result.get('outcome', {}).get('status') in (
        36                    'episode_limit', 'victory', 'defeat'):
        37                return result, False
        38            raise
        39
        40
        41    class Game:
        42        def __init__(self, args, log):
        43            self.args = args
        44            self.log = log
        45            self.process = None
        46            self.sock = None
        47            self.reader = None
        48            self.watchdog = None
        49
        50        def __enter__(self):
        51            with socket.socket() as reservation:
        52                reservation.bind(('127.0.0.1', 0))
        53                port = reservation.getsockname()[1]
        54            env = dict(os.environ, SUPERTUX_PORT=str(port), SUPERTUX_STEPS=str(self.args.steps),
        55                       SUPERTUX_CALLS=str(self.args.calls), SUPERTUX_TIMEOUT_MS=str(int(self.args.wall*1000)))
        56            self.process = subprocess.Popen([self.args.godot, '--no-window', '--path', str(ROOT),
        57                                             'res://ai/external.tscn'], env=env, stdout=self.log, stderr=self.log)
        58            self.watchdog = threading.Timer(self.args.process_timeout, self.process.kill)
        59            self.watchdog.start()
        60            try:
        61                deadline = time.monotonic()+self.args.rpc_timeout
        62                while True:
        63                    try:
        64                        self.sock = socket.create_connection(('127.0.0.1', port), timeout=self.args.rpc_timeout)
        65                        break
        66                    except ConnectionRefusedError:
        67                        if self.process.poll() is not None or time.monotonic() >= deadline:
        68                            raise RuntimeError('Godot startup failed; see engine log')
        69                        time.sleep(.05)
        70                self.reader = self.sock.makefile('rb')
        71                return self
        72            except BaseException:
        73                self.__exit__(None, None, None)
        74                raise
        75
        76        def rpc(self, op, **kwargs):
        77            self.sock.sendall((json.dumps(dict(op=op, **kwargs))+'\n').encode())
        78            line = self.reader.readline(4*1024*1024)
        79            if not line.endswith(b'\n'):
        80                raise RuntimeError('engine disconnected or oversized response')
        81            result = json.loads(line)
        82            if isinstance(result, dict) and 'error' in result:
        83                raise EngineError(result)
        84            return result
        85
        86        def __exit__(self, *_):
        87            if self.watchdog:
        88                self.watchdog.cancel()
        89            if self.reader:
        90                self.reader.close()
        91            if self.sock:
        92                self.sock.close()
        93            if self.process and self.process.poll() is None:
        94                self.process.terminate()
        95                try:
        96                    self.process.wait(timeout=2)
        97                except subprocess.TimeoutExpired:
        98                    self.process.kill()
        99                    self.process.wait()
       100
       101
       102    def _vertex_worker(pipe, config, timeout, observation, legal):
       103        try:
       104            pipe.send(('ok', Vertex(config, timeout).request(observation, legal)))
       105        except Exception as exc:
       106            pipe.send(('error', type(exc).__name__))
       107        finally:
       108            pipe.close()
       109
       110
       111    class BoundedVertex:
       112        def __init__(self, config, timeout):
       113            if config.get('provider') != 'vertex':
       114                raise ValueError('only explicitly selected Vertex is supported')
       115            Vertex(config, timeout)  # Validate before starting an episode.
       116            self.config, self.timeout = config, timeout
       117
       118        def request(self, observation, legal):
       119            context = multiprocessing.get_context('spawn')
       120            parent, child = context.Pipe(duplex=False)
       121            process = context.Process(target=_vertex_worker, args=(child, self.config, self.timeout, observation, legal))
       122            process.start()
       123            child.close()
       124            try:
       125                if not parent.poll(self.timeout):
       126                    raise TimeoutError()
       127                status, value = parent.recv()
       128                if status != 'ok':
       129                    raise RuntimeError(value)
       130                return value
       131            finally:
       132                if process.is_alive():
       133                    process.terminate()
       134                process.join(timeout=2)
       135                if process.is_alive():
       136                    process.kill()
       137                    process.join()
       138                parent.close()
       139
       140
       141    def episode(args, config, situation, kind, trial, folder):
       142        folder.mkdir(parents=True, exist_ok=True)
       143        stem = f"{situation['name']}-{kind}-{trial}"
       144        report = dict(situation=situation, player=kind, trial=trial, model=config.get('model') if kind == 'model' else None,
       145                      status='unavailable', terminal_reason=None, win=None, score=None, steps=0, setup_steps=0,
       146                      valid_actions=0, invalid_actions=0, fallback_actions=0, model_calls=0,
       147                      latency_seconds=[], tokens=None, estimated_api_cost_usd=None, measurements_complete=False,
       148                      trace=str(folder / (stem+'.jsonl')), trace_complete=False, last_outcome=None)
       149        usage = []
       150        started = time.monotonic()
       151        with (folder/(stem+'.jsonl')).open('x') as trace, (folder/(stem+'.engine.log')).open('x') as log:
       152            def record(data):
       153                trace.write(json.dumps(data)+'\n')
       154                trace.flush()
       155            try:
       156                player = BoundedVertex(config, args.request_timeout) if kind == 'model' else None
       157                baseline = Baseline()
       158                with Game(args, log) as game:
       159                    observation = game.rpc('reset', seed=situation['seed'])
       160                    legal = game.rpc('legal_actions')
       161                    outcome = game.rpc('outcome')
       162                    report['last_outcome'] = outcome
       163                    record(dict(event='reset', observation=observation, legal_actions=legal, outcome=outcome))
       164                    for action in situation['prefix']:
       165                        if outcome['status'] != 'ongoing':
       166                            break
       167                        result, executed = execute_step(game, action)
       168                        observation, outcome = result.get('observation', observation), result['outcome']
       169                        report['last_outcome'] = outcome
       170                        report['setup_steps'] += int(executed)
       171                        record(dict(event='setup', action=action, **result))
       172                    while outcome['status'] == 'ongoing':
       173                        if kind == 'model':
       174                            if not game.rpc('begin_model_call'):
       175                                outcome = game.rpc('outcome')
       176                                break
       177                            report['model_calls'] += 1
       178                            decision = decide(player, observation, legal, baseline)
       179                            report['invalid_actions'] += int(not decision['valid_proposal'])
       180                            report['fallback_actions'] += int(decision['fallback'])
       181                            report['latency_seconds'].append(decision['latency_seconds'])
       182                            usage.append(decision['usage'])
       183                        else:
       184                            decision = dict(action=baseline.choose(observation, legal))
       185                        if decision['action'] not in legal:
       186                            raise ValueError('controller proposed illegal fallback')
       187                        record(dict(event='decision', **decision))
       188                        result, executed = execute_step(game, decision['action'])
       189                        report['valid_actions'] += int(executed)
       190                        report['steps'] += int(executed)
       191                        observation, outcome = result.get('observation', observation), result['outcome']
       192                        report['last_outcome'] = outcome
       193                        record(dict(event='step' if executed else 'action_not_executed', **result))
       194                    report.update(status=outcome['status'], terminal_reason=outcome['reason'], score=outcome['score'],
       195                                  win=outcome['status'] == 'victory', measurements_complete=True, trace_complete=True, last_outcome=outcome)
       196            except Exception as exc:
       197                report['terminal_reason'] = 'infrastructure_or_configuration:'+type(exc).__name__
       198                record(dict(event='error', reason=report['terminal_reason'], partial_trace=True,
       199                            engine_response=exc.response if isinstance(exc, EngineError) else None,
       200                            last_outcome=report['last_outcome']))
       201            if kind == 'baseline':
       202                report.update(tokens=0, estimated_api_cost_usd=0)
       203            elif usage and all(u is not None and 'totalTokenCount' in u for u in usage):
       204                report['tokens'] = sum(u['totalTokenCount'] for u in usage)
       205                rates = (config.get('input_usd_per_million'), config.get('output_usd_per_million'))
       206                if all(r is not None for r in rates) and all('promptTokenCount' in u and 'candidatesTokenCount' in u for u in usage):
       207                    report['estimated_api_cost_usd'] = sum(u['promptTokenCount']*rates[0]+(u['totalTokenCount']-u['promptTokenCount'])*rates[1] for u in usage)/1e6
       208            report['elapsed_seconds'] = time.monotonic()-started
       209            record(dict(event='summary', **report))
       210        return report
       211
       212
       213    def main():
       214        p = argparse.ArgumentParser(description=__doc__)
       215        p.add_argument('--player', choices=['baseline', 'model'], default='baseline')
       216        p.add_argument('--evaluate', action='store_true')
       217        p.add_argument('--live', action='store_true', help='authorize real Vertex requests')
       218        p.add_argument('--config', default=str(ROOT/'agent-config.json'))
       219        p.add_argument('--output', default=str(ROOT/'traces'/'autonomous'))
       220        p.add_argument('--godot', default='/Applications/Godot.app/Contents/MacOS/Godot')
       221        for name, default, kind in [('steps', 600, int), ('calls', 100, int), ('wall', 120, float),
       222                                    ('request-timeout', 15, float), ('rpc-timeout', 30, float), ('process-timeout', None, float)]:
       223            p.add_argument('--'+name, type=kind, default=default)
       224        args = p.parse_args()
       225        if args.process_timeout is None:
       226            args.process_timeout = process_budget(args)
       227        if any(not math.isfinite(getattr(args, key)) or getattr(args, key) <= 0 for key in ('steps', 'calls', 'wall', 'request_timeout', 'rpc_timeout', 'process_timeout')):
       228            p.error('all limits must be positive and finite')
       229        if args.process_timeout < process_budget(args):
       230            p.error('--process-timeout must be at least wall + request-timeout + 2*rpc-timeout + 5 seconds')
       231        if args.player == 'model' and not args.live:
       232            p.error('model episodes require --live')
       233        config = json.loads(Path(args.config).read_text())
       234        for key, env in [('project', 'GOOGLE_CLOUD_PROJECT'), ('location', 'GOOGLE_CLOUD_LOCATION'), ('model', 'VERTEX_MODEL')]:
       235            config[key] = config.get(key) or os.environ.get(env)
       236        situations = config['situations'] if args.evaluate else config['situations'][:1]
       237        output = Path(args.output)
       238        if output.exists():
       239            p.error('output directory exists; choose a fresh --output to preserve traces')
       240        reports = []
       241        for situation in situations:
       242            reports.append(episode(args, config, situation, 'baseline' if args.evaluate else args.player, 1, output))
       243            if args.evaluate:
       244                for trial in (1, 2):
       245                    if args.live:
       246                        reports.append(episode(args, config, situation, 'model', trial, output))
       247                    else:
       248                        reports.append(dict(situation=situation, player='model', trial=trial, model=config.get('model'),
       249                                            status='not_run', terminal_reason='--live not supplied', win=None, score=None,
       250                                            steps=None, setup_steps=None, valid_actions=None, invalid_actions=None,
       251                                            fallback_actions=None, model_calls=0, latency_seconds=None, tokens=None,
       252                                            estimated_api_cost_usd=None, trace=None, measurements_complete=False))
       253        (output/'report.json').write_text(json.dumps(reports, indent=2)+'\n')
       254        print(json.dumps(reports, indent=2))
       255
       256
       257    if __name__ == '__main__':
       258        main()
         1    import json
         2    import os
         3    import subprocess
         4    import time
         5    import urllib.request
         6    import urllib.parse
         7
         8
         9    class Baseline:
        10        def __init__(self):
        11            self.previous_x = None
        12            self.stuck = 0
        13            self.jump_held = False
        14
        15        def choose(self, observation, legal):
        16            p = observation['player']
        17            x, y = p['position']
        18            self.stuck = self.stuck + 1 if self.previous_x is not None and abs(x-self.previous_x) < 1 else 0
        19            self.previous_x = x
        20            direction = 'RIGHT'
        21            goals = [o for o in observation['objects'] if o['kind'] == 'goal']
        22            if goals and goals[0]['position'][0] < x-8:
        23                direction = 'LEFT'
        24            sign = 1 if direction == 'RIGHT' else -1
        25            ahead = lambda pos: 0 < sign*(pos[0]-x) < 64
        26            obstacle = any(ahead(o['position']) and abs(o['position'][1]-y) < 48
        27                           and o['kind'] in ('hazard', 'block') for o in observation['objects'])
        28            terrain = observation['terrain']
        29            # Appearances are a coarse visual sensor, not guaranteed solid collision.
        30            wall = any(0 < sign*(t['position'][0]-x) < 32 and -20 < t['position'][1]-y < 12 for t in terrain)
        31            support = any(16 < sign*(t['position'][0]-x) < 64 and 12 < t['position'][1]-y < 64 for t in terrain)
        32            jump = p['grounded'] and (obstacle or wall or not support or self.stuck >= 2)
        33            # Release between jumps so the input layer can detect another edge.
        34            action = direction + '_JUMP' if jump and not self.jump_held else direction
        35            self.jump_held = action.endswith('_JUMP')
        36            return action if action in legal else ('WAIT' if 'WAIT' in legal else legal[0])
        37
        38
        39    def validate_response(raw, legal):
        40        try:
        41            data = json.loads(raw)
        42            action = data['action']
        43            if set(data) == {'action'} and isinstance(action, str) and action in legal:
        44                return action
        45        except (ValueError, TypeError, KeyError):
        46            pass
        47        return None
        48
        49
        50    def decide(player, observation, legal, fallback):
        51        started = time.monotonic()
        52        record = {'raw_response': None, 'usage': None, 'error': None}
        53        try:
        54            raw, usage = player.request(observation, legal)
        55            record.update(raw_response=raw, usage=usage)
        56            action = validate_response(raw, legal)
        57            if action is None:
        58                record['error'] = 'invalid_response'
        59        except Exception as exc:
        60            # Never serialize exception bodies which may include credentials/headers.
        61            record['error'] = type(exc).__name__
        62            action = None
        63        record['latency_seconds'] = time.monotonic()-started
        64        record['valid_proposal'] = action is not None
        65        record['fallback'] = action is None
        66        record['action'] = action or fallback.choose(observation, legal)
        67        return record
        68
        69
        70    class Vertex:
        71        def __init__(self, config, timeout):
        72            self.config = config
        73            self.timeout = timeout
        74            if not all(config.get(k) for k in ('project', 'location', 'model')):
        75                raise ValueError('Vertex requires explicit project, location and course model')
        76
        77        def request(self, observation, legal):
        78            start = time.monotonic()
        79            # Existing ADC only; never login or change cloud configuration.
        80            token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
        81                                   capture_output=True, text=True, check=True, timeout=self.timeout).stdout.strip()
        82            c = self.config
        83            host = 'aiplatform.googleapis.com' if c['location'] == 'global' else c['location']+'-aiplatform.googleapis.com'
        84            path = '/'.join(urllib.parse.quote(c[k], safe='') for k in ('project', 'location', 'model'))
        85            project, location, model = path.split('/')
        86            url = f'https://{host}/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent'
        87            prompt = ('Play a platformer toward the goal, usually right. Positive y points down. '
        88                      'Each action lasts six physics frames. Jump needs release between presses. '
        89                      'Return only JSON {"action":"one legal action"}.\n' +
        90                      json.dumps({'observation': observation, 'legal_actions': legal}, separators=(',', ':')))
        91            body = {'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        92                    'generationConfig': {'temperature': 0, 'maxOutputTokens': 128, 'responseMimeType': 'application/json'}}
        93            request = urllib.request.Request(url, json.dumps(body).encode(),
        94                                            {'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'})
        95            remaining = self.timeout-(time.monotonic()-start)
        96            if remaining <= 0:
        97                raise TimeoutError()
        98            with urllib.request.urlopen(request, timeout=remaining) as response:
        99                result = json.load(response)
       100            text = ''.join(p.get('text', '') for p in result.get('candidates', [{}])[0].get('content', {}).get('parts', []) if not p.get('thought'))
       101            return text, result.get('usageMetadata')
    ✓ • 0ms

## Activity

    $ nl -ba tests/test_controller.py; nl -ba tests/test_episode.gd; nl -ba tests/test_ai_controls.gd; nl -ba tests/test_ai_level.gd; nl -ba agent-config.json; nl -ba EVALUATION.md; nl -ba README.md; nl -ba ../../.github/workflows/midterm-scarlettleon7.yml
         1    import unittest
         2    from controller.players import Baseline, decide, validate_response
         3
         4    OBS = {'player': {'position': [0, 0], 'grounded': True}, 'terrain': [], 'objects': []}
         5    LEGAL = ['RIGHT', 'RIGHT_JUMP', 'WAIT']
         6
         7
         8    class PlayerTests(unittest.TestCase):
         9        def test_strict_actions(self):
        10            for raw in ['{}', 'null', '[]', '{"action":42}', '{"action":"TELEPORT"}',
        11                        '{"action":"RIGHT","tool":"read"}', 'RIGHT']:
        12                self.assertIsNone(validate_response(raw, LEGAL))
        13            self.assertEqual(validate_response('{"action":"RIGHT"}', LEGAL), 'RIGHT')
        14
        15        def test_gap_and_jump_release(self):
        16            baseline = Baseline()
        17            self.assertEqual(baseline.choose(OBS, LEGAL), 'RIGHT_JUMP')
        18            self.assertEqual(baseline.choose(OBS, LEGAL), 'RIGHT')
        19
        20        def test_fallback_records_invalid(self):
        21            class Invalid:
        22                def request(self, observation, legal):
        23                    return '{"action":"FLY"}', {'totalTokenCount': 3}
        24            result = decide(Invalid(), OBS, LEGAL, Baseline())
        25            self.assertTrue(result['fallback'])
        26            self.assertFalse(result['valid_proposal'])
        27            self.assertIn(result['action'], LEGAL)
        28            self.assertEqual(result['raw_response'], '{"action":"FLY"}')
        29
        30        def test_timeout_fallback(self):
        31            class Failed:
        32                def request(self, observation, legal):
        33                    raise TimeoutError()
        34            result = decide(Failed(), OBS, LEGAL, Baseline())
        35            self.assertEqual(result['error'], 'TimeoutError')
        36            self.assertIsNone(result['usage'])
        37            self.assertTrue(result['fallback'])
        38
        39
        40    class EpisodeRegressionTests(unittest.TestCase):
        41        def run_episode(self, folder, failure):
        42            import argparse
        43            from unittest.mock import patch
        44            from controller.run import episode
        45            class FakeGame:
        46                def __init__(self, *args):
        47                    pass
        48                def __enter__(self):
        49                    return self
        50                def __exit__(self, *args):
        51                    pass
        52                def rpc(self, op, **kwargs):
        53                    if op == 'reset':
        54                        return OBS
        55                    if op == 'legal_actions':
        56                        return LEGAL
        57                    if op == 'outcome':
        58                        return {'status': 'ongoing', 'reason': 'playing', 'score': 5}
        59                    if op == 'begin_model_call':
        60                        return True
        61                    if op == 'step':
        62                        raise failure
        63            class SlowPlayer:
        64                def __init__(self, *args):
        65                    pass
        66                def request(self, *args):
        67                    raise TimeoutError()
        68            args = argparse.Namespace(request_timeout=1)
        69            with patch('controller.run.Game', FakeGame), patch('controller.run.BoundedVertex', SlowPlayer):
        70                return episode(args, {}, {'name': 'slow', 'seed': 7, 'prefix': []}, 'model', 1, folder)
        71
        72        def test_timeout_between_decision_and_step(self):
        73            import tempfile
        74            import json
        75            from pathlib import Path
        76            from controller.run import EngineError
        77            with tempfile.TemporaryDirectory() as directory:
        78                folder = Path(directory)
        79                report = self.run_episode(folder, EngineError({'error': 'terminal', 'outcome': {
        80                    'status': 'episode_limit', 'reason': 'wall_timeout', 'score': 5}}))
        81                self.assertEqual((report['status'], report['terminal_reason'], report['score']),
        82                                 ('episode_limit', 'wall_timeout', 5))
        83                self.assertEqual(report['model_calls'], 1)  # Failed call still counts.
        84                self.assertEqual(report['fallback_actions'], 1)
        85                self.assertEqual(report['steps'], 0)
        86                self.assertTrue(report['trace_complete'])
        87                records = [json.loads(line) for line in Path(report['trace']).read_text().splitlines()]
        88                self.assertEqual(records[-2]['event'], 'action_not_executed')
        89                with self.assertRaises(FileExistsError):
        90                    self.run_episode(folder, RuntimeError())
        91
        92        def test_transport_failure_keeps_partial_trace(self):
        93            import tempfile
        94            import json
        95            from pathlib import Path
        96            with tempfile.TemporaryDirectory() as directory:
        97                report = self.run_episode(Path(directory), RuntimeError('disconnected'))
        98                self.assertEqual(report['status'], 'unavailable')
        99                self.assertFalse(report['trace_complete'])
       100                self.assertEqual(report['last_outcome']['score'], 5)
       101                records = [json.loads(line) for line in Path(report['trace']).read_text().splitlines()]
       102                self.assertTrue(records[-2]['partial_trace'])
       103                self.assertEqual(records[-3]['event'], 'decision')
       104
       105        def test_process_margin(self):
       106            import argparse
       107            from controller.run import process_budget
       108            self.assertEqual(process_budget(argparse.Namespace(
       109                wall=600, request_timeout=30, rpc_timeout=30)), 695)
       110
       111
       112    class ProtocolTests(unittest.TestCase):
       113        @unittest.skipUnless(__import__('os').environ.get('SUPERTUX_INTEGRATION') == '1',
       114                             'opt in to real Godot with SUPERTUX_INTEGRATION=1')
       115        def test_real_protocol_and_termination(self):
       116            import argparse
       117            import tempfile
       118            from controller.run import Game
       119            args = argparse.Namespace(godot='/Applications/Godot.app/Contents/MacOS/Godot',
       120                                      steps=1, calls=1, wall=30, rpc_timeout=20, process_timeout=35)
       121            with tempfile.TemporaryFile(mode='w+') as log, Game(args, log) as game:
       122                observation = game.rpc('reset', seed=7)
       123                self.assertEqual(observation['physics_frames'], 0)
       124                self.assertEqual(len(game.rpc('legal_actions')), 6)
       125                self.assertEqual(game.rpc('legal_actions', player_id='other'), [])
       126                for request in [('step', {'action': 'FLY'}), ('invalid', {}), ('reset', {'seed': '7'})]:
       127                    with self.assertRaises(RuntimeError):
       128                        game.rpc(request[0], **request[1])
       129                self.assertEqual(game.rpc('observe')['physics_frames'], 0)
       130                result = game.rpc('step', action='RIGHT')
       131                self.assertEqual(result['observation']['physics_frames'], 6)
       132                self.assertEqual(result['outcome']['reason'], 'step_limit')
       133                with self.assertRaises(RuntimeError):
       134                    game.rpc('step', action='RIGHT')
       135                game.rpc('reset', seed=7)
       136                self.assertTrue(game.rpc('begin_model_call'))
       137                self.assertFalse(game.rpc('begin_model_call'))
       138                self.assertEqual(game.rpc('outcome')['reason'], 'model_call_limit')
       139                # A slow provider can return after the engine deadline, while the
       140                # external process remains healthy and can explain termination.
       141                import time
       142                from controller.run import execute_step
       143            args.wall = 1
       144            with tempfile.TemporaryFile(mode='w+') as log, Game(args, log) as game:
       145                game.rpc('reset', seed=7)
       146                self.assertTrue(game.rpc('begin_model_call'))
       147                time.sleep(1.1)
       148                result, executed = execute_step(game, 'RIGHT')
       149                self.assertFalse(executed)
       150                self.assertEqual(result['outcome']['reason'], 'wall_timeout')
       151                self.assertEqual(game.rpc('observe')['physics_frames'], 0)
       152                self.assertIsNone(game.process.poll())
       153
       154
       155    if __name__ == '__main__':
       156        unittest.main()
         1    extends Node
         2
         3    var failures = 0
         4    var runner
         5
         6    class PhysicsCounter:
         7        extends Node
         8        var ticks = 0
         9        func _physics_process(_delta):
        10            ticks += 1
        11
        12    func check(ok, label):
        13        print("PASS: " if ok else "FAIL: ", label)
        14        if !ok:
        15            failures += 1
        16
        17    func _ready():
        18        pause_mode = PAUSE_MODE_PROCESS
        19        get_tree().create_timer(30.0).connect("timeout", self, "watchdog")
        20        call_deferred("run_tests")
        21
        22    func run_tests():
        23        runner = load("res://ai/EpisodeRunner.gd").new()
        24        add_child(runner)
        25        var first = yield(runner.reset(7), "completed")
        26        check(first.has("player"), "reset loads real player")
        27        check(runner.legal_actions("tux").size() == 6, "six actions")
        28        check(runner.observe("spectator").has("error") and runner.legal_actions("spectator").empty(), "role boundary")
        29        check(JSON.parse(JSON.print(first)).error == OK, "JSON observation")
        30        check(!first.has("level") and !first.has("seed") and !first.has("enemies"), "observation allowlist")
        31        check(first.player.has("grounded") and typeof(first.player.grounded) == TYPE_BOOL, "grounded state exposed")
        32        var origin = first.player.position
        33        var invalid = yield(runner.step("tux", "TELEPORT"), "completed")
        34        check(invalid.error == "invalid_action" and runner.steps == 0 and runner.frames == 0, "invalid action rejected without advancing")
        35        invalid = yield(runner.step("other", "RIGHT"), "completed")
        36        check(invalid.error == "unknown_player", "wrong role rejected")
        37        var counter = PhysicsCounter.new()
        38        runner.level.add_child(counter)
        39        var result = yield(runner.step("tux", "RIGHT"), "completed")
        40        check(runner.frames == 6 and result.observation.player.position[0] > origin[0], "six real physics ticks move Tux")
        41        check(counter.ticks == 6, "independent counter confirms six level ticks")
        42        var held = runner.observe("tux")
        43        for _i in range(8):
        44            yield(get_tree(), "physics_frame")
        45        check(JSON.print(runner.observe("tux")) == JSON.print(held), "world frozen between steps")
        46        var bounded = true
        47        for tile in held.terrain:
        48            bounded = bounded and abs(tile.position[0] - held.player.position[0]) <= 160 and abs(tile.position[1] - held.player.position[1]) <= 128
        49        for object in held.objects:
        50            bounded = bounded and abs(object.position[0] - held.player.position[0]) <= 160 and abs(object.position[1] - held.player.position[1]) <= 128
        51        check(bounded, "terrain and objects inside view")
        52        var again = yield(runner.reset(7), "completed")
        53        check(JSON.print(again) == JSON.print(first), "same seed resets observation and counters")
        54        yield(runner.step("tux", "RIGHT"), "completed")
        55        check(JSON.print(runner.observe("tux")) == JSON.print(held), "same seed and action repeat physics")
        56        var invisible = load("res://scenes/objects/BonusInvisible.tscn").instance()
        57        runner.level.add_child(invisible)
        58        invisible.global_position = Global.player.global_position + Vector2(32, -32)
        59        var hidden_pos = [invisible.global_position.x, invisible.global_position.y]
        60        var leaked = false
        61        for object in runner.observe("tux").objects:
        62            if object.position == hidden_pos:
        63                leaked = true
        64        check(!leaked, "actual invisible bonus block omitted")
        65        # Trusted test fixtures invoke real game lifecycle methods, never player API.
        66        Global.player.die()
        67        check(runner.outcome().status == "defeat", "real death detected before respawn")
        68        yield(runner.reset(7), "completed")
        69        var goal = load("res://scenes/objects/EndGoalPosts.tscn").instance()
        70        runner.level.add_child(goal)
        71        goal._on_Area2D_body_entered(Global.player)
        72        check(runner.outcome().status == "victory" and runner.outcome().score == 100, "existing goal handler triggers victory and score")
        73        yield(runner.reset(7), "completed")
        74        for action in runner.legal_actions("tux"):
        75            var valid = yield(runner.step("tux", action), "completed")
        76            check(valid.has("observation"), "valid action: " + action)
        77        var bad_type = yield(runner.step("tux", 42), "completed")
        78        check(bad_type.error == "invalid_action", "non-string action rejected")
        79        yield(runner.reset(7), "completed")
        80        runner.max_steps = 1
        81        yield(runner.step("tux", "WAIT"), "completed")
        82        check(runner.outcome().reason == "step_limit", "step limit")
        83        var frozen = runner.frames
        84        yield(runner.step("tux", "RIGHT"), "completed")
        85        check(runner.frames == frozen, "terminal step cannot advance")
        86        yield(runner.reset(7), "completed")
        87        runner.max_model_calls = 1
        88        check(runner.begin_model_call(), "reserve model call before attempt")
        89        # A failed attempt is deliberately not refunded.
        90        check(!runner.begin_model_call() and runner.outcome().reason == "model_call_limit", "failed calls consume budget")
        91        yield(runner.reset(7), "completed")
        92        runner.timeout_ms = 1
        93        yield(get_tree().create_timer(0.02), "timeout")
        94        check(runner.outcome().reason == "wall_timeout", "timeout while waiting for player")
        95        runner.timeout_ms = 120000
        96        yield(runner.reset(7), "completed")
        97        Global.player.free()
        98        check(runner.outcome().reason == "player_lost", "missing player terminates safely")
        99        runner.timeout_ms = 0
       100        var startup = yield(runner.reset(7), "completed")
       101        check(startup.get("error") == "startup_timeout" and startup.outcome.reason == "wall_timeout", "startup timeout returns explicit terminal reason")
       102        runner.timeout_ms = 120000
       103        var recovered = yield(runner.reset(7), "completed")
       104        check(recovered.has("player") and runner.outcome().status == "ongoing", "reset recovers after startup timeout")
       105        print("Episode interface: ", failures, " failures")
       106        get_tree().quit(0 if failures == 0 else 1)
       107
       108    func watchdog():
       109        print("FAIL: test watchdog")
       110        get_tree().quit(1)
         1    extends SceneTree
         2
         3    # Run with Godot 3.5.2: --no-window --path . -s tests/test_ai_controls.gd
         4    func _init():
         5        var tux = load("res://scenes/player/Tux.gd").new()
         6        assert(!tux.set_ai_action("RIGHT"))
         7        tux.set_ai_control_enabled(true)
         8        var expected = {
         9            "LEFT": [true, false, false],
        10            "RIGHT": [false, true, false],
        11            "JUMP": [false, false, true],
        12            "LEFT_JUMP": [true, false, true],
        13            "RIGHT_JUMP": [false, true, true],
        14            "WAIT": [false, false, false]
        15        }
        16        for action in tux.AI_ACTIONS:
        17            assert(tux.set_ai_action(action))
        18            tux.begin_control_tick()
        19            assert(tux.control_pressed("move_left") == expected[action][0])
        20            assert(tux.control_pressed("move_right") == expected[action][1])
        21            assert(tux.control_pressed("jump") == expected[action][2])
        22            assert(!tux.control_pressed("run"))
        23            assert(!tux.control_pressed("duck"))
        24            assert(!tux.control_pressed("move_up"))
        25        assert(tux.set_ai_action("JUMP"))
        26        tux.begin_control_tick()
        27        assert(tux.control_just_pressed("jump"))
        28        assert(tux.set_ai_action("RIGHT_JUMP"))
        29        tux.begin_control_tick()
        30        assert(!tux.control_just_pressed("jump"))
        31        assert(tux.control_pressed("jump"))
        32        assert(!tux.set_ai_action("INVALID"))
        33        assert(!tux.set_ai_action(42))
        34        assert(tux.control_pressed("move_right"))
        35        assert(tux.set_ai_action("WAIT"))
        36        tux.begin_control_tick()
        37        assert(!tux.control_pressed("jump"))
        38        assert(tux.set_ai_action("JUMP"))
        39        tux.begin_control_tick()
        40        assert(tux.control_just_pressed("jump"))
        41        Input.action_press("move_left")
        42        assert(!tux.control_pressed("move_left"))
        43        tux.set_ai_control_enabled(false)
        44        assert(tux.control_pressed("move_left") == Input.is_action_pressed("move_left"))
        45        Input.action_release("move_left")
        46        tux.set_ai_control_enabled(true)
        47        tux.begin_control_tick()
        48        assert(!tux.control_pressed("jump"))
        49        assert(!tux.control_just_pressed("jump"))
        50        tux.free()
        51        print("AI control assertions passed")
        52        quit()
         1    extends Node
         2
         3    # Temporary, opt-in integration harness. Uses the real level and physics.
         4    const LEVEL = "res://scenes/levels/world1/level1.tscn"
         5    const RIGHT_FRAMES = 12
         6    var level_ready = false
         7    var tux = null
         8    var failures = 0
         9    var finished = false
        10
        11    func _ready():
        12        # Independent wall-clock watchdog also catches stalled readiness/coroutines.
        13        get_tree().create_timer(20.0).connect("timeout", self, "_timeout")
        14        call_deferred("_run")
        15
        16    func _run():
        17        print("AI level integration: Godot ", Engine.get_version_info().string)
        18        var level = load(LEVEL).instance()
        19        level.connect("level_ready", self, "_on_level_ready")
        20        # Follow the normal root-level startup path, including the title card.
        21        Global.current_scene = level
        22        Global.current_level_path = LEVEL
        23        Global.spawn_position = null
        24        add_child(level)
        25        for _frame in range(600):
        26            if level_ready and is_instance_valid(Global.player):
        27                break
        28            yield(get_tree(), "physics_frame")
        29        tux = Global.player
        30        if !_check(level_ready and is_instance_valid(tux) and level.is_a_parent_of(tux),
        31                "Level ready with active Global.player"):
        32            _finish()
        33            return
        34        tux.set_ai_control_enabled(true)
        35        _check(tux.set_ai_action("WAIT"), "AI controls enabled")
        36        # Align action submissions with the boundary before node physics processing.
        37        yield(get_tree(), "physics_frame")
        38        for _frame in range(120):
        39            if tux.grounded:
        40                break
        41            yield(_frames(1), "completed")
        42        if !_check(tux.grounded, "Tux settled on actual level ground"):
        43            _finish()
        44            return
        45        var start_x = tux.global_position.x
        46        tux.set_ai_action("RIGHT")
        47        yield(_frames(RIGHT_FRAMES), "completed")
        48        _check(tux.global_position.x > start_x,
        49            "RIGHT: X increased over %d physics frames (%f -> %f)" % [RIGHT_FRAMES, start_x, tux.global_position.x])
        50        if !_check(tux.grounded, "RIGHT_JUMP starts grounded"):
        51            _finish()
        52            return
        53        var start_y = tux.global_position.y
        54        tux.set_ai_action("RIGHT_JUMP")
        55        yield(_frames(4), "completed")
        56        _check(!tux.grounded and tux.velocity.y < 0 and tux.global_position.y < start_y,
        57            "RIGHT_JUMP: airborne, rising, Y decreased (%f -> %f)" % [start_y, tux.global_position.y])
        58        tux.set_ai_action("WAIT")
        59        yield(_frames(2), "completed")
        60        _check(!tux.control_pressed("move_left") and !tux.control_pressed("move_right")
        61            and !tux.control_pressed("jump") and tux.move_direction == 0,
        62            "WAIT releases movement and jump input (inertia is allowed)")
        63        # Real keyboard event through InputMap, not a direct controller call.
        64        _key(true)
        65        yield(_frames(2), "completed")
        66        _check(Input.is_action_pressed("move_left") and !tux.control_pressed("move_left")
        67            and tux.move_direction == 0, "AI mode ignores held Left keyboard input")
        68        tux.set_ai_control_enabled(false)
        69        var before_velocity = tux.velocity.x
        70        yield(_frames(4), "completed")
        71        _check(tux.control_pressed("move_left") and tux.move_direction == -1
        72            and tux.velocity.x < before_velocity and !tux.set_ai_action("RIGHT"),
        73            "Human keyboard restored: Left drives physics after AI disabled")
        74        _key(false)
        75        yield(_frames(2), "completed")
        76        _check(!tux.control_pressed("move_left") and tux.move_direction == 0,
        77            "Human keyboard release reaches controller")
        78        _finish()
        79
        80    func _frames(count):
        81        # Called at a physics-frame boundary: the next signal observes the previous
        82        # tick's completed node processing. No rendered-frame timing dependency.
        83        for _frame in range(count):
        84            yield(get_tree(), "physics_frame")
        85
        86    func _key(pressed):
        87        var event = InputEventKey.new()
        88        event.scancode = KEY_LEFT
        89        event.pressed = pressed
        90        Input.parse_input_event(event)
        91
        92    func _on_level_ready():
        93        level_ready = true
        94
        95    func _check(ok, description):
        96        print("PASS: " if ok else "FAIL: ", description)
        97        if !ok:
        98            failures += 1
        99        return ok
       100
       101    func _timeout():
       102        if !finished:
       103            _check(false, "20-second integration watchdog expired")
       104            _finish()
       105
       106    func _finish():
       107        finished = true
       108        _key(false)
       109        if is_instance_valid(tux):
       110            tux.set_ai_control_enabled(false)
       111        print("AI level integration: ", "PASS" if failures == 0 else "FAIL", " (", failures, " failures)")
       112        get_tree().quit(0 if failures == 0 else 1)
         1    {
         2      "provider": "vertex",
         3      "model": null,
         4      "project": null,
         5      "location": null,
         6      "input_usd_per_million": null,
         7      "output_usd_per_million": null,
         8      "situations": [
         9        {"name": "opening", "seed": 7, "prefix": []},
        10        {"name": "approach", "seed": 17, "prefix": ["RIGHT", "RIGHT", "RIGHT", "RIGHT", "RIGHT"]},
        11        {"name": "held-out-jump", "seed": 29, "held_out": true, "prefix": ["RIGHT", "RIGHT_JUMP", "RIGHT", "RIGHT", "RIGHT"]}
        12      ]
        13    }
         1    # Autonomous players
         2
         3    Python 3.10+ uses only the standard library. Godot must be the imported **3.5.2
         4    Standard** project (the original level/resources and physics remain authoritative).
         5    Run these commands from this project directory. macOS Godot needs window-server
         6    access even with `--no-window`; change `--godot` on other platforms.
         7
         8    ```sh
         9    # One full baseline episode
        10    python3 -m controller.run --output traces/baseline-01
        11
        12    # One real Vertex episode (existing ADC and gcloud CLI required)
        13    # Set these to your existing course configuration; no default model is invented.
        14    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --player model --live --wall 600 --request-timeout 30 --output traces/model-02
        15
        16    # Same three situations: baseline once and two independent live episodes each
        17    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --evaluate --live --wall 600 --request-timeout 30 --output traces/evaluation-02
        18
        19    # Baseline suite without spending credits; six model trials recorded not_run
        20    python3 -m controller.run --evaluate --output traces/baseline-suite-01
        21
        22    # Deterministic Python checks, then actual engine/protocol checks
        23    python3 -m unittest discover -s tests -v
        24    SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v
        25    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_episode.tscn
        26    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
        27    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
        28    ```
        29
        30    Use a fresh output directory for every run; previous evidence is never overwritten.
        31    `agent-config.json` holds nonsecret settings, situation definitions, and optional
        32    USD per million input/output token rates. Project, location, and model may instead
        33    come from the environment shown above. Never store credentials there. The adapter
        34    uses existing `gcloud auth application-default print-access-token`; it never logs
        35    in or changes authentication. It calls the real Vertex
        36    [generateContent REST endpoint](https://docs.cloud.google.com/workflows/docs/tutorials/use-vertex-ai-models).
        37    No tools, repository contents, seed, setup prefix, evaluator results, or hidden
        38    state are included in the model request. Only instructions, observation, and legal
        39    actions are supplied. This is a tool-free language-model player, not an OS sandbox
        40    for arbitrary malicious Python plugins.
        41
        42    ## Protocol and control
        43
        44    `ai/external.tscn` serves newline-delimited UTF-8 JSON on a single loopback TCP
        45    connection. The trusted launcher passes a temporary port and limits through
        46    `SUPERTUX_PORT`, `SUPERTUX_STEPS`, `SUPERTUX_CALLS`, `SUPERTUX_TIMEOUT_MS`.
        47    The port reservation has a small close/listen race; startup failures are explicit.
        48    This local transport is intended for one trusted controller, not multiuser hosting.
        49    Operations are `{"op":"reset","seed":7}`, `observe`, `legal_actions`,
        50    `{"op":"step","action":"RIGHT"}`, and `outcome`; optional `player_id`
        51    defaults to tux. Replies are one JSON value per line, errors are dictionaries.
        52    `begin_model_call` is a trusted budget reservation, never exposed to the model.
        53    Unknown operations and invalid seeds/actions are rejected. No generic method
        54    invocation or node serialization exists. Godot logging goes to separate files.
        55    The five-operation runner and six-physics-frame duration are unchanged.
        56
        57    The baseline uses position history, grounded state, visible terrain, blocks,
        58    hazards, gaps and goals to choose movement/jumps. It releases jump between
        59    presses. Tile appearances are coarse and may include decorative terrain, so gap
        60    and obstacle detection is heuristic. This baseline is not claimed to win.
        61    Malformed/illegal model responses and failed requests use this same baseline as
        62    an explicitly recorded fallback. Every submitted action is checked against legal
        63    actions by Python and Godot. Raw response text and usage metadata are retained.
        64
        65    Defaults: 600 engine steps (including situation setup), 100 model attempts,
        66    120-second engine wall timeout, 15-second provider attempt deadline,
        67    30-second RPC timeout. The external Godot lifetime defaults to
        68    `wall + request-timeout + 2*rpc-timeout + 5` seconds (200 seconds with defaults,
        69    695 seconds with `--wall 600 --request-timeout 30`). An explicit
        70    `--process-timeout` must meet that minimum. All limits must be positive and
        71    finite. CLI flags can lower or raise these bounds; step and call defaults remain
        72    600 and 100. The margin covers startup, an in-flight provider attempt and cleanup,
        73    and terminal RPC handling; it is a bounded grace period, not extra game time. Every provider attempt reserves its call **before**
        74    requesting; failures and timeouts consume the budget, with no automatic retries.
        75    A separate worker process bounds token acquisition and HTTP calls. The engine
        76    lifetime watchdog handles engine hangs; infrastructure failures preserve partial
        77    traces and report unavailable outcome rather than claiming a loss.
        78    A terminal step rejection carries the engine outcome through to the report:
        79    wall expiry becomes `episode_limit / wall_timeout`, preserving score and without
        80    counting the rejected action as executed. Its decision remains in the trace,
        81    followed by `action_not_executed`. Infrastructure errors record `partial_trace`,
        82    a structured engine response when available, and `last_outcome`; the summary
        83    sets `trace_complete=false`. Trace/log creation is exclusive even when calling
        84    `episode()` directly.
        85
        86    ## Evaluation design and measurements
        87
        88    The fixed situations in `agent-config.json` are opening (seed 7), approach
        89    (seed 17, five RIGHT steps), and held-out-jump (seed 29, a five-action jump
        90    prefix). Prefixes run through real `step`, consume the same episode budgets,
        91    and are traced separately from player actions. These are modest initial-state
        92    variations on one level, not three different levels or guaranteed distinct
        93    obstacle types. Held-out is reserved for final evaluation; no tuning on its
        94    results is claimed. Each model trial starts a fresh engine and has no prior
        95    trial history. Human experience is not measured by these tests.
        96
        97    Each JSONL records reset, setup, decisions (raw text, errors, fallback, latency,
        98    usage), steps and final summary. `report.json` records every requested episode,
        99    win, score, terminal reason, successful submitted actions, invalid model
       100    proposals/failed calls, fallback count, setup and player step counts, model calls,
       101    latencies, total tokens and estimated cost. Null means unavailable, never zero.
       102    Baseline tokens/cost are zero. Partial token usage stays in traces; aggregate
       103    usage/cost remains null if any attempt lacks usage. Rates must be supplied for
       104    cost estimates; output estimates use total minus prompt tokens (including
       105    reported reasoning tokens). These are estimates, not billing records; model,
       106    region, caching and rate differences require checking actual billing.
       107
       108    Python player tests use explicit deterministic doubles, never live-trial evidence.
       109    The original Godot tests cover lifecycle/limit detection. The saved model-01
       110    trace is a real Vertex episode with partial measurements; its unavailable outcome
       111    must not count as a completed evaluation. Supply your existing provider
       112    configuration when running new live trials.
       113
       114    ## Actual local verification (November 7, 2026)
       115
       116    * Python: four player tests plus real Godot protocol test passed (5 total).
       117    * Existing Godot episode suite: 32 checks passed, zero failures, exit 0.
       118    * Existing Godot input assertions and real-level integration (10 checks): passed.
       119    * Baseline suite: opening died after 36 player steps; approach and held-out-jump
       120      each died after 31 player steps plus five setup steps. All scored 0. No wins.
       121    * Raw evidence: `traces/baseline-suite-actual/`; `report.json` also lists six
       122      model trials as not run. The suite was run before any tuning on its results.
       123    * Initial sandbox failure and separate 40-step-cap baseline smoke are preserved
       124      in `traces/baseline-smoke/` and `traces/baseline-real-smoke/` respectively.
       125    * At the initial verification, live Vertex trials had not been run. The later
       126      user-supplied model-01 trace is analyzed below. No new live calls were made
       127      during the timeout fix.
       128
       129    Only new transport/controller/config/tests/docs and traces were added; existing
       130    EpisodeRunner, Tux controls, level, physics, scenes, licenses and credits remain
       131    unchanged. No game rules, legal actions, observations or scoring were changed,
       132    so no rule-change review is claimed for this transport integration. Referenced
       133    `.claude` skill/reviewer files remain absent locally.
       134
       135    ## Timeout regression investigation (November 7, 2026)
       136
       137    The preserved `traces/model-01/opening-model-1.jsonl` contains 68 successful
       138    Vertex decisions and 67 executed steps (402 physics frames), last score 5.
       139    Its final decision succeeded; the following step did not return successfully.
       140    The original `Game.rpc()` raised `RuntimeError` for a structured terminal reply
       141    and discarded the outcome. The broad episode handler then discarded the message.
       142    The engine's idle wall timer runs while waiting for Vertex; after expiry,
       143    `step()` returns `error=terminal` with `episode_limit/wall_timeout`. This path
       144    explains the 121.147-second result with a 120-second engine budget. The external
       145    150-second watchdog would not yet have fired. No engine log or exception message
       146    was saved with this trace, so the historical exception text cannot be recovered;
       147    a disconnected transport also used RuntimeError. The real-engine regression
       148    reproduces and verifies the terminal-rejection path without any provider call.
       149    No original trace is rewritten or relabeled as a successful completed episode.
       150
       151    Verification commands are listed above. The live commands now use finite
       152    600-second engine and 30-second provider budgets with an automatic 695-second
       153    external deadline per episode. The full suite runs three baselines and six real
       154    Vertex trials; each trial still permits at most 600 steps and 100 model attempts.
       155    Choose a new output path if the example already exists.
       156
       157    Fix verification: all eight Python tests passed with real Godot integration,
       158    including wall expiry between decision and step; the existing episode suite,
       159    input assertions, and ten real-level checks passed. CLI checks rejected NaN and
       160    an insufficient external deadline. No live Vertex credits were spent verifying
       161    the fix. Modified files: `controller/run.py`, `tests/test_controller.py`, and
       162    `EVALUATION.md`; the runner, level and physics files are unchanged.
       163
       164    ## Completed live evaluation — November 7, 2026
       165
       166    Source: [report](traces/evaluation-02/report.json) and all nine adjacent JSONL files. Each raw summary matches its report entry; decision, executed step, setup, latency and token counts were cross-checked. Historical JSONL files were also inspected. Original evidence is preserved.
       167
       168    All nine episodes ended in `defeat / death`. Baseline win rate: **0/3 (0%)**; Vertex win rate: **0/6 (0%)**. Model: **`gemini-3.5-flash-lite`** (recorded in reports; configuration uses an environment override). No invalid proposals, fallbacks, failed provider calls, infrastructure errors or timeouts occur in these nine completed trials.
       169
       170    | Situation / player / trial | Score | Player steps | Setup steps | Calls | Elapsed s |
       171    |---|---:|---:|---:|---:|---:|
       172    | opening / baseline / 1 | 0 | 36 | 0 | 0 | 5.384 |
       173    | opening / model / 1 | 10 | 79 | 0 | 79 | 174.474 |
       174    | opening / model / 2 | 0 | 19 | 0 | 19 | 35.571 |
       175    | approach / baseline / 1 | 0 | 31 | 5 | 0 | 5.186 |
       176    | approach / model / 1 | 5 | 74 | 5 | 74 | 137.750 |
       177    | approach / model / 2 | 3 | 28 | 5 | 28 | 50.115 |
       178    | held-out-jump / baseline / 1 | 0 | 31 | 5 | 0 | 5.233 |
       179    | held-out-jump / model / 1 | 13 | 64 | 5 | 64 | 115.600 |
       180    | held-out-jump / model / 2 | 0 | 14 | 5 | 14 | 25.610 |
       181
       182    Steps exclude setup; every executed action advances six physics frames. Elapsed time includes startup, decisions and engine work. Latency below is per provider attempt, including process/authentication/HTTP overhead, rather than isolated model inference time.
       183
       184    | Live trial | Input tokens | Output tokens | Total tokens | Latency mean / median / max (s) | Conditional global / non-global USD |
       185    |---|---:|---:|---:|---|---|
       186    | opening 1 | 41,966 | 556 | 42,522 | 2.083 / 1.659 / 21.659 | 0.013980 / 0.015378 |
       187    | opening 2 | 12,461 | 106 | 12,567 | 1.691 / 1.673 / 1.914 | 0.004003 / 0.004404 |
       188    | approach 1 | 44,177 | 505 | 44,682 | 1.727 / 1.645 / 6.486 | 0.014516 / 0.015967 |
       189    | approach 2 | 13,669 | 185 | 13,854 | 1.611 / 1.585 / 2.277 | 0.004563 / 0.005020 |
       190    | held-out-jump 1 | 33,023 | 445 | 33,468 | 1.668 / 1.666 / 2.053 | 0.011019 / 0.012121 |
       191    | held-out-jump 2 | 9,413 | 80 | 9,493 | 1.585 / 1.608 / 1.712 | 0.003024 / 0.003326 |
       192
       193    Totals: **278 calls**, **154,709 input + 1,877 output = 156,586 tokens**. Call-weighted latency mean 1.793s, median 1.651s, range 1.418–21.659s. Baselines use zero tokens/calls and cost $0.
       194
       195    Model mean score: **5.17**, median **4**, range **0–13**; baseline mean/median **0**. Model mean scores by situation: opening **5**, approach **4**, held-out-jump **6.5**, versus **0** for each baseline. Four of six trials scored above baseline; two tied. Mean player steps: model **46.33**, baseline **32.67**; longer survival is not a win.
       196
       197    ### Pricing provenance and estimates
       198
       199    Checked November 7, 2026: Google Cloud’s authoritative [Vertex pricing URL](https://cloud.google.com/vertex-ai/generative-ai/pricing), redirected to [Model Garden pricing](https://cloud.google.com/model-garden/pricing), Gemini 3 **Standard** table. Gemini 3.5 Flash-Lite text rates are $0.30 input / $2.50 output per million tokens globally, or $0.33 / $2.75 for non-global endpoints. The page states non-global pricing applies from **July 1, 2026**. Priority and Flex/Batch tables have different prices; Gemini Developer API pricing is not the billing source used here. This is a dated lookup, not an archived invoice or a guaranteed historical rate snapshot.
       200
       201    Conditional standard on-demand estimates use `(prompt tokens × input rate + (total − prompt) × output rate) / 1,000,000`. The recorded usage is TEXT, ON_DEMAND; no cache usage is reported. Output includes any reasoning counted in total minus prompt. Aggregate conditional estimates: **$0.051105 global**, **$0.056216 non-global**.
       202
       203    The actual endpoint location is absent from the saved report and null in `agent-config.json`. Therefore a single run-specific estimated cost remains **unavailable** (`null` in original evidence); the two conditional calculations above must not be presented as the amount billed. Confirm endpoint and applicable rate with your Cloud billing records. Credits, taxes, negotiated discounts and historical partial-run charges are excluded. No original report or trace was rewritten to insert an assumed region or price.
       204
       205    ### Interpretation and evidence limits
       206
       207    These are two stochastic trials per situation, one baseline per situation, on one level. Small samples, a weak baseline, coarse local observations and render-frame updates prevent broad reliability or replay-determinism claims. Seeds and prefixes are initial-state variations; “held-out” is a configuration label, not independent proof of no tuning. Death traces establish outcome, not a verified causal diagnosis for each failure. Model latency pauses bounded physics progression but consumes wall time. Successful collection with zero wins demonstrates partial progress, not platformer mastery. No human-experience result follows from these automated tests. The earlier `model-01` timeout remains separate regression evidence and is excluded from these six completed trials.
       208
       209    ### Submission evidence audit
       210
       211    * `docs/interface-review.md` reports a separate read-only `rules_review` agent, findings and follow-up. It supports a documented review claim for the earlier interface, but no session transcript/ID or immutable session link is present to independently verify a separate session. It does not cover the later controller, live evaluation or this CI change. A strict separate-session evidence requirement is **not yet demonstrably satisfied**. Obtain an actual independent read-only review and retain its session reference, scope, findings and dispositions; no review was created by this audit.
       212
       213    * No project-local reusable `SKILL.md` or execution evidence was found; the referenced `.claude` skill/reviewer files are absent. Add the required reusable skill and an actual usage artifact if required by the rubric.
       214
       215    * No human playtest observations, participant-safe outcomes/interpretation, playable-build link, or video/recording link was found in project documentation. JSONL action traces are automated evidence, not a video or human playtest. Conduct and document actual human testing and supply accessible recording/build links.
       216
       217    * `AGENT-TEAM.md` is referenced by README but absent. Supply executable role configurations and real role/session evidence, your design decisions and limitations. Current `agent-config.json` configures the runtime player only.
       218
       219    * Student must verify media licenses/credits, maintain Asana tasks/PPP/acceptance and gate decisions, link the PR/CI, and verify the course rubric and submission destination/deadline. Asana and any external submission state were not available in this audit. No gate approval, commit, push, publication or live rerun was performed.
       220
       221    ### Verification for this documentation/CI phase
       222
       223    Modified files: `EVALUATION.md`, `README.md`, and the sole new workflow `../../.github/workflows/midterm-scarlettleon7.yml`. Gameplay, physics, controller behavior, original evidence and credentials were untouched.
       224
       225    Actual local results on November 7, 2026, Godot `3.5.2.stable.official.170ba337a`:
       226
       227    * `python3 -m unittest discover -s tests -v`: 7 passed, 1 opt-in integration skipped (8 discovered).
       228    * `SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v`: all 8 passed, including actual Godot protocol/termination and wall-expiry regression.
       229    * `tests/test_episode.tscn`: 32 checks passed, zero failures, exit 0.
       230    * `tests/test_ai_controls.gd`: assertions passed, exit 0.
       231    * `tests/test_ai_level.tscn`: 10 checks passed, zero failures, exit 0, including keyboard restoration.
       232    * All saved JSONL files parsed; evaluation-02 raw counts, usage, latencies and embedded summaries matched report.json.
       233
       234    The initial sandbox Godot version probe aborted; successful engine tests used approved macOS window-server access. Existing OpenGL texture warnings appeared; no GDScript errors appeared. CI uses the official Godot 3.5.2 Standard Linux binary, asset import, Xvfb and software OpenGL, with bounded commands and explicit success/error checks. No Vertex secrets/authentication or live evaluation command is configured. Python integration currently hardcodes macOS, so Linux CI uses the three direct engine suites and leaves that Python test skipped. The workflow has not run on GitHub; Linux CI success is pending a student push/PR. No costly trials were rerun.
         1    # SuperTux AI Challenge
         2
         3    ## Project Overview
         4
         5    SuperTux AI Challenge is an adaptation of SuperTux Classic, a Mario-inspired 2D platformer, developed for the AI in Games midterm.
         6
         7    The project aims to support both human gameplay and autonomous AI gameplay. A model-driven agent will play the game through a structured observation/action interface and be compared with a scripted baseline.
         8
         9    ## Current Status
        10
        11    AI input controls and an opt-in five-operation interface for the original first level are implemented. See [input controls](docs/ai-input-controls.md) and [machine interface](docs/machine-interface.md) for commands, API, tests, and limitations. A Python baseline, Vertex REST player, and evaluation runner are implemented; see [commands and actual results](EVALUATION.md). Six real Vertex trials and three baselines completed; all ended in defeat. Live scores were 10, 0, 5, 3, 13, and 0. See EVALUATION.md for measured results and preserved timeout regression evidence.
        12
        13    ## Technology
        14
        15    - Engine: Godot 3.5.2
        16    - Language: GDScript
        17    - Original game: SuperTux Classic
        18    - AI player: Python observation-based baseline and Vertex language-model adapter
        19
        20    ## Setup and Play
        21
        22    Starting from `midterms/scarlettleon7/`:
        23
        24    1. Install Godot 3.5.2 Standard.
        25    2. Import `project.godot` in Godot.
        26    3. Run the game using F5.
        27
        28    The original game currently supports keyboard controls.
        29
        30    ## Planned Midterm Scope
        31
        32    The intended midterm adaptation will focus on one bounded platformer level featuring movement, jumping, obstacles, collectibles, and a clear terminal outcome.
        33
        34    The complete original game, additional worlds, advanced enemies, and cosmetic changes are outside the planned scope.
        35
        36    The planned AI interface consists of:
        37
        38    - `reset(seed)`
        39    - `observe(player_id)`
        40    - `legal_actions(player_id)`
        41    - `step(player_id, action)`
        42    - `outcome()`
        43
        44    ## Rule / Source Map — Initial Draft
        45
        46    | Rule | Evidence label | Evidence location |
        47    |---|---|---|
        48    | Left/right movement and acceleration | code | `scenes/player/Tux.gd`, `move_input()` and `horizontal_movement()` |
        49    | Jumping, including buffering | code | `scenes/player/Tux.gd`, `jump_input()` |
        50    | Movement and collisions | code | `scenes/player/Tux.gd`, `apply_movement()` |
        51    | Player idle, walk, jump, fall, win, and dead states | code | `scenes/player/TuxSM.gd` |
        52    | One bounded evaluation level | implementation | Original world1/level1 via `ai/EpisodeRunner.gd` |
        53    | AI action vocabulary and step limits | implementation | [Machine-interface rule map](docs/rule-source-map.md) |
        54
        55    This rule map will be updated to cover all rules enforced by the completed adaptation.
        56
        57    ## Source and License
        58
        59    This project adapts [SuperTux Classic](https://github.com/Alzter/SuperTux-Classic), a remake of SuperTux Milestone 1.
        60
        61    The original source is distributed under GPL-3.0-or-later. The license text is preserved in `LICENSE-SUPERTUX`, and original contributor credits are retained in `scenes/menus/CreditsText.tscn`.
        62
        63    Original upstream commit: **[f4c0db9d4e3d1292f80cf82257161d4d01b9d1db]**
        64
        65    The original project credits additional graphics, audio, and music contributors. Applicable media licenses must be verified before public submission.
        66
        67    ## Evaluation
        68
        69    See [EVALUATION.md](EVALUATION.md) for the evaluation suite, players, exact commands, results, and evidence limits.
        70
        71    ## Agent Team
        72
        73    Development-agent roles, independent review evidence, and my design decisions will be documented in `AGENT-TEAM.md`.
        74
        75    ## Limitations
        76
        77    The interface has local deterministic tests; the nine-episode evaluation is recorded; cross-platform replay determinism remains unverified. See [machine-interface limitations](docs/machine-interface.md).
        78
        79
        80    ## Exact project-directory commands
        81
        82    Requires Python 3.10+ (standard library only), Godot **3.5.2 Standard**, and project assets imported. On macOS:
        83
        84    ```sh
        85    export GODOT=/Applications/Godot.app/Contents/MacOS/Godot
        86    python3 --version
        87    "$GODOT" --version
        88    "$GODOT" --editor --path .
        89    # Wait for asset import, then close the editor.
        90    "$GODOT" --path .
        91
        92    # One baseline; always choose a new output directory.
        93    python3 -m controller.run --godot "$GODOT" --output traces/baseline-new
        94    # Three baselines, no API requests; live trials marked not_run.
        95    python3 -m controller.run --godot "$GODOT" --evaluate --output traces/offline-suite-new
        96
        97    python3 -m unittest discover -s tests -v
        98    SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v
        99    "$GODOT" --no-window --path . res://tests/test_episode.tscn
       100    "$GODOT" --no-window --path . -s tests/test_ai_controls.gd
       101    "$GODOT" --no-window --path . res://tests/test_ai_level.tscn
       102    ```
       103
       104    On other platforms set `GODOT` to the installed Godot 3.5.2 Standard executable. The opt-in Python integration test currently hardcodes the macOS executable; CI runs the portable engine suites directly. macOS engine commands require window-server access even with `--no-window`. Human keyboard mappings are in the editor’s Project Settings → Input Map.
       105
       106    Live commands below **spend credits** and are provided for reproducibility; the completed trials need no rerun. Install the gcloud CLI, obtain authorized Application Default Credentials, and set your actual project and location (neither is saved in the evidence):
       107
       108    ```sh
       109    gcloud auth application-default login
       110    export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT
       111    export GOOGLE_CLOUD_LOCATION=YOUR_LOCATION
       112    export VERTEX_MODEL=gemini-3.5-flash-lite
       113    python3 -m controller.run --godot "$GODOT" --player model --live --wall 600 --request-timeout 30 --output traces/live-single-new
       114    python3 -m controller.run --godot "$GODOT" --evaluate --live --wall 600 --request-timeout 30 --output traces/live-suite-new
       115    ```
       116
       117    The suite executes three baselines and six Vertex episodes, with at most 600 total steps and 100 model attempts per episode. Output directories must be fresh. Credentials stay outside the repository. CI runs offline Python and Godot tests through the single project workflow `.github/workflows/midterm-scarlettleon7.yml`; no live evaluations run in CI.
         1    name: Scarlett SuperTux offline tests
         2    on:
         3      push:
         4        paths:
         5          - 'midterms/scarlettleon7/**'
         6          - '.github/workflows/midterm-scarlettleon7.yml'
         7      pull_request:
         8        paths:
         9          - 'midterms/scarlettleon7/**'
        10          - '.github/workflows/midterm-scarlettleon7.yml'
        11      workflow_dispatch:
        12    permissions:
        13      contents: read
        14    jobs:
        15      offline:
        16        runs-on: ubuntu-22.04
        17        timeout-minutes: 15
        18        defaults:
        19          run:
        20            working-directory: midterms/scarlettleon7
        21            shell: bash
        22        steps:
        23          - uses: actions/checkout@v4
        24            with:
        25              sparse-checkout: midterms/scarlettleon7
        26          - uses: actions/setup-python@v5
        27            with:
        28              python-version: '3.11'
        29          - name: Deterministic Python tests (no provider requests)
        30            run: python -m unittest discover -s tests -v
        31          - name: Install Godot 3.5.2 Standard and display dependencies
        32            run: |
        33              sudo apt-get update
        34              sudo apt-get install -y xvfb libgl1-mesa-dri libgl1 libasound2 libxcursor1 libxinerama1 libxrandr2 libxi6
        35              curl --fail --location --retry 3 https://github.com/godotengine/godot/releases/download/3.5.2-stable/Godot_v3.5.2-stable_x11.64.zip -o "$RUNNER_TEMP/godot.zip"
        36              unzip -q "$RUNNER_TEMP/godot.zip" -d "$RUNNER_TEMP/godot"
        37              chmod +x "$RUNNER_TEMP/godot/Godot_v3.5.2-stable_x11.64"
        38              echo "GODOT=$RUNNER_TEMP/godot/Godot_v3.5.2-stable_x11.64" >> "$GITHUB_ENV"
        39          - name: Import assets and run actual Godot tests (no cloud credentials)
        40            env:
        41              LIBGL_ALWAYS_SOFTWARE: '1'
        42            run: |
        43              set -euo pipefail
        44              "$GODOT" --version | grep '^3.5.2.stable.official'
        45              timeout 180s xvfb-run -a "$GODOT" --no-window --audio-driver Dummy --editor --path . --quit 2>&1 | tee "$RUNNER_TEMP/import.log"
        46              if grep -Eq 'SCRIPT ERROR:|Parse Error:' "$RUNNER_TEMP/import.log"; then exit 1; fi
        47              run_suite() {
        48                local label="$1"
        49                local marker="$2"
        50                shift 2
        51                timeout 90s xvfb-run -a "$GODOT" --no-window --audio-driver Dummy --path . "$@" 2>&1 | tee "$RUNNER_TEMP/$label.log"
        52                if grep -Eq 'SCRIPT ERROR:|Parse Error:|FAIL:' "$RUNNER_TEMP/$label.log"; then return 1; fi
        53                grep -F "$marker" "$RUNNER_TEMP/$label.log"
        54              }
        55              run_suite episode 'Episode interface: 0 failures' res://tests/test_episode.tscn
        56              run_suite controls 'AI control assertions passed' -s tests/test_ai_controls.gd
        57              run_suite level 'AI level integration: PASS (0 failures)' res://tests/test_ai_level.tscn
    ✓ • 0ms

## Activity

    $ cat agent-config.json; sed -n '1,115p' EVALUATION.md; rg -n 'func _process|func _physics_process|begin_control_tick|ai_|control_just' scenes/player/Tux.gd scenes/player/TuxSM.gd; rg -n 'func _process|func _physics_process|delta|Timer|level_timer' scenes/levels/Level.gd scripts/Scoreboard.gd; rg --files ai docs traces | head -65; nl -ba tests/test_ai_level.gd | tail -65
    {
      "provider": "vertex",
      "model": null,
      "project": null,
      "location": null,
      "input_usd_per_million": null,
      "output_usd_per_million": null,
      "situations": [
        {"name": "opening", "seed": 7, "prefix": []},
        {"name": "approach", "seed": 17, "prefix": ["RIGHT", "RIGHT", "RIGHT", "RIGHT", "RIGHT"]},
        {"name": "held-out-jump", "seed": 29, "held_out": true, "prefix": ["RIGHT", "RIGHT_JUMP", "RIGHT", "RIGHT", "RIGHT"]}
      ]
    }
    # Autonomous players
    
    Python 3.10+ uses only the standard library. Godot must be the imported **3.5.2
    Standard** project (the original level/resources and physics remain authoritative).
    Run these commands from this project directory. macOS Godot needs window-server
    access even with `--no-window`; change `--godot` on other platforms.
    
    ```sh
    # One full baseline episode
    python3 -m controller.run --output traces/baseline-01
    
    # One real Vertex episode (existing ADC and gcloud CLI required)
    # Set these to your existing course configuration; no default model is invented.
    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --player model --live --wall 600 --request-timeout 30 --output traces/model-02
    
    # Same three situations: baseline once and two independent live episodes each
    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT GOOGLE_CLOUD_LOCATION=YOUR_LOCATION VERTEX_MODEL=YOUR_COURSE_MODEL python3 -m controller.run --evaluate --live --wall 600 --request-timeout 30 --output traces/evaluation-02
    
    # Baseline suite without spending credits; six model trials recorded not_run
    python3 -m controller.run --evaluate --output traces/baseline-suite-01
    
    # Deterministic Python checks, then actual engine/protocol checks
    python3 -m unittest discover -s tests -v
    SUPERTUX_INTEGRATION=1 python3 -m unittest discover -s tests -v
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_episode.tscn
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
    ```
    
    Use a fresh output directory for every run; previous evidence is never overwritten.
    `agent-config.json` holds nonsecret settings, situation definitions, and optional
    USD per million input/output token rates. Project, location, and model may instead
    come from the environment shown above. Never store credentials there. The adapter
    uses existing `gcloud auth application-default print-access-token`; it never logs
    in or changes authentication. It calls the real Vertex
    [generateContent REST endpoint](https://docs.cloud.google.com/workflows/docs/tutorials/use-vertex-ai-models).
    No tools, repository contents, seed, setup prefix, evaluator results, or hidden
    state are included in the model request. Only instructions, observation, and legal
    actions are supplied. This is a tool-free language-model player, not an OS sandbox
    for arbitrary malicious Python plugins.
    
    ## Protocol and control
    
    `ai/external.tscn` serves newline-delimited UTF-8 JSON on a single loopback TCP
    connection. The trusted launcher passes a temporary port and limits through
    `SUPERTUX_PORT`, `SUPERTUX_STEPS`, `SUPERTUX_CALLS`, `SUPERTUX_TIMEOUT_MS`.
    The port reservation has a small close/listen race; startup failures are explicit.
    This local transport is intended for one trusted controller, not multiuser hosting.
    Operations are `{"op":"reset","seed":7}`, `observe`, `legal_actions`,
    `{"op":"step","action":"RIGHT"}`, and `outcome`; optional `player_id`
    defaults to tux. Replies are one JSON value per line, errors are dictionaries.
    `begin_model_call` is a trusted budget reservation, never exposed to the model.
    Unknown operations and invalid seeds/actions are rejected. No generic method
    invocation or node serialization exists. Godot logging goes to separate files.
    The five-operation runner and six-physics-frame duration are unchanged.
    
    The baseline uses position history, grounded state, visible terrain, blocks,
    hazards, gaps and goals to choose movement/jumps. It releases jump between
    presses. Tile appearances are coarse and may include decorative terrain, so gap
    and obstacle detection is heuristic. This baseline is not claimed to win.
    Malformed/illegal model responses and failed requests use this same baseline as
    an explicitly recorded fallback. Every submitted action is checked against legal
    actions by Python and Godot. Raw response text and usage metadata are retained.
    
    Defaults: 600 engine steps (including situation setup), 100 model attempts,
    120-second engine wall timeout, 15-second provider attempt deadline,
    30-second RPC timeout. The external Godot lifetime defaults to
    `wall + request-timeout + 2*rpc-timeout + 5` seconds (200 seconds with defaults,
    695 seconds with `--wall 600 --request-timeout 30`). An explicit
    `--process-timeout` must meet that minimum. All limits must be positive and
    finite. CLI flags can lower or raise these bounds; step and call defaults remain
    600 and 100. The margin covers startup, an in-flight provider attempt and cleanup,
    and terminal RPC handling; it is a bounded grace period, not extra game time. Every provider attempt reserves its call **before**
    requesting; failures and timeouts consume the budget, with no automatic retries.
    A separate worker process bounds token acquisition and HTTP calls. The engine
    lifetime watchdog handles engine hangs; infrastructure failures preserve partial
    traces and report unavailable outcome rather than claiming a loss.
    A terminal step rejection carries the engine outcome through to the report:
    wall expiry becomes `episode_limit / wall_timeout`, preserving score and without
    counting the rejected action as executed. Its decision remains in the trace,
    followed by `action_not_executed`. Infrastructure errors record `partial_trace`,
    a structured engine response when available, and `last_outcome`; the summary
    sets `trace_complete=false`. Trace/log creation is exclusive even when calling
    `episode()` directly.
    
    ## Evaluation design and measurements
    
    The fixed situations in `agent-config.json` are opening (seed 7), approach
    (seed 17, five RIGHT steps), and held-out-jump (seed 29, a five-action jump
    prefix). Prefixes run through real `step`, consume the same episode budgets,
    and are traced separately from player actions. These are modest initial-state
    variations on one level, not three different levels or guaranteed distinct
    obstacle types. Held-out is reserved for final evaluation; no tuning on its
    results is claimed. Each model trial starts a fresh engine and has no prior
    trial history. Human experience is not measured by these tests.
    
    Each JSONL records reset, setup, decisions (raw text, errors, fallback, latency,
    usage), steps and final summary. `report.json` records every requested episode,
    win, score, terminal reason, successful submitted actions, invalid model
    proposals/failed calls, fallback count, setup and player step counts, model calls,
    latencies, total tokens and estimated cost. Null means unavailable, never zero.
    Baseline tokens/cost are zero. Partial token usage stays in traces; aggregate
    usage/cost remains null if any attempt lacks usage. Rates must be supplied for
    cost estimates; output estimates use total minus prompt tokens (including
    reported reasoning tokens). These are estimates, not billing records; model,
    region, caching and rate differences require checking actual billing.
    
    Python player tests use explicit deterministic doubles, never live-trial evidence.
    The original Godot tests cover lifecycle/limit detection. The saved model-01
    trace is a real Vertex episode with partial measurements; its unavailable outcome
    must not count as a completed evaluation. Supply your existing provider
    configuration when running new live trials.
    
    ## Actual local verification (November 7, 2026)
    
    scenes/player/TuxSM.gd:33:    host.begin_control_tick()
    scenes/player/Tux.gd:107:var _ai_control_enabled = false
    scenes/player/Tux.gd:108:var _ai_action = "WAIT"
    scenes/player/Tux.gd:109:var _ai_jump_held = false
    scenes/player/Tux.gd:110:var _ai_jump_just_pressed = false
    scenes/player/Tux.gd:113:func set_ai_control_enabled(enabled : bool):
    scenes/player/Tux.gd:114:    _ai_control_enabled = enabled
    scenes/player/Tux.gd:115:    _ai_action = "WAIT"
    scenes/player/Tux.gd:116:    _ai_jump_held = false
    scenes/player/Tux.gd:117:    _ai_jump_just_pressed = false
    scenes/player/Tux.gd:120:func set_ai_action(action) -> bool:
    scenes/player/Tux.gd:123:    if !_ai_control_enabled:
    scenes/player/Tux.gd:125:    _ai_action = action
    scenes/player/Tux.gd:129:func begin_control_tick():
    scenes/player/Tux.gd:130:    var jump_held = _ai_control_enabled and _ai_action in ["JUMP", "LEFT_JUMP", "RIGHT_JUMP"]
    scenes/player/Tux.gd:131:    _ai_jump_just_pressed = jump_held and !_ai_jump_held
    scenes/player/Tux.gd:132:    _ai_jump_held = jump_held
    scenes/player/Tux.gd:135:    if !_ai_control_enabled:
    scenes/player/Tux.gd:139:            return _ai_action in ["LEFT", "LEFT_JUMP"]
    scenes/player/Tux.gd:141:            return _ai_action in ["RIGHT", "RIGHT_JUMP"]
    scenes/player/Tux.gd:143:            return _ai_jump_held
    scenes/player/Tux.gd:146:func control_just_pressed(action : String) -> bool:
    scenes/player/Tux.gd:147:    if !_ai_control_enabled:
    scenes/player/Tux.gd:149:    return action == "jump" and _ai_jump_just_pressed
    scenes/player/Tux.gd:273:    if control_just_pressed("jump"):
    scenes/player/Tux.gd:537:    if control_just_pressed("run"):
    rg: scenes/levels/Level.gd: No such file or directory (os error 2)
    rg: scripts/Scoreboard.gd: No such file or directory (os error 2)
    traces/interface-smoke.jsonl
    ai/run_episode.gd
    ai/external.tscn
    ai/EpisodeRunner.gd
    ai/external.gd
    ai/run_episode.tscn
    docs/interface-review.md
    docs/machine-interface.md
    docs/rule-source-map.md
    docs/ai-input-controls.md
    traces/baseline-suite-actual/held-out-jump-baseline-1.jsonl
    traces/baseline-smoke/opening-baseline-1.jsonl
    traces/baseline-suite-actual/opening-baseline-1.jsonl
    traces/baseline-suite-actual/report.json
    traces/baseline-suite-actual/approach-baseline-1.jsonl
    traces/baseline-smoke/report.json
    traces/evaluation-02/report.json
    traces/evaluation-02/approach-baseline-1.jsonl
    traces/evaluation-02/opening-model-1.jsonl
    traces/evaluation-02/held-out-jump-model-2.jsonl
    traces/evaluation-02/approach-model-1.jsonl
    traces/evaluation-02/held-out-jump-baseline-1.jsonl
    traces/evaluation-02/opening-baseline-1.jsonl
    traces/evaluation-02/held-out-jump-model-1.jsonl
    traces/evaluation-02/approach-model-2.jsonl
    traces/evaluation-02/opening-model-2.jsonl
    traces/baseline-real-smoke/opening-baseline-1.jsonl
    traces/baseline-real-smoke/report.json
    traces/model-01/report.json
    traces/model-01/opening-model-1.jsonl
        48        _check(tux.global_position.x > start_x,
        49            "RIGHT: X increased over %d physics frames (%f -> %f)" % [RIGHT_FRAMES, start_x, tux.global_position.x])
        50        if !_check(tux.grounded, "RIGHT_JUMP starts grounded"):
        51            _finish()
        52            return
        53        var start_y = tux.global_position.y
        54        tux.set_ai_action("RIGHT_JUMP")
        55        yield(_frames(4), "completed")
        56        _check(!tux.grounded and tux.velocity.y < 0 and tux.global_position.y < start_y,
        57            "RIGHT_JUMP: airborne, rising, Y decreased (%f -> %f)" % [start_y, tux.global_position.y])
        58        tux.set_ai_action("WAIT")
        59        yield(_frames(2), "completed")
        60        _check(!tux.control_pressed("move_left") and !tux.control_pressed("move_right")
        61            and !tux.control_pressed("jump") and tux.move_direction == 0,
        62            "WAIT releases movement and jump input (inertia is allowed)")
        63        # Real keyboard event through InputMap, not a direct controller call.
        64        _key(true)
        65        yield(_frames(2), "completed")
        66        _check(Input.is_action_pressed("move_left") and !tux.control_pressed("move_left")
        67            and tux.move_direction == 0, "AI mode ignores held Left keyboard input")
        68        tux.set_ai_control_enabled(false)
        69        var before_velocity = tux.velocity.x
        70        yield(_frames(4), "completed")
        71        _check(tux.control_pressed("move_left") and tux.move_direction == -1
        72            and tux.velocity.x < before_velocity and !tux.set_ai_action("RIGHT"),
        73            "Human keyboard restored: Left drives physics after AI disabled")
        74        _key(false)
        75        yield(_frames(2), "completed")
        76        _check(!tux.control_pressed("move_left") and tux.move_direction == 0,
        77            "Human keyboard release reaches controller")
        78        _finish()
        79
        80    func _frames(count):
        81        # Called at a physics-frame boundary: the next signal observes the previous
        82        # tick's completed node processing. No rendered-frame timing dependency.
        83        for _frame in range(count):
        84            yield(get_tree(), "physics_frame")
        85
        86    func _key(pressed):
        87        var event = InputEventKey.new()
        88        event.scancode = KEY_LEFT
        89        event.pressed = pressed
        90        Input.parse_input_event(event)
        91
        92    func _on_level_ready():
        93        level_ready = true
        94
        95    func _check(ok, description):
        96        print("PASS: " if ok else "FAIL: ", description)
        97        if !ok:
        98            failures += 1
        99        return ok
       100
       101    func _timeout():
       102        if !finished:
       103            _check(false, "20-second integration watchdog expired")
       104            _finish()
       105
       106    func _finish():
       107        finished = true
       108        _key(false)
       109        if is_instance_valid(tux):
       110            tux.set_ai_control_enabled(false)
       111        print("AI level integration: ", "PASS" if failures == 0 else "FAIL", " (", failures, " failures)")
       112        get_tree().quit(0 if failures == 0 else 1)
    ✓ • 0ms

## Assistant

The model request contains only instructions, observations, and legal actions; I found no repository or evaluator access in that path. I’m checking timing and terminal-state behavior next. CI skips the Python-to-Godot integration test, and saved reports omit several settings needed to reproduce the trials.

## Activity

    $ rg --files | rg '(Scoreboard|Level|StateMachine|TuxSM|BonusInvisible|EndGoal|AGENT-TEAM|SKILL|LICENSE)'; nl -ba scenes/player/TuxSM.gd | head -170; rg -n 'func _process|func _physics_process|delta' scenes/objects/*.gd scenes/enemies/*.gd autoload/*.gd; cat docs/machine-interface.md
    autoload/UserLevelsManager.gd
    autoload/Scoreboard.tscn
    autoload/Scoreboard.gd
    LICENSE-SUPERTUX
    !LevelImporter/ImportTiles.gd
    !LevelImporter/ImportFunction.tscn
    !LevelImporter/ImportFunction.gd
    !LevelImporter/ImportObjects.gd
    !LevelImporter/!WorldmapImporter.tscn
    !LevelImporter/!LevelImporter.tscn
    !LevelImporter/MusicImporter.gd
    !LevelImporter/ImportTiles - Copy.gd
    !LevelImporter/ImportObjects.tscn
    !LevelImporter/!LevelImporter.gd
    scenes/player/TuxSM.gd
    scenes/master/Level.gd
    scenes/tilesets/LevelTiles.tres
    scenes/worldmap/LevelDot.gd
    scenes/worldmap/LevelDotContainer.gd
    scenes/worldmap/LevelDot.tscn
    scenes/objects/BonusInvisible.tscn
    scenes/objects/EndGoalPosts.gd
    scenes/objects/EndGoalPosts.tscn
    scenes/objects/EndGoalIgloo.tscn
    scenes/objects/EndGoalIgloo.gd
    music/LevelDone.mp3.import
    music/LevelDone.mp3
    music/Pingus - Level.mp3
    music/Pingus - Level.mp3.import
    scenes/menus/CustomLevels.gd
    scenes/menus/BonusLevels.gd
    scenes/menus/LevelIntroduction.tscn
    scenes/menus/BonusLevels.tscn
    scenes/menus/CustomLevels.tscn
    scenes/menus/LevelIntroduction.gd
    scenes/leveleditor/LevelPropertiesPanel.gd
    scenes/leveleditor/LevelEditor.gd
    scenes/leveleditor/LevelEditor.tscn
    images/editor/EndGoalIgloo.png
    images/editor/EndGoalPosts.png.import
    images/editor/EndGoalIgloo.png.import
    images/editor/EndGoalPosts.png
    scenes/leveleditor/menus/LevelButton.tscn
    scenes/leveleditor/menus/DeleteLevelDialog.tscn
    scenes/leveleditor/menus/OpenLevel.tscn
    images/editor/object_icons/LevelDot.png.import
    images/editor/object_icons/LevelDot.png
    scenes/levels/world1/Level27Script.gd
         1    #  SuperTux - A 2D, Open-Source Platformer Game licensed under GPL-3.0-or-later
         2    #  Copyright (C) 2022 Alexander Small <alexsmudgy20@gmail.com>
         3    #
         4    #  This program is free software; you can redistribute it and/or
         5    #  modify it under the terms of the GNU General Public License
         6    #  as published by the Free Software Foundation; either version 3
         7    #  of the License, or (at your option) any later version.
         8    #
         9    #  This program is distributed in the hope that it will be useful,
        10    #  but WITHOUT ANY WARRANTY; without even the implied warranty of
        11    #  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        12    #  GNU General Public License for more details.
        13    #
        14    #  You should have received a copy of the GNU General Public License
        15    #  along with this program.  If not, see <http://www.gnu.org/licenses/>.
        16
        17
        18    extends StateMachine
        19
        20    func _ready():
        21        add_state("idle")
        22        add_state("duck")
        23        add_state("walk")
        24        add_state("jump")
        25        add_state("fall")
        26        add_state("dead")
        27        add_state("win")
        28        add_state("win_inside_igloo")
        29        add_state("riding")
        30        call_deferred("set_state", "idle")
        31
        32    func _state_logic(delta):
        33        host.begin_control_tick()
        34        if "dead" in state:
        35            host.stop_riding_entity()
        36            host.apply_gravity(delta)
        37            host.apply_movement(delta, false)
        38            host.update_sprite()
        39            return
        40
        41        if "win" in state:
        42            host.win_loop(state == "win")
        43            host.apply_gravity(delta, Global.gravity * 0.25)
        44            host.apply_movement(delta)
        45            host.update_sprite()
        46            return
        47
        48        if ["idle", "walk", "jump", "fall", "duck"].has(state):
        49            host.move_direction = host.move_input()
        50
        51            # We can't move while ducking on the floor
        52            if host.grounded and state == "duck":
        53                host.move_direction = 0
        54            if host.move_direction != 0: host.facing = host.move_direction
        55
        56            host.horizontal_movement()
        57            host.fireball_input()
        58
        59            host.jump_input()
        60            host.check_bounce(delta)
        61            host.apply_gravity(delta)
        62
        63        host.apply_movement(delta)
        64        if host.grabbed_object != null: host.hold_object()
        65
        66        host.update_sprite()
        67        host.update_grab_position()
        68
        69    func _get_transition(delta):
        70        match state:
        71            "idle":
        72                if !host.is_on_floor():
        73                    if host.velocity.y < 0:
        74                        return "jump"
        75                    else: return "fall"
        76                elif host.velocity.x != 0: return "walk"
        77                elif host.can_duck(): return "duck"
        78
        79            "duck":
        80                if !host.can_duck() and host.can_unduck() and host.grounded:
        81                    return "idle"
        82
        83            "walk":
        84                if !host.is_on_floor():
        85                    if host.velocity.y < 0:
        86                        return "jump"
        87                    else: return "fall"
        88                elif host.velocity.x == 0: return "idle"
        89                elif host.can_duck(): return "duck"
        90
        91            "jump":
        92                if host.is_on_floor():
        93                    if host.can_duck(): return "duck"
        94                    else: return "idle"
        95                elif host.velocity.y >= 0: return "fall"
        96
        97            "fall":
        98                if host.is_on_floor():
        99                    if host.can_duck(): return "duck"
       100                    else: return "idle"
       101                elif host.velocity.y < 0: return "jump"
       102
       103        return null
       104
       105    func _enter_state(new_state, old_state):
       106        match new_state:
       107            "duck":
       108                host.duck_hitbox(true)
       109
       110    func _exit_state(old_state, new_state):
       111        match old_state:
       112            "duck":
       113                host.duck_hitbox(false)
    scenes/enemies/Stalactite.gd:57:func apply_gravity(delta, grav_set = Global.gravity):
    scenes/enemies/Stalactite.gd:58:    velocity.y += grav_set * delta
    scenes/enemies/Stalactite.gd:60:func apply_movement(delta):
    scenes/enemies/badguy.gd:65:func apply_movement(delta, solid = true):
    scenes/enemies/badguy.gd:75:        position += velocity * delta
    scenes/enemies/badguy.gd:100:func flying_movement(delta):
    scenes/enemies/badguy.gd:105:        velocity.y = distance / delta
    scenes/enemies/badguy.gd:107:func apply_gravity(delta, grav_set = Global.gravity):
    scenes/enemies/badguy.gd:108:    velocity.y += grav_set * delta
    scenes/enemies/badguy.gd:117:func hit_blocks(delta):
    scenes/enemies/badguy.gd:120:        block_raycast.cast_to = Vector2.RIGHT * velocity * delta + direction
    scenes/enemies/badguy.gd:128:                    velocity.x = (block_raycast.get_collision_point() - block_raycast.global_position - direction).x / delta
    scenes/enemies/badguy.gd:282:func check_water_below(delta):
    scenes/enemies/badguy.gd:285:    water_detector.cast_to.y = velocity.y * delta
    scenes/enemies/FlameOrb.gd:27:func _process(delta):
    scenes/enemies/FlameOrb.gd:28:    starting_angle += speed * delta
    scenes/enemies/StalactiteSM.gd:28:func _state_logic(delta):
    scenes/enemies/StalactiteSM.gd:31:            host.apply_gravity(delta)
    scenes/enemies/StalactiteSM.gd:32:            host.apply_movement(delta)
    scenes/enemies/StalactiteSM.gd:34:            host.apply_gravity(delta)
    scenes/enemies/StalactiteSM.gd:35:            host.apply_movement(delta)
    scenes/enemies/StalactiteSM.gd:37:func _get_transition(delta):
    scenes/objects/Powerup.gd:45:func _physics_process(delta):
    scenes/objects/Powerup.gd:46:    intangibility_timer -= delta
    scenes/objects/Powerup.gd:48:    apply_gravity(delta)
    scenes/objects/Powerup.gd:50:    apply_movement(delta, is_solid)
    scenes/objects/Powerup.gd:57:func apply_gravity(delta, grav_set = Global.gravity):
    scenes/objects/Powerup.gd:58:    velocity.y += grav_set * delta
    scenes/objects/Powerup.gd:60:func apply_movement(delta, solid):
    scenes/objects/Powerup.gd:66:    else: position += velocity * delta
    scenes/enemies/icedragon_sm.gd:30:func _state_logic(delta):
    scenes/enemies/icedragon_sm.gd:35:            host.apply_gravity(delta)
    scenes/enemies/icedragon_sm.gd:36:            host.apply_movement(delta, false)
    scenes/enemies/icedragon_sm.gd:42:    host.apply_gravity(delta)
    scenes/enemies/icedragon_sm.gd:43:    host.apply_movement(delta)
    scenes/enemies/icedragon_sm.gd:45:func _get_transition(delta):
    scenes/objects/Block.gd:100:func _process(delta):
    scenes/objects/Block.gd:101:    global_position += velocity * delta
    scenes/objects/Block.gd:103:    var lerp_speed = 0.1 * delta * 60
    scenes/enemies/icedragon.gd:41:func apply_movement(delta, solid = true):
    scenes/enemies/icedragon.gd:48:        position += velocity * delta
    scenes/enemies/icedragon.gd:50:func apply_gravity(delta, grav_set = Global.gravity):
    scenes/enemies/icedragon.gd:51:    velocity.y += grav_set * delta
    autoload/MobileControls.gd:106:func _physics_process(delta):
    autoload/Scoreboard.gd:56:func _process(delta):
    scenes/enemies/badguy_sm.gd:49:func _state_logic(delta):
    scenes/enemies/badguy_sm.gd:53:            host.flying_movement(delta)
    scenes/enemies/badguy_sm.gd:58:            host.apply_gravity(delta)
    scenes/enemies/badguy_sm.gd:63:            host.apply_gravity(delta)
    scenes/enemies/badguy_sm.gd:66:            host.check_water_below(delta)
    scenes/enemies/badguy_sm.gd:71:            host.apply_gravity(delta)
    scenes/enemies/badguy_sm.gd:82:            host.hit_blocks(delta)
    scenes/enemies/badguy_sm.gd:84:            host.apply_gravity(delta)
    scenes/enemies/badguy_sm.gd:85:            host.apply_movement(delta, false)
    scenes/enemies/badguy_sm.gd:91:    host.apply_gravity(delta)
    scenes/enemies/badguy_sm.gd:92:    host.apply_movement(delta)
    scenes/enemies/badguy_sm.gd:94:func _get_transition(delta):
    # Machine interface — Godot 3.5.2
    
    Run from `midterms/scarlettleon7/` with a **debug Godot 3.5.2 Standard** build.
    On macOS the commands are:
    
    ```sh
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://ai/run_episode.tscn
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_episode.tscn
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
    /Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
    ```
    
    Replace the executable path on other systems. Import `project.godot` in the
    editor first if resources have not been imported. `--no-window` on this macOS
    build still requires graphics/window-server access. Sandboxed launches may abort.
    The new test scene exits 0 on success, 1 on failure, with a 30-second watchdog.
    The original course Python commands are not applicable to this Godot project.
    
    The smoke scene runs eight WAIT actions with seed 7 and writes actual results to
    `traces/interface-smoke.jsonl` (overwriting that file). It is an interface smoke
    run, not a baseline, live-model evaluation, or level-completion demonstration.
    Normal F5 gameplay does not load any runner code; keyboard controls are unchanged.
    
    ## Trusted caller API
    
    Create `ai/EpisodeRunner.gd` as a child of a harness with
    `pause_mode = PAUSE_MODE_PROCESS`. Use a dedicated process, one runner, main thread.
    
    ```gdscript
    var runner = load("res://ai/EpisodeRunner.gd").new()
    add_child(runner)
    var observation = yield(runner.reset(7), "completed")
    var actions = runner.legal_actions("tux")
    var result = yield(runner.step("tux", "RIGHT_JUMP"), "completed")
    print(JSON.print(result))
    print(JSON.print(runner.outcome()))
    ```
    
    `reset(seed)` and `step(player_id, action)` **always return coroutines**, including
    errors. Await `completed`. Other methods return synchronously. Do not concurrently
    call operations; overlapping mutation requests return `busy`. Only `tux` is a
    player role. Other roles receive `unknown_player` / an empty action list. These
    strings are routing validation, not authentication.
    
    * `reset(int)`: reinstantiate the original world1/level1, clear checkpoint, coins,
      lives, deaths, player powerup and episode counters; seed Godot's RNG. The existing
      `start_level(true)` path skips title/pause UI, but instantiates the real objects
      and player, sets gravity and starts the original game clock. No settling steps
      are inserted: initial grounded is normally false. Episode settings force
      auto-run on, 60 physics ticks/second and time scale 1, independent of saved options.
    * `observe("tux")`: JSON-compatible position/velocity arrays, grounded flag, step
      and physics-frame counts, local terrain appearances and object categories.
      The role's viewport is 320 x 256 world pixels centered on Tux. It is independent
      of the human camera and has ordinary platformer visibility (no wall occlusion).
      Only tile/object centers inside this window are reported; invisible tiles and
      object-map markers are omitted. Blocks expose no contents; enemy categories
      expose no AI state. No seed, complete map, resource path, node reference,
      off-window goal/enemy coordinates, evaluator data, or repository tools are sent.
      This is a coarse visual sensor, not a full collision/semantic map.
    * `legal_actions("tux")`: always a fresh array of LEFT, RIGHT, JUMP, LEFT_JUMP,
      RIGHT_JUMP, WAIT, independent of hidden state. Jump actions remain legal in air.
    * `step("tux", action)`: case-sensitive string validation; invalid requests return
      an error, do not count as steps and advance zero physics ticks. Repeated invalid
      input is still bounded by the wall timeout. Valid actions advance six actual
      scene-tree physics ticks (0.1 simulation seconds); terminal events may stop early.
      `physics_frame` occurs before node processing: unpause at one boundary and pause
      at the seventh. This uses real Tux/state-machine/collision processing, never
      direct manual `_physics_process` calls. The world stays paused between decisions.
      Level and scoreboard timers use physics processing and respect pause. WAIT
      releases buttons but preserves inertia. Jump edges retain the input-layer rules.
      Returns `{observation, outcome}`; terminal requests return `terminal` without
      advancing. See `docs/ai-input-controls.md` for input details.
    * `outcome()`: `{status, reason, score}`. Status is `ongoing`, `victory`, `defeat`,
      or `episode_limit`; reasons are `playing`, `goal_reached`, `death`, `player_lost`,
      `step_limit`, `model_call_limit`, `wall_timeout`, or `not_reset`. Terminal state
      latches until reset. Score is current coin counter + 100 for victory. The upstream coin counter rolls over at 100. This is an
      evaluation score, not an upstream SuperTux scoring rule.
    
    Tux's actual `dead`, `win`, `win_inside_igloo` states determine outcomes, before
    respawn/victory animations progress. Goal posts already call `Tux.win()`. Detection
    runs at physics boundaries and while paused; the first observed game terminal
    state takes precedence over timeout/step exhaustion. No upstream scripts change.
    
    ## Episode budgets and isolation
    
    Defaults: 600 valid steps, 100 model-call attempts, 120,000 monotonic wall-clock
    milliseconds including reset and decision waiting. The trusted caller can lower
    budgets for tests. Before **every** future provider attempt, it must call
    `begin_model_call()`. A successful reservation increments immediately; failed,
    malformed and timed-out responses are never refunded. The last reserved attempt
    can submit an action. A further reservation ends with `model_call_limit` and
    returns false. Never retry outside this accounting. These hooks make no provider
    calls and spend no credits.
    
    The runner owns authoritative state and limits; observations are copied data.
    A future model must run outside Godot and receive only serialized observations
    and permitted action strings, with its response validated by `step`. Never pass
    this Node, Global, engine objects, filesystem tools, or evaluator tools to a model.
    The external transport is now documented in [EVALUATION.md](../EVALUATION.md). There is no OS sandbox for arbitrary controller code: an arbitrary
    in-process GDScript caller is trusted and can access Global. The external Python runner now enforces provider and engine process deadlines.
    
    The wall watchdog runs while the scene tree is paused and terminates an idle
    player or asynchronous provider wait. It cannot interrupt a blocked engine main
    thread, hung driver, synchronous network call, or engine crash. A future external
    supervisor must kill such a process and record an explicit infrastructure reason.
    Do not perform synchronous network calls on the Godot thread. Normal exit or
    forced process termination cannot promise an in-engine final message.
    
    ## Evidence and limits
    
    Tests check all action strings, invalid requests, roles, JSON, local boundaries,
    same-seed reset/action repeatability, an independent six-tick counter, pause
    between decisions, lifecycle terminal adaptation, scoring and each episode limit.
    Death/goal tests invoke the real lifecycle handlers from trusted fixtures; they
    do not demonstrate an agent reaching a goal or dying via a natural collision.
    Observation coverage is coarse; it does not provide pixel rendering, block
    contents, every hazard type's semantic label, or guaranteed replay determinism
    across operating systems/render timings. The game still uses visibility-enabled
    enemies and animation/idle processing. Longer replay determinism and full-level
    play are unverified. Human experience requires a separate playtest.
    
    Rule mapping and independent review: `docs/rule-source-map.md` and
    `docs/interface-review.md`. The external baseline and Vertex adapter are now implemented; see [evaluation](../EVALUATION.md). Actual live model results remain unavailable.
    ✓ • 0ms

## Activity

    $ nl -ba scenes/objects/Block.gd | sed -n '65,125p'; nl -ba autoload/Scoreboard.gd | sed -n '25,155p'; nl -ba scenes/master/Level.gd | sed -n '30,170p'; nl -ba controller/players.py | sed -n '39,48p'; rg -n 'visibility|screen_entered|screen_exited' scenes/enemies/badguy.gd scenes/enemies/badguy_sm.gd; nl -ba agent-config.json; ls -la .claude .agents AGENT-TEAM.md
        65
        66        if !hit:
        67            if contains_powerup:
        68                var small = is_body_small(body, true)
        69                _spawn_contents(body, small)
        70                _make_box_empty()
        71            else:
        72                if contains_coin:
        73                    _get_coin()
        74                elif type == "Brick":
        75                    var small = is_body_small(body, false)
        76                    if !small: _brick_smash()
        77                else: _make_box_empty()
        78
        79    func _get_coin():
        80        sfx.play("Coin")
        81        animation_player.play("coin")
        82        _make_box_empty()
        83        Scoreboard.coins += 1
        84
        85    func _make_box_empty():
        86        if invisible:
        87            invisible_shimmer_bodies = []
        88            invisible = false
        89            sprite.modulate.a = 1
        90            animation_player.play("default")
        91        sprite.play("Empty")
        92        hit = true
        93
        94    func _brick_smash():
        95        _disable_collision()
        96        sfx.play("Smash")
        97        destroy_timer.start()
        98        animation_player.play("smash")
        99
       100    func _process(delta):
       101        global_position += velocity * delta
       102        velocity *= 0.8
       103        var lerp_speed = 0.1 * delta * 60
       104        global_position.x = lerp(global_position.x, initial_position.x, lerp_speed)
       105        global_position.y = lerp(global_position.y, initial_position.y, lerp_speed)
       106
       107        if invisible:
       108            invisible_shimmer()
       109
       110    # Returns true if small tux hit this box
       111    func is_body_small(body, default = true):
       112        if body.is_in_group("players"):
       113            return body.state == body.states.SMALL
       114        else: return default
       115
       116    func _spawn_contents(body, small = true):
       117        sfx.play("Bonus")
       118        var facing = 1
       119        if body != null:
       120            facing = sign(global_position.x - body.global_position.x)
       121            if facing == 0: facing = 1
       122
       123        var pos = global_position - Vector2(0, Global.TILE_SIZE)
       124        var object_to_spawn = contents_small if small else contents_big
       125        var o = object_to_spawn.instance()
        25    export var initial_lives = 3
        26    export var initial_state = 0
        27    export var game_over_lives = 10 # How many lives we grant the player after getting a game over.
        28
        29    onready var coins = initial_coins setget _set_coin_count
        30    onready var lives : int = initial_lives setget _set_lives_count
        31    onready var player_initial_state = initial_state # What powerup state Tux has when spawning into the level.
        32
        33    onready var level_timer = $LEVELTIMER
        34    onready var hud_node = $Control
        35    onready var tween = $Tween
        36    onready var coins_text = $Control/CoinCounter/Coins
        37    onready var lives_counter = $Control/LifeCounter
        38    onready var lives_text = $Control/LifeCounter/Lives
        39    onready var timer_ui = $Control/ClockCounter
        40    onready var timer_text = $Control/ClockCounter/Timer
        41    onready var game_over_screen = $Control/GameOverScreen
        42    onready var sfx = $SFX
        43    onready var message_text_object = $Message
        44
        45    var number_of_deaths = 0
        46    var level_timer_enabled = false
        47    var tick_time = 999
        48    var message_text = "" setget update_message_text
        49
        50    var score_visible = true
        51
        52    func _ready():
        53        self.message_text = ""
        54        stop_level_timer()
        55
        56    func _process(delta):
        57        _draw()
        58
        59        if level_timer_enabled:
        60
        61            # If we have under 10 seconds remaining in the current level:
        62            if level_timer.time_left < 10:
        63                # Play a clock ticking noise every second
        64                var time_left = ceil(level_timer.time_left)
        65
        66                if time_left < tick_time:
        67
        68                    tick_time = time_left
        69
        70                    if time_left == 0:
        71                        sfx.play("TimeOver")
        72                    else:
        73                        sfx.play("Tick")
        74
        75    func _draw():
        76        if level_timer_enabled:
        77            var time_left = ceil(level_timer.time_left)
        78            timer_text.text = str(time_left)
        79
        80        coins_text.text = str(coins)
        81
        82        lives_text.text = str( max(lives, 0) )
        83
        84    func start_level_timer():
        85        level_timer.paused = false
        86
        87    func stop_level_timer():
        88        level_timer.paused = true
        89
        90    func enable_level_timer(time):
        91        tick_time = 999
        92        level_timer_enabled = true
        93        level_timer.paused = true
        94        level_timer.start(time)
        95        timer_ui.show()
        96
        97    func disable_level_timer():
        98        stop_level_timer()
        99        level_timer_enabled = false
       100        timer_ui.hide()
       101
       102    func set_level_timer(time):
       103        tick_time = 999
       104        level_timer_enabled = true
       105        level_timer.paused = false
       106        level_timer.start(time)
       107        timer_ui.show()
       108
       109    func _set_coin_count(new_value):
       110        coins = new_value
       111        if coins >= 100:
       112            coins = 0
       113            self.lives += 1
       114
       115    func _set_lives_count(new_value):
       116        if new_value > lives: sfx.play("1up")
       117        lives = clamp(new_value, -1, 99)
       118
       119    func hide():
       120        score_visible = false
       121        clear_message()
       122        hud_node.hide()
       123
       124    func show(include_lives_count = true):
       125        score_visible = true
       126        lives_counter.visible = include_lives_count
       127        hud_node.show()
       128
       129    func reset_player_values(game_over = false, reset_state = true):
       130        coins = initial_coins
       131        lives = game_over_lives if game_over else initial_lives
       132        if reset_state: player_initial_state = initial_state
       133
       134    func game_over():
       135        stop_level_timer()
       136
       137        # We need the music node to process so it can play the game over song
       138        # even while the world is paused.
       139        Music.pause_mode = PAUSE_MODE_PROCESS
       140
       141        # Pause the game so that wild shennanigans don't occur
       142        # while the game over screen is happening
       143        get_tree().paused = true
       144
       145        # Make the game over screen appear
       146        game_over_screen.appear()
       147        Music.play("GameOver")
       148
       149        # Wait five seconds
       150        yield(get_tree().create_timer(4.5), "timeout")
       151
       152        game_over_screen.hide_text()
       153
       154        # ============================================================
       155        # Move the lives counter to the center of the screen,
        30    export var is_worldmap = false
        31    export var level_title = ""
        32    export var level_author = ""
        33    export var music = "ChipDisko" setget _set_level_music
        34    export var particle_system = ""
        35    export var uses_timer = true
        36    export var time = 300
        37    export var gravity = 10
        38    export var autoscroll_speed = 0.0
        39    export var starting_powerup = 0
        40    export var spawn_position = Vector2()
        41    export var level_height = 15
        42
        43    # If the level uses custom music, this variable specifies
        44    # the time (in seconds) at which the custom music stream
        45    # starts after being looped.
        46    export var custom_music_loop_offset : float = 0.0
        47
        48    onready var objects = get_node("Objects").get_children() if has_node("Objects") else null
        49
        50    onready var custom_camera = get_node_or_null("Camera2D")
        51
        52    signal level_ready
        53    signal music_changed
        54
        55    # Called when the node enters the scene tree for the first time.
        56    func _ready():
        57        Global.current_level = self
        58        set_pause_mode(PAUSE_MODE_STOP)
        59
        60        # Only automatically start levels if the level is the root scene.
        61        # This is not the case when we are in the level editor, because
        62        # the level is a child of the LevelEditor scene.
        63        if self == Global.current_scene:
        64            start_level()
        65
        66    func activate_objectmaps():
        67        for node in Global.get_all_children(self):
        68            if node.is_in_group("objectmaps"):
        69                if node.has_method("tiles_to_objects"):
        70                    node.tiles_to_objects()
        71
        72    func start_level(in_editor = false):
        73        activate_objectmaps()
        74
        75        yield(get_tree(), "idle_frame")
        76
        77        #print(spawn_position)
        78
        79        ResolutionManager.connect("window_resized", self, "window_resized")
        80        Scoreboard.show(!in_editor)
        81        WorldmapManager.is_level_worldmap = is_worldmap
        82
        83        if is_worldmap:
        84            _spawn_worldmap_player(spawn_position)
        85        else: _spawn_player()
        86
        87        if !is_worldmap:
        88            _set_level_gravity()
        89        else:
        90            uses_timer = false
        91
        92        # Set the player's starting powerup
        93        if !in_editor and Scoreboard.player_initial_state < starting_powerup:
        94            Scoreboard.player_initial_state = starting_powerup
        95
        96        if uses_timer: Scoreboard.enable_level_timer(time)
        97        else: Scoreboard.disable_level_timer()
        98
        99        # Display the level title card and wait until it disappears
       100        if !is_worldmap and !in_editor: yield(_level_title_card(), "completed")
       101        else:
       102            Global.emit_signal("level_ready")
       103
       104        # Then we load the pause menu into the level so you can pause the game
       105        if !in_editor: _load_pause_menu(in_editor)
       106
       107        # If we're using a custom camera, make it override the player's camera
       108        # (You can use custom cameras by adding a Camera2D node into the level)
       109        if custom_camera != null:
       110            custom_camera.current = true
       111
       112        # If the level has a specified autoscroll speed, we make our own
       113        # custom camera node to override the player's
       114        elif autoscroll_speed != 0:
       115            create_autoscroll_camera()
       116            ResolutionManager.emit_signal("window_resized")
       117
       118        # If we're using the level timer, start the clock!
       119        if uses_timer:
       120            Scoreboard.set_level_timer(time)
       121
       122        # And play the level music!
       123        if music == "" or !music:
       124            Music.stop_all()
       125        else:
       126            play_music(in_editor)
       127
       128            if !in_editor: Music.set_editor_music(false)
       129
       130        emit_signal("level_ready")
       131
       132    func _process(delta):
       133        if is_autoscrolling:
       134            autoscroll(delta)
       135
       136    func _set_level_gravity():
       137        if gravity < 10 && gravity > 0:
       138
       139            # If gravity is lower than normal (under 10), we add
       140            # more gravity it the closer it is to 5 to more closely
       141            # imitate how Milestone 1's gravity behaviour
       142            var additional_gravity = (gravity / (10.0 - gravity)) + ((10.0 - gravity) / gravity)
       143            additional_gravity = (10 - additional_gravity)
       144            additional_gravity /= 10
       145
       146            gravity += additional_gravity
       147
       148        if gravity > 10:
       149            var additional_gravity = (gravity - 10) * 0.5
       150
       151            gravity += additional_gravity
       152
       153        Global.gravity = gravity / 10.0
       154
       155    func _level_title_card():
       156        # Stop the music
       157        Music.stop_all()
       158
       159        # Delete the player from the level
       160        # (we're going to display the title card, so we don't want Tux
       161        # to be able to move or die during this!)
       162        if Global.player == null:
       163            yield(Global, "player_loaded")
       164        Global.player.queue_free()
       165
       166        # Instantiate (spawn) the level title card
       167        var title = level_intro.instance()
       168        title.title = level_title
       169        title.author = level_author
       170        add_child(title)
        39    def validate_response(raw, legal):
        40        try:
        41            data = json.loads(raw)
        42            action = data['action']
        43            if set(data) == {'action'} and isinstance(action, str) and action in legal:
        44                return action
        45        except (ValueError, TypeError, KeyError):
        46            pass
        47        return None
        48
         1    {
         2      "provider": "vertex",
         3      "model": null,
         4      "project": null,
         5      "location": null,
         6      "input_usd_per_million": null,
         7      "output_usd_per_million": null,
         8      "situations": [
         9        {"name": "opening", "seed": 7, "prefix": []},
        10        {"name": "approach", "seed": 17, "prefix": ["RIGHT", "RIGHT", "RIGHT", "RIGHT", "RIGHT"]},
        11        {"name": "held-out-jump", "seed": 29, "held_out": true, "prefix": ["RIGHT", "RIGHT_JUMP", "RIGHT", "RIGHT", "RIGHT"]}
        12      ]
        13    }
    ls: .agents: No such file or directory
    ls: .claude: No such file or directory
    ls: AGENT-TEAM.md: No such file or directory
    ✗ (1) • 0ms

## Activity

    $ PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.test_controller.PlayerTests tests.test_controller.EpisodeRegressionTests.test_process_margin -v
    test_fallback_records_invalid (tests.test_controller.PlayerTests.test_fallback_records_invalid) ... ok
    test_gap_and_jump_release (tests.test_controller.PlayerTests.test_gap_and_jump_release) ... ok
    test_strict_actions (tests.test_controller.PlayerTests.test_strict_actions) ... ok
    test_timeout_fallback (tests.test_controller.PlayerTests.test_timeout_fallback) ... ok
    test_process_margin (tests.test_controller.EpisodeRegressionTests.test_process_margin) ... ok
    
    ----------------------------------------------------------------------
    Ran 5 tests in 0.032s
    
    OK
    ✓ • 533ms

## Activity

    $ PYTHONDONTWRITEBYTECODE=1 python3 - <<'PY'
        import json
        from pathlib import Path
        p=Path('traces/evaluation-02')
        reports=json.loads((p/'report.json').read_text())
        for r in reports:
         f=p/Path(r['trace']).name
         rows=[json.loads(x) for x in f.read_text().splitlines()]
         decisions=[x for x in rows if x['event']=='decision']
         steps=[x for x in rows if x['event']=='step']
         setup=[x for x in rows if x['event']=='setup']
         assert rows[-1]['event']=='summary'
         assert {k:v for k,v in rows[-1].items() if k!='event'}==r
         assert len(decisions)==r['steps']==len(steps)
         assert len(setup)==r['setup_steps']
         assert sum('raw_response' in x for x in decisions)==r['model_calls']
         print(f.name, r['status'], r['terminal_reason'], 'score',r['score'],'steps',len(steps),'calls',r['model_calls'])
        print('episodes',len(reports),'calls',sum(r['model_calls'] for r in reports),'tokens',sum(r['tokens'] for r in reports))
        print('report fields:', sorted(reports[0]))
        PY
        nl -ba scenes/objects/EndGoalPosts.gd | tail -45; nl -ba scenes/objects/EndGoalIgloo.gd | tail -35; rg -n 'func die|func win|create_timer|queue_free|set_state' scenes/player/Tux.gd; rg -n 'process_mode|pause_mode|current|smoothing' scenes/player/Tux.tscn scenes/objects/Block.tscn; rg -n 'Visibility|screen|visible' scenes/enemies/badguy_sm.gd scenes/enemies/badguy.gd; nl -ba scenes/enemies/badguy_sm.gd | sed -n '30,60p'; rg -n 'Camera|camera|screen' scenes/enemies/*.gd
    zsh:1: can't create temp file for here document: operation not permitted
         1    #  SuperTux - A 2D, Open-Source Platformer Game licensed under GPL-3.0-or-later
         2    #  Copyright (C) 2022 Alexander Small <alexsmudgy20@gmail.com>
         3    #
         4    #  This program is free software; you can redistribute it and/or
         5    #  modify it under the terms of the GNU General Public License
         6    #  as published by the Free Software Foundation; either version 3
         7    #  of the License, or (at your option) any later version.
         8    #
         9    #  This program is distributed in the hope that it will be useful,
        10    #  but WITHOUT ANY WARRANTY; without even the implied warranty of
        11    #  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        12    #  GNU General Public License for more details.
        13    #
        14    #  You should have received a copy of the GNU General Public License
        15    #  along with this program.  If not, see <http://www.gnu.org/licenses/>.
        16
        17
        18    extends Node2D
        19
        20    onready var raycast = $RayCast2D
        21    onready var hitbox = $Node2D/Area2D/CollisionShape2D
        22
        23    func _on_Area2D_body_entered(body):
        24        if body.is_in_group("players"):
        25            body.win()
        26
        27    func _ready():
        28        raycast.force_raycast_update()
        29        if raycast.is_colliding():
        30            # Make the hitbox shape unique since we're about to modify it
        31            hitbox.shape = hitbox.shape.duplicate(true)
        32
        33            # Use the raycast to get the position of the roof above us
        34            var roof = raycast.get_collision_point() - raycast.global_position
        35
        36            # Make the hitbox of the goal post not exceed this roof
        37            var hitbox_size = Vector2(16, round(abs(roof.y * 0.5) + 8))
        38            #print(hitbox_size)
        39
        40            # Change the hitbox size to this new size (have to do it using this method or else)
        41            hitbox.shape.set_deferred("extents", hitbox_size)
        42            hitbox.position.y = 96 - abs(hitbox_size.y)
         1    #  SuperTux - A 2D, Open-Source Platformer Game licensed under GPL-3.0-or-later
         2    #  Copyright (C) 2022 Alexander Small <alexsmudgy20@gmail.com>
         3    #
         4    #  This program is free software; you can redistribute it and/or
         5    #  modify it under the terms of the GNU General Public License
         6    #  as published by the Free Software Foundation; either version 3
         7    #  of the License, or (at your option) any later version.
         8    #
         9    #  This program is distributed in the hope that it will be useful,
        10    #  but WITHOUT ANY WARRANTY; without even the implied warranty of
        11    #  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        12    #  GNU General Public License for more details.
        13    #
        14    #  You should have received a copy of the GNU General Public License
        15    #  along with this program.  If not, see <http://www.gnu.org/licenses/>.
        16
        17
        18    extends Node2D
        19
        20    func _on_Area2D_body_entered(body):
        21        if body.is_in_group("players"):
        22            if body.state_machine.state == "win":
        23                body.state_machine.set_state("win_inside_igloo")
    339:    if state_machine.state != "duck": state_machine.set_state("jump")
    447:func die():
    465:    state_machine.set_state("dead")
    575:func win():
    592:    state_machine.set_state("win")
    603:func win_loop(jump_over_walls = true):
    rg: scenes/objects/Block.tscn: No such file or directory (os error 2)
    scenes/player/Tux.tscn:324:current = true
    scenes/player/Tux.tscn:328:smoothing_speed = 25.0
    scenes/player/Tux.tscn:432:process_mode = 0
    scenes/player/Tux.tscn:437:process_mode = 0
    scenes/player/Tux.tscn:442:process_mode = 0
    scenes/player/Tux.tscn:447:process_mode = 0
    scenes/player/Tux.tscn:452:process_mode = 0
    scenes/enemies/badguy.gd:198:    if explosion_sprite: explosion_sprite.visible = true
        30        add_state("bounce_up")
        31        add_state("bounce_forward")
        32        add_state("fly")
        33        add_state("fall")
        34        add_state("water_submerged")
        35
        36        # What initial state to use for the enemy depends on its type
        37        match host.type:
        38            "Fish":
        39                call_deferred("set_state", "fall")
        40            "Jumpy": # Jumpy goes to a bouncing state
        41                call_deferred("set_state", "bounce_up")
        42            "Bouncing": # Bouncing snowball bounces forwards
        43                call_deferred("set_state", "bounce_forward")
        44            "Flying": # Bouncing snowball bounces forwards
        45                call_deferred("set_state", "fly")
        46            _: # All other walking enemies use the default walking state
        47                call_deferred("set_state", "walk")
        48
        49    func _state_logic(delta):
        50        match state:
        51            "water_submerged": return
        52            "fly":
        53                host.flying_movement(delta)
        54                host.jumpy_movement()
        55                return
        56            "bounce_up":
        57                host.jumpy_bounce()
        58                host.apply_gravity(delta)
        59                host.jumpy_movement()
        60                host.update_sprite()
    scenes/enemies/badguy.gd:191:    Global.camera_shake(10, 0.95)
    ✓ • 0ms

## Activity

    $ PYTHONDONTWRITEBYTECODE=1 python3 -c 'import json; from pathlib import Path; p=Path("traces/evaluation-02"); reports=json.loads((p/"report.json").read_text());
        for r in reports:
         rows=[json.loads(x) for x in (p/Path(r["trace"]).name).read_text().splitlines()]; ds=[x for x in rows if x["event"]=="decision"]; ss=[x for x in rows if x["event"]=="step"]; setup=[x for x in rows if x["event"]=="setup"]; assert {k:v for k,v in rows[-1].items() if k!="event"}==r; assert len(ds)==r["steps"]==len(ss); assert len(setup)==r["setup_steps"]; assert sum("raw_response" in x for x in ds)==r["model_calls"]; print(Path(r["trace"]).name, r["status"],r["terminal_reason"],r["score"],len(ss),r["model_calls"])
        print("episodes",len(reports),"calls",sum(r["model_calls"] for r in reports),"tokens",sum(r["tokens"] for r in reports)); print("fields",sorted(reports[0]))'
    opening-baseline-1.jsonl defeat death 0 36 0
    opening-model-1.jsonl defeat death 10 79 79
    opening-model-2.jsonl defeat death 0 19 19
    approach-baseline-1.jsonl defeat death 0 31 0
    approach-model-1.jsonl defeat death 5 74 74
    approach-model-2.jsonl defeat death 3 28 28
    held-out-jump-baseline-1.jsonl defeat death 0 31 0
    held-out-jump-model-1.jsonl defeat death 13 64 64
    held-out-jump-model-2.jsonl defeat death 0 14 14
    episodes 9 calls 278 tokens 156586
    fields ['elapsed_seconds', 'estimated_api_cost_usd', 'fallback_actions', 'invalid_actions', 'last_outcome', 'latency_seconds', 'measurements_complete', 'model', 'model_calls', 'player', 'score', 'setup_steps', 'situation', 'status', 'steps', 'terminal_reason', 'tokens', 'trace', 'trace_complete', 'trial', 'valid_actions', 'win']
    ✓ • 0ms

## Activity

    $ nl -ba scenes/player/Tux.gd | sed -n '440,475p'; nl -ba scenes/player/Tux.gd | sed -n '570,605p'; nl -ba scenes/objects/Block.gd | sed -n '18,66p'; rg -n 'VisibilityEnabler|process_parent|physics_process_parent' scenes/enemies/*.tscn | head -24; nl -ba tests/test_episode.gd | sed -n '45,105p'
       440                return
       441            if state == states.SMALL:
       442                die()
       443            else: # Get hurt
       444                self.state -= 1
       445                set_invincible()
       446
       447    func die():
       448        if !can_die: return
       449
       450        Scoreboard.number_of_deaths += 1
       451        Scoreboard.lives -= 1
       452        Scoreboard.player_initial_state = states.SMALL
       453        Scoreboard.stop_level_timer()
       454
       455        sfx.play("Hurt")
       456        self.invincible = false
       457        self.state = states.SMALL
       458        if grabbed_object != null: release_grabbed_object()
       459        velocity = Vector2.ZERO
       460        velocity.y = run_jump_height
       461        # Disable all Tux's collision so nothing interferes with his death state
       462        toggle_nodes(small_nodes, false, true)
       463        toggle_nodes(big_nodes, false, true)
       464        z_index = 999 # Go to the front of the screen
       465        state_machine.set_state("dead")
       466        Global.can_pause = false
       467
       468    func set_invincible():
       469        if state_machine.state == "dead": return
       470        invincible_type = invincible_types.DAMAGED
       471        invincible_timer.start(damage_safe_time)
       472        invincible = true
       473
       474    func _on_InvincibleTimer_timeout():
       475        invincible = false
       570            if Scoreboard.lives == -1 and !Global.is_in_editor:
       571                Scoreboard.game_over()
       572            else:
       573                Global.respawn_player()
       574
       575    func win():
       576        # Save Tux's state so it loads in on the next level
       577        Scoreboard.player_initial_state = state
       578
       579        # Give Tux invincibility
       580        invincible_timer.stop()
       581        invincible_type = invincible_types.STAR
       582        invincible = true
       583        can_die = false
       584
       585        # Make Tux face to the right (or else he'd moonwalk)
       586        velocity.y *= 0.5
       587        facing = 1
       588
       589        # Release any grabbed objects
       590        if grabbed_object != null: release_grabbed_object()
       591
       592        state_machine.set_state("win")
       593        Music.play("LevelDone")
       594        Scoreboard.stop_level_timer()
       595        Scoreboard.hide()
       596        Global.can_pause = false
       597
       598        # Once this timer depletes, load in the next level
       599        win_timer.start()
       600
       601        #camera.smooth_zoom(0.5, 1)
       602
       603    func win_loop(jump_over_walls = true):
       604        if jump_over_walls and grounded and is_on_wall():
       605            self.grounded = false
        18    #  along with this program.  If not, see <http://www.gnu.org/licenses/>.
        19
        20
        21    extends StaticBody2D
        22
        23    export var type = ""
        24    export var invisible = false
        25    export var initial_animation = "default"
        26    export var contains_powerup = false
        27    export var contains_coin = false
        28    export (PackedScene) var contents_small
        29    export (PackedScene) var contents_big
        30    onready var animation_player = $AnimationPlayer
        31    onready var sprite = $AnimatedSprite
        32    onready var sfx = $SFX
        33    onready var collision_shapes = [$Hitbox, $AboveHitbox, $CollisionShape2D]
        34    onready var above_hitbox = $AboveHitbox
        35    onready var destroy_timer = $DestroyTimer
        36
        37    onready var invisible_max_distance = $InvisibleShimmer/CollisionShape2D.shape.radius
        38
        39    onready var initial_position = global_position
        40
        41    var velocity = Vector2()
        42    var hit = false
        43
        44    var invisible_shimmer_bodies = []
        45
        46    func _ready():
        47        if invisible: animation_player.play("invisible")
        48        sprite.play(initial_animation)
        49
        50    func be_hit_from_above(body):
        51        if body.is_in_group("players"):
        52            var vel_x = 0 #body.velocity.x * 0.25
        53            var vel_y = -6 * Global.TILE_SIZE
        54            _get_hit(body, vel_x, vel_y)
        55
        56    func be_hit_from_side(vel, body):
        57        var vel_x = vel.x * 0.5 if hit else 0
        58        var vel_y = 0
        59        _get_hit(body, vel_x, vel_y)
        60
        61    func _get_hit(body, vel_x = 0, vel_y = 0):
        62        velocity = Vector2(vel_x, vel_y)
        63        sfx.play("Brick")
        64        if !hit: _kill_enemies()
        65
        66        if !hit:
    scenes/enemies/Spiky.tscn:64:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Spiky.tscn:66:process_parent = true
    scenes/enemies/Spiky.tscn:67:physics_process_parent = true
    scenes/enemies/Bomb.tscn:100:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Bomb.tscn:103:process_parent = true
    scenes/enemies/Bomb.tscn:104:physics_process_parent = true
    scenes/enemies/Snowball.tscn:79:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Snowball.tscn:82:process_parent = true
    scenes/enemies/Snowball.tscn:83:physics_process_parent = true
    scenes/enemies/Smartblock.tscn:118:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Smartblock.tscn:120:process_parent = true
    scenes/enemies/Smartblock.tscn:121:physics_process_parent = true
    scenes/enemies/Jumpy.tscn:61:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Jumpy.tscn:64:process_parent = true
    scenes/enemies/Jumpy.tscn:65:physics_process_parent = true
    scenes/enemies/Smartball.tscn:79:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Smartball.tscn:82:process_parent = true
    scenes/enemies/Smartball.tscn:83:physics_process_parent = true
    scenes/enemies/Iceblock.tscn:116:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/Iceblock.tscn:118:process_parent = true
    scenes/enemies/Iceblock.tscn:119:physics_process_parent = true
    scenes/enemies/FlameOrb.tscn:82:[node name="VisibilityEnabler2D" type="VisibilityEnabler2D" parent="."]
    scenes/enemies/FlameOrb.tscn:85:process_parent = true
    scenes/enemies/FlameOrb.tscn:86:physics_process_parent = true
        45        check(JSON.print(runner.observe("tux")) == JSON.print(held), "world frozen between steps")
        46        var bounded = true
        47        for tile in held.terrain:
        48            bounded = bounded and abs(tile.position[0] - held.player.position[0]) <= 160 and abs(tile.position[1] - held.player.position[1]) <= 128
        49        for object in held.objects:
        50            bounded = bounded and abs(object.position[0] - held.player.position[0]) <= 160 and abs(object.position[1] - held.player.position[1]) <= 128
        51        check(bounded, "terrain and objects inside view")
        52        var again = yield(runner.reset(7), "completed")
        53        check(JSON.print(again) == JSON.print(first), "same seed resets observation and counters")
        54        yield(runner.step("tux", "RIGHT"), "completed")
        55        check(JSON.print(runner.observe("tux")) == JSON.print(held), "same seed and action repeat physics")
        56        var invisible = load("res://scenes/objects/BonusInvisible.tscn").instance()
        57        runner.level.add_child(invisible)
        58        invisible.global_position = Global.player.global_position + Vector2(32, -32)
        59        var hidden_pos = [invisible.global_position.x, invisible.global_position.y]
        60        var leaked = false
        61        for object in runner.observe("tux").objects:
        62            if object.position == hidden_pos:
        63                leaked = true
        64        check(!leaked, "actual invisible bonus block omitted")
        65        # Trusted test fixtures invoke real game lifecycle methods, never player API.
        66        Global.player.die()
        67        check(runner.outcome().status == "defeat", "real death detected before respawn")
        68        yield(runner.reset(7), "completed")
        69        var goal = load("res://scenes/objects/EndGoalPosts.tscn").instance()
        70        runner.level.add_child(goal)
        71        goal._on_Area2D_body_entered(Global.player)
        72        check(runner.outcome().status == "victory" and runner.outcome().score == 100, "existing goal handler triggers victory and score")
        73        yield(runner.reset(7), "completed")
        74        for action in runner.legal_actions("tux"):
        75            var valid = yield(runner.step("tux", action), "completed")
        76            check(valid.has("observation"), "valid action: " + action)
        77        var bad_type = yield(runner.step("tux", 42), "completed")
        78        check(bad_type.error == "invalid_action", "non-string action rejected")
        79        yield(runner.reset(7), "completed")
        80        runner.max_steps = 1
        81        yield(runner.step("tux", "WAIT"), "completed")
        82        check(runner.outcome().reason == "step_limit", "step limit")
        83        var frozen = runner.frames
        84        yield(runner.step("tux", "RIGHT"), "completed")
        85        check(runner.frames == frozen, "terminal step cannot advance")
        86        yield(runner.reset(7), "completed")
        87        runner.max_model_calls = 1
        88        check(runner.begin_model_call(), "reserve model call before attempt")
        89        # A failed attempt is deliberately not refunded.
        90        check(!runner.begin_model_call() and runner.outcome().reason == "model_call_limit", "failed calls consume budget")
        91        yield(runner.reset(7), "completed")
        92        runner.timeout_ms = 1
        93        yield(get_tree().create_timer(0.02), "timeout")
        94        check(runner.outcome().reason == "wall_timeout", "timeout while waiting for player")
        95        runner.timeout_ms = 120000
        96        yield(runner.reset(7), "completed")
        97        Global.player.free()
        98        check(runner.outcome().reason == "player_lost", "missing player terminates safely")
        99        runner.timeout_ms = 0
       100        var startup = yield(runner.reset(7), "completed")
       101        check(startup.get("error") == "startup_timeout" and startup.outcome.reason == "wall_timeout", "startup timeout returns explicit terminal reason")
       102        runner.timeout_ms = 120000
       103        var recovered = yield(runner.reset(7), "completed")
       104        check(recovered.has("player") and runner.outcome().status == "ongoing", "reset recovers after startup timeout")
       105        print("Episode interface: ", failures, " failures")
    ✓ • 0ms

## Assistant

The nine saved traces agree with their report summaries, executed-step counts, setup counts, and model-call counts. They record nine defeats, 278 model calls, and 156,586 tokens. Five tests that can run without writing files passed. I did not run the tests that create temporary files or launch Godot, to respect the read-only scope.

## Assistant

The implementation has a clear separation between the model and authoritative game state. I found **no verified critical vulnerability, hidden-state leak to the model, or terminal-outcome misclassification** in the reviewed paths. The main findings concern reproducibility, CI coverage, and submission evidence.

This was an independent, read-only review. I changed no files and made no live provider calls. “Verified” below means established from source or saved artifacts; it does not imply reproduction in Godot.

1. **Medium — Saved evaluations omit effective runtime configuration. Verified.**  
   [controller/run.py:144](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/controller/run.py:144) records the model and situation but omits endpoint location, effective episode/request limits, engine version, and source revision. Environment overrides are resolved at [line 234](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/controller/run.py:234), while [agent-config.json:3](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/agent-config.json:3) leaves model and location unset. Consequently, the artifacts cannot establish the exact execution configuration or endpoint-specific cost. EVALUATION.md correctly acknowledges the missing location.  
   **Suggested disposition:** Record effective nonsecret settings and engine/source identifiers in future run manifests; preserve existing evidence unchanged.

2. **Medium — CI omits the actual Python-to-Godot transport test. Verified.**  
   [tests/test_controller.py:113](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/tests/test_controller.py:113) requires an opt-in environment variable and hardcodes a macOS Godot path. The [workflow:29](/Users/scarlettleon/game-dev-f26/.github/workflows/midterm-scarlettleon7.yml:29) runs Python tests without that opt-in, then executes direct Godot suites at [line 55](/Users/scarlettleon/game-dev-f26/.github/workflows/midterm-scarlettleon7.yml:55). Those suites do not exercise TCP framing, Python process startup/cleanup, or `external.gd` dispatch. CI could therefore pass despite a broken controller connection.  
   **Suggested disposition:** Make the integration executable configurable and include the protocol test in Linux CI.

3. **Medium — Six physics ticks do not establish deterministic whole-game replay. Verified limitation; effect on recorded outcomes unverified.**  
   [ai/EpisodeRunner.gd:112](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/ai/EpisodeRunner.gd:112) bounds physics ticks, but upstream block movement and damping still run in render processing: [scenes/objects/Block.gd:100](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/scenes/objects/Block.gd:100). Converting timers to physics processing does not address that behavior. The repeatability test compares only reset and one RIGHT action at [tests/test_episode.gd:52](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/tests/test_episode.gd:52). It cannot establish replay stability after block interactions or across rendering schedules.  
   **Suggested disposition:** Retain the documented limitation and add longer repeated-action replay evidence before claiming broader determinism.

4. **Medium — Natural victory and terminal-boundary coverage remain incomplete. Verified test gap; no demonstrated terminal bug.**  
   Death and victory tests invoke lifecycle handlers directly at [tests/test_episode.gd:65](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/tests/test_episode.gd:65). They establish handler adaptation, but do not test natural goal collision during `step`, early termination within six ticks, or victory/death coinciding with the last allowed step or wall deadline. The supplied completed evaluations all end in death, so they provide no natural-victory evidence.  
   **Suggested disposition:** Add deterministic engine fixtures covering those boundaries and verify that terminal results remain latched.

5. **Medium — Development-role and reusable-skill evidence is missing locally. Verified absence; grading consequence conditional.**  
   [README.md:73](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/README.md:73) promises `AGENT-TEAM.md`, but that file is absent. The local `.claude` and `.agents` directories are also absent; [EVALUATION.md:213](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/EVALUATION.md:213) acknowledges missing reusable-skill evidence. The runtime player configuration does not establish executable development-role configurations or their actual use.  
   **Suggested disposition:** Document real roles, sessions, decisions, and finding dispositions. Confirm exact midterm requirements against the syllabus/rubric; I did not inspect unrelated course folders or external Asana state.

6. **Low — Worker termination may leave token-acquisition subprocesses running temporarily. Unverified concern.**  
   [controller/run.py:132](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/controller/run.py:132) terminates the provider worker, while [controller/players.py:80](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/controller/players.py:80) launches `gcloud` as its child. The cleanup does not explicitly terminate descendants. If the outer deadline expires during authentication, `gcloud` may outlive the worker. This does not demonstrate extra model calls or credential disclosure.  
   **Suggested disposition:** Test timeout cleanup using a harmless subprocess double, without cloud access.

7. **Low — CI downloads executable tooling without an integrity check. Verified hardening gap.**  
   The [workflow:35](/Users/scarlettleon/game-dev-f26/.github/workflows/midterm-scarlettleon7.yml:35) downloads a versioned Godot archive over HTTPS but verifies no checksum; checkout/setup actions also use version tags rather than immutable commits. There is no evidence of compromise.  
   **Suggested disposition:** Pin action revisions and verify the downloaded archive against a trusted digest.

Additional submission concerns remain **unverified**: human playtesting, accessible build/recording links, complete media-license verification, and Asana/gate evidence. [EVALUATION.md:215](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/EVALUATION.md:215) already identifies these gaps. Their absence from this review’s evidence should not be represented as proof that the activities never occurred.

The model request at [controller/players.py:87](/Users/scarlettleon/game-dev-f26/midterms/scarlettleon7/controller/players.py:87) contains instructions, observations, and permitted actions. I found no repository tools, seed, setup prefix, or evaluator results passed to it. Local observation bounds and invisible-block filtering are present. The unauthenticated loopback transport is explicitly documented for a trusted local controller; it should retain that deployment scope.

Validation performed: five non-writing Python tests passed. I cross-checked all nine `evaluation-02` trace summaries against `report.json`, including setup, executed-step, and model-call counts. The artifacts record three baseline defeats and six model defeats, totaling 278 calls and 156,586 reported tokens. This verifies artifact consistency, not independent provider provenance. I did not rerun Godot, temporary-file tests, GitHub Actions, or live evaluations.

Text you can use in `AGENT-TEAM.md`:

> An independent read-only review inspected the bounded Godot interface, external transport, Python players/controller, tests, configuration, evaluation documentation, saved evaluation artifacts, and CI workflow. No files were changed and no live provider calls were made. Five non-writing Python tests passed, and all nine completed evaluation traces matched their report summaries and action counts. No critical defect or model-facing hidden-state leak was verified. Findings concern missing runtime metadata, omitted CI protocol coverage, limited replay/terminal-boundary testing, and missing development-role/skill evidence. Provider subprocess cleanup remains an unverified concern. Finding dispositions and any fixes must be documented separately; this review does not approve a course gate.

Retain this conversation’s actual session reference alongside that summary; none was available to insert here.
