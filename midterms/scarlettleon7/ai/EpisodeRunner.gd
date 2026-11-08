extends Node
# Trusted, opt-in controller. Never pass this Node to an untrusted player.
const LEVEL = "res://scenes/levels/world1/level1.tscn"
const ACTIONS = ["LEFT", "RIGHT", "JUMP", "LEFT_JUMP", "RIGHT_JUMP", "WAIT"]
const FRAMES_PER_ACTION = 6
const PLAYER_ID = "tux"
var max_steps = 600
var max_model_calls = 100
var timeout_ms = 120000
var steps = 0
var frames = 0
var model_calls = 0
var level = null
var _player = null
var _busy = false
var _active = false
var _level_ready = false
var _started_ms = 0
var _terminal = {"status": "episode_limit", "reason": "not_reset", "score": 0}
var _old_auto_run = true
var _old_scoreboard_pause = 0
var _old_physics_fps = 60
var _old_time_scale = 1.0

func _ready():
	pause_mode = PAUSE_MODE_PROCESS
	_old_auto_run = Global.auto_run
	_old_scoreboard_pause = Scoreboard.pause_mode
	_old_physics_fps = Engine.iterations_per_second
	_old_time_scale = Engine.time_scale

func reset(episode_seed):
	# Always asynchronous, including rejected requests.
	yield(get_tree(), "idle_frame")
	if _busy:
		return {"error": "busy"}
	if typeof(episode_seed) != TYPE_INT:
		return {"error": "invalid_seed"}
	_busy = true
	_active = false
	get_tree().paused = true
	if is_instance_valid(level):
		level.free()
	Global.player = null
	Global.current_level = null
	Global.spawn_position = null
	Global.fireballs_on_screen = 0
	Global.can_pause = false
	Global.auto_run = true
	Scoreboard.reset_player_values()
	Scoreboard.number_of_deaths = 0
	Scoreboard.pause_mode = PAUSE_MODE_STOP
	Engine.iterations_per_second = 60
	Engine.time_scale = 1.0
	seed(episode_seed)
	steps = 0
	frames = 0
	model_calls = 0
	_started_ms = OS.get_ticks_msec()
	_terminal = {"status": "ongoing", "reason": "playing", "score": 0}
	level = load(LEVEL).instance()
	# Keep current_scene as this harness: prevents automatic scene replacement.
	Global.current_scene = self
	Global.current_level_path = LEVEL
	add_child(level)
	# Existing editor startup bypasses title/pause UI but uses real objects,
	# player, collisions, gravity and level clock. No engine rules are replaced.
	_level_ready = false
	level.connect("level_ready", self, "_on_level_ready")
	level.start_level(true)
	while !_level_ready:
		if OS.get_ticks_msec() - _started_ms >= timeout_ms:
			_end("episode_limit", "wall_timeout")
			_busy = false
			return {"error": "startup_timeout", "outcome": outcome()}
		yield(get_tree(), "idle_frame")
	_player = Global.player
	_player.set_ai_control_enabled(true)
	_player.set_ai_action("WAIT")
	for node in Global.get_all_children(level):
		if node is Timer:
			node.process_mode = Timer.TIMER_PROCESS_PHYSICS
	Scoreboard.level_timer.process_mode = Timer.TIMER_PROCESS_PHYSICS
	_active = true
	_busy = false
	get_tree().paused = true
	return observe(PLAYER_ID)

func _on_level_ready():
	_level_ready = true

func legal_actions(player_id):
	if player_id != PLAYER_ID:
		return []
	return ACTIONS.duplicate()

func step(player_id, action):
	yield(get_tree(), "idle_frame")
	if _busy:
		return {"error": "busy"}
	if player_id != PLAYER_ID:
		return {"error": "unknown_player"}
	if typeof(action) != TYPE_STRING or !ACTIONS.has(action):
		return {"error": "invalid_action"}
	if outcome().status != "ongoing":
		return {"error": "terminal", "outcome": outcome()}
	_busy = true
	steps += 1
	_player.set_ai_action(action)
	# physics_frame fires BEFORE node physics processing. Start at one boundary
	# and stop at the seventh, so exactly six node ticks run (unless terminal).
	yield(get_tree(), "physics_frame")
	for _i in range(FRAMES_PER_ACTION):
		if outcome().status != "ongoing":
			break
		get_tree().paused = false
		yield(get_tree(), "physics_frame")
		frames += 1
		get_tree().paused = true
		_detect_game_end()
	if is_instance_valid(_player):
		_player.set_ai_action("WAIT")
	_busy = false
	if _terminal.status == "ongoing" and steps >= max_steps:
		_end("episode_limit", "step_limit")
	return {"observation": observe(PLAYER_ID), "outcome": outcome()}

# Call BEFORE dispatch to provider. Failures/timeouts are never refunded.
# The final reserved call may submit an action; the next reservation terminates.
func begin_model_call():
	if _busy or outcome().status != "ongoing":
		return false
	if model_calls >= max_model_calls:
		_end("episode_limit", "model_call_limit")
		return false
	model_calls += 1
	return true

func _process(_delta):
	if _active:
		outcome()
		if !_busy or _terminal.status != "ongoing":
			get_tree().paused = true

func _detect_game_end():
	if !_active or _terminal.status != "ongoing":
		return
	if !is_instance_valid(_player) or Global.player != _player:
		_end("defeat", "player_lost")
		return
	var state = _player.state_machine.state
	if state == "dead":
		_end("defeat", "death")
	elif state == "win" or state == "win_inside_igloo":
		_end("victory", "goal_reached")

func outcome():
	_detect_game_end()
	if _active and _terminal.status == "ongoing" and OS.get_ticks_msec() - _started_ms >= timeout_ms:
		_end("episode_limit", "wall_timeout")
	var result = _terminal.duplicate(true)
	if result.status == "ongoing":
		result.score = Scoreboard.coins - Scoreboard.initial_coins
	return result

func _end(status, reason):
	if _terminal.status != "ongoing":
		return
	_terminal = {"status": status, "reason": reason,
		"score": Scoreboard.coins - Scoreboard.initial_coins + (100 if status == "victory" else 0)}
	get_tree().paused = true

func observe(player_id):
	if player_id != PLAYER_ID:
		return {"error": "unknown_player"}
	if !_active or !is_instance_valid(_player):
		return {"error": "not_ready"}
	var p = _player.global_position
	# Fixed player-centered observation viewport, independent of camera smoothing.
	var view = Rect2(p - Vector2(160, 128), Vector2(320, 256))
	var terrain = []
	var objects = []
	for node in Global.get_all_children(level):
		if node is TileMap and !node.is_in_group("objectmaps") and node.is_visible_in_tree():
			# Query only the local grid, never export full maps or collision data.
			var lo = node.world_to_map(node.to_local(view.position))
			var hi = node.world_to_map(node.to_local(view.end))
			for y in range(int(lo.y), int(hi.y) + 1):
				for x in range(int(lo.x), int(hi.x) + 1):
					var id = node.get_cell(x, y)
					if id < 0:
						continue
					var tile_name = node.tile_set.tile_get_name(id)
					if tile_name.begins_with("Invisible"):
						continue
					var pos = node.to_global(node.map_to_world(Vector2(x, y)) + node.cell_size / 2)
					if view.has_point(pos):
						terrain.append({"position": _xy(pos), "appearance": tile_name})
		elif node is Node2D and node != _player and node.is_visible_in_tree() and view.has_point(node.global_position):
			var kind = ""
			if node.is_in_group("enemies"):
				kind = "hazard"
			elif node.is_in_group("blocks"):
				if "invisible" in node and node.invisible:
					continue
				kind = "block"
			elif node.is_in_group("coins"):
				kind = "coin"
			elif node.filename in ["res://scenes/objects/EndGoalPosts.tscn", "res://scenes/objects/EndGoalIgloo.tscn"]:
				kind = "goal"
			if kind != "":
				objects.append({"kind": kind, "position": _xy(node.global_position)})
	return {"player_id": PLAYER_ID, "player": {"position": _xy(p),
		"velocity": _xy(_player.velocity), "grounded": _player.grounded},
		"view": {"position": _xy(view.position), "size": _xy(view.size)},
		"terrain": terrain, "objects": objects, "steps": steps, "physics_frames": frames}

func _xy(v):
	return [v.x, v.y]

func _exit_tree():
	Global.auto_run = _old_auto_run
	Scoreboard.pause_mode = _old_scoreboard_pause
	Engine.iterations_per_second = _old_physics_fps
	Engine.time_scale = _old_time_scale
	# Dedicated episode process exits after use; do not unpause during teardown.
