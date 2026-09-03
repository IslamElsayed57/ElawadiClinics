// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Main Dashboard Controller
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

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
        const { data, error } = await client.from("clinic_appointments").select("id, status");
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

        // Total patients (respecting admin-patient visibility)
        const { data: pts, error: ptErr } = await client.from("clinic_patients").select("id", { count: "exact" });
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
        const { data, error } = await db.getClient()
            .from("clinic_appointments")
            .select("id, patient_name, doctor_name, branch_name, preferred_day, status, created_at")
            .order("created_at", { ascending: false })
            .limit(10);

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

            return `
                <tr ${isNew && isPending ? 'style="background: rgba(34,211,238,0.06);"' : ''}>
                    <td><strong>${a.patient_name}</strong></td>
                    <td>${a.doctor_name || "-"}</td>
                    <td><small style="color: var(--text-muted);">${a.branch_name || "-"}</small></td>
                    <td><span class="badge badge-info"><i class="fa-solid fa-calendar-day"></i> ${a.preferred_day || "-"}</span></td>
                    <td>${utils.getAppointmentStatusBadge(a.status)}</td>
                    <td><small style="color: var(--text-muted);">${dateStr}</small></td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="openAppointmentDetails('${a.id}')">
                            <i class="fa-solid fa-eye"></i> ${i18n.t("viewDetails")}
                        </button>
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
        const { error } = await db.getClient()
            .from("clinic_appointments")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) throw error;

        if (newStatus !== "new") {
            notifications.removePendingAlert(String(id));
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
