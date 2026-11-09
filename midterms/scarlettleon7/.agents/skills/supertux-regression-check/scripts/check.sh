#!/usr/bin/env bash
# Offline checks only; invoke from the SuperTux project root.
set -u
if [[ ! -f project.godot || ! -f tests/test_controller.py || ! -d controller ]]; then
  echo 'SKIP: all checks; run from the SuperTux project root.' >&2
  exit 2
fi
PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1 ||
   ! "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo 'SKIP: all checks; Python 3.10+ is required for bounded execution.' >&2
  exit 2
fi
export PYTHONDONTWRITEBYTECODE=1
export GODOT="${GODOT:-/Applications/Godot.app/Contents/MacOS/Godot}"
log_dir=$(mktemp -d "${TMPDIR:-/tmp}/supertux-regression.XXXXXX") || exit 2
passed=0
failed=0
skipped=0
printf 'Logs: %s\n' "$log_dir"

# Portable deadlines; kill the entire subprocess group, including child Godot.
run_check() {
  local label="$1" marker="$2" deadline="$3"
  shift 3
  local log="$log_dir/$label.log"
  "$PYTHON" - "$deadline" "$log" "$@" <<'PY'
import os
import signal
import subprocess
import sys
seconds, log, *command = sys.argv[1:]
with open(log, 'w') as output:
    try:
        process = subprocess.Popen(command, stdout=output, stderr=subprocess.STDOUT,
                                   start_new_session=True)
        try:
            code = process.wait(timeout=float(seconds))
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            output.write('\nFAIL: external deadline exceeded\n')
            code = 124
    except OSError as exc:
        output.write('FAIL: could not launch: ' + type(exc).__name__ + '\n')
        code = 127
sys.exit(code if 0 <= code <= 255 else 1)
PY
  local status=$?
  if [[ $status -eq 0 ]] &&
     ! grep -Eq 'SCRIPT ERROR:|Parse Error:|FAIL:|Assertion failed' "$log" &&
     { [[ -z "$marker" ]] || grep -Fq "$marker" "$log"; }; then
    printf 'PASS: %s (exit %s)\n' "$label" "$status"
    passed=$((passed + 1))
  else
    printf 'FAIL: %s (exit %s; inspect %s)\n' "$label" "$status" "$log"
    failed=$((failed + 1))
  fi
  grep -E 'skipped|^Ran |^OK' "$log" || true
}
skip_check() {
  printf 'SKIP: %s (%s)\n' "$1" "$2"
  skipped=$((skipped + 1))
}

run_check python-unit 'OK' 60 env SUPERTUX_INTEGRATION=0 "$PYTHON" -m unittest discover -s tests -v
engine_reason=''
if ! command -v "$GODOT" >/dev/null 2>&1; then
  engine_reason='GODOT unavailable; set GODOT to Godot 3.5.2 Standard'
elif [[ "$(uname -s)" == Linux && -z "${DISPLAY:-}" ]]; then
  engine_reason='Linux display unavailable; run under xvfb-run -a'
else
  before=$failed
  run_check godot-version '3.5.2.stable.official' 15 "$GODOT" --version
  if [[ $failed -gt $before ]]; then
    engine_reason='Godot 3.5.2 version prerequisite failed'
  else
    passed=$((passed - 1)) # Version is a prerequisite, not a regression group.
  fi
fi
if [[ -n "$engine_reason" ]]; then
  for label in python-godot-integration godot-episode godot-input-controls godot-real-level; do
    skip_check "$label" "$engine_reason"
  done
else
  run_check python-godot-integration 'OK' 90 env SUPERTUX_INTEGRATION=1 \
    PYTHONPATH="tests${PYTHONPATH:+:$PYTHONPATH}" "$PYTHON" -m unittest test_controller.ProtocolTests -v
  run_check godot-episode 'Episode interface: 0 failures' 90 \
    "$GODOT" --no-window --audio-driver Dummy --path . res://tests/test_episode.tscn
  run_check godot-input-controls 'AI control assertions passed' 90 \
    "$GODOT" --no-window --audio-driver Dummy --path . -s tests/test_ai_controls.gd
  run_check godot-real-level 'AI level integration: PASS (0 failures)' 90 \
    "$GODOT" --no-window --audio-driver Dummy --path . res://tests/test_ai_level.tscn
fi
run_check git-diff-check '' 15 git diff --check
printf '\nSummary: %s passed groups, %s failures, %s skipped groups.\n' "$passed" "$failed" "$skipped"
echo 'Unit-only transport skip is intentional; see the separate integration result.'
echo 'Limits: offline regression only; no live API, full-level win, human-playtest, or cross-platform CI evidence.'
printf 'Logs retained at: %s\n' "$log_dir"
if [[ $failed -gt 0 ]]; then exit 1; fi
if [[ $skipped -gt 0 ]]; then exit 2; fi
exit 0
