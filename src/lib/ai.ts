/**
 * AI utilities — priority filtering, smart reply suggestions, email summarization
 */

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type Priority = 'high' | 'medium' | 'low'

export async function classifyEmailPriority(
  subject: string,
  snippet: string,
  from: string
): Promise<Priority> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You classify emails into priority levels. Reply with ONLY one word: "high", "medium", or "low".
High: urgent requests, deadlines, payments, security alerts, direct questions from real people.
Medium: newsletters you actually subscribed to, meeting invites, normal work emails.
Low: marketing, promotions, automated notifications, social media updates.`,
        },
        {
          role: 'user',
          content: `From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    })
    const text = res.choices[0]?.message?.content?.trim().toLowerCase() || 'medium'
    if (text === 'high' || text === 'medium' || text === 'low') return text
    return 'medium'
  } catch {
    return 'medium'
  }
}

export async function generateSmartReplies(
  subject: string,
  body: string
): Promise<string[]> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Generate 3 short, professional smart reply options for this email. Return a JSON array of strings. Each reply should be 1-2 sentences max.',
        },
        {
          role: 'user',
          content: `Subject: ${subject}\n\n${body.slice(0, 500)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })
    const content = res.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    return parsed.replies || parsed.options || []
  } catch {
    return []
  }
}

export async function summarizeEmail(body: string): Promise<string> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize this email in 1-2 sentences. Be concise and direct.',
        },
        { role: 'user', content: body.slice(0, 2000) },
      ],
      max_tokens: 100,
      temperature: 0,
    })
    return res.choices[0]?.message?.content?.trim() || ''
  } catch {
    return ''
  }
}

export async function processAgentMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: { userEmail: string }
): Promise<{ text: string; actions?: AgentAction[] }> {
  const systemPrompt = `You are FlowMail AI — a personal email and calendar assistant for ${context.userEmail}.
You can help the user:
- Send emails: extract recipient, subject, body → return action type "send_email"
- Create calendar events: extract title, time, attendees → return action type "create_event"
- Search emails: extract search query → return action type "search_emails"
- Summarize inbox: return action type "summarize_inbox"
- Schedule meetings: extract details → return action type "create_event" + "send_email"

Always respond with a JSON object:
{
  "text": "Your friendly response to the user",
  "actions": [
    {
      "type": "send_email" | "create_event" | "search_emails" | "summarize_inbox" | "none",
      "params": { ... relevant params ... }
    }
  ]
}

For "send_email" params: { to, subject, body }
For "create_event" params: { title, startTime (ISO), endTime (ISO), attendees (array), description }
For "search_emails" params: { query }

If no action needed, use type "none" with empty params.
Be helpful, friendly and concise.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
    max_tokens: 500,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  try {
    const content = res.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    return {
      text: parsed.text || "I'm not sure how to help with that.",
      actions: parsed.actions || [],
    }
  } catch {
    return { text: "Sorry, I had trouble processing that.", actions: [] }
  }
}

export interface AgentAction {
  type: 'send_email' | 'create_event' | 'search_emails' | 'summarize_inbox' | 'none'
  params: Record<string, any>
}
