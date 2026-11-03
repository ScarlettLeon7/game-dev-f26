import test from 'node:test'
import assert from 'node:assert/strict'
import { createVertexPlayer } from '../src/vertex.js'

test('Vertex adapter sends only observation, actions and bounded history with no model tools', async () => {
  let request
  const player = await createVertexPlayer({ project: 'test-project', accessToken: 'test-only', fetchImpl: async (url, options) => {
    request = JSON.parse(options.body)
    assert.ok(url.includes('/locations/global/'))
    return { ok: true, json: async () => ({ modelVersion: 'test-version', candidates: [{ content: { parts: [{ text: '{"type":"launch","frame":7}' }] } }], usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8, thoughtsTokenCount: 2 } }) }
  } })
  const result = await player({ observation: { score: 0 }, legalActions: [], history: [] })
  assert.deepEqual(result.action, { type: 'launch', frame: 7 })
  assert.equal(result.usage.outputTokens, 10)
  assert.equal(Object.hasOwn(request, 'tools'), false)
  assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), { observation: { score: 0 }, legalActions: [], history: [] })
})
test('Vertex refuses to run without a configured project', async () => {
  await assert.rejects(createVertexPlayer({ project: '', accessToken: 'test-only' }), /GOOGLE_CLOUD_PROJECT/)
})
test('non-JSON model output remains an invalid action with token usage recorded', async () => {
  const player = await createVertexPlayer({ project: 'test-project', accessToken: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'bad JSON' }] } }], usageMetadata: { promptTokenCount: 20 } }) }) })
  const result = await player({})
  assert.equal(result.action.type, 'invalid_model_json')
  assert.equal(result.usage.inputTokens, 20)
})
test('HTTP errors do not include credentials or raw provider messages', async () => {
  const player = await createVertexPlayer({ project: 'test-project', accessToken: 'test-only', fetchImpl: async () => ({ ok: false, status: 403 }) })
  await assert.rejects(player({}), /HTTP 403/)
})
