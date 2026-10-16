-- ============================================================
-- WE Quiz Game — Database Migration
-- Run in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. game_users_progress — cumulative progress per employee
CREATE TABLE IF NOT EXISTS public.game_users_progress (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score      INTEGER NOT NULL DEFAULT 0,
  current_level    INTEGER NOT NULL DEFAULT 1,
  completed_levels INTEGER NOT NULL DEFAULT 0,
  total_correct    INTEGER NOT NULL DEFAULT 0,
  total_wrong      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. game_questions — reusable question bank
CREATE TABLE IF NOT EXISTS public.game_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level            INTEGER NOT NULL DEFAULT 1,
  question_text    TEXT NOT NULL,
  options          JSONB NOT NULL,          -- ["opt A","opt B","opt C","opt D"]
  correct_option   TEXT NOT NULL,           -- exact text of the correct option
  explanation      TEXT NOT NULL DEFAULT '',
  source_reference TEXT,
  content_hash     TEXT,                    -- SHA-256 of question_text to deduplicate
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','disabled')),
  created_by       TEXT DEFAULT 'ai',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_questions_level_status ON public.game_questions(level, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_questions_hash ON public.game_questions(content_hash) WHERE content_hash IS NOT NULL;

-- 3. game_quiz_sessions — one session = 5 questions
CREATE TABLE IF NOT EXISTS public.game_quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level           INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','expired')),
  question_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ordered array of question UUIDs
  score_delta     INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  wrong_count     INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON public.game_quiz_sessions(user_id, status);

-- 4. game_quiz_answers — individual answers, unique per question per session
CREATE TABLE IF NOT EXISTS public.game_quiz_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.game_quiz_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.game_questions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  points_awarded  INTEGER NOT NULL,       -- +2 or -1
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)         -- prevent duplicate answers
);

CREATE INDEX IF NOT EXISTS idx_game_answers_session ON public.game_quiz_answers(session_id);

-- ============================================================
-- 5. Scoring function — calculate level from total_score
-- ============================================================
CREATE OR REPLACE FUNCTION public.game_calculate_level(p_total_score INTEGER)
RETURNS TABLE(current_level INTEGER, completed_levels INTEGER)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_level INTEGER := 0;
  v_threshold NUMERIC;
BEGIN
  -- Level thresholds: T(n) = 20 * 1.1^(n-1)
  -- Find highest level whose threshold is met
  LOOP
    v_level := v_level + 1;
    v_threshold := 20.0 * POWER(1.10, v_level - 1);
    EXIT WHEN p_total_score < CEIL(v_threshold);
  END LOOP;

  -- completed_levels = number of levels fully completed
  completed_levels := GREATEST(v_level - 1, 0);
  -- current_level = the level the user is working on (at least 1)
  current_level := GREATEST(v_level, 1);
  
  -- If score < 0, stay at level 1 with 0 completed
  IF p_total_score < 0 THEN
    current_level := 1;
    completed_levels := 0;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- ============================================================
-- 6. Leaderboard RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.game_leaderboard(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  rank         BIGINT,
  user_id      UUID,
  display_name TEXT,
  total_score  INTEGER,
  current_level INTEGER,
  completed_levels INTEGER,
  total_correct INTEGER,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      DENSE_RANK() OVER (ORDER BY gp.total_score DESC, gp.completed_levels DESC, gp.updated_at ASC) AS rk,
      gp.user_id,
      COALESCE(pr.full_name, pr.username, 'موظف') AS dname,
      gp.total_score,
      gp.current_level,
      gp.completed_levels,
      gp.total_correct
    FROM public.game_users_progress gp
    LEFT JOIN public.profiles pr ON pr.id = gp.user_id
    WHERE gp.total_score > 0
  )
  SELECT
    r.rk,
    r.user_id,
    r.dname,
    r.total_score,
    r.current_level,
    r.completed_levels,
    r.total_correct,
    (r.user_id = p_user_id) AS is_current_user
  FROM ranked r
  WHERE r.rk <= 10 OR r.user_id = p_user_id
  ORDER BY r.rk ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.game_leaderboard(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.game_leaderboard(UUID) FROM public, anon;

-- ============================================================
-- 7. RLS Policies
-- ============================================================
ALTER TABLE public.game_users_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_quiz_answers ENABLE ROW LEVEL SECURITY;

-- game_users_progress: user reads own only
DROP POLICY IF EXISTS gup_select_own ON public.game_users_progress;
CREATE POLICY gup_select_own ON public.game_users_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE from client — handled by edge function with service_role

-- game_questions: authenticated users can read active questions (without correct_option — enforced in edge function)
DROP POLICY IF EXISTS gq_select_active ON public.game_questions;
CREATE POLICY gq_select_active ON public.game_questions
  FOR SELECT TO authenticated
  USING (status = 'active');

-- game_quiz_sessions: user reads own sessions only
DROP POLICY IF EXISTS gs_select_own ON public.game_quiz_sessions;
CREATE POLICY gs_select_own ON public.game_quiz_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- game_quiz_answers: user reads own answers only
DROP POLICY IF EXISTS ga_select_own ON public.game_quiz_answers;
CREATE POLICY ga_select_own ON public.game_quiz_answers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 8. Helper index for leaderboard performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_game_progress_score ON public.game_users_progress(total_score DESC, completed_levels DESC);

-- ============================================================
-- 9. Atomic Answer Submission Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.game_submit_answer(
  p_session_id UUID,
  p_question_id UUID,
  p_selected_option TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := COALESCE(auth.uid(), (SELECT user_id FROM public.game_quiz_sessions WHERE id = p_session_id));
  v_session RECORD;
  v_question RECORD;
  v_is_correct BOOLEAN;
  v_points INTEGER;
  v_new_score INTEGER;
  v_level_info RECORD;
  v_existing_answer UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Verify session
  SELECT * INTO v_session FROM public.game_quiz_sessions
  WHERE id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_session.status <> 'in_progress' THEN
    RAISE EXCEPTION 'session_not_active' USING ERRCODE = '22000';
  END IF;

  -- Verify question is part of session
  IF NOT (v_session.question_ids @> to_jsonb(p_question_id::text)) THEN
    RAISE EXCEPTION 'question_not_in_session' USING ERRCODE = '22023';
  END IF;

  -- Check duplicate answer
  SELECT id INTO v_existing_answer FROM public.game_quiz_answers
  WHERE session_id = p_session_id AND question_id = p_question_id;

  IF FOUND THEN
    RAISE EXCEPTION 'already_answered' USING ERRCODE = '23505';
  END IF;

  -- Fetch question details
  SELECT * INTO v_question FROM public.game_questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Score
  v_is_correct := (TRIM(v_question.correct_option) = TRIM(p_selected_option));
  v_points := CASE WHEN v_is_correct THEN 2 ELSE -1 END;

  -- Insert answer
  INSERT INTO public.game_quiz_answers (
    session_id, question_id, user_id, selected_option, is_correct, points_awarded
  ) VALUES (
    p_session_id, p_question_id, v_user_id, p_selected_option, v_is_correct, v_points
  );

  -- Update session counts
  UPDATE public.game_quiz_sessions
  SET
    score_delta = score_delta + v_points,
    correct_count = correct_count + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
    wrong_count = wrong_count + (CASE WHEN v_is_correct THEN 0 ELSE 1 END)
  WHERE id = p_session_id;

  -- Ensure user progress row exists
  INSERT INTO public.game_users_progress (user_id, total_score, current_level, completed_levels, total_correct, total_wrong)
  VALUES (v_user_id, 0, 1, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Calculate new user score (floor at 0 points)
  SELECT total_score + v_points INTO v_new_score
  FROM public.game_users_progress WHERE user_id = v_user_id;

  IF v_new_score < 0 THEN
    v_new_score := 0;
  END IF;

  -- Recalculate level
  SELECT * INTO v_level_info FROM public.game_calculate_level(v_new_score);

  UPDATE public.game_users_progress
  SET
    total_score = v_new_score,
    current_level = v_level_info.current_level,
    completed_levels = v_level_info.completed_levels,
    total_correct = total_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
    total_wrong = total_wrong + (CASE WHEN v_is_correct THEN 0 ELSE 1 END),
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_option', v_question.correct_option,
    'explanation', v_question.explanation,
    'points_awarded', v_points,
    'current_score', v_new_score,
    'current_level', v_level_info.current_level,
    'completed_levels', v_level_info.completed_levels
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.game_submit_answer(UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.game_submit_answer(UUID, UUID, TEXT) FROM public, anon;

-- ============================================================
-- 10. Atomic Finish Session Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.game_finish_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := COALESCE(auth.uid(), (SELECT user_id FROM public.game_quiz_sessions WHERE id = p_session_id));
  v_session RECORD;
  v_user RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_session FROM public.game_quiz_sessions
  WHERE id = p_session_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Mark completed if still in progress
  IF v_session.status = 'in_progress' THEN
    UPDATE public.game_quiz_sessions
    SET status = 'completed', completed_at = now()
    WHERE id = p_session_id
    RETURNING * INTO v_session;
  END IF;

  SELECT * INTO v_user FROM public.game_users_progress WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'level', v_session.level,
    'score_delta', v_session.score_delta,
    'correct_count', v_session.correct_count,
    'wrong_count', v_session.wrong_count,
    'total_score', COALESCE(v_user.total_score, 0),
    'current_level', COALESCE(v_user.current_level, 1),
    'completed_levels', COALESCE(v_user.completed_levels, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.game_finish_session(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.game_finish_session(UUID) FROM public, anon;

-- ============================================================
-- 11. Initial Question Bank Seeds (WE Telecom Egypt)
-- ============================================================
INSERT INTO public.game_questions (level, question_text, options, correct_option, explanation, content_hash)
VALUES
(1, 'ما هو الكود المختصر للاستعلام عن رصيد خط وي WE مسبق الدفع؟',
 '["*550#", "*322#", "*555#", "*100#"]'::jsonb,
 '*555#', 'الكود المخصص للاستعلام عن رصيد وي كارت هو *555# وتكلفته 5 قروش.',
 encode(digest('q_seed_lvl1_1', 'sha256'), 'hex')),

(1, 'ما هي السرعة القصوى لباقة WE Super على خطوط الإنترنت المنزلي VDSL؟',
 '["حتى 15 ميجابت/ث", "حتى 30 ميجابت/ث", "حتى 70 ميجابت/ث", "حتى 100 ميجابت/ث"]'::jsonb,
 'حتى 30 ميجابت/ث', 'باقة سوبر Super من وي إنترنت منزلي توفر سرعة تصل حتى 30 ميجابت في الثانية.',
 encode(digest('q_seed_lvl1_2', 'sha256'), 'hex')),

(1, 'كم يبلغ الحد الأقصى لرصيد محفظة WE Pay الإلكترونية للمواطن وفق تعليمات البنك المركزي؟',
 '["50,000 جنيه", "100,000 جنيه", "200,000 جنيه", "500,000 جنيه"]'::jsonb,
 '200,000 جنيه', 'الحد الأقصى لرصيد محفظة الهاتف المحمول للأفراد هو 200,000 جنيه.',
 encode(digest('q_seed_lvl1_3', 'sha256'), 'hex')),

(1, 'ما هو رقم خدمة عملاء الدعم الفني للإنترنت المنزلي والدعم الموحد لشركة WE؟',
 '["111", "123", "888", "155"]'::jsonb,
 '111', 'رقم 111 أو 19777 هو الرقم الموحد لخدمة عملاء المصرية للاتصالات WE.',
 encode(digest('q_seed_lvl1_4', 'sha256'), 'hex')),

(1, 'ما هي وحدة المحاسبة في باقات كيكس KIX عند تصفح فيسبوك وواتساب؟',
 '["1 كيكس = 1 ميجابايت", "1 كيكس = 2 ميجابايت", "1 كيكس = 0.5 ميجابايت", "2 كيكس = 1 ميجابايت"]'::jsonb,
 '1 كيكس = 2 ميجابايت', 'في باقات كيكس يتم احتساب 1 كيكس = 2 ميجابايت لمواقع السوشيال ميديا المحددة.',
 encode(digest('q_seed_lvl1_5', 'sha256'), 'hex')),

(1, 'ما المدة المحددة لسداد فاتورة التليفون الأرضي بعد إصدارها قبل تطبيق فترة الاستقبال؟',
 '["10 أيام", "15 يوماً", "شهر كامل", "شهران"]'::jsonb,
 'شهر كامل', 'تمنح الشركة فترة سماح مدتها شهر كامل للإرسال ثم يتحول الخط إلى استقبال.',
 encode(digest('q_seed_lvl1_6', 'sha256'), 'hex')),

(2, 'ما هي سرعة باقة WE Ultra للإنترنت المنزلي؟',
 '["حتى 30 ميجابت/ث", "حتى 70 ميجابت/ث", "حتى 100 ميجابت/ث", "حتى 200 ميجابت/ث"]'::jsonb,
 'حتى 100 ميجابت/ث', 'باقة ألترا Ultra توفر سرعات تصل إلى 100 ميجابت/ث عبر كبائن الـ MSAN والفايبر.',
 encode(digest('q_seed_lvl2_1', 'sha256'), 'hex')),

(2, 'وفقاً لتعليمات الجهاز القومي لتنظيم الاتصالات NTRA، ما هو الحد الأقصى لخطوط المحمول المسجلة بالرقم القومي الواحد لكل مشغل بدون سجل تجاري؟',
 '["3 خطوط", "5 خطوط", "10 خطوط", "15 خطاً"]'::jsonb,
 '10 خطوط', 'الحد الأقصى لملكية خطوط المحمول للأفراد بالرقم القومي هو 10 خطوط لكل مشغل اتصالات.',
 encode(digest('q_seed_lvl2_2', 'sha256'), 'hex')),

(2, 'ما هي ميزة خدمة "سلفني شكراً" من وي WE وكيف يتم تفعيلها؟',
 '["*504#", "*999#", "*04#", "*550#"]'::jsonb,
 '*504#', 'يمكن استخدام كود *504# للاستفادة من خدمات سلفني شكراً عند نفاذ الرصيد.',
 encode(digest('q_seed_lvl2_3', 'sha256'), 'hex')),

(2, 'ما هو النظام المستخدم في خدمة العملاء لتسجيل ومتابعة أعطال وشكاوى الإنترنت المنزلي؟',
 '["BSS", "Remedy CRM", "SAP", "Outlook"]'::jsonb,
 'Remedy CRM', 'نظام ريميدي Remedy هو النظام المعتمد لتسجيل تذاكر الأعطال وتوجيهها للفرق الفنية.',
 encode(digest('q_seed_lvl2_4', 'sha256'), 'hex')),

(2, 'ما هي خاصية خدمة WE Mix الأساسية؟',
 '["دمج باقة المحمول مع الإنترنت المنزلي ومشاركتها مع العائلة", "شحن رصيد مجاني أسبوعياً", "خصم 50% على الهواتف", "إنترنت غير محدود بدون سياسة استخدام عادل"]'::jsonb,
 'دمج باقة المحمول مع الإنترنت المنزلي ومشاركتها مع العائلة', 'باقة وي ميكس تدمج باقة الإنترنت المنزلي مع باقة الموبايل وفاتورة واحدة مع إمكانية مشاركة الدقائق والميجات.',
 encode(digest('q_seed_lvl2_5', 'sha256'), 'hex')),

(3, 'ما هي البوابة التكنولوجية التي تحول شبكة النحاس التقليدية إلى خطوط فايبر تدعم VDSL؟',
 '["MSAN", "PSTN", "ISDN", "GSM"]'::jsonb,
 'MSAN', 'كبائن MSAN (Multi-Service Access Node) تربط بالألياف الضوئية لتقليل المسافة النحاسية ورفع السرعات.',
 encode(digest('q_seed_lvl3_1', 'sha256'), 'hex')),

(3, 'عند شحن كارت الشحن بقيمة 100 جنيه في مصر، ما هي قيمة الرصيد الصافي المتاح للاستخدام؟',
 '["100 جنيه", "85 جنيهاً", "70 جنيهاً", "60 جنيهاً"]'::jsonb,
 '70 جنيهاً', 'كارت 100 جنيه يعطي 70 جنيهاً رصيداً صافياً بعد خصم ضريبة القيمة المضافة وضريبة الجدول.',
 encode(digest('q_seed_lvl3_2', 'sha256'), 'hex')),

(3, 'ما هو الحد الأقصى للمعاملات اليومية الصادرة من محفظة WE Pay؟',
 '["10,000 جنيه", "30,000 جنيه", "60,000 جنيه", "100,000 جنيه"]'::jsonb,
 '60,000 جنيه', 'الحد الأقصى للتحويل والسحب اليومي من محفظة الهاتف المحمول هو 60,000 جنيه وفق ضوابط البنك المركزي.',
 encode(digest('q_seed_lvl3_3', 'sha256'), 'hex')),

(3, 'ما هو كود تحويل الرصيد من خط وي إلى خط وي آخر؟',
 '["*551*الرقم*المبلغ#", "*550*الرقم*المبلغ#", "*322*الرقم*المبلغ#", "*777*الرقم*المبلغ#"]'::jsonb,
 '*551*الرقم*المبلغ#', 'كود تحويل الرصيد في وي هو *551*الرقم المراد التحويل له*المبلغ#.',
 encode(digest('q_seed_lvl3_4', 'sha256'), 'hex'))
ON CONFLICT (content_hash) DO NOTHING;

