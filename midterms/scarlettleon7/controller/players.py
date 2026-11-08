import json
import os
import subprocess
import time
import urllib.request
import urllib.parse


class Baseline:
    def __init__(self):
        self.previous_x = None
        self.stuck = 0
        self.jump_held = False

    def choose(self, observation, legal):
        p = observation['player']
        x, y = p['position']
        self.stuck = self.stuck + 1 if self.previous_x is not None and abs(x-self.previous_x) < 1 else 0
        self.previous_x = x
        direction = 'RIGHT'
        goals = [o for o in observation['objects'] if o['kind'] == 'goal']
        if goals and goals[0]['position'][0] < x-8:
            direction = 'LEFT'
        sign = 1 if direction == 'RIGHT' else -1
        ahead = lambda pos: 0 < sign*(pos[0]-x) < 64
        obstacle = any(ahead(o['position']) and abs(o['position'][1]-y) < 48
                       and o['kind'] in ('hazard', 'block') for o in observation['objects'])
        terrain = observation['terrain']
        # Appearances are a coarse visual sensor, not guaranteed solid collision.
        wall = any(0 < sign*(t['position'][0]-x) < 32 and -20 < t['position'][1]-y < 12 for t in terrain)
        support = any(16 < sign*(t['position'][0]-x) < 64 and 12 < t['position'][1]-y < 64 for t in terrain)
        jump = p['grounded'] and (obstacle or wall or not support or self.stuck >= 2)
        # Release between jumps so the input layer can detect another edge.
        action = direction + '_JUMP' if jump and not self.jump_held else direction
        self.jump_held = action.endswith('_JUMP')
        return action if action in legal else ('WAIT' if 'WAIT' in legal else legal[0])


def validate_response(raw, legal):
    try:
        data = json.loads(raw)
        action = data['action']
        if set(data) == {'action'} and isinstance(action, str) and action in legal:
            return action
    except (ValueError, TypeError, KeyError):
        pass
    return None


def decide(player, observation, legal, fallback):
    started = time.monotonic()
    record = {'raw_response': None, 'usage': None, 'error': None}
    try:
        raw, usage = player.request(observation, legal)
        record.update(raw_response=raw, usage=usage)
        action = validate_response(raw, legal)
        if action is None:
            record['error'] = 'invalid_response'
    except Exception as exc:
        # Never serialize exception bodies which may include credentials/headers.
        record['error'] = type(exc).__name__
        action = None
    record['latency_seconds'] = time.monotonic()-started
    record['valid_proposal'] = action is not None
    record['fallback'] = action is None
    record['action'] = action or fallback.choose(observation, legal)
    return record


class Vertex:
    def __init__(self, config, timeout):
        self.config = config
        self.timeout = timeout
        if not all(config.get(k) for k in ('project', 'location', 'model')):
            raise ValueError('Vertex requires explicit project, location and course model')

    def request(self, observation, legal):
        start = time.monotonic()
        # Existing ADC only; never login or change cloud configuration.
        token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                               capture_output=True, text=True, check=True, timeout=self.timeout).stdout.strip()
        c = self.config
        host = 'aiplatform.googleapis.com' if c['location'] == 'global' else c['location']+'-aiplatform.googleapis.com'
        path = '/'.join(urllib.parse.quote(c[k], safe='') for k in ('project', 'location', 'model'))
        project, location, model = path.split('/')
        url = f'https://{host}/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent'
        prompt = ('Play a platformer toward the goal, usually right. Positive y points down. '
                  'Each action lasts six physics frames. Jump needs release between presses. '
                  'Return only JSON {"action":"one legal action"}.\n' +
                  json.dumps({'observation': observation, 'legal_actions': legal}, separators=(',', ':')))
        body = {'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
                'generationConfig': {'temperature': 0, 'maxOutputTokens': 128, 'responseMimeType': 'application/json'}}
        request = urllib.request.Request(url, json.dumps(body).encode(),
                                        {'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'})
        remaining = self.timeout-(time.monotonic()-start)
        if remaining <= 0:
            raise TimeoutError()
        with urllib.request.urlopen(request, timeout=remaining) as response:
            result = json.load(response)
        text = ''.join(p.get('text', '') for p in result.get('candidates', [{}])[0].get('content', {}).get('parts', []) if not p.get('thought'))
        return text, result.get('usageMetadata')
