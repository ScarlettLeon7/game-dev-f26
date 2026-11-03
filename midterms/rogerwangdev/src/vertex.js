import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)

export const SYSTEM_PROMPT = `You play a bounded Gold Miner level. Choose actions yourself using only the provided visible observation. Collect enough value to meet the quota before simulated time expires. Prioritize value relative to waiting, extension and weight-dependent return time, and avoid intercepting rocks. Angles are radians from downward vertical. The claw swings automatically. A decision advances exactly 30 frames at 60 Hz. Return either {"type":"wait"} or {"type":"launch","frame":N}, where N is an integer from 0 through 29. A launch waits N physics frames within this interval then fires along the resulting angle. Never select a target ID or change state. Do not include frame in a wait action. You have no repository tools, hidden-state access, or evaluator tools.`

export async function createVertexPlayer({ project = process.env.GOOGLE_CLOUD_PROJECT, location = process.env.GOOGLE_CLOUD_LOCATION ?? 'global', model = process.env.COURSE_MODEL ?? 'gemini-3.5-flash-lite', fetchImpl = fetch, accessToken } = {}) {
  if (!project || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) throw new Error('Set GOOGLE_CLOUD_PROJECT to the project ID associated with your course credits')
  if (!/^[a-z0-9-]+$/.test(location) || !/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid location or model identifier')
  const token = accessToken ?? (await exec('gcloud', ['auth', 'application-default', 'print-access-token', '--quiet'], { timeout: 30000, maxBuffer: 65536 })).stdout.trim()
  if (!token) throw new Error('No application-default access token. Run gcloud auth application-default login')
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`
  const endpoint = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`
  const player = async (payload, { signal } = {}) => {
    const response = await fetchImpl(endpoint, {
      method: 'POST', signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
        generationConfig: {
          temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { type: { type: 'STRING', enum: ['wait', 'launch'] }, frame: { type: 'INTEGER', minimum: 0, maximum: 29 } }, required: ['type'] }
        }
      })
    })
    if (!response.ok) throw new Error(`Vertex request failed with HTTP ${response.status}`)
    const body = await response.json()
    const text = body.candidates?.[0]?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('')
    const usage = body.usageMetadata ?? {}
    let action
    try { action = JSON.parse(text) } catch { action = { type: 'invalid_model_json' } }
    return { action, modelVersion: body.modelVersion ?? model, usage: { inputTokens: usage.promptTokenCount ?? 0, outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0) } }
  }
  player.configuration = { provider: 'vertex', model, location, temperature: 0.2, maxOutputTokens: 1024, retries: 0 }
  return player
}
