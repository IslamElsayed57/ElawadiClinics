-- =========================================================================
-- صيدليات العوضي — إعداد جدولي "الأطباء" و"حجوزات العيادة" في Supabase
-- شغّل هذا الملف كامل مرة واحدة من SQL Editor في لوحة تحكم Supabase
-- =========================================================================

-- 1) جدول الأطباء
--    أي طبيب تضيفه هنا (ويكون is_active = true) هيظهر تلقائياً في صفحة
--    "حجز استشارات طبية" على الموقع، من غير ما تلمس الكود خالص.
create table if not exists public.doctors (
    id uuid primary key default gen_random_uuid(),
    name_ar text not null,                              -- اسم الطبيب
    specialty text not null,                             -- التخصص (يظهر كبادج فوق الاسم)
    title text,                                           -- الوصف/اللقب العلمي (اختياري)
    branch_id uuid references public.branches(id),        -- الفرع (من جدول branches الموجود عندك)
    fee numeric(10,2) not null default 0,                 -- قيمة الكشف
    avatar_icon text default 'fa-user-doctor',            -- أيقونة Font Awesome (اختياري)
    -- الأيام المتاحة فقط (من غير أوقات) — مثال: '{"السبت","الإثنين","الأربعاء"}'
    available_days text[] not null default '{}',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.doctors enable row level security;

-- السماح لأي زائر بقراءة الأطباء النشطين فقط (نفس فلسفة جدول products/categories عندك)
drop policy if exists "Public can read active doctors" on public.doctors;
create policy "Public can read active doctors"
    on public.doctors
    for select
    using (is_active = true);

-- =========================================================================

-- 2) جدول حجوزات العيادة (اللي بييجي من استمارة "تثبيت وتأكيد موعد العيادة")
create table if not exists public.clinic_appointments (
    id uuid primary key default gen_random_uuid(),
    doctor_id uuid references public.doctors(id),
    doctor_name text not null,
    branch_id uuid references public.branches(id),
    branch_name text not null,
    preferred_day text not null,      -- اليوم المفضل فقط (بدون وقت محدد)
    patient_name text not null,
    patient_phone text not null,
    notes text,
    status text not null default 'new',   -- new / confirmed / cancelled ... الخ حسب احتياجك
    created_at timestamptz not null default now()
);

alter table public.clinic_appointments enable row level security;

-- السماح لأي زائر بإرسال (INSERT) طلب حجز فقط — بدون قراءة حجوزات الغير
drop policy if exists "Public can insert clinic appointments" on public.clinic_appointments;
create policy "Public can insert clinic appointments"
    on public.clinic_appointments
    for insert
    with check (true);

-- =========================================================================
-- ملاحظة: لو عايز تشوف الحجوزات وتديرها من التطبيق بتاعك (الأدمن)، هتحتاج
-- تكون عامل تسجيل دخول Authenticated وتضيف policy إضافية للـ SELECT/UPDATE
-- خاصة بالأدمن فقط، أو تستخدم service_role key من السيرفر/الأدمن بانل.
-- =========================================================================
