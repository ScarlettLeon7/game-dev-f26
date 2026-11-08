extends SceneTree

# Run with Godot 3.5.2: --no-window --path . -s tests/test_ai_controls.gd
func _init():
	var tux = load("res://scenes/player/Tux.gd").new()
	assert(!tux.set_ai_action("RIGHT"))
	tux.set_ai_control_enabled(true)
	var expected = {
		"LEFT": [true, false, false],
		"RIGHT": [false, true, false],
		"JUMP": [false, false, true],
		"LEFT_JUMP": [true, false, true],
		"RIGHT_JUMP": [false, true, true],
		"WAIT": [false, false, false]
	}
	for action in tux.AI_ACTIONS:
		assert(tux.set_ai_action(action))
		tux.begin_control_tick()
		assert(tux.control_pressed("move_left") == expected[action][0])
		assert(tux.control_pressed("move_right") == expected[action][1])
		assert(tux.control_pressed("jump") == expected[action][2])
		assert(!tux.control_pressed("run"))
		assert(!tux.control_pressed("duck"))
		assert(!tux.control_pressed("move_up"))
	assert(tux.set_ai_action("JUMP"))
	tux.begin_control_tick()
	assert(tux.control_just_pressed("jump"))
	assert(tux.set_ai_action("RIGHT_JUMP"))
	tux.begin_control_tick()
	assert(!tux.control_just_pressed("jump"))
	assert(tux.control_pressed("jump"))
	assert(!tux.set_ai_action("INVALID"))
	assert(!tux.set_ai_action(42))
	assert(tux.control_pressed("move_right"))
	assert(tux.set_ai_action("WAIT"))
	tux.begin_control_tick()
	assert(!tux.control_pressed("jump"))
	assert(tux.set_ai_action("JUMP"))
	tux.begin_control_tick()
	assert(tux.control_just_pressed("jump"))
	Input.action_press("move_left")
	assert(!tux.control_pressed("move_left"))
	tux.set_ai_control_enabled(false)
	assert(tux.control_pressed("move_left") == Input.is_action_pressed("move_left"))
	Input.action_release("move_left")
	tux.set_ai_control_enabled(true)
	tux.begin_control_tick()
	assert(!tux.control_pressed("jump"))
	assert(!tux.control_just_pressed("jump"))
	tux.free()
	print("AI control assertions passed")
	quit()
