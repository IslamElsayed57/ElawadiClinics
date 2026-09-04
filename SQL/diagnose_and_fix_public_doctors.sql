-- =========================================================================
-- عيادات العوضي — تشخيص + إصلاح ظهور الأطباء في موقع العملاء
-- شغّل الأقسام دي بالترتيب من SQL Editor في Supabase
-- =========================================================================


-- -------------------------------------------------------------------------
-- القسم 1: تشخيص — إيه اللي موجود فعلياً في جدول doctors (بصلاحية postgres
-- اللي بتتخطى الـ RLS، عشان تشوف الداتا الحقيقية بغض النظر عن الصلاحيات)
-- -------------------------------------------------------------------------
select
    d.id,
    d.name_ar,
    d.is_active,
    d.branch_id,
    cb.name_ar as branch_name,
    d.category_id,
    cc.name_ar as category_name,
    d.new_visit_fee,
    d.available_days
from public.doctors d
left join public.clinic_branches cb on cb.id = d.branch_id
left join public.clinic_categories cc on cc.id = d.category_id;

-- لو الجدول ده رجع صفوف وفيها is_active = true وbranch_name/category_name
-- ظاهرين صح → الداتا نفسها سليمة، والمشكلة في الصلاحيات (روح القسم 3).
-- لو branch_name أو category_name طلعوا NULL رغم إن branch_id/category_id
-- موجودين → معناها الـ id مش بيشاور على صف موجود فعلاً في الجدول التاني.


-- -------------------------------------------------------------------------
-- القسم 2: تشخيص — إيه اللي موقع العملاء (بدون تسجيل دخول) شايفه فعلياً.
-- هنحاكي صلاحية الزائر العادي (anon) بدل صلاحية postgres، وده هيوريك
-- بالظبط لو الصلاحيات فاضية أو لأ.
-- -------------------------------------------------------------------------
set local role anon;

select id, name_ar, is_active, branch_id, category_id
from public.doctors
where is_active = true;

reset role;

-- لو القسم ده رجع "Success. No rows returned" رغم إن القسم 1 فوق ورّى
-- صفوف موجودة → دي تأكيد قاطع إن المشكلة صلاحيات RLS بس، مش الداتا.


-- -------------------------------------------------------------------------
-- القسم 3: إعادة تفعيل صلاحية القراءة العامة (idempotent — آمن تشغيله
-- أي وقت، مش هيمسح حاجة). ده بيضيف صلاحية "جنب" أي صلاحيات تانية موجودة،
-- فلو الموظفين شغالين تمام، هيفضلوا شغالين، وموقع العملاء هيرجع يشتغل.
-- -------------------------------------------------------------------------
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

drop policy if exists "public_read_active_categories" on public.clinic_categories;
create policy "public_read_active_categories"
    on public.clinic_categories for select
    to anon, authenticated
    using (is_active = true);

-- =========================================================================
-- بعد تشغيل القسم 3، اعمل Hard Refresh لموقع العملاء (Ctrl+Shift+R) —
-- الأطباء لازم يرجعوا يظهروا فوراً من غير أي تعديل تاني في الكود.
-- =========================================================================
