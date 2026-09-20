// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Authentication & Profile Guard
// Roles: admin / staff / doctor  (جدول clinic_profiles)
// ==========================================================================

// Last known role of the signed-in account. Used to decide which sidebar links
// to show BEFORE the profile finishes loading from Supabase, so links the
// account is not allowed to use never flash on screen while navigating.
const ROLE_CACHE_KEY = "elawadi_clinic_role";

class AuthService {
    constructor() {
        this.user = null;
        this.profile = null;

        // Runs synchronously when this script loads (before any network call):
        // the CSS rules keyed on <html data-clinic-role> (see style.css) then
        // keep the restricted sidebar links hidden from the very first paint.
        try {
            const cachedRole = localStorage.getItem(ROLE_CACHE_KEY);
            if (cachedRole) document.documentElement.setAttribute("data-clinic-role", cachedRole);
        } catch (e) { /* storage unavailable: links simply stay hidden until the profile loads */ }
    }

    /** Publishes the confirmed role on <html> and remembers it for the next page. */
    syncRoleAttribute() {
        if (!this.profile) return;
        const role = this.profile.clinic_role || "staff";
        document.documentElement.setAttribute("data-clinic-role", role);
        try { localStorage.setItem(ROLE_CACHE_KEY, role); } catch (e) { /* ignore */ }
    }

    clearRoleCache() {
        document.documentElement.removeAttribute("data-clinic-role");
        try { localStorage.removeItem(ROLE_CACHE_KEY); } catch (e) { /* ignore */ }
    }

    /**
     * Initializes auth state, checks session, fetches clinic profile
     * @param {boolean} isLoginPage - Whether the current page is login.html
     */
    async init(isLoginPage = false) {
        try {
            const { data: { session }, error } = await db.getClient().auth.getSession();

            if (error || !session) {
                this.clearRoleCache();
                if (!isLoginPage) window.location.href = "login.html";
                return false;
            }

            this.user = session.user;
            await this.loadUserProfile();
            this.syncRoleAttribute();

            // If profile is inactive, force sign out
            if (this.profile && !this.profile.is_active) {
                await this.signOut();
                alert(i18n.t("inactiveAccountError"));
                window.location.href = "login.html";
                return false;
            }

            if (isLoginPage) {
                window.location.href = "dashboard.html";
                return true;
            }

            this.renderUserUI();
            this.enforceRolePermissions();
            return true;
        } catch (err) {
            console.error("Auth initialization error:", err);
            if (!isLoginPage) window.location.href = "login.html";
            return false;
        }
    }

    async loadUserProfile() {
        if (!this.user) return;

        // Try loading from database
        try {
            const { data, error } = await db.getClient()
                .from("clinic_profiles")
                .select("*")
                .eq("id", this.user.id)
                .maybeSingle();

            if (!error && data) {
                this.profile = data;
                return;
            }

            if (error) {
                console.warn("Could not load clinic profile:", error);
            }
        } catch (err) {
            console.error("Error loading clinic profile:", err);
        }

        // Fallback: try to create profile
        try {
            const { error: insertErr } = await db.getClient()
                .from("clinic_profiles")
                .insert({
                    id: this.user.id,
                    full_name: this.user.email?.split("@")[0] || "User",
                    clinic_role: "clinic_admin",
                    is_active: true
                });

            if (!insertErr) {
                const { data: newData } = await db.getClient()
                    .from("clinic_profiles")
                    .select("*")
                    .eq("id", this.user.id)
                    .maybeSingle();
                if (newData) {
                    this.profile = newData;
                    return;
                }
            }
        } catch (e) {
            console.warn("Auto-create profile failed:", e);
        }

        // Last resort: in-memory fallback
        this.profile = {
            id: this.user.id,
            full_name: this.user.email?.split("@")[0] || "User",
            clinic_role: "clinic_admin",
            is_active: true,
            can_view_reports: true,
            can_view_patients: true
        };
    }

    async signIn(email, password) {
        try {
            const { data, error } = await db.getClient().auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.user = data.user;
            await this.loadUserProfile();
            this.syncRoleAttribute();

            if (this.profile && !this.profile.is_active) {
                await this.signOut();
                throw new Error(i18n.t("inactiveAccountError"));
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async signOut() {
        try {
            await db.getClient().auth.signOut();
        } catch (e) {
            console.error("Sign out error:", e);
        } finally {
            this.user = null;
            this.profile = null;
            this.clearRoleCache();
            window.location.href = "login.html";
        }
    }

    isAdmin() {
        return this.profile?.clinic_role === "clinic_admin";
    }

    isLoggedIn() {
        return !!this.profile;
    }

    getRoleKey() {
        return this.profile?.clinic_role || "staff";
    }

    renderUserUI() {
        if (!this.profile) {
            // Signed-in user without a clinic profile: treat as read-only staff
            const userNameEl = document.getElementById("sidebarUserName");
            const userRoleEl = document.getElementById("sidebarUserRole");
            const userAvatarEl = document.getElementById("sidebarUserAvatar");
            if (userNameEl) userNameEl.textContent = this.user?.email || "Staff";
            if (userRoleEl) userRoleEl.textContent = i18n.t("roleStaff");
            if (userAvatarEl) {
                const initial = (this.user?.email || "U").charAt(0).toUpperCase();
                userAvatarEl.textContent = initial;
            }
            document.querySelectorAll(".admin-only-nav, .admin-only").forEach(el => el.style.display = "none");
            return;
        }

        const userRoleEl = document.getElementById("sidebarUserRole");
        const userAvatarEl = document.getElementById("sidebarUserAvatar");
        const userNameEl = document.getElementById("sidebarUserName");

        if (userNameEl) userNameEl.textContent = this.profile.full_name || this.user.email;
        if (userRoleEl) {
            userRoleEl.textContent = this.isAdmin()
                ? i18n.t("roleAdmin")
                : (this.profile.clinic_role === "doctor" ? i18n.t("roleDoctor") : i18n.t("roleStaff"));
        }
        if (userAvatarEl) {
            const initial = (this.profile.full_name || this.user.email || "U").charAt(0).toUpperCase();
            userAvatarEl.textContent = initial;
        }

        // Reveal admin-only nav for admins only
        if (this.isAdmin()) {
            document.querySelectorAll(".admin-only-nav, .admin-only").forEach(el => {
                el.style.display = "";
            });
        } else {
            document.querySelectorAll(".admin-only-nav, .admin-only").forEach(el => {
                el.style.display = "none";
            });
        }

        // Reveal reports nav for admins OR staff/doctors granted can_view_reports
        const canSeeReports = this.isAdmin() || (this.profile && this.profile.can_view_reports);
        document.querySelectorAll(".reports-nav").forEach(el => {
            el.style.display = canSeeReports ? "" : "none";
        });

        // Hide prescription nav for staff (cannot write prescriptions)
        if (this.profile.clinic_role === "staff") {
            document.querySelectorAll('a[href="prescription.html"]').forEach(el => {
                el.style.display = "none";
            });
        }

        // Hide intake nav for doctors (they don't handle intake)
        if (this.profile.clinic_role === "doctor") {
            document.querySelectorAll('a[href="intake.html"]').forEach(el => {
                el.style.display = "none";
            });
            document.querySelectorAll(".doctor-hide").forEach(el => {
                el.style.display = "none";
            });
        }

        // Show branch in topbar indicator
        if (this.profile.branch_id) {
            db.getClient().from("clinic_branches").select("name_ar, name_en").eq("id", this.profile.branch_id).maybeSingle()
                .then(({ data }) => {
                    const branchEl = document.getElementById("topbarBranchIndicator");
                    if (branchEl && data) {
                        const branchName = i18n.currentLang === "en" ? (data.name_en || data.name_ar) : data.name_ar;
                        branchEl.innerHTML = `<i class="fa-solid fa-hospital"></i> <span>${branchName}</span>`;
                    }
                });
        }
    }

    enforceRolePermissions() {
        const currentPage = window.location.pathname.split("/").pop();

        // Dashboard page: admin and staff only, not doctors
        if (currentPage === "dashboard.html" && this.profile?.clinic_role === "doctor") {
            window.location.href = "prescription.html";
            return;
        }

        // Reports page: admin always; staff/doctor only if admin granted can_view_reports
        if (currentPage === "reports.html" && !this.isAdmin()) {
            if (!this.profile || !this.profile.can_view_reports) {
                window.location.href = "dashboard.html";
            }
        }

        // Intake page: doctors cannot access
        if (currentPage === "intake.html" && this.profile?.clinic_role === "doctor") {
            window.location.href = "dashboard.html";
        }
    }
}

// Global Singleton
const auth = new AuthService();
