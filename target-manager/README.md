# WE Target Manager — Target & Sales Performance Management System

**WE-Core Sales Target & Performance Management System**

نظام احترافي لإدارة ومتابعة Target المبيعات والأداء، مدمج بالكامل داخل منصة **WE-Core** ومصمم بالهوية البصرية للمصرية للاتصالات WE.

---

## 🌟 الميزات الأساسية

1. **الدمج الكامل مع نظام Authentication الحالي**:
   - لا يتطلب إنشاء نظام تسجيل دخول جديد.
   - يعتمد على الـ Cookie `sb-access-token` وجدول `profiles` الموجود في Supabase.

2. **دعم أدوار المستويات الهيكلية (Roles & Hierarchy)**:
   - **Agent (الموظف)**: لوحة الأداء الفردي فقط.
   - **Branch Manager (مدير الفرع)**: لوحة أداء الفرع وجدول أداء الموظفين التابعين له.
   - **Area Manager (مدير المنطقة)**: لوحة أداء المنطقة ومتابعة الفروع داخل منطقته.
   - **Supervisor (المشرف)**: لوحة التحكم الإشرافية والتنقل بين المناطق والفروع والموظفين.
   - **Admin (المسؤول)**: صلاحيات كاملة على كافة المستويات.

3. **محرك الحسابات (Target Calculator)**:
   - **Total Lines**: مجموع (`PT12` + `Super Kix` + `New Control Tazbeet` + `Data`).
   - **مستقل (Independent KPIs)**: `ADSL` + `Fixed` + `WE Pay`.
   - **الحسابات**: `Achievement %`, `Remaining`, `Projection`, `Daily Target`, `Deficit`, `Today's Required`, `Required Daily`, و `Status`.

4. **WE AI Coach (مدرب الذكاء الاصطناعي)**:
   - تحليل مخصص يعتمد على دور المستخدم ويتم تشغيله عبر **Supabase Edge Function** دون كشف API Keys في الـ Frontend.
   - نظام Caching لتخزين التحليلات وتخفيض الاستهلاك.

5. **تصدير التقارير (Excel & Google Sheets)**:
   - تصدير ملفات Excel CSV مدعومة بالرمز UTF-8 BOM للغة العربية.
   - إمكانية التصدير الآمن لـ Google Sheets من خلال Edge Function.

---

## 📁 الهيكل التنفيذي للملفات

```text
target-manager/
├── index.html                  # موجه الصفحات حسب Role المستخدم
├── pages/
│   ├── agent.html              # لوحة أداء الموظف الفردي
│   ├── branch-manager.html     # لوحة مدير الفرع
│   ├── area-manager.html       # لوحة مدير المنطقة
│   ├── supervisor.html         # لوحة المشرف العام
│   ├── performance.html        # تسجيل وإدخال الأداء اليومي
│   ├── history.html            # السجل التاريخي والتصدير
│   └── settings.html           # إعداد فترات ومستهدفات المبيعات
├── css/
│   ├── global.css              # المتغيرات والألوان وهوية WE
│   ├── dashboard.css           # تنسيقات الهيدر، السايدبار، والـ KPIs
│   ├── responsive.css          # التجاوب مع الجوال والشاشات المختلفة
│   └── components.css          # الجداول، المودالز، والبادجات
├── js/
│   ├── app.js                  # المتحكم الرئيسي والتهيئة
│   ├── auth.js                 # التكامل مع auth.js الأساسي للموقع
│   ├── permissions.js          # صلاحيات الأدوار والتوجيه
│   ├── dashboard.js            # عرض اللوحات والتفاعل
│   ├── target-calculator.js    # محرك الحسابات الرياضية
│   ├── charts.js               # رسوم Chart.js التفاعلية
│   ├── api.js                  # ربط Supabase REST & Edge Functions
│   ├── ai.js                   # مدرب الذكاء الاصطناعي WE AI Coach
│   └── utils.js                # التنسيق وتصدير الإكسيل
├── tests/
│   └── target-calculator.test.js # اختبارات وحدة محرك الحسابات
└── README.md
```

---

## 🗄️ إعداد قاعدة البيانات (Supabase Migration)

يوجد ملف الهجرة SQL جاهز للتطبيق داخل Supabase SQL Editor:
`supabase/migrations/20261001_target_manager_schema.sql`

تشمل الجداول:
- `profiles` (توسيع الجدول الحالي بأعمدة `role`, `branch`, `area`, `supervisor_id`)
- `target_periods`
- `targets`
- `daily_performance`
- `ai_analysis`
- `audit_logs`

مع تطبيق وسياسات **Row Level Security (RLS)** لضمان حماية البيانات على مستوى السيرفر.
