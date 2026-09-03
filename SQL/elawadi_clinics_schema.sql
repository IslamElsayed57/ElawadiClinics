-- =========================================================================
-- عيادات العوضي (Elawadi Clinics) - Dashboard Schema (INCREMENTAL EXTENSION)
-- =========================================================================
-- هذا الملف ← مكمل للملفات الموجودة عندك واللي شغّلتها قبل كده:
--     1) files/doctors_and_appointments_setup.sql   (جدول doctors + clinic_appointments)
--     2) files/clinic_branches_setup.sql            (جدول clinic_branches + إعادة الربط)
--
-- شغّل هذا الملف أولاً بعدهم: بيفتح الجداول الجديدة (الصلاحيات، المرضى،
-- الروشتات، الأقسام، الأحداث) وبيفرد على جدول doctors الحقول الجديدة
-- (اسم إنجليزي، نبذة، أوقات العمل، جلسات مرور، قيمة إعادة الكشف).
-- =========================================================================

-- 0) EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1) جدول صلاحيات العيادات (نفس فكرة جدول profiles لكن خاص بالعيادة)
--    roles: admin / staff / doctor
--    admin: تحكم كامل + اختيار مين يشوف تقارير/مرضى مين
--    staff/doctor: قراءة حسب الإعدادات اللي عملها الأدمن
--    فعّل الجدول وبعدين (force) ضيف أول أدمن هنا يدوي:
--    INSERT INTO public.clinic_profiles (id, full_name, clinic_role, is_active)
--    VALUES ('<USER_ID من Authentication>', 'Admin', 'clinic_admin', true);
-- =========================================================================
create table if not exists public.clinic_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    mobile text,
    clinic_role text not null default 'staff',
    is_active boolean not null default true,
    can_view_reports boolean not null default false,
    report_doctor_ids uuid[] default '{}',
    can_view_patients boolean not null default true,
    patient_doctor_ids uuid[] default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.clinic_profiles enable row level security;

drop policy if exists "Clinic profiles readable by authenticated" on public.clinic_profiles;
create policy "Clinic profiles readable by authenticated"
    on public.clinic_profiles for select
    using (auth.uid() = id or exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Only admin can update clinic profiles" on public.clinic_profiles;
create policy "Only admin can update clinic profiles"
    on public.clinic_profiles for update
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'));

drop policy if exists "Only admin can insert clinic profiles" on public.clinic_profiles;
create policy "Only admin can insert clinic profiles"
    on public.clinic_profiles for insert
    with check (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'));

-- =========================================================================
-- 2) جدول أقسام العيادات (Categories - خاص بالعيادة، مش الأقسام بتاعة الصيدلية)
--    الإضافة والتعديل للأدمن فقط، والباقي قراءة
-- =========================================================================
create table if not exists public.clinic_categories (
    id uuid primary key default gen_random_uuid(),
    name_ar text not null,
    name_en text,
    slug text,
    icon text default 'fa-stethoscope',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);
alter table public.clinic_categories enable row level security;

drop policy if exists "Clinic categories readable by authenticated" on public.clinic_categories;
create policy "Clinic categories readable by authenticated"
    on public.clinic_categories for select using (true);

drop policy if exists "Only admin write clinic categories" on public.clinic_categories;
create policy "Only admin write clinic categories"
    on public.clinic_categories for all
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'));

-- =========================================================================
-- 2b) تفريد جدول clinic_branches (الموجود من ملف clinic_branches_setup.sql)
--     إضافة عمود الاسم الإنجليزي + سياسات READ للمصادقين و WRITE للأدمن
--     (الملف القديم مسموح فيه قراءة الفروع النشطة للجمهور فقط، ومفيش
--      سياسات للأدمن عشان يضيف/يعدل — هنا بنضيفهم)
-- =========================================================================
alter table public.clinic_branches
    add column if not exists name_en text;

drop policy if exists "Clinic branches readable by authenticated" on public.clinic_branches;
create policy "Clinic branches readable by authenticated"
    on public.clinic_branches for select using (true);

drop policy if exists "Only admin write clinic branches" on public.clinic_branches;
create policy "Only admin write clinic branches"
    on public.clinic_branches for all
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'));

-- =========================================================================
-- 3) تفريد جدول DOCTORS الموجود بـ حقول لوحة العيادات
--    (بيشاور على clinic_branches ومتوافق مع صفحة الحجز)
-- =========================================================================
alter table public.doctors
    add column if not exists name_en text,
    add column if not exists bio text,
    add column if not exists category_id uuid references public.clinic_categories(id),
    add column if not exists working_hours jsonb default '[]'::jsonb,
    add column if not exists new_visit_fee numeric(10,2) default 0,
    add column if not exists followup_fee numeric(10,2) default 0,
    add column if not exists updated_at timestamptz default now();

-- سياسات: الأدمن إضافة/تعديل، والمصادق للقراءة
drop policy if exists "Clinic doctors readable by authenticated" on public.doctors;
create policy "Clinic doctors readable by authenticated"
    on public.doctors for select using (true);

drop policy if exists "Only admin write clinic doctors" on public.doctors;
create policy "Only admin write clinic doctors"
    on public.doctors for all
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'));

-- =========================================================================
-- 4) جدول المرضى (Patient Profile)
--    بيجمع بيانات المريض + صور الروشتة والتحاليل + الطبيب المسؤول
-- =========================================================================
create table if not exists public.clinic_patients (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    gender text not null default 'male',
    age int,
    phone text,
    is_new_visit boolean not null default true,
    complaint_type text,
    complaint_details text,
    prescription_image text,
    lab_image text,
    doctor_id uuid references public.doctors(id),
    status text not null default 'active',
    visits_count int not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.clinic_patients enable row level security;

drop policy if exists "Clinic patients readable" on public.clinic_patients;
create policy "Clinic patients readable"
    on public.clinic_patients for select
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic patients insert" on public.clinic_patients;
create policy "Clinic patients insert"
    on public.clinic_patients for insert
    with check (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic patients update" on public.clinic_patients;
create policy "Clinic patients update"
    on public.clinic_patients for update
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic patients delete" on public.clinic_patients;
create policy "Clinic patients delete"
    on public.clinic_patients for delete
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

-- =========================================================================
-- 5) جدول الروشتات (Prescriptions)
--    الادوية jsonb: [{ name, dosage, instructions }] + رقم المرضى بتاع الروشتة
-- =========================================================================
create table if not exists public.clinic_prescriptions (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid references public.clinic_patients(id) on delete cascade,
    patient_name text not null,
    patient_age int,
    patient_phone text,
    doctor_name text not null,
    doctor_id uuid references public.doctors(id),
    doctor_signature_image text,
    medicines jsonb not null default '[]'::jsonb,
    notes text,
    pdf_url text,
    created_at timestamptz not null default now()
);
alter table public.clinic_prescriptions enable row level security;

drop policy if exists "Clinic prescriptions readable" on public.clinic_prescriptions;
create policy "Clinic prescriptions readable"
    on public.clinic_prescriptions for select
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic prescriptions insert" on public.clinic_prescriptions;
create policy "Clinic prescriptions insert"
    on public.clinic_prescriptions for insert
    with check (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic prescriptions update" on public.clinic_prescriptions;
create policy "Clinic prescriptions update"
    on public.clinic_prescriptions for update
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic prescriptions delete" on public.clinic_prescriptions;
create policy "Clinic prescriptions delete"
    on public.clinic_prescriptions for delete
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

-- =========================================================================
-- 6) جدول حجوزات العيادة - بوليصة قراءة/تعديل للموظفين
--    (الجدول نفسه اتفرّد من ملف appointments_setup - هنا بنضيف الـ policies)
-- =========================================================================
alter table public.clinic_appointments enable row level security;

drop policy if exists "Public can insert clinic appointments" on public.clinic_appointments;
create policy "Public can insert clinic appointments"
    on public.clinic_appointments for insert with check (true);

drop policy if exists "Authenticated can read clinic appointments" on public.clinic_appointments;
create policy "Authenticated can read clinic appointments"
    on public.clinic_appointments for select
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Authenticated can update clinic appointments" on public.clinic_appointments;
create policy "Authenticated can update clinic appointments"
    on public.clinic_appointments for update
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

-- =========================================================================
-- 7) جدول الأحداث/الإشعارات (اختياري للتنبيهات الداخلية)
-- =========================================================================
create table if not exists public.clinic_events (
    id uuid primary key default gen_random_uuid(),
    type text not null,
    ref_id uuid,
    title text,
    payload jsonb default '{}'::jsonb,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);
alter table public.clinic_events enable row level security;

drop policy if exists "Clinic events readable" on public.clinic_events;
create policy "Clinic events readable"
    on public.clinic_events for select
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

drop policy if exists "Clinic events insert" on public.clinic_events;
create policy "Clinic events insert"
    on public.clinic_events for insert with check (true);

drop policy if exists "Clinic events update" on public.clinic_events;
create policy "Clinic events update"
    on public.clinic_events for update
    using (exists (select 1 from public.clinic_profiles cp where cp.id = auth.uid()));

-- =========================================================================
-- 8) STORAGE BUCKET لرفع صور العيادة (الروشتة / التحاليل / توقيع الطبيب)
--    من واجهة Supabase: Storage → New bucket → name: clinic-uploads → Public
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('clinic-uploads', 'clinic-uploads', true)
on conflict (id) do nothing;

drop policy if exists "Clinic uploads read" on storage.objects;
create policy "Clinic uploads read"
    on storage.objects for select
    using (bucket_id = 'clinic-uploads');

drop policy if exists "Clinic uploads write" on storage.objects;
create policy "Clinic uploads write"
    on storage.objects for insert with check (bucket_id = 'clinic-uploads' and auth.role() = 'authenticated');

-- =========================================================================
-- مهم جداً بعد التشغيل: سجّل الأدمن الأول في جدول clinic_profiles
--     INSERT INTO public.clinic_profiles (id, full_name, clinic_role, is_active)
--     VALUES ('<UUID من Authentication>', 'مدير النظام', 'clinic_admin', true);
-- من غير كده محدش يقرا الجداول الخاصة بالعيادة.
-- =========================================================================