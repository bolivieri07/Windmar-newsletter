import { NextRequest, NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"
const TAG_NAME = "solar academy member"

async function ghlFetch(endpoint: string, options: any = {}) {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) throw new Error("GHL credentials not configured")

  const url = `${GHL_BASE}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
      ...(options.headers || {}),
    },
  })
  return res.json()
}

async function getTaggedContacts(): Promise<any[]> {
  const locationId = process.env.GHL_LOCATION_ID
  let contacts: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const data = await ghlFetch(`/contacts/?locationId=${locationId}&query=${encodeURIComponent(TAG_NAME)}&limit=100&page=${page}`)
    if (data.contacts && data.contacts.length > 0) {
      const tagged = data.contacts.filter((c: any) =>
        c.tags && c.tags.some((t: string) => t.toLowerCase() === TAG_NAME.toLowerCase())
      )
      contacts = [...contacts, ...tagged]
      if (data.contacts.length < 100) hasMore = false
      else page++
    } else {
      hasMore = false
    }
  }
  return contacts
}

async function sendSMS(contactId: string, message: string) {
  return ghlFetch("/conversations/messages", {
    method: "POST",
    body: JSON.stringify({
      type: "SMS",
      contactId,
      message,
    }),
  })
}

async function sendEmail(contactId: string, subject: string, htmlBody: string) {
  return ghlFetch("/conversations/messages", {
    method: "POST",
    body: JSON.stringify({
      type: "Email",
      contactId,
      subject,
      html: htmlBody,
    }),
  })
}

export async function GET(request: NextRequest) {
  try {
    const contacts = await getTaggedContacts()
    return NextResponse.json({
      count: contacts.length,
      contacts: contacts.map((c: any) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(" "),
        email: c.email,
        phone: c.phone,
        tags: c.tags,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, message, emailSubject, emailBody } = body

    const contacts = await getTaggedContacts()
    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts with tag '" + TAG_NAME + "' found" }, { status: 404 })
    }

    const results = { smsSuccess: 0, smsFailed: 0, emailSuccess: 0, emailFailed: 0, total: contacts.length }

    for (const contact of contacts) {
      if (contact.phone && message) {
        try {
          const smsRes = await sendSMS(contact.id, message)
          if (smsRes.message || smsRes.messageId || smsRes.id) results.smsSuccess++
          else results.smsFailed++
        } catch { results.smsFailed++ }
      }

      if (contact.email && emailSubject && emailBody) {
        try {
          const emailRes = await sendEmail(contact.id, emailSubject, emailBody)
          if (emailRes.message || emailRes.messageId || emailRes.id) results.emailSuccess++
          else results.emailFailed++
        } catch { results.emailFailed++ }
      }

      await new Promise(r => setTimeout(r, 200))
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
