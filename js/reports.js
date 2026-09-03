// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Reports Controller
// Admin + staff/doctor granted can_view_reports (guarded in auth.js).
// ==========================================================================

let reportDoctors = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadDoctorsForReport();
    await loadReports();

    const period = document.getElementById("reportPeriod");
    if (period) {
        period.addEventListener("change", () => {
            const custom = period.value === "custom";
            document.getElementById("customDateWrap").style.display = custom ? "" : "none";
            document.getElementById("customDateWrap2").style.display = custom ? "" : "none";
        });
    }

    window.onLanguageChange = () => loadReports();
});

async function loadDoctorsForReport() {
    try {
        const { data } = await db.getClient().from("doctors").select("id, name_ar, name_en").eq("is_active", true);
        reportDoctors = data || [];
        const select = document.getElementById("reportDoctorFilter");
        if (select) {
            select.innerHTML = `<option value="all">${i18n.currentLang === "en" ? "All doctors" : "كل الأطباء"}</option>` +
                reportDoctors.map(d => `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`).join("");
        }
    } catch (e) {
        console.error("Load doctors for report error:", e);
    }
}

function getDateRange() {
    const period = document.getElementById("reportPeriod")?.value || "all";
    const now = new Date();
    let from = null, to = null;

    if (period === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(from); to.setDate(to.getDate() + 1);
    } else if (period === "week") {
        from = new Date(now); from.setDate(from.getDate() - 7);
        to = new Date(now); to.setDate(to.getDate() + 1);
    } else if (period === "month") {
        from = new Date(now); from.setDate(from.getDate() - 30);
        to = new Date(now); to.setDate(to.getDate() + 1);
    } else if (period === "custom") {
        const f = document.getElementById("reportFromDate")?.value;
        const t = document.getElementById("reportToDate")?.value;
        if (f) from = new Date(f + "T00:00:00");
        if (t) { to = new Date(t + "T00:00:00"); to.setDate(to.getDate() + 1); }
    }
    return { from, to };
}

async function loadReports() {
    // Ensure shared elements exist
    const summaryEl = document.getElementById("reportSummaryCards");
    const tbody = document.getElementById("reportsTableBody");
    if (!summaryEl || !tbody) return;

    summaryEl.innerHTML = `<div style="grid-column:1/-1;padding:2rem;text-align:center;">${i18n.t("loadingData")}</div>`;
    tbody.innerHTML = "";

    const doctorFilter = document.getElementById("reportDoctorFilter")?.value || "all";
    const { from, to } = getDateRange();

    try {
        const client = db.getClient();
        let appointmentsQuery = client.from("clinic_appointments").select("*");
        let prescriptionsQuery = client.from("clinic_prescriptions").select("*");

        if (from) appointmentsQuery = appointmentsQuery.gte("created_at", from.toISOString());
        if (to) appointmentsQuery = appointmentsQuery.lt("created_at", to.toISOString());
        if (doctorFilter !== "all") appointmentsQuery = appointmentsQuery.eq("doctor_id", doctorFilter);

        if (from) prescriptionsQuery = prescriptionsQuery.gte("created_at", from.toISOString());
        if (to) prescriptionsQuery = prescriptionsQuery.lt("created_at", to.toISOString());
        if (doctorFilter !== "all") prescriptionsQuery = prescriptionsQuery.eq("doctor_id", doctorFilter);

        const [apptRes, rxRes] = await Promise.all([appointmentsQuery, prescriptionsQuery]);

        if (apptRes.error) throw apptRes.error;
        if (rxRes.error) throw rxRes.error;

        const appointments = apptRes.data || [];
        const prescriptions = rxRes.data || [];

        // ---- Summary cards ----
        const totalAppointments = appointments.length;
        const confirmed = appointments.filter(a => (a.status || "").toLowerCase() === "confirmed" || (a.status || "").toLowerCase() === "completed").length;
        const newVisits = appointments.filter(a => (a.is_new_visit === true) || ((a.visit_type || "").toLowerCase() === "new")).length;
        const totalRx = prescriptions.length;
        const uniquePatients = new Set([...appointments.map(a => a.patient_name), ...prescriptions.map(p => p.patient_name)]).size;

        // Estimated revenue from prescriptions (doctor fees)
        let estimatedRevenue = 0;
        for (const rx of prescriptions) {
            if (rx.doctor_id) {
                const doc = reportDoctors.find(d => d.id === rx.doctor_id);
                if (doc) {
                    const fee = await getDoctorFee(rx.doctor_id);
                    estimatedRevenue += fee;
                }
            }
        }

        summaryEl.innerHTML = `
            <div class="stat-card stat-blue">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "Appointments" : "الزيارات / الحجوزات"}</h3><div class="stat-value">${totalAppointments}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-calendar-check"></i></div>
            </div>
            <div class="stat-card stat-orange">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "Confirmed/Completed" : "مؤكد / مكتمل"}</h3><div class="stat-value">${confirmed}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-circle-check"></i></div>
            </div>
            <div class="stat-card stat-green">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "New visits" : "كشوفات جديدة"}</h3><div class="stat-value">${newVisits}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-user-plus"></i></div>
            </div>
            <div class="stat-card stat-purple">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "Prescriptions" : "الروشتات"}</h3><div class="stat-value">${totalRx}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-prescription"></i></div>
            </div>
            <div class="stat-card stat-gold">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "Patients" : "المرضى"}</h3><div class="stat-value">${uniquePatients}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-users"></i></div>
            </div>
            <div class="stat-card stat-completed">
                <div class="stat-info"><h3>${i18n.currentLang === "en" ? "Est. value" : "القيمة التقديرية"}</h3><div class="stat-value">${utils.formatCurrency(estimatedRevenue)}</div></div>
                <div class="stat-icon-wrap"><i class="fa-solid fa-money-bill-trend-up"></i></div>
            </div>
        `;

        // ---- Per-doctor table ----
        const doctors = reportDoctors.length ? reportDoctors : [{ id: null, name_ar: "غير محدد", name_en: "Unassigned" }];

        const rows = [];
        for (const doc of doctors) {
            const dAppts = appointments.filter(a => a.doctor_id === doc.id);
            const dRx = prescriptions.filter(r => r.doctor_id === doc.id);
            const dPatients = new Set([...dAppts.map(a => a.patient_name), ...dRx.map(r => r.patient_name)]);
            const newCount = dAppts.filter(a => (a.is_new_visit === true) || ((a.visit_type || "").toLowerCase() === "new")).length;
            const followCount = dAppts.length - newCount;
            const fee = await getDoctorFee(doc.id);
            const estValue = dRx.length * fee;

            rows.push({ doc, dAppts, dRx, dPatients, newCount, followCount, estValue });
        }

        rows.sort((a, b) => (b.dAppts.length + b.dRx.length) - (a.dAppts.length + a.dRx.length));

        tbody.innerHTML = rows.map(r => {
            const name = i18n.currentLang === "en" ? (r.doc.name_en || r.doc.name_ar) : r.doc.name_ar;
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td><span class="badge badge-info">${r.dAppts.length + r.dRx.length}</span></td>
                    <td>${r.newCount}</td>
                    <td>${r.followCount}</td>
                    <td><span class="badge badge-purple">${r.dRx.length}</span></td>
                    <td>${r.dPatients.size}</td>
                    <td><strong style="color:var(--primary);">${utils.formatCurrency(r.estValue)}</strong></td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load reports error:", err);
        summaryEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</div>`;
    }
}

const feeCache = {};
async function getDoctorFee(doctorId) {
    if (!doctorId) return 0;
    if (feeCache[doctorId] !== undefined) return feeCache[doctorId];
    try {
        const { data } = await db.getClient().from("doctors").select("new_visit_fee").eq("id", doctorId).maybeSingle();
        feeCache[doctorId] = data?.new_visit_fee || 0;
        return feeCache[doctorId];
    } catch (e) {
        return 0;
    }
}
