-- =========================================================================
-- عيادات العوضي - RLS Policies (RESTRICTED)
-- القراءة فقط لمن لديه حساب في clinic_profiles
-- =========================================================================

-- Drop ALL existing policies on clinic tables
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('clinic_profiles','clinic_categories','doctors','clinic_branches','clinic_appointments','clinic_patients','clinic_prescriptions','clinic_events')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s" ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.clinic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- clinic_profiles: any authenticated user can read (NO self-reference)
-- =============================================
CREATE POLICY "p_profiles_select"
    ON public.clinic_profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "p_profiles_update"
    ON public.clinic_profiles FOR UPDATE
    USING (
        id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid() AND clinic_role = 'clinic_admin')
    );

CREATE POLICY "p_profiles_insert"
    ON public.clinic_profiles FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid() AND clinic_role = 'clinic_admin')
    );

-- =============================================
-- All other tables: must exist in clinic_profiles to access
-- (safe — no circular dependency because clinic_profiles SELECT uses auth.uid() IS NOT NULL)
-- =============================================

-- clinic_categories
CREATE POLICY "p_categories_select"
    ON public.clinic_categories FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_categories_all"
    ON public.clinic_categories FOR ALL
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid() AND clinic_role = 'clinic_admin'));

-- doctors
CREATE POLICY "p_doctors_select"
    ON public.doctors FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_doctors_all"
    ON public.doctors FOR ALL
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid() AND clinic_role = 'clinic_admin'));

-- clinic_branches
CREATE POLICY "p_branches_select"
    ON public.clinic_branches FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_branches_all"
    ON public.clinic_branches FOR ALL
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid() AND clinic_role = 'clinic_admin'));

-- clinic_appointments
CREATE POLICY "p_appointments_select"
    ON public.clinic_appointments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_appointments_insert"
    ON public.clinic_appointments FOR INSERT
    WITH CHECK (true);
CREATE POLICY "p_appointments_update"
    ON public.clinic_appointments FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));

-- clinic_patients
CREATE POLICY "p_patients_select"
    ON public.clinic_patients FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_patients_insert"
    ON public.clinic_patients FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_patients_update"
    ON public.clinic_patients FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_patients_delete"
    ON public.clinic_patients FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));

-- clinic_prescriptions
CREATE POLICY "p_prescriptions_select"
    ON public.clinic_prescriptions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_prescriptions_insert"
    ON public.clinic_prescriptions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_prescriptions_update"
    ON public.clinic_prescriptions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_prescriptions_delete"
    ON public.clinic_prescriptions FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));

-- clinic_events
CREATE POLICY "p_events_select"
    ON public.clinic_events FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_events_insert"
    ON public.clinic_events FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));
CREATE POLICY "p_events_update"
    ON public.clinic_events FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.clinic_profiles WHERE id = auth.uid()));

NOTIFY pgrst, 'reload schema';
