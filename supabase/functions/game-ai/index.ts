// Supabase Edge Function: game-ai
// Interactive WE Quiz Game Backend Engine
// - Completely independent from trainer-ai
// - Supports 5 API keys (GAME_AI_KEY_1 to GAME_AI_KEY_5) + 3 extra (up to GAME_AI_KEY_8)
// - Automatic token rotation and rate-limit fallback across all keys
// - Secure server-side validation: level gating, question generation, atomic scoring, leaderboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const MODEL = Deno.env.get("GAME_AI_MODEL") || Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

// In-memory key rotation tracker
let keyRotationIndex = 0;

/**
 * Collects all configured Gemini API keys (up to 8 keys).
 * Automatically reads GAME_AI_KEY_1 through GAME_AI_KEY_8.
 */
function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const val = Deno.env.get(`GAME_AI_KEY_${i}`);
    if (val && val.trim()) {
      keys.push(val.trim());
    }
  }
  // Fallbacks if individual numbered keys are not set
  if (keys.length === 0) {
    const singleGameKey = Deno.env.get("GAME_AI_KEY");
    if (singleGameKey && singleGameKey.trim()) keys.push(singleGameKey.trim());
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey && geminiKey.trim()) keys.push(geminiKey.trim());
  }
  return keys;
}

/**
 * Validates the caller's Supabase JWT and returns the User object.
 */
async function authenticateUser(authHeader: string) {
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Calls Gemini with token rotation across available keys.
 */
async function generateWithRotatingKeys(prompt: string, keys: string[]): Promise<string> {
  if (keys.length === 0) {
    throw new Error("NO_AI_KEYS_CONFIGURED");
  }

  const numKeys = keys.length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < numKeys; attempt++) {
    const activeIndex = (keyRotationIndex + attempt) % numKeys;
    const apiKey = keys[activeIndex];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 3000,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (response.status === 429 || response.status === 403 || response.status >= 500) {
        const errorText = await response.text();
        console.warn(`[Game-AI] Key #${activeIndex + 1} throttled or failed (${response.status}): ${errorText.slice(0, 100)}`);
        lastError = new Error(`Key #${activeIndex + 1} status ${response.status}`);
        continue; // Rotate to next key
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini error (${response.status}): ${errorText.slice(0, 150)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
      if (!text) throw new Error("Empty candidate response");

      // Advance rotation index for the next call (load-balancing)
      keyRotationIndex = (activeIndex + 1) % numKeys;
      return text;
    } catch (err: any) {
      console.warn(`[Game-AI] Attempt with key #${activeIndex + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All ${numKeys} AI keys failed or exhausted: ${lastError?.message || "unavailable"}`);
}

// Google Sheet source. Default: one tab (gid=1212703104).
// To use several tabs set GAME_SHEET_CSV_URLS = comma-separated export URLs (one per tab).
const SHEET_CSV_URLS: string[] = (
  Deno.env.get("GAME_SHEET_CSV_URLS") ||
  Deno.env.get("GAME_SHEET_CSV_URL") ||
  "https://docs.google.com/spreadsheets/d/1Ne0kI6Ddfb7bTiEdkK6fnW1IdyIEjCqM0A1TG9KTY6Y/export?format=csv&gid=1212703104"
).split(",").map((u) => u.trim()).filter(Boolean);

const sheetCache = new Map<string, { text: string; time: number }>();

/**
 * Fetches a random tab from the Google Sheet (CSV) with a 5-minute cache per tab.
 */
async function fetchGoogleSheetContent(): Promise<string> {
  const url = SHEET_CSV_URLS[Math.floor(Math.random() * SHEET_CSV_URLS.length)];
  const now = Date.now();
  const cached = sheetCache.get(url);
  if (cached && now - cached.time < 300000) return cached.text;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const text = await res.text();
      // Verify response is actual CSV and not a Google login page
      if (!/^\s*<(!doctype|html)/i.test(text)) {
        const trimmed = text.slice(0, 30000);
        sheetCache.set(url, { text: trimmed, time: now });
        console.log(`[Game-AI] Sheet tab loaded (${trimmed.length} chars)`);
        return trimmed;
      }
    }
    console.warn("[Game-AI] Google Sheet returned HTML or 401. Ensure sheet has 'Anyone with the link can view' permission.");
  } catch (err: any) {
    console.warn("[Game-AI] Could not fetch Google Sheet:", err.message);
  }
  return cached?.text || "";
}

/**
 * Difficulty profile per game level (1-2 easy, 3-4 medium, 5+ hard).
 */
function getDifficultyProfile(level: number): { name: string; rules: string } {
  if (level <= 2) {
    return {
      name: "سهل",
      rules: `- كل سؤال مبني على معلومة واحدة مباشرة من صف واحد في الشيت (رقم، سن، مدة، مستند).
- صياغة بسيطة وواضحة، والاختيارات الخاطئة بعيدة نسبياً عن الصحيحة.
- بدون مواقف مركبة وبدون حسابات.`,
    };
  }
  if (level <= 4) {
    return {
      name: "متوسط",
      rules: `- اجعل السؤال في صورة موقف قصير من العمل (عميل أجنبي جاء بمستند معين) واسأل عن الإجراء الصحيح.
- يجب أن تكون 2 على الأقل من الاختيارات الخاطئة قريبة جداً ومقنعة (أرقام أو شروط متشابهة من الشيت).
- اربط بين معلومتين من الشيت كحد أقصى.`,
    };
  }
  return {
    name: "صعب",
    rules: `- اجعل السؤال موقفاً مركباً يجمع 2-3 قواعد من الشيت معاً (مثل نوع التأشيرة + مدة الإقامة + فترة السماح 30 يوم + عدد الخطوط المسموح).
- أدخل فخاً في التفاصيل (استثناء، رقم قريب، أو الفرق بين نوعين من المستندات).
- كل الاختيارات تبدو منطقية ولا يُعرف الصحيح إلا بمعرفة دقيقة بالتعليمات.`,
  };
}

const QUESTION_ANGLES = [
  "الأعمار والحدود الدنيا",
  "المستندات المطلوبة وبياناتها",
  "تواريخ الانتهاء وفترات السماح",
  "عدد الخطوط والضوابط",
  "الحالات الخاصة والاستثناءات والممنوعات",
  "خطوات التسجيل على السيستم",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calculates current level and threshold for a given score.
 * Formula: T(n) = 20 * (1.10)^(n-1)
 */
function calculateLevel(score: number): { currentLevel: number; completedLevels: number; nextThreshold: number; prevThreshold: number } {
  if (score < 0) score = 0;
  let level = 0;
  let threshold = 20;

  while (true) {
    level++;
    threshold = Math.ceil(20.0 * Math.pow(1.10, level - 1));
    if (score < threshold) break;
  }

  const completedLevels = Math.max(0, level - 1);
  const currentLevel = Math.max(1, level);
  const nextThreshold = threshold;
  const prevThreshold = currentLevel > 1 ? Math.ceil(20.0 * Math.pow(1.10, currentLevel - 2)) : 0;

  return { currentLevel, completedLevels, nextThreshold, prevThreshold };
}

/**
 * SHA-256 hash helper for question deduplication
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const user = await authenticateUser(authHeader);
    if (!user) {
      return json({ error: "Unauthorized or invalid session", code: "unauthorized" }, 401);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    // -------------------------------------------------------------
    // ACTION: get_progress
    // -------------------------------------------------------------
    if (action === "get_progress" || action === "get-progress") {
      let { data: progress } = await adminClient
        .from("game_users_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!progress) {
        const { data: created } = await adminClient
          .from("game_users_progress")
          .insert({
            user_id: user.id,
            total_score: 0,
            current_level: 1,
            completed_levels: 0,
            total_correct: 0,
            total_wrong: 0,
          })
          .select()
          .single();
        progress = created || { total_score: 0, current_level: 1, completed_levels: 0, total_correct: 0, total_wrong: 0 };
      }

      const lvl = calculateLevel(progress.total_score);
      const span = Math.max(1, lvl.nextThreshold - lvl.prevThreshold);
      const curInLevel = Math.max(0, progress.total_score - lvl.prevThreshold);
      const progressPct = Math.min(100, Math.round((curInLevel / span) * 100));

      return json({
        user_id: user.id,
        total_score: progress.total_score,
        current_level: progress.current_level,
        completed_levels: progress.completed_levels,
        total_correct: progress.total_correct,
        total_wrong: progress.total_wrong,
        next_threshold: lvl.nextThreshold,
        prev_threshold: lvl.prevThreshold,
        progress_pct: progressPct,
      });
    }

    // -------------------------------------------------------------
    // ACTION: start_quiz (ALWAYS POWERED BY GEMINI AI + GOOGLE SHEET)
    // -------------------------------------------------------------
    if (action === "start_quiz" || action === "start-quiz") {
      // Get user's progress
      let { data: progress } = await adminClient
        .from("game_users_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Level = the PLAYER's level (derived from total score), never chosen by the client.
      const requestedLevel = calculateLevel(progress?.total_score || 0).currentLevel;

      const chosenQuestions: any[] = [];
      const keys = getApiKeys();
      const diff = getDifficultyProfile(requestedLevel);
      const angles = shuffle(QUESTION_ANGLES).slice(0, 3).join("، ");

      // Recently answered questions of this user (avoid repeats)
      const recentIds: string[] = [];
      const recentTexts: string[] = [];
      {
        const { data: recentAns } = await adminClient
          .from("game_quiz_answers")
          .select("question_id")
          .eq("user_id", user.id)
          .order("answered_at", { ascending: false })
          .limit(40);
        for (const r of recentAns || []) recentIds.push(r.question_id);
        if (recentIds.length > 0) {
          const { data: recentQ } = await adminClient
            .from("game_questions")
            .select("question_text")
            .in("id", recentIds.slice(0, 25));
          for (const q of recentQ || []) recentTexts.push(q.question_text);
        }
      }

      // Fetch live Google Sheet content and shuffle rows so each round focuses on different data
      const sheetData = await fetchGoogleSheetContent();
      let sheetSnippets = sheetData;
      if (sheetData) {
        const rows = sheetData.split("\n").filter((r) => r.replace(/[,\s"]/g, "").length > 5);
        sheetSnippets = shuffle(rows).slice(0, 35).join("\n");
      }

      const avoidBlock = recentTexts.length
        ? `\nأسئلة سبق أن أجاب عنها هذا الموظف (لا تكررها ولا تكرر فكرتها):\n${recentTexts.map((t) => "- " + t).join("\n")}\n`
        : "";

      const prompt = `أنت الذكاء الاصطناعي Game AI المتخصص في صناعة أسئلة كويز احترافية لموظفي المصرية للاتصالات WE.
المطلوب: 5 أسئلة اختيار من متعدد جديدة ومتنوعة بالعربية، مستوى الصعوبة: ${diff.name} (المستوى ${requestedLevel}).

قواعد مستوى الصعوبة:
${diff.rules}

مصدر الأسئلة الإلزامي (بيانات شيت تعليمات WE) - لا تستخدم أي معلومة من خارجه:
--- بداية بيانات الشيت ---
${sheetSnippets || "تعليمات تعاقد عملاء الأجانب، E-Visa، جواز السفر، الإقامة وفترة الـ 30 يوم، كارت المفوضية والسن، 5 خطوط صوت + 5 داتا."}
--- نهاية بيانات الشيت ---
${avoidBlock}
قواعد التوليد:
1. ركّز في هذه الجولة على المحاور: ${angles}، ونوّع بين الأسئلة بحيث لا يتشابه سؤالان.
2. كل سؤال له 4 اختيارات واضحة، وإجابة صحيحة واحدة فقط مطابقة حرفياً لأحد الاختيارات.
3. الإجابة الصحيحة يجب أن تكون مستخرجة من الشيت فعلاً، ولا تخترع أرقاماً غير موجودة فيه.
4. شرح مختصر لسبب صحة الإجابة بالاستناد لتعليمات الشيت.
5. الإخراج JSON فقط، مصفوفة من 5 كائنات بهذا الشكل:
[
  {
    "question_text": "نص السؤال؟",
    "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
    "correct_option": "اختيار 1",
    "explanation": "شرح سبب صحة الإجابة"
  }
]
رقم عشوائي لتنويع الجولة: ${Math.floor(Math.random() * 100000)}`;

      if (keys.length > 0) {
        try {
          const aiResponseText = await generateWithRotatingKeys(prompt, keys);
          const cleanedJson = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
          const generatedList = JSON.parse(cleanedJson);

          if (Array.isArray(generatedList)) {
            for (const item of generatedList) {
              if (
                item.question_text &&
                Array.isArray(item.options) &&
                item.options.length === 4 &&
                item.options.includes(item.correct_option) &&
                new Set(item.options).size === 4 &&
                chosenQuestions.length < 5
              ) {
                item.options = shuffle(item.options);
                const hash = await sha256(item.question_text);
                const { data: insertedQ } = await adminClient
                  .from("game_questions")
                  .insert({
                    level: requestedLevel,
                    question_text: item.question_text,
                    options: item.options,
                    correct_option: item.correct_option,
                    explanation: item.explanation || "",
                    content_hash: hash,
                    status: "active",
                    created_by: "gemini_sheet_ai",
                  })
                  .select("id, question_text, options")
                  .single();

                if (insertedQ) {
                  chosenQuestions.push(insertedQ);
                }
              }
            }
          }
        } catch (aiErr: any) {
          console.error("[Game-AI] AI Question Generation error:", aiErr.message);
        }
      }

      // Fallback: If AI fails or returns fewer than 5, pull from active DB questions
      if (chosenQuestions.length < 5) {
        const { data: dbFallbacks } = await adminClient
          .from("game_questions")
          .select("id, question_text, options")
          .eq("status", "active")
          .eq("level", requestedLevel)
          .order("created_at", { ascending: false })
          .limit(40);

        if (dbFallbacks) {
          const shuffled = [...dbFallbacks].sort(() => Math.random() - 0.5);
          for (const fb of shuffled) {
            if (chosenQuestions.length >= 5) break;
            if (!chosenQuestions.some((q) => q.id === fb.id) && !recentIds.includes(fb.id)) {
              chosenQuestions.push(fb);
            }
          }
        }
      }

      // Second fallback: any level (closest first) if this level has too few stored questions
      if (chosenQuestions.length < 5) {
        const { data: anyLevel } = await adminClient
          .from("game_questions")
          .select("id, question_text, options, level")
          .eq("status", "active")
          .limit(80);
        const sorted = shuffle(anyLevel || []).sort(
          (a: any, b: any) => Math.abs(a.level - requestedLevel) - Math.abs(b.level - requestedLevel),
        );
        for (const fb of sorted) {
          if (chosenQuestions.length >= 5) break;
          if (!chosenQuestions.some((q) => q.id === fb.id) && !recentIds.includes(fb.id)) {
            chosenQuestions.push(fb);
          }
        }
      }

      if (chosenQuestions.length < 5) {
        return json({
          error: "تعذر تجهيز 5 أسئلة مكتملة للجلسة. حاول مرة أخرى.",
          code: "insufficient_questions",
        }, 500);
      }

      // Shuffle the 5 questions
      const finalQuestions = chosenQuestions.slice(0, 5).sort(() => Math.random() - 0.5);
      const questionIds = finalQuestions.map((q) => q.id);

      // Create session
      const { data: session, error: sessErr } = await adminClient
        .from("game_quiz_sessions")
        .insert({
          user_id: user.id,
          level: requestedLevel,
          status: "in_progress",
          question_ids: questionIds,
          score_delta: 0,
          correct_count: 0,
          wrong_count: 0,
        })
        .select("id, level, started_at")
        .single();

      if (sessErr || !session) {
        return json({ error: "Failed to create session", detail: sessErr?.message }, 500);
      }

      // Return questions strictly WITHOUT correct_option or explanation
      const sanitizedQuestions = finalQuestions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
      }));

      return json({
        session_id: session.id,
        level: session.level,
        started_at: session.started_at,
        questions: sanitizedQuestions,
      });
    }

    // -------------------------------------------------------------
    // ACTION: submit_answer
    // -------------------------------------------------------------
    if (action === "submit_answer" || action === "submit-answer") {
      const { session_id, question_id, selected_option } = body;
      if (!session_id || !question_id || selected_option === undefined) {
        return json({ error: "Missing required parameters", code: "bad_request" }, 400);
      }

      // Verify session belongs to user
      const { data: session, error: sessErr } = await adminClient
        .from("game_quiz_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sessErr || !session) {
        return json({ error: "الجلسة غير موجودة", code: "session_not_found" }, 404);
      }

      if (session.status !== "in_progress") {
        return json({ error: "الجلسة منتهية أو غير نشطة", code: "session_inactive" }, 400);
      }

      // Check if already answered
      const { data: existingAns } = await adminClient
        .from("game_quiz_answers")
        .select("id")
        .eq("session_id", session_id)
        .eq("question_id", question_id)
        .maybeSingle();

      if (existingAns) {
        return json({ error: "تمت الإجابة عن هذا السؤال مسبقاً", code: "already_answered" }, 400);
      }

      // Fetch question details
      const { data: question } = await adminClient
        .from("game_questions")
        .select("correct_option, explanation")
        .eq("id", question_id)
        .maybeSingle();

      if (!question) {
        return json({ error: "السؤال غير موجود", code: "question_not_found" }, 404);
      }

      const isCorrect = String(selected_option).trim() === String(question.correct_option).trim();
      const points = isCorrect ? 2 : -1;

      // Insert individual answer
      await adminClient.from("game_quiz_answers").insert({
        session_id,
        question_id,
        user_id: user.id,
        selected_option: String(selected_option),
        is_correct: isCorrect,
        points_awarded: points,
      });

      // Update session statistics
      await adminClient
        .from("game_quiz_sessions")
        .update({
          score_delta: (session.score_delta || 0) + points,
          correct_count: (session.correct_count || 0) + (isCorrect ? 1 : 0),
          wrong_count: (session.wrong_count || 0) + (isCorrect ? 0 : 1),
        })
        .eq("id", session_id);

      // Update user cumulative progress
      let { data: prog } = await adminClient
        .from("game_users_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const oldScore = prog?.total_score || 0;
      const newScore = Math.max(0, oldScore + points);
      const lvlInfo = calculateLevel(newScore);

      await adminClient.from("game_users_progress").upsert({
        user_id: user.id,
        total_score: newScore,
        current_level: lvlInfo.currentLevel,
        completed_levels: lvlInfo.completedLevels,
        total_correct: (prog?.total_correct || 0) + (isCorrect ? 1 : 0),
        total_wrong: (prog?.total_wrong || 0) + (isCorrect ? 0 : 1),
        updated_at: new Date().toISOString(),
      });

      return json({
        is_correct: isCorrect,
        correct_option: question.correct_option,
        explanation: question.explanation,
        points_awarded: points,
        current_score: newScore,
        current_level: lvlInfo.currentLevel,
        completed_levels: lvlInfo.completedLevels,
      });
    }

    // -------------------------------------------------------------
    // ACTION: finish_quiz
    // -------------------------------------------------------------
    if (action === "finish_quiz" || action === "finish-session") {
      const { session_id } = body;
      if (!session_id) {
        return json({ error: "Missing session_id", code: "bad_request" }, 400);
      }

      const { data: session } = await adminClient
        .from("game_quiz_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!session) {
        return json({ error: "الجلسة غير موجودة", code: "session_not_found" }, 404);
      }

      if (session.status === "in_progress") {
        await adminClient
          .from("game_quiz_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", session_id);
      }

      const { data: prog } = await adminClient
        .from("game_users_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      return json({
        session_id: session.id,
        level: session.level,
        score_delta: session.score_delta,
        correct_count: session.correct_count,
        wrong_count: session.wrong_count,
        total_score: prog?.total_score || 0,
        current_level: prog?.current_level || 1,
        completed_levels: prog?.completed_levels || 0,
      });
    }

    // -------------------------------------------------------------
    // ACTION: get_leaderboard
    // -------------------------------------------------------------
    if (action === "get_leaderboard" || action === "get-leaderboard") {
      const { data: rows, error } = await adminClient.rpc("game_leaderboard", {
        p_user_id: user.id,
      });

      if (error) {
        return json({ error: error.message, code: "leaderboard_failed" }, 500);
      }

      return json({ leaderboard: rows || [] });
    }

    return json({ error: "Unknown action", code: "invalid_action" }, 400);
  } catch (err: any) {
    console.error("[Game-AI] Unhandled exception:", err.message);
    return json({ error: "Internal game server error", detail: err.message }, 500);
  }
});
