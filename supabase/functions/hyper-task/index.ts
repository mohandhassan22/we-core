
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_FOLDERS_VIDEOS = ['Bss Features', 'Fixed & Adsl', 'Ramedy', 'WE Gold']
const ALLOWED_FOLDERS_SOFT = ['Soft']

// ─── إعدادات CORS ───
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '*'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

// ─── استخراج التوكن بدقة من الكوكيز ───
function getCookieToken(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  // استخدام Regex لضمان جلب التوكن حتى لو فيه علامات تنصيص
  const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) {
    return decodeURIComponent(match[2]).replace(/"/g, '');
  }
  return null
}

// ─── التحقق من هوية المستخدم ───
async function verifyUser(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  // 1. البحث في الهيدر أولاً
  let token: string | undefined | null = req.headers.get('Authorization')?.replace('Bearer ', '')

  // 2. البحث في الكوكيز لو مش موجود في الهيدر
  if (!token) {
    token = getCookieToken(req, 'sb-access-token')
  }

  if (!token) return null

  try {
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabaseUser.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch (e) {
    console.error('Auth check failed:', e)
    return null
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // استخدام Service Key للتعامل مع الداتابيز بصلاحيات كاملة
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const { action, username, file_id, source } = body

    // ─── 1. جلب الإيميل (متاح للجميع) ───
    if (action === 'get_email') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .ilike('username', username?.trim() || '')
        .maybeSingle()

      if (error) throw error
      return new Response(JSON.stringify({ email: data?.email ?? null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 2. التحقق من التوكن للأكشنز المحمية ───
    const user = await verifyUser(req, supabaseUrl, supabaseAnonKey)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 3. جلب قائمة الفيديوهات أو السوفت ───
    if (action === 'get_videos') {
      const isSoft = source === 'soft'
      const tableName = isSoft ? 'Curces Soft' : 'Videos'
      const allowed = isSoft ? ALLOWED_FOLDERS_SOFT : ALLOWED_FOLDERS_VIDEOS

      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('id, title, file_id, "folder-name"') // لاحظ الدبل كوتس لاسم العمود
        .in('folder-name', allowed)
        .order('title', { ascending: true })

      if (error) throw error

      const result = (data ?? []).map((row: any) => ({
        title: row.title,
        file_id: row.file_id,
        folder: row['folder-name'],
      }))

      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 4. جلب رابط الفيديو (Google Drive Preview) ───
    if (action === 'get_single_url') {
      const isSoft = source === 'soft'
      const tableName = isSoft ? 'Curces Soft' : 'Videos'

      const { data: row, error } = await supabaseAdmin
        .from(tableName)
        .select('file_id')
        .eq('file_id', file_id)
        .maybeSingle()

      if (error || !row) throw new Error('File not found')

      const url = `https://drive.google.com/file/d/${file_id}/preview`
      return new Response(JSON.stringify({ url }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})