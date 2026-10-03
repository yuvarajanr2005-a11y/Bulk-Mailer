import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT) || 5000
const maxRecipients = 200
const maxHistory = 50
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const campaigns = []
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('This origin is not allowed by the CORS policy.'))
  },
}))
app.use(express.json({ limit: '1mb' }))

function getRecipients(value) {
  if (typeof value !== 'string') return { error: 'Recipients must be entered as email addresses.' }

  const entered = value.split(/[\s,;]+/).filter(Boolean)
  const recipients = [...new Set(entered.map((email) => email.toLowerCase()))]
  const invalid = recipients.filter((email) => !emailPattern.test(email))

  if (recipients.length === 0) return { error: 'Add at least one recipient email address.' }
  if (recipients.length > maxRecipients) {
    return { error: `You can send to a maximum of ${maxRecipients} recipients per campaign.` }
  }
  if (invalid.length) {
    return { error: `Check these invalid email address${invalid.length === 1 ? '' : 'es'}: ${invalid.join(', ')}` }
  }

  return { recipients }
}

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email sending is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.')
  }

  const portNumber = Number(SMTP_PORT) || 587
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: portNumber,
    secure: SMTP_SECURE === 'true' || portNumber === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/emails', (_request, response) => {
  const emails = campaigns.slice(0, maxHistory).map(
    ({ _id, subject, recipients, status, sentCount, createdAt }) => ({
      _id,
      subject,
      recipients,
      status,
      sentCount,
      createdAt,
    }),
  )
  response.json({ emails })
})

app.post('/api/emails', async (request, response, next) => {
  try {
    const { subject, body } = request.body ?? {}
    const recipientResult = getRecipients(request.body?.recipients)

    if (typeof subject !== 'string' || !subject.trim()) {
      return response.status(400).json({ message: 'A subject is required.' })
    }
    if (subject.trim().length > 200) {
      return response.status(400).json({ message: 'The subject must be 200 characters or fewer.' })
    }
    if (typeof body !== 'string' || !body.trim()) {
      return response.status(400).json({ message: 'A message body is required.' })
    }
    if (body.length > 20000) {
      return response.status(400).json({ message: 'The message body must be 20,000 characters or fewer.' })
    }
    if (recipientResult.error) {
      return response.status(400).json({ message: recipientResult.error })
    }

    const transporter = createTransporter()
    const campaign = {
      _id: randomUUID(),
      subject: subject.trim(),
      recipients: recipientResult.recipients,
      status: 'sending',
      sentCount: 0,
      createdAt: new Date(),
    }
    campaigns.unshift(campaign)
    campaigns.length = Math.min(campaigns.length, maxHistory)
    let sentCount = 0

    for (const recipient of recipientResult.recipients) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: recipient,
          subject: subject.trim(),
          text: body,
        })
        sentCount += 1
      } catch (error) {
        console.error(`Email delivery failed for campaign ${campaign.id}:`, error.message)
      }
    }

    campaign.sentCount = sentCount
    campaign.status = sentCount === recipientResult.recipients.length
      ? 'sent'
      : sentCount > 0
        ? 'partial'
        : 'failed'
    campaign.sentCount = sentCount

    const failedCount = recipientResult.recipients.length - sentCount
    const message = failedCount === 0
      ? `Campaign sent to ${sentCount} ${sentCount === 1 ? 'recipient' : 'recipients'}.`
      : `${sentCount} of ${recipientResult.recipients.length} emails sent. ${failedCount} could not be delivered.`

    return response.status(campaign.status === 'failed' ? 502 : 200).json({
      message,
      status: campaign.status,
      sentCount,
      totalRecipients: recipientResult.recipients.length,
    })
  } catch (error) {
    return next(error)
  }
})

app.use((request, response) => {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.path}` })
})

app.use((error, _request, response, _next) => {
  console.error('API error:', error.message)
  if (response.headersSent) return
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' })
  }
  response.status(500).json({ message: 'The server could not complete your request.' })
})

app.listen(port, () => {
  console.log(`Bulk Mail API listening on port ${port}`)
})
