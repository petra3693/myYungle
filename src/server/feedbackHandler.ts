import { z } from 'zod'

export const feedbackPayloadSchema = z
  .object({
    thought: z.string().optional(),
    issue: z.string().optional(),
    contact: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasContent = [data.thought, data.issue, data.contact].some((v) => v?.trim())
    if (!hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please fill in at least one field before sending.',
      })
    }
  })

export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>

export interface FeedbackResponse {
  success: boolean
  error?: string
}

function formatFeedbackMessage(payload: FeedbackPayload): string {
  const lines = ['**myJungle Feedback**']
  if (payload.thought?.trim()) lines.push(`**Thought:** ${payload.thought.trim()}`)
  if (payload.issue?.trim()) lines.push(`**Issue:** ${payload.issue.trim()}`)
  if (payload.contact?.trim()) lines.push(`**Feature / Contact:** ${payload.contact.trim()}`)
  return lines.join('\n')
}

async function sendViaDiscord(webhookUrl: string, message: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message.slice(0, 2000) }),
  })
  if (!response.ok) {
    throw new Error(`Discord webhook failed (${response.status})`)
  }
}

async function sendViaResend(message: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.FEEDBACK_TO_EMAIL
  if (!apiKey || !to) throw new Error('Resend is not configured')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM_EMAIL ?? 'myJungle <onboarding@resend.dev>',
      to: [to],
      subject: 'myJungle App Feedback',
      text: message.replace(/\*\*/g, ''),
    }),
  })

  if (!response.ok) {
    throw new Error(`Resend API failed (${response.status})`)
  }
}

export async function handleFeedbackRequest(body: unknown): Promise<{ status: number; body: FeedbackResponse }> {
  const parsed = feedbackPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid feedback payload.'
    return { status: 400, body: { success: false, error: message } }
  }

  const discordUrl = process.env.DISCORD_WEBHOOK_URL
  const resendKey = process.env.RESEND_API_KEY
  const resendTo = process.env.FEEDBACK_TO_EMAIL

  if (!discordUrl && !(resendKey && resendTo)) {
    return {
      status: 503,
      body: { success: false, error: 'Feedback delivery is not configured on the server.' },
    }
  }

  const message = formatFeedbackMessage(parsed.data)

  try {
    if (discordUrl) {
      await sendViaDiscord(discordUrl, message)
    } else {
      await sendViaResend(message)
    }
    return { status: 200, body: { success: true } }
  } catch {
    return {
      status: 500,
      body: { success: false, error: 'Failed to send feedback. Please try again later.' },
    }
  }
}
