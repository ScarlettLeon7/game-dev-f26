extends Node

var failures = 0
var runner

class PhysicsCounter:
	extends Node
	var ticks = 0
	func _physics_process(_delta):
		ticks += 1

func check(ok, label):
	print("PASS: " if ok else "FAIL: ", label)
	if !ok:
		failures += 1

func _ready():
	pause_mode = PAUSE_MODE_PROCESS
	get_tree().create_timer(30.0).connect("timeout", self, "watchdog")
	call_deferred("run_tests")

func run_tests():
	runner = load("res://ai/EpisodeRunner.gd").new()
	add_child(runner)
	var first = yield(runner.reset(7), "completed")
	check(first.has("player"), "reset loads real player")
	check(runner.legal_actions("tux").size() == 6, "six actions")
	check(runner.observe("spectator").has("error") and runner.legal_actions("spectator").empty(), "role boundary")
	check(JSON.parse(JSON.print(first)).error == OK, "JSON observation")
	check(!first.has("level") and !first.has("seed") and !first.has("enemies"), "observation allowlist")
	check(first.player.has("grounded") and typeof(first.player.grounded) == TYPE_BOOL, "grounded state exposed")
	var origin = first.player.position
	var invalid = yield(runner.step("tux", "TELEPORT"), "completed")
	check(invalid.error == "invalid_action" and runner.steps == 0 and runner.frames == 0, "invalid action rejected without advancing")
	invalid = yield(runner.step("other", "RIGHT"), "completed")
	check(invalid.error == "unknown_player", "wrong role rejected")
	var counter = PhysicsCounter.new()
	runner.level.add_child(counter)
	var result = yield(runner.step("tux", "RIGHT"), "completed")
	check(runner.frames == 6 and result.observation.player.position[0] > origin[0], "six real physics ticks move Tux")
	check(counter.ticks == 6, "independent counter confirms six level ticks")
	var held = runner.observe("tux")
	for _i in range(8):
		yield(get_tree(), "physics_frame")
	check(JSON.print(runner.observe("tux")) == JSON.print(held), "world frozen between steps")
	var bounded = true
	for tile in held.terrain:
		bounded = bounded and abs(tile.position[0] - held.player.position[0]) <= 160 and abs(tile.position[1] - held.player.position[1]) <= 128
	for object in held.objects:
		bounded = bounded and abs(object.position[0] - held.player.position[0]) <= 160 and abs(object.position[1] - held.player.position[1]) <= 128
	check(bounded, "terrain and objects inside view")
	var again = yield(runner.reset(7), "completed")
	check(JSON.print(again) == JSON.print(first), "same seed resets observation and counters")
	yield(runner.step("tux", "RIGHT"), "completed")
	check(JSON.print(runner.observe("tux")) == JSON.print(held), "same seed and action repeat physics")
	var invisible = load("res://scenes/objects/BonusInvisible.tscn").instance()
	runner.level.add_child(invisible)
	invisible.global_position = Global.player.global_position + Vector2(32, -32)
	var hidden_pos = [invisible.global_position.x, invisible.global_position.y]
	var leaked = false
	for object in runner.observe("tux").objects:
		if object.position == hidden_pos:
			leaked = true
	check(!leaked, "actual invisible bonus block omitted")
	# Trusted test fixtures invoke real game lifecycle methods, never player API.
	Global.player.die()
	check(runner.outcome().status == "defeat", "real death detected before respawn")
	yield(runner.reset(7), "completed")
	var goal = load("res://scenes/objects/EndGoalPosts.tscn").instance()
	runner.level.add_child(goal)
	goal._on_Area2D_body_entered(Global.player)
	check(runner.outcome().status == "victory" and runner.outcome().score == 100, "existing goal handler triggers victory and score")
	yield(runner.reset(7), "completed")
	for action in runner.legal_actions("tux"):
		var valid = yield(runner.step("tux", action), "completed")
		check(valid.has("observation"), "valid action: " + action)
	var bad_type = yield(runner.step("tux", 42), "completed")
	check(bad_type.error == "invalid_action", "non-string action rejected")
	yield(runner.reset(7), "completed")
	runner.max_steps = 1
	yield(runner.step("tux", "WAIT"), "completed")
	check(runner.outcome().reason == "step_limit", "step limit")
	var frozen = runner.frames
	yield(runner.step("tux", "RIGHT"), "completed")
	check(runner.frames == frozen, "terminal step cannot advance")
	yield(runner.reset(7), "completed")
	runner.max_model_calls = 1
	check(runner.begin_model_call(), "reserve model call before attempt")
	# A failed attempt is deliberately not refunded.
	check(!runner.begin_model_call() and runner.outcome().reason == "model_call_limit", "failed calls consume budget")
	yield(runner.reset(7), "completed")
	runner.timeout_ms = 1
	yield(get_tree().create_timer(0.02), "timeout")
	check(runner.outcome().reason == "wall_timeout", "timeout while waiting for player")
	runner.timeout_ms = 120000
	yield(runner.reset(7), "completed")
	Global.player.free()
	check(runner.outcome().reason == "player_lost", "missing player terminates safely")
	runner.timeout_ms = 0
	var startup = yield(runner.reset(7), "completed")
	check(startup.get("error") == "startup_timeout" and startup.outcome.reason == "wall_timeout", "startup timeout returns explicit terminal reason")
	runner.timeout_ms = 120000
	var recovered = yield(runner.reset(7), "completed")
	check(recovered.has("player") and runner.outcome().status == "ongoing", "reset recovers after startup timeout")
	print("Episode interface: ", failures, " failures")
	get_tree().quit(0 if failures == 0 else 1)

func watchdog():
	print("FAIL: test watchdog")
	get_tree().quit(1)
