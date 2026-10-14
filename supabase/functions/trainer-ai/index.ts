// Supabase Edge Function: trainer-ai
// actions: "explain" | "questions"
// - 4 keys: TRAINER_AI_KEY_1..4 (Gemini). Rotates; if one is out of credit/quota it falls to the next.
// - Question bank in public.training_ai_questions: returns 2-4 stored questions per call,
//   and only calls the AI to refill the bank when it has too few.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BANK_MIN = 6;   // refill when the module has fewer unseen-enough questions than this
const GENERATE = 8;   // questions generated per refill

const KEYS = [1, 2, 3, 4]
  .map((i) => ({ name: `TRAINER_AI_KEY_${i}`, key: Deno.env.get(`TRAINER_AI_KEY_${i}`) || "" }))
  .filter((k) => k.key);

let cursor = 0; // round-robin start so load spreads across keys

async function callAi(prompt: string, system: string, maxTokens: number, json_ = false) {
  if (!KEYS.length) throw Object.assign(new Error("No TRAINER_AI_KEY_* configured"), { code: "NO_KEY" });
  const start = cursor++ % KEYS.length;
  let lastErr = "";
  for (let n = 0; n < KEYS.length; n++) {
    const k = KEYS[(start + n) % KEYS.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": k.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: maxTokens,
          ...(json_ ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (res.ok) {
      const d = await res.json();
      const t = d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
      if (t) return t;
      lastErr = `${k.name}: empty`;
      continue;
    }
    const body = (await res.text()).slice(0, 200);
    lastErr = `${k.name}: ${res.status} ${body}`;
    // credit/quota/permission/overload -> try next key; any other 4xx is a real bug, stop
    if ([401, 402, 403, 429].includes(res.status) || res.status >= 500) continue;
    break;
  }
  throw new Error(`All AI keys failed. Last: ${lastErr}`);
}

async function getUser(auth: string) {
  const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
  return r.ok ? await r.json() : null;
}

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

async function hash(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.replace(/\s+/g, " ").trim()));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function refillBank(slug: string, topic: string, context: string) {
  const system = "أنت مدرب لموظفي المصرية للاتصالات WE. اكتب أسئلة اختيار من متعدد بالعربية المبسطة، مبنية فقط على المحتوى المعطى. أرجع JSON فقط.";
  const prompt = `الوحدة: ${topic}\nالمحتوى:\n${context.slice(0, 4000)}\n\nاكتب ${GENERATE} أسئلة مختلفة. الصيغة: [{"question":"","options":["","","",""],"correct_index":0,"explanation":""}]`;
  const raw = await callAi(prompt, system, 2500, true);
  const arr = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const rows = [];
  for (const q of Array.isArray(arr) ? arr : []) {
    if (!q?.question || !Array.isArray(q.options) || q.options.length !== 4) continue;
    const ci = Number(q.correct_index);
    if (!(ci >= 0 && ci <= 3)) continue;
    rows.push({
      module_slug: slug, question: String(q.question), options: q.options.map(String),
      correct_index: ci, explanation: String(q.explanation || ""), question_hash: await hash(slug + q.question),
    });
  }
  if (rows.length) {
    await db("training_ai_questions?on_conflict=question_hash", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(rows),
    });
  }
}

async function getQuestions(slug: string, topic: string, context: string) {
  const count = 2 + Math.floor(Math.random() * 3); // 2..4
  const list = async () => {
    const r = await db(`training_ai_questions?module_slug=eq.${encodeURIComponent(slug)}&select=*&order=used_count.asc&limit=40`);
    return r.ok ? await r.json() : [];
  };
  let bank: any[] = await list();
  let generated = false;
  if (bank.length < BANK_MIN) {
    try { await refillBank(slug, topic, context); generated = true; bank = await list(); }
    catch (e) { if (!bank.length) throw e; } // serve what we have if refill fails
  }
  // least-used first, shuffled within the pool for variety
  const pool = bank.slice(0, Math.max(count * 2, 8)).sort(() => Math.random() - 0.5).slice(0, count);
  for (const q of pool) {
    db(`training_ai_questions?id=eq.${q.id}`, { method: "PATCH", body: JSON.stringify({ used_count: q.used_count + 1 }) });
  }
  return { questions: pool.map((q) => ({ question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation })), from_bank: !generated, bank_size: bank.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Missing authorization token" }, 401);
    if (!(await getUser(auth))?.id) return json({ error: "Invalid or expired session" }, 401);

    const p = await req.json();
    const topic = String(p.topic || "التدريب").slice(0, 120);
    const context = String(p.context || "").slice(0, 6000);

    if (p.action === "questions") {
      const slug = String(p.slug || topic).slice(0, 80);
      return json(await getQuestions(slug, topic, context));
    }
    const question = String(p.question || "").slice(0, 500).trim();
    if (!question) return json({ error: "Empty question" }, 400);
    const system = "أنت مدرب لموظفي المصرية للاتصالات WE. اشرح بالعربية المبسطة وبإيجاز اعتماداً على المحتوى المعطى فقط.";
    const text = await callAi(`الموضوع: ${topic}\nالمحتوى:\n${context}\n\nالسؤال: ${question}`, system, 800);
    return json({ text });
  } catch (e) {
    const err = e as any;
    console.error("trainer-ai:", err.message);
    return json({ error: "AI service failed", code: err.code || "AI_FAILED", detail: String(err.message).slice(0, 200) }, err.code === "NO_KEY" ? 503 : 502);
  }
});
