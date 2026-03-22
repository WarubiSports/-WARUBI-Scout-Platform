import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  recipients: { email: string; name?: string }[]
  subject: string
  htmlBody: string
  fromName: string
  fromDomain: 'warubi' | 'scoutbuddy'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const { recipients, subject, htmlBody, fromName, fromDomain } = await req.json() as EmailRequest

    if (!recipients?.length || !subject || !htmlBody) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cap at 50 recipients per request
    const batch = recipients.slice(0, 50)

    const fromEmail = fromDomain === 'warubi'
      ? `${fromName.toLowerCase().replace(/\s+/g, '.')}@warubi-sports.com`
      : `noreply@warubi-sports.com`

    // Send emails via Resend batch API
    const results: { email: string; success: boolean; error?: string }[] = []

    // Resend supports batch sending — up to 100 emails per request
    const emails = batch.map((r) => ({
      from: `${fromName} <${fromEmail}>`,
      to: [r.email],
      subject,
      html: htmlBody.replace(/\{\{name\}\}/g, r.name || 'there'),
    }))

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emails),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[send-outreach-email] Resend error:', errorText)
      throw new Error(`Resend API error: ${res.status}`)
    }

    const resendResult = await res.json()

    return new Response(JSON.stringify({
      sent: batch.length,
      results: resendResult,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-outreach-email] Error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
