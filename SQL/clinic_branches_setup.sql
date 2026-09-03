-- =========================================================================
-- صيدليات العوضي — فصل فروع "العيادات" عن فروع "الصيدليات"
-- شغّل هذا الملف كامل مرة واحدة من SQL Editor في لوحة تحكم Supabase
-- (ده مكمل للملف اللي قبله doctors_and_appointments_setup.sql، ومطلوب
--  تشغيله بعده عشان يفصل جدول فروع العيادات عن جدول فروع الصيدليات)
-- =========================================================================

-- 1) جدول فروع العيادات (منفصل تماماً عن جدول "branches" بتاع الصيدليات)
--    أي فرع تضيفه هنا هيظهر بس في قايمة "فرع العيادة" في استمارة حجز
--    العيادات على الموقع — من غير ما يأثر على أي قسم تاني في الموقع
--    (التوصيل، الاستلام، صفحة الفروع، الخريطة... كلها لسه على جدول
--    branches الأصلي زي ما هي).
create table if not exists public.clinic_branches (
    id uuid primary key default gen_random_uuid(),
    name_ar text not null,        -- اسم فرع العيادة
    city text,                    -- المدينة (اختياري، للتصنيف لو حبيت)
    address text,
    phone text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.clinic_branches enable row level security;

drop policy if exists "Public can read active clinic branches" on public.clinic_branches;
create policy "Public can read active clinic branches"
    on public.clinic_branches
    for select
    using (is_active = true);

-- =========================================================================

-- 2) إعادة ربط جدول "doctors" بجدول clinic_branches بدل جدول الصيدليات
--    (كان بيشاور على public.branches غلط — دلوقتي هيشاور على
--     public.clinic_branches الصح)
alter table public.doctors
    drop constraint if exists doctors_branch_id_fkey;

alter table public.doctors
    add constraint doctors_branch_id_fkey
    foreign key (branch_id) references public.clinic_branches(id);

-- =========================================================================

-- 3) نفس الشيء لجدول "clinic_appointments"
alter table public.clinic_appointments
    drop constraint if exists clinic_appointments_branch_id_fkey;

alter table public.clinic_appointments
    add constraint clinic_appointments_branch_id_fkey
    foreign key (branch_id) references public.clinic_branches(id);

-- =========================================================================
-- ⚠️ مهم: لو كان عندك بيانات فعلية قبل كده في جدول doctors بـ branch_id
-- بيشاور على صفوف موجودة في جدول "branches" (فروع الصيدليات)، لازم
-- تحدّث القيم دي يدوياً بحيث تبقى بتشاور على IDs من جدول
-- clinic_branches الجديد (بعد ما تضيف فروع العيادات فيه)، وإلا
-- الـ ALTER TABLE فوق هيرفض بسبب تعارض الـ foreign key.
-- أسهل حل: امسح صفوف doctors التجريبية القديمة، ضيف فروع العيادات في
-- clinic_branches الأول، وبعدين ضيف الأطباء تاني بـ branch_id الصح.
-- =========================================================================
