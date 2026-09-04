// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Main Dashboard Controller
// ==========================================================================

let currentUserDoctorId = null;
let isDoctor = false;

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    isDoctor = auth.profile?.clinic_role === "doctor";
    currentUserDoctorId = auth.profile?.doctor_id || null;

    notifications.init();
    await loadDashboardStats();
    await loadRecentAppointments();

    window.onNewRealtimeAppointment = () => {
        loadDashboardStats();
        loadRecentAppointments();
    };

    window.onLanguageChange = () => {
        loadDashboardStats();
        loadRecentAppointments();
    };
});

async function loadDashboardStats() {
    try {
        const client = db.getClient();
        let query = client.from("clinic_appointments").select("id, status");

        // Doctor: only own appointments
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const counts = { new: 0, confirmed: 0, completed: 0, cancelled: 0 };
        (data || []).forEach(a => {
            const st = (a.status || "new").toLowerCase();
            if (counts[st] !== undefined) counts[st]++;
        });

        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set("statCountNew", counts.new);
        set("statCountConfirmed", counts.confirmed);
        set("statCountCompleted", counts.completed);
        set("statCountCancelled", counts.cancelled);

        // Follow-up patients from patient data section (doctor: only own patients; admin: all)
        let ptQuery = client.from("clinic_patients").select("id", { count: "exact" }).eq("is_new_visit", false);
        if (isDoctor && currentUserDoctorId) {
            ptQuery = ptQuery.eq("doctor_id", currentUserDoctorId);
        }
        const { data: pts, error: ptErr } = await ptQuery;
        if (!ptErr) {
            set("statTotalPatients", (pts && pts.length) || 0);
        }

    } catch (err) {
        console.error("Dashboard stats error:", err);
    }
}

async function loadRecentAppointments() {
    const tableBody = document.getElementById("recentAppointmentsBody");
    const emptyState = document.getElementById("emptyRecentState");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        let query = db.getClient()
            .from("clinic_appointments")
            .select("id, patient_name, doctor_name, branch_name, preferred_day, status, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

        // Doctor: only own appointments
        if (isDoctor && currentUserDoctorId) {
            query = query.eq("doctor_id", currentUserDoctorId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            tableBody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        tableBody.innerHTML = data.map(a => {
            const isNew = (a.status || "").toLowerCase() === "new";
            const isPending = notifications.isPending(a.id);
            const dateStr = utils.formatDate(a.created_at, true);

            const muteBtn = (isNew && isPending)
                ? `<button class="btn btn-warning btn-sm mute-alert-btn"
                        data-apt-id="${a.id}"
                        onclick="muteAppointmentAlert('${a.id}', this)"
                        title="${i18n.currentLang === "ar" ? "إيقاف التنبيه" : "Mute alert"}"
                        style="margin-inline-start:0.3rem;background:#F59E0B;color:#fff;border:none;">
                        <i class="fa-solid fa-bell-slash"></i>
                   </button>`
                : "";

            return `
                <tr ${isNew && isPending ? 'style="background: rgba(251,191,36,0.06);"' : ''}>
                    <td><strong>${a.patient_name}</strong></td>
                    <td>${a.doctor_name || "-"}</td>
                    <td><small style="color: var(--text-muted);">${a.branch_name || "-"}</small></td>
                    <td><span class="badge badge-info"><i class="fa-solid fa-calendar-day"></i> ${a.preferred_day || "-"}</span></td>
                    <td>${utils.getAppointmentStatusBadge(a.status)}</td>
                    <td><small style="color: var(--text-muted);">${dateStr}</small></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.3rem;">
                            <button class="btn btn-outline btn-sm" onclick="openAppointmentDetails('${a.id}')">
                                <i class="fa-solid fa-eye"></i> ${i18n.t("viewDetails")}
                            </button>
                            ${muteBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Recent appointments error:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

// ------------------------------------------------------------------
// Appointment Details Modal (view full info + confirm / cancel)
// ------------------------------------------------------------------
async function openAppointmentDetails(id) {
    try {
        const { data, error } = await db.getClient()
            .from("clinic_appointments")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            utils.showToast(i18n.t("errorGeneric"), "error");
            return;
        }

        let modal = document.getElementById("aptDetailsModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "aptDetailsModal";
            modal.className = "modal-backdrop";
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 600px;">
                    <div class="modal-header">
                        <h4 class="card-title" id="aptModalTitle"></h4>
                        <button class="btn btn-icon btn-sm" onclick="closeAptModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" id="aptModalBody"></div>
                    <div class="modal-footer" id="aptModalFooter"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById("aptModalTitle").textContent = data.patient_name;
        document.getElementById("aptModalBody").innerHTML = `
            <div class="detail-grid" style="margin-bottom:1rem;">
                <div class="detail-item"><p><strong>${i18n.t("appointmentPhone")}:</strong> <a href="tel:${data.patient_phone}" style="color:var(--primary);">${data.patient_phone}</a></p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDoctor")}:</strong> ${data.doctor_name || "-"}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentBranch")}:</strong> ${data.branch_name || "-"}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDay")}:</strong> ${data.preferred_day || "-"}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentStatus")}:</strong> ${utils.getAppointmentStatusBadge(data.status)}</p></div>
                <div class="detail-item"><p><strong>${i18n.t("appointmentDate")}:</strong> ${utils.formatDate(data.created_at, true)}</p></div>
            </div>
            <p style="margin:0 0 0.25rem;"><strong>${i18n.t("appointmentNotes")}:</strong></p>
            <p style="margin:0; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); white-space: pre-wrap;">${data.notes || "-"}</p>
        `;

        const currentStatus = (data.status || "new").toLowerCase();

        let btns = `<button class="btn btn-secondary" onclick="closeAptModal()">${i18n.t("close")}</button>`;
        if (currentStatus === "new") {
            btns += `
                <button class="btn btn-danger" onclick="updateAppointmentStatus('${data.id}', 'cancelled')"><i class="fa-solid fa-ban"></i> ${i18n.t("actionCancel")}</button>
                <button class="btn btn-primary" onclick="updateAppointmentStatus('${data.id}', 'confirmed')"><i class="fa-solid fa-circle-check"></i> ${i18n.t("actionConfirm")}</button>
            `;
        } else if (currentStatus === "confirmed") {
            btns += `
                <button class="btn btn-danger" onclick="updateAppointmentStatus('${data.id}', 'cancelled')"><i class="fa-solid fa-ban"></i> ${i18n.t("actionCancel")}</button>
                <button class="btn btn-success" onclick="updateAppointmentStatus('${data.id}', 'completed')"><i class="fa-solid fa-badge-check"></i> ${i18n.t("actionComplete")}</button>
            `;
        }

        document.getElementById("aptModalFooter").innerHTML = btns;
        modal.classList.add("active");

    } catch (err) {
        console.error("Open appointment details error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function closeAptModal() {
    const modal = document.getElementById("aptDetailsModal");
    if (modal) modal.classList.remove("active");
}

async function updateAppointmentStatus(id, newStatus) {
    try {
        const client = db.getClient();

        // If completing, fetch appointment data first to create patient
        let appointmentData = null;
        if (newStatus === "completed") {
            const { data: apt } = await client
                .from("clinic_appointments")
                .select("*")
                .eq("id", id)
                .maybeSingle();
            appointmentData = apt;
        }

        const { error } = await client
            .from("clinic_appointments")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) throw error;

        // Store fee at confirmation time if not already set
        if (newStatus === "confirmed" && appointmentData && !appointmentData.visit_fee && appointmentData.doctor_id) {
            const { data: docFee } = await client
                .from("doctors")
                .select("new_visit_fee, followup_fee")
                .eq("id", appointmentData.doctor_id)
                .maybeSingle();
            if (docFee) {
                const fee = appointmentData.is_new_visit ? (docFee.new_visit_fee || 0) : (docFee.followup_fee || 0);
                await client
                    .from("clinic_appointments")
                    .update({ visit_fee: fee })
                    .eq("id", id);
            }
        }

        if (newStatus !== "new") {
            notifications.removePendingAlert(String(id));
        }

        // When completed: auto-create patient record if not exists
        if (newStatus === "completed" && appointmentData) {
            await syncPatientFromAppointment(client, appointmentData);
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeAptModal();
        loadDashboardStats();
        loadRecentAppointments();
    } catch (err) {
        console.error("Update appointment status error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function syncPatientFromAppointment(client, apt) {
    try {
        // Check if patient already exists by phone
        const { data: existing } = await client
            .from("clinic_patients")
            .select("id, visits_count")
            .eq("phone", apt.patient_phone)
            .maybeSingle();

        if (existing) {
            // Patient exists: increment visit count
            await client
                .from("clinic_patients")
                .update({
                    visits_count: (existing.visits_count || 1) + 1,
                    visit_date: new Date().toISOString().slice(0, 10),
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);
        } else {
            // New patient: create record from appointment
            await client.from("clinic_patients").insert({
                full_name: apt.patient_name,
                phone: apt.patient_phone,
                doctor_id: apt.doctor_id,
                visit_date: new Date().toISOString().slice(0, 10),
                complaint_details: apt.notes || null,
                is_new_visit: apt.is_new_visit !== false,
                status: "active",
                visits_count: 1
            });
        }
    } catch (e) {
        console.warn("Auto-create patient from appointment failed:", e);
    }
}

// ------------------------------------------------------------------
// Mute alert per appointment (like pharmacy dashboard)
// ------------------------------------------------------------------
function muteAppointmentAlert(aptId, btn) {
    notifications.removePendingAlert(String(aptId));

    btn.style.opacity = "0";
    btn.style.transform = "scale(0.8)";
    btn.style.transition = "all 0.25s ease";
    setTimeout(() => { btn.style.display = "none"; }, 260);

    const row = btn.closest("tr");
    if (row) row.style.background = "";

    utils.showToast(i18n.currentLang === "ar" ? "تم إيقاف التنبيه" : "Alert muted", "info");
}

// Called by notifications.js when pending set changes from another tab
window._refreshAppointmentMuteButtons = function () {
    document.querySelectorAll(".mute-alert-btn").forEach(btn => {
        const aptId = btn.getAttribute("data-apt-id");
        if (!notifications.isPending(aptId)) {
            btn.style.opacity = "0";
            btn.style.transform = "scale(0.8)";
            btn.style.transition = "all 0.25s ease";
            setTimeout(() => { btn.style.display = "none"; }, 260);
            const row = btn.closest("tr");
            if (row) row.style.background = "";
        }
    });
};
