-- =========================================================================
-- ربط قسم "الأطباء" في Elawadi Clinics بقسم "حجز موعد العيادات" في Customer Website
-- شغّل الملف كامل مرة واحدة من SQL Editor في Supabase (آمن تشغيله أكتر من مرة).
-- =========================================================================

-- 1) عمود الصورة الشخصية (الأفاتار) للدكتور
alter table public.doctors
    add column if not exists avatar_url text;

-- 2) توحيد قيمة الكشف: عمود fee القديم (اللي كان الموقع بيقراه) = قيمة الكشف الجديد
--    (اللوحة بقت تحدّثهم مع بعض، وده بيظبط الأطباء الحاليين)
update public.doctors
   set fee = new_visit_fee
 where coalesce(new_visit_fee, 0) > 0
   and fee is distinct from new_visit_fee;

-- 3) صلاحية القراءة العامة (لزوّار موقع العملاء) للأطباء والفروع النشطة
--    لو سياسات الـ RLS اتمسحت قبل كده، ده بيرجّعها من غير ما يمس الباقي.
drop policy if exists "public_read_active_doctors" on public.doctors;
create policy "public_read_active_doctors"
    on public.doctors for select
    to anon, authenticated
    using (is_active = true);

drop policy if exists "public_read_active_clinic_branches" on public.clinic_branches;
create policy "public_read_active_clinic_branches"
    on public.clinic_branches for select
    to anon, authenticated
    using (is_active = true);

-- 4) التحديث اللحظي (Realtime): أي تعديل في اللوحة يظهر في الموقع من غير refresh
do $$
begin
    alter publication supabase_realtime add table public.doctors;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.clinic_branches;
exception when duplicate_object then null;
end $$;

-- 5) حذف صور الأطباء القديمة من الـ Storage لما تتغير أو تتحذف
--    (بيسمح للأدمن بس، وبيشتغل على bucket clinic-uploads)
drop policy if exists "Clinic uploads delete" on storage.objects;
create policy "Clinic uploads delete"
    on storage.objects for delete
    using (
        bucket_id = 'clinic-uploads'
        and exists (
            select 1 from public.clinic_profiles cp
            where cp.id = auth.uid() and cp.clinic_role = 'clinic_admin'
        )
    );

-- ملاحظة: بعد التشغيل اعمل Hard Refresh للموقعين (Ctrl+Shift+R).
