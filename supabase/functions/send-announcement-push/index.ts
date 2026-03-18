import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const CHUNK_SIZE = 100

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    user_id: string | null
    type: string
    title: string
    body: string
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json()

    // announcements（user_id = NULL）のINSERTのみ処理
    if (
      payload.type !== 'INSERT' ||
      payload.record?.user_id !== null ||
      payload.record?.type !== 'announcement'
    ) {
      return new Response('skipped', { status: 200 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // announcement通知を無効にしたユーザーを取得
    const { data: optedOut } = await supabase
      .from('user_notification_settings')
      .select('user_id')
      .eq('announcement', false)

    const optedOutIds = (optedOut ?? []).map((r) => r.user_id)

    // announcement無効ユーザーを除いた全push_tokenを取得
    let tokenQuery = supabase.from('push_tokens').select('token')
    if (optedOutIds.length > 0) {
      tokenQuery = tokenQuery.not('user_id', 'in', `(${optedOutIds.join(',')})`)
    }
    const { data: tokenRows, error } = await tokenQuery

    if (error) throw error
    if (!tokenRows || tokenRows.length === 0) {
      return new Response('no tokens', { status: 200 })
    }

    const { title, body } = payload.record
    const tokens = tokenRows.map((r) => r.token)

    // 100件ずつExpo Push APIにバッチ送信
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE)
      const messages = chunk.map((to) => ({
        to,
        title,
        body,
        sound: 'default',
      }))

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`Expo Push API error: ${res.status} ${text}`)
      }
    }

    return new Response(JSON.stringify({ sent: tokens.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
