// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Supabase Service Layer
// ==========================================================================

class SupabaseService {
    constructor() {
        if (!window.supabase) {
            console.error("Supabase JS CDN library not loaded!");
            return;
        }

        this.client = window.supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_PUBLISHABLE_KEY
        );
    }

    getClient() {
        return this.client;
    }

    /**
     * Uploads a file to the clinic-uploads storage bucket
     * @param {File} file
     * @param {string} folder - subfolder (patients / signatures)
     * @returns {Promise<string|null>} Public URL of uploaded file
     */
    async uploadClinicFile(file, folder = "misc") {
        if (!file) return null;
        try {
            const ext = file.name.split(".").pop();
            const safeName = `${folder}/${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

            const { error: upErr } = await this.client
                .storage
                .from(CONFIG.STORAGE_BUCKET)
                .upload(safeName, file, { cacheControl: "3600", upsert: true });

            if (upErr) {
                console.error("Clinic upload error:", upErr);
                return null;
            }

            const { data } = this.client
                .storage
                .from(CONFIG.STORAGE_BUCKET)
                .getPublicUrl(safeName);

            // Ensure full URL
            const url = data?.publicUrl || null;
            if (url && !url.startsWith("http")) {
                return CONFIG.SUPABASE_URL + "/storage/v1/object/public/" + CONFIG.STORAGE_BUCKET + "/" + safeName;
            }
            return url;
        } catch (err) {
            console.error("Unexpected clinic upload error:", err);
            return null;
        }
    }
}

// Global Singleton
const db = new SupabaseService();
