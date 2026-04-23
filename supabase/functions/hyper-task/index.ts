import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_FOLDERS_VIDEOS = ['Bss Features', 'Fixed & Adsl', 'Ramedy', 'WE Gold']
const ALLOWED_FOLDERS_SOFT   = ['Soft']

// --- CORS ---
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigins = [
    'https://we-core.icu',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000'
  ]
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
  if (allowedOrigins.includes(origin) || origin.endsWith('we-core.icu')) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

// --- Cookie helper ---
function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=')
    acc[parts[0]] = parts.slice(1).join('=')
    return acc
  }, {} as Record<string, string>)
  return cookies[name] || null
}

// --- Auth ---
async function verifyUser(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  let token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    token = getCookie(req, 'sb-access-token') || getCookie(req, 'supabase-auth-token')
  }
  if (!token) return null
  try {
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error } = await supabaseUser.auth.getUser()
    if (error || !user) return null
    return user
  } catch (e) {
    console.error('Auth error:', e)
    return null
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl        = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseAdmin      = createClient(supabaseUrl, supabaseServiceKey)

    let body: any = {}
    try { body = await req.json() } catch { body = {} }

    const { action, username, file_id, source } = body
    // source = 'videos' (default) | 'soft'

    // ─── get_email (no auth needed) ───
    if (action === 'get_email') {
      if (!username) {
        return new Response(JSON.stringify({ error: 'Username is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .ilike('username', username.trim())
        .maybeSingle()
      if (error) throw error
      return new Response(JSON.stringify({ email: data?.email ?? null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── Auth check ───
    const user = await verifyUser(req, supabaseUrl, supabaseAnonKey)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login first' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── get_videos ───
    if (action === 'get_videos') {
      const isSoft    = source === 'soft'
      const tableName = isSoft ? 'Curces Soft' : 'Videos'
      const allowed   = isSoft ? ALLOWED_FOLDERS_SOFT : ALLOWED_FOLDERS_VIDEOS

      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('id, title, file_id, folder-name')
        .in('folder-name', allowed)
        .order('folder-name', { ascending: true })
        .order('title',       { ascending: true })

      if (error) throw error

      const videos = (data ?? []).map((row: any) => ({
        title:   row.title,
        file_id: row.file_id,
        folder:  row['folder-name'],
      }))

      return new Response(JSON.stringify(videos), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── get_single_url ───
    if (action === 'get_single_url') {
      if (!file_id) {
        return new Response(JSON.stringify({ error: 'file_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const isSoft    = source === 'soft'
      const tableName = isSoft ? 'Curces Soft' : 'Videos'
      const allowed   = isSoft ? ALLOWED_FOLDERS_SOFT : ALLOWED_FOLDERS_VIDEOS

      // التحقق إن الـ file_id موجود في الجدول الصح
      const { data: row, error } = await supabaseAdmin
        .from(tableName)
        .select('file_id, folder-name')
        .eq('file_id', file_id)
        .maybeSingle()

      if (error) throw error
      if (!row) {
        return new Response(JSON.stringify({ error: 'Video not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (!allowed.includes(row['folder-name'])) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const url = `https://drive.google.com/file/d/${file_id}/preview`
      return new Response(JSON.stringify({ url }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Server Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})