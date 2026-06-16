/**
 * AI utilities — priority filtering, smart reply suggestions, email summarization.
 * OpenAI client is lazy-initialised to avoid build-time errors when the key is absent.
 */

import OpenAI from 'openai'

let _openai: OpenAI | undefined
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

export type Priority = 'high' | 'medium' | 'low'

export async function classifyEmailPriority(
  subject: string,
  snippet: string,
  from: string,
): Promise<Priority> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify emails into priority levels. Reply with ONLY one word: "high", "medium", or "low".
High: urgent requests, deadlines, payments, security alerts, direct questions from real people.
Medium: newsletters you subscribed to, meeting invites, normal work emails.
Low: marketing, promotions, automated notifications, social media.`,
        },
        {
          role: 'user',
          content: `From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`,
        },
      ],
      max_tokens: 5,
      temperature: 0,
    })
    const text = res.choices[0]?.message?.content?.trim().toLowerCase() ?? 'medium'
    if (text === 'high' || text === 'medium' || text === 'low') return text
    return 'medium'
  } catch {
    return 'medium'
  }
}

export async function generateSmartReplies(subject: string, body: string): Promise<string[]> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Generate 3 short professional smart replies. Return JSON: { "replies": ["...", "...", "..."] }. Each reply ≤ 2 sentences.',
        },
        { role: 'user', content: `Subject: ${subject}\n\n${body.slice(0, 500)}` },
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })
    const content = res.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content) as { replies?: string[]; options?: string[] }
    return parsed.replies ?? parsed.options ?? []
  } catch {
    return []
  }
}

export async function summarizeEmail(body: string): Promise<string> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize this email in 1-2 sentences. Be concise.' },
        { role: 'user', content: body.slice(0, 2000) },
      ],
      max_tokens: 100,
      temperature: 0,
    })
    return res.choices[0]?.message?.content?.trim() ?? ''
  } catch {
    return ''
  }
}

export interface AgentAction {
  type: 'send_email' | 'create_event' | 'search_emails' | 'summarize_inbox' | 'none'
  params: Record<string, unknown>
}

export async function processAgentMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: { userEmail: string },
): Promise<{ text: string; actions: AgentAction[] }> {
  const systemPrompt = `You are FlowMail AI — a personal email and calendar assistant for ${context.userEmail}.

You can:
- Send emails → action type "send_email", params: { to, subject, body }
- Create calendar events → action type "create_event", params: { title, startTime (ISO 8601), endTime (ISO 8601), attendees (string[]), description }
- Search emails → action type "search_emails", params: { query }
- Summarize inbox → action type "summarize_inbox", params: {}

Always respond with valid JSON:
{
  "text": "Your response to the user",
  "actions": [{ "type": "...", "params": { ... } }]
}

If no action is needed use type "none". Be helpful and concise.`

  try {
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })
    const content = res.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content) as { text?: string; actions?: AgentAction[] }
    return {
      text: parsed.text ?? "I'm not sure how to help with that.",
      actions: parsed.actions ?? [],
    }
  } catch {
    return { text: 'Sorry, I had trouble processing that.', actions: [] }
  }
}
