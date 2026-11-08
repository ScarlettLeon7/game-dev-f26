extends Node

# Temporary, opt-in integration harness. Uses the real level and physics.
const LEVEL = "res://scenes/levels/world1/level1.tscn"
const RIGHT_FRAMES = 12
var level_ready = false
var tux = null
var failures = 0
var finished = false

func _ready():
	# Independent wall-clock watchdog also catches stalled readiness/coroutines.
	get_tree().create_timer(20.0).connect("timeout", self, "_timeout")
	call_deferred("_run")

func _run():
	print("AI level integration: Godot ", Engine.get_version_info().string)
	var level = load(LEVEL).instance()
	level.connect("level_ready", self, "_on_level_ready")
	# Follow the normal root-level startup path, including the title card.
	Global.current_scene = level
	Global.current_level_path = LEVEL
	Global.spawn_position = null
	add_child(level)
	for _frame in range(600):
		if level_ready and is_instance_valid(Global.player):
			break
		yield(get_tree(), "physics_frame")
	tux = Global.player
	if !_check(level_ready and is_instance_valid(tux) and level.is_a_parent_of(tux),
			"Level ready with active Global.player"):
		_finish()
		return
	tux.set_ai_control_enabled(true)
	_check(tux.set_ai_action("WAIT"), "AI controls enabled")
	# Align action submissions with the boundary before node physics processing.
	yield(get_tree(), "physics_frame")
	for _frame in range(120):
		if tux.grounded:
			break
		yield(_frames(1), "completed")
	if !_check(tux.grounded, "Tux settled on actual level ground"):
		_finish()
		return
	var start_x = tux.global_position.x
	tux.set_ai_action("RIGHT")
	yield(_frames(RIGHT_FRAMES), "completed")
	_check(tux.global_position.x > start_x,
		"RIGHT: X increased over %d physics frames (%f -> %f)" % [RIGHT_FRAMES, start_x, tux.global_position.x])
	if !_check(tux.grounded, "RIGHT_JUMP starts grounded"):
		_finish()
		return
	var start_y = tux.global_position.y
	tux.set_ai_action("RIGHT_JUMP")
	yield(_frames(4), "completed")
	_check(!tux.grounded and tux.velocity.y < 0 and tux.global_position.y < start_y,
		"RIGHT_JUMP: airborne, rising, Y decreased (%f -> %f)" % [start_y, tux.global_position.y])
	tux.set_ai_action("WAIT")
	yield(_frames(2), "completed")
	_check(!tux.control_pressed("move_left") and !tux.control_pressed("move_right")
		and !tux.control_pressed("jump") and tux.move_direction == 0,
		"WAIT releases movement and jump input (inertia is allowed)")
	# Real keyboard event through InputMap, not a direct controller call.
	_key(true)
	yield(_frames(2), "completed")
	_check(Input.is_action_pressed("move_left") and !tux.control_pressed("move_left")
		and tux.move_direction == 0, "AI mode ignores held Left keyboard input")
	tux.set_ai_control_enabled(false)
	var before_velocity = tux.velocity.x
	yield(_frames(4), "completed")
	_check(tux.control_pressed("move_left") and tux.move_direction == -1
		and tux.velocity.x < before_velocity and !tux.set_ai_action("RIGHT"),
		"Human keyboard restored: Left drives physics after AI disabled")
	_key(false)
	yield(_frames(2), "completed")
	_check(!tux.control_pressed("move_left") and tux.move_direction == 0,
		"Human keyboard release reaches controller")
	_finish()

func _frames(count):
	# Called at a physics-frame boundary: the next signal observes the previous
	# tick's completed node processing. No rendered-frame timing dependency.
	for _frame in range(count):
		yield(get_tree(), "physics_frame")

func _key(pressed):
	var event = InputEventKey.new()
	event.scancode = KEY_LEFT
	event.pressed = pressed
	Input.parse_input_event(event)

func _on_level_ready():
	level_ready = true

func _check(ok, description):
	print("PASS: " if ok else "FAIL: ", description)
	if !ok:
		failures += 1
	return ok

func _timeout():
	if !finished:
		_check(false, "20-second integration watchdog expired")
		_finish()

func _finish():
	finished = true
	_key(false)
	if is_instance_valid(tux):
		tux.set_ai_control_enabled(false)
	print("AI level integration: ", "PASS" if failures == 0 else "FAIL", " (", failures, " failures)")
	get_tree().quit(0 if failures == 0 else 1)
