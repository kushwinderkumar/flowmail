
import Corsair from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar"
const corsair = new Corsair({
  plugins: [gmail(), GoogleCalendar()],
});

function getCorsairBase(): string {
  return process.env.CORSAIR_BASE_URL ?? 'https://api.corsair.dev'
}


function getCorsairKey(): string {
  const key = process.env.CORSAIR_API_KEY
  if (!key) throw new Error('CORSAIR_API_KEY is not set')
  return key
}

async function corsairFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${getCorsairBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getCorsairKey()}`,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Corsair API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Gmail ──────────────────────────────────────────────────────────────────

export interface ListEmailsParams {
  maxResults?: number
  pageToken?: string
  q?: string
  labelIds?: string[]
}

export async function corsairListEmails(accessToken: string, params: ListEmailsParams = {}) {
  return corsairFetch('/gmail/messages/list', {
    method: 'POST',
    body: JSON.stringify({ accessToken, ...params }),
  })
}

export async function corsairGetEmail(accessToken: string, messageId: string) {
  return corsairFetch('/gmail/messages/get', {
    method: 'POST',
    body: JSON.stringify({ accessToken, messageId }),
  })
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  replyToMessageId?: string
  threadId?: string
}

export async function corsairSendEmail(accessToken: string, params: SendEmailParams) {
  return corsairFetch('/gmail/messages/send', {
    method: 'POST',
    body: JSON.stringify({ accessToken, ...params }),
  })
}

export async function corsairModifyEmail(
  accessToken: string,
  messageId: string,
  addLabels: string[],
  removeLabels: string[],
) {
  return corsairFetch('/gmail/messages/modify', {
    method: 'POST',
    body: JSON.stringify({ accessToken, messageId, addLabels, removeLabels }),
  })
}

export async function corsairSearchEmails(
  accessToken: string,
  query: string,
  maxResults = 20,
) {
  return corsairFetch('/gmail/search', {
    method: 'POST',
    body: JSON.stringify({ accessToken, query, maxResults }),
  })
}

export async function corsairGetThread(accessToken: string, threadId: string) {
  return corsairFetch('/gmail/threads/get', {
    method: 'POST',
    body: JSON.stringify({ accessToken, threadId }),
  })
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export interface ListEventsParams {
  timeMin?: string
  timeMax?: string
  maxResults?: number
  calendarId?: string
}

export async function corsairListEvents(accessToken: string, params: ListEventsParams = {}) {
  return corsairFetch('/calendar/events/list', {
    method: 'POST',
    body: JSON.stringify({ accessToken, calendarId: 'primary', ...params }),
  })
}

export interface CreateEventParams {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  attendees?: string[]
  addGoogleMeet?: boolean
  calendarId?: string
}

export async function corsairCreateEvent(accessToken: string, params: CreateEventParams) {
  return corsairFetch('/calendar/events/create', {
    method: 'POST',
    body: JSON.stringify({ accessToken, calendarId: 'primary', ...params }),
  })
}

export interface UpdateEventParams {
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  attendees?: string[]
}

export async function corsairUpdateEvent(
  accessToken: string,
  eventId: string,
  params: UpdateEventParams,
) {
  return corsairFetch('/calendar/events/update', {
    method: 'POST',
    body: JSON.stringify({ accessToken, eventId, calendarId: 'primary', ...params }),
  })
}

export async function corsairDeleteEvent(
  accessToken: string,
  eventId: string,
  calendarId = 'primary',
) {
  return corsairFetch('/calendar/events/delete', {
    method: 'POST',
    body: JSON.stringify({ accessToken, eventId, calendarId }),
  })
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface RegisterWebhookParams {
  type: 'gmail' | 'calendar'
  accessToken: string
  webhookUrl: string
  userId: string
}

export async function corsairRegisterWebhook(params: RegisterWebhookParams) {
  return corsairFetch('/webhooks/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// ─── MCP Agent ───────────────────────────────────────────────────────────────

export interface AgentChatParams {
  message: string
  accessToken: string
  userId: string
  history?: Array<{ role: string; content: string }>
}

export async function corsairAgentChat(params: AgentChatParams) {
  return corsairFetch('/agent/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
