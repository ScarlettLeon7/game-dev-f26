# Tux input controls (Godot 3.5.2)

Human controls are the default on every newly spawned Tux. Keyboard, gamepad,
remapped controls and mobile controls still use Godot's existing Input actions.
AI input is local to Tux and never changes the global Input singleton.

A trusted in-engine controller can call these methods on the current Tux after
the level's `level_ready` signal (the title card replaces the initial player):

```gdscript
Global.player.set_ai_control_enabled(true)
var accepted = Global.player.set_ai_action("RIGHT_JUMP")
# Later, release all AI buttons:
Global.player.set_ai_action("WAIT")
# Return control to the human:
Global.player.set_ai_control_enabled(false)
```

Accepted strings: LEFT, RIGHT, JUMP, LEFT_JUMP, RIGHT_JUMP, WAIT. Requests return
false when disabled or invalid, leaving the action unchanged. Actions persist
until replaced. Submit from the main thread before the next Tux physics tick.
Multiple requests before that tick collapse to the latest request. A held jump
produces one press edge; use a non-jump action for at least one physics tick before
requesting another jump. Switching modes resets AI input to WAIT.

WAIT releases buttons; it does not freeze motion. AI mode leaves run, duck and up
unpressed, but preserves Global.auto_run. Jump buffering, coyote time, variable
jump height, bounces, collisions, gravity and state transitions use the original
code. Death and victory retain their original automatic behavior. Pause and
victory-skip UI remain human controlled. Respawn/scene replacement creates a new
human-controlled Tux; a future runner must enable AI on the new instance.

## Manual verification (not yet observed)

1. Open project.godot in Godot 3.5.2, play a level, and check left/right arrows,
   Space jump (tap versus hold), Ctrl run, Down duck as big Tux, grabbing and
   fireballs where available. Check pause and goal completion.
2. From a temporary in-engine controller, enable AI using the example above.
   Try each of the six actions for several physics ticks. Confirm directions and
   jumps; WAIT should release jump and allow normal deceleration/falling.
3. Hold keyboard movement/run/duck during AI mode: gameplay should follow AI
   only. Switch RIGHT_JUMP to LEFT_JUMP: jump must remain held without retrigger.
   Use WAIT for a physics tick then JUMP to obtain a new press.
4. Disable AI and confirm all human controls return. Check death/respawn defaults
   to human controls and that goal completion still works.

## Automated control assertions

```sh
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . -s tests/test_ai_controls.gd
```

The script checks mappings, jump edges, validation, source isolation and source
reset using Tux's actual methods, without loading a level. It does not verify
physics or human experience. Run a debug build so assertions are enabled.

This is only the input layer: no bounded simulation stepping, episode runner,
observation API, baseline, model calls or evaluation results are included.

## Temporary real-level integration test

From this project directory, run:

```sh
/Applications/Godot.app/Contents/MacOS/Godot --no-window --path . res://tests/test_ai_level.tscn
```

Use Godot **3.5.2**. On other systems replace the executable path with your
Godot 3.5.2 executable. Alternatively, open `tests/test_ai_level.tscn` in the
Godot editor and press F6 (Run Current Scene). Leave the keyboard untouched.
The test exits automatically; read PASS/FAIL lines in the output. Exit status
is 0 for success and 1 for failure, with a 20-second watchdog.

This opt-in scene loads the actual `scenes/levels/world1/level1.tscn`, follows
its normal title-card/player replacement sequence, waits for level readiness
and grounded Tux, then enables AI. It holds RIGHT for 12 physics ticks and
checks increasing X; holds RIGHT_JUMP for four ticks from ground and checks
airborne, upward velocity and decreasing Y; then checks WAIT releases direction
and jump. A synthetic Left-arrow keyboard event passes through Godot's InputMap:
AI must ignore it, then disabling AI must restore leftward control and change
horizontal velocity through the real physics. Releasing the key must clear
movement input. Position and velocity are only read, never assigned.

The keyboard check assumes the default Left-arrow binding to `move_left`;
custom saved bindings can cause a failure. The game loads its usual saved
options (including auto-run). This is automated keyboard-path evidence, not a
human playtest or a level-completion test. No normal gameplay scene references
this harness; remove the two `tests/test_ai_level.*` files when no longer needed.

Executed on November 7, 2026 with Godot 3.5.2 stable official on macOS:
all 10 checks PASS, exit status 0. RIGHT moved X from 112.000000 to 157.818192;
RIGHT_JUMP moved Y from 427.924042 to 389.945526 while rising and airborne.
WAIT, keyboard isolation, restored keyboard physics and keyboard release passed.
The run used saved auto-run enabled. Godot printed an OpenGL texture warning
during startup; it did not prevent test execution. The sandboxed launch aborted
before engine startup; the successful run required execution outside the sandbox.
