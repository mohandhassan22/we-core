# WE Target Manager

متابعة Target المبيعات والأداء داخل نظام WE-Core. **HTML + CSS + Vanilla JS فقط**، بدون Framework ولا خطوة Build.

## الأدوار والمسؤوليات

| الدور | يرى | يكتب |
|---|---|---|
| **Agent** (موظف) | بياناته فقط | أداءه اليومي، داخل فترة Target الخاصة به فقط |
| **Store Manager** (مدير فرع) | فرعه كله، أو أي موظف فيه | Targets موظفي فرعه |
| **Area Manager** (مدير منطقة) | منطقته، أي فرع فيها، أي موظف | Targets موظفي فروع منطقته |
| **Admin** | كل شيء | كل شيء |

لا يوجد Supervisor في النظام. الدور الحقيقي يأتي من الخادم (`app_role()`)، وليس من المتصفح.

**التسلسل:** المنطقة مسجلة باسم مديرها (`areas.manager_id`)، والفرع باسم مديره (`branches.manager_id`)،
والموظف تابع لفرعه (`profiles.branch_id`). لإضافة موظف أو مدير: عدّل هذه الأعمدة (أو شاشة الأدمن).

## الأمن

- الواجهة **ليست** مصدر الصلاحيات. القراءة والكتابة تمر عبر **RLS** على كل الجداول، والإجماليات عبر Edge Function
  (`get-dashboard-data`, `verify_jwt: true`) تعمل بـ Token المستخدم نفسه.
- التعديل في JavaScript من DevTools لا يكشف أي بيانات إضافية.
- كل النصوص المعروضة تمر عبر `Utils.esc()` (حماية XSS)، وتصدير CSV يعطّل الصيغ (`=`, `+`, `-`, `@`).
- لا مفاتيح سرية في الواجهة (المفتاح الموجود هو Publishable key العام).
- سجل التدقيق (`audit_logs`) يُكتب من Triggers على الخادم.

## الملفات

```text
js/target-calculator.js   كل الحسابات (مصدر وحيد) + اختباراتها
js/api.js                 كل اتصال بـ Supabase / Edge Functions (بدون بيانات وهمية)
js/permissions.js         القوائم والتوجيه حسب الدور (للعرض فقط)
js/dashboard.js           رسم لوحات الموظف / الفرع / المنطقة، وتحديد الـ Targets
js/charts.js, ai.js, app.js, utils.js
pages/                    agent | branch-manager | area-manager | performance | history | settings
tests/                    calculator (Node) + ui-smoke (jsdom) + rls-smoke.sql
../supabase/migrations/   سجل تغييرات قاعدة البيانات المطبقة
```

## التشغيل والاختبار

```bash
node --test target-manager/tests/target-calculator.test.js
npm i --no-save jsdom && node --test target-manager/tests/ui-smoke.test.js
```

اختبار الصلاحيات على قاعدة البيانات: الصق `tests/rls-smoke.sql` في Supabase SQL Editor (يتراجع تلقائيًا ولا يترك بيانات).

## Edge Function

`get-dashboard-data` منشورة على Supabase وتحتوي نسخة من `target-calculator.js`. لتحميل المصدر:
`supabase functions download get-dashboard-data`. عند تعديل الحسابات انشر الدالة من جديد لتبقى النسختان متطابقتين.

## غير مكتمل بعد

- **AI Coach (Gemini):** يعمل حاليًا بتحليل قواعد حسابية مكتوب بوضوح في الواجهة. التكامل مع Gemini يحتاج Edge Function
  (المفتاح على الخادم فقط) ثم ضبط `AI_FUNCTION` في `js/ai.js`.
- **Google Sheets:** غير مفعّل (يحتاج Edge Function وبيانات اعتماد Google على الخادم). تصدير Excel/CSV يعمل من صفحة السجل.
- **Login:** `assets/js/login.js` ما زال يقرأ `profiles` كزائر لجلب الإيميل، لذلك قراءة `profiles` العامة مفتوحة. الأفضل التحويل لـ
  `hyper-task` (`action: get_email`) ثم إغلاق القراءة العامة.
