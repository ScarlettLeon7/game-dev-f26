extends Node
# Smoke demonstration only: WAIT is not a competitive baseline.
func _ready():
	pause_mode = PAUSE_MODE_PROCESS
	call_deferred("run_episode")

func run_episode():
	var runner = load("res://ai/EpisodeRunner.gd").new()
	add_child(runner)
	runner.max_steps = 8
	var observation = yield(runner.reset(7), "completed")
	var trace = File.new()
	var error = trace.open("res://traces/interface-smoke.jsonl", File.WRITE)
	if error != OK:
		push_error("Cannot write smoke trace: " + str(error))
		get_tree().quit(1)
		return
	trace.store_line(JSON.print({"event": "reset", "seed": 7, "observation": observation}))
	while runner.outcome().status == "ongoing":
		var result = yield(runner.step("tux", "WAIT"), "completed")
		var entry = {"action": "WAIT", "result": result}
		trace.store_line(JSON.print(entry))
		print(JSON.print(entry))
	trace.close()
	print("Trace: res://traces/interface-smoke.jsonl")
	get_tree().quit()
