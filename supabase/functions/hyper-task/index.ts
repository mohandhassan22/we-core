import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_FOLDERS = ['Bss Features', 'Fixed & Adsl', 'Ramedy']

// --- إعدادات الـ CORS ---
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

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  } else {
    // للسماح بالوصول من أي نطاق فرعي لـ we-core.icu إذا لزم الأمر
    if (origin.endsWith('we-core.icu')) {
      headers['Access-Control-Allow-Origin'] = origin
    }
  }

  return headers
}

// --- استخراج التوكن من الكوكيز ---
function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const parts = cookie.trim().split('=');
    const key = parts[0];
    const value = parts.slice(1).join('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[name] || null;
}

// --- التحقق من المستخدم ---
async function verifyUser(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  // 1. محاولة جلب التوكن من الهيدر أولاً
  let token = req.headers.get('Authorization')?.replace('Bearer ', '');

  // 2. لو مش موجود، ندور عليه في الكوكيز
  // ملاحظة: Supabase غالباً بيخزن التوكن في كوكيز بتبدأ بـ sb-
  if (!token) {
    token = getCookie(req, 'sb-access-token') || getCookie(req, 'supabase-auth-token');
  }

  if (!token) return null;

  try {
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error } = await supabaseUser.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (e) {
    console.error('Auth verification error:', e);
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // التعامل مع طلبات Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // محاولة قراءة الـ body، مع معالجة الخطأ إذا كان فارغاً
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    
    const { action, username, path } = body as any;

    // --- 1. أكشن لا يحتاج توكن (جلب الإيميل بناءً على اليوزرنيم) ---
    if (action === 'get_email') {
      if (!username) {
        return new Response(JSON.stringify({ error: 'Username is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .ilike('username', username.trim())
        .maybeSingle();

      if (error) throw error;
      return new Response(JSON.stringify({ email: data?.email ?? null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- التحقق من التوكن للأكشنز اللي جاية (Header أو Cookie) ---
    const user = await verifyUser(req, supabaseUrl, supabaseAnonKey);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login first' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- 2. جلب قائمة الفيديوهات من الـ Storage ---
    if (action === 'get_videos') {
      const folderResults = await Promise.all(
        ALLOWED_FOLDERS.map(async (folderName) => {
          const { data: files, error } = await supabaseAdmin.storage
            .from('Videos')
            .list(folderName, { sortBy: { column: 'name', order: 'asc' } });

          if (error || !files) {
            console.error(`Error listing folder ${folderName}:`, error);
            return [];
          }

          return files
            .filter(f => f.id && !f.name.startsWith('.'))
            .map(f => ({
              title: f.name.replace(/\.[^.]+$/, ''),
              path: `${folderName}/${f.name}`,
              folder: folderName
            }));
        })
      );

      return new Response(JSON.stringify(folderResults.flat()), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- 3. توليد رابط فيديو موقت (Signed URL) ---
    if (action === 'get_single_url') {
      if (!path) {
        return new Response(JSON.stringify({ error: 'Path is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const folderOfPath = path.split('/')[0];
      if (!ALLOWED_FOLDERS.includes(folderOfPath)) {
        return new Response(JSON.stringify({ error: 'Access denied to this folder' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const { data, error } = await supabaseAdmin.storage
        .from('Videos')
        .createSignedUrl(path, 3600); // رابط صالح لمدة ساعة

      if (error) throw error;
      return new Response(JSON.stringify({ url: data?.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Server Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
