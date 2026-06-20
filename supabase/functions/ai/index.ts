// Supabase Edge Function (Deno) — the only place the Anthropic key lives.
// The browser calls this via supabase.functions.invoke('ai', { body: { action, ... } });
// it proxies to Claude so the API key never reaches the client.
//
// Deploy:  supabase functions deploy ai
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const MODEL = 'claude-opus-4-8'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

// Flatten a Claude response to its text (skips thinking blocks).
const textOf = (msg: Anthropic.Message) =>
  msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim()

// Natural-language search: "who in fintech near Pune can help with fundraising?"
async function search({ query, contacts }: { query: string; contacts: unknown[] }) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: "Match the user's natural-language question to people in their personal network. Only return people genuinely relevant to the question; if none fit, return an empty list.",
    messages: [{
      role: 'user',
      content: `Question: "${query}"\n\nContacts (JSON):\n${JSON.stringify(contacts)}\n\nReturn the ids of matching contacts, best match first, each with a one-line reason.`,
    }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object', additionalProperties: false, required: ['matches'],
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false, required: ['id', 'reason'],
                properties: { id: { type: 'string' }, reason: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  })
  return JSON.parse(textOf(msg))
}

// Pre-meeting brief: summarise a person's log history into 2–3 sentences.
async function brief({ contact, timeline }: { contact: unknown; timeline: { date: string; content: string }[] }) {
  const log = timeline.map((t) => `- ${t.date}: ${t.content}`).join('\n') || '(no log entries yet)'
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: 'Write a crisp pre-meeting brief about a person from the user\'s own notes. Two or three sentences, concrete and specific, no preamble or salutation.',
    messages: [{ role: 'user', content: `Person: ${JSON.stringify(contact)}\n\nLog (newest first):\n${log}\n\nWrite a 2–3 sentence brief I can read right before meeting them.` }],
  })
  return { brief: textOf(msg) }
}

// Free-text parsing: find which contacts a prose entry references (no @ needed).
async function parse({ prose, contacts }: { prose: string; contacts: unknown[] }) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: "Identify which of the user's contacts are referenced in a free-text journal entry, even when named loosely (first name, nickname, or by role/company).",
    messages: [{ role: 'user', content: `Journal entry:\n"""${prose}"""\n\nContacts (JSON):\n${JSON.stringify(contacts)}\n\nReturn the ids of every contact referenced.` }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: { type: 'object', additionalProperties: false, required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } } } },
      },
    },
  })
  return JSON.parse(textOf(msg))
}

const actions: Record<string, (input: any) => Promise<unknown>> = { search, brief, parse }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { action, ...input } = await req.json()
    const handler = actions[action]
    if (!handler) return json({ error: `unknown action: ${action}` }, 400)
    return json(await handler(input))
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
