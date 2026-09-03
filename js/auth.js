// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Authentication & Profile Guard
// Roles: admin / staff / doctor  (جدول clinic_profiles)
// ==========================================================================

class AuthService {
    constructor() {
        this.user = null;
        this.profile = null;
    }

    /**
     * Initializes auth state, checks session, fetches clinic profile
     * @param {boolean} isLoginPage - Whether the current page is login.html
     */
    async init(isLoginPage = false) {
        try {
            const { data: { session }, error } = await db.getClient().auth.getSession();

            if (error || !session) {
                if (!isLoginPage) window.location.href = "login.html";
                return false;
            }

            this.user = session.user;
            await this.loadUserProfile();

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

        try {
            const { data, error } = await db.getClient()
                .from("clinic_profiles")
                .select("*")
                .eq("id", this.user.id)
                .maybeSingle();

            if (error) {
                console.warn("Could not load clinic profile:", error);
                this.profile = null;
            } else if (data) {
                this.profile = data;
            } else {
                this.profile = null;
            }
        } catch (err) {
            console.error("Error loading clinic profile:", err);
            this.profile = null;
        }
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
    }

    enforceRolePermissions() {
        const currentPage = window.location.pathname.split("/").pop();

        // Reports page: admin always; staff/doctor only if admin granted can_view_reports
        if (currentPage === "reports.html" && !this.isAdmin()) {
            if (!this.profile || !this.profile.can_view_reports) {
                window.location.href = "dashboard.html";
            }
        }
    }
}

// Global Singleton
const auth = new AuthService();
