extends Node
# Trusted transport only. No generic object/method access is exposed.
var server = TCP_Server.new()
var peer = null
var buffer = ""
var busy = false
var runner

func _ready():
	pause_mode = PAUSE_MODE_PROCESS
	runner = load("res://ai/EpisodeRunner.gd").new()
	add_child(runner)
	var port = int(OS.get_environment("SUPERTUX_PORT"))
	runner.max_steps = int(OS.get_environment("SUPERTUX_STEPS"))
	runner.max_model_calls = int(OS.get_environment("SUPERTUX_CALLS"))
	runner.timeout_ms = int(OS.get_environment("SUPERTUX_TIMEOUT_MS"))
	if port <= 0 or server.listen(port, "127.0.0.1") != OK:
		get_tree().quit(2)

func _process(_delta):
	if peer == null and server.is_connection_available():
		peer = server.take_connection()
		server.stop()
	if peer == null:
		return
	if peer.get_status() == StreamPeerTCP.STATUS_NONE:
		get_tree().quit()
		return
	var count = peer.get_available_bytes()
	if count > 0:
		buffer += peer.get_utf8_string(count)
	if buffer.length() > 65536:
		get_tree().quit(2)
	if !busy and buffer.find("\n") >= 0:
		var end = buffer.find("\n")
		var line = buffer.substr(0, end)
		buffer = buffer.substr(end + 1)
		busy = true
		call_deferred("dispatch", line)

func dispatch(line):
	# Always coroutine: reset/step retain their asynchronous semantics.
	yield(get_tree(), "idle_frame")
	var parsed = JSON.parse(line)
	var result = {"error": "invalid_request"}
	if parsed.error == OK and typeof(parsed.result) == TYPE_DICTIONARY:
		var request = parsed.result
		var role = request.get("player_id", "tux")
		match request.get("op", ""):
			"reset":
				var value = request.get("seed", null)
				# JSON numbers decode as real values in Godot 3.
				if (typeof(value) == TYPE_INT or typeof(value) == TYPE_REAL) and value == floor(value) and abs(value) <= 2147483647:
					result = yield(runner.reset(int(value)), "completed")
				else:
					result = {"error": "invalid_seed"}
			"observe":
				result = runner.observe(role)
			"legal_actions":
				result = runner.legal_actions(role)
			"step":
				result = yield(runner.step(role, request.get("action", null)), "completed")
			"outcome":
				result = runner.outcome()
			"begin_model_call":
				result = runner.begin_model_call()
	peer.put_data((JSON.print(result) + "\n").to_utf8())
	busy = false
