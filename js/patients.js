// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Patients Profiles Controller
// List + full profile view (incl. uploaded rx/lab images) + link to write rx.
// ==========================================================================

let patientsList = [];
let doctorsOptions = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadDoctorsForFilter();
    await loadPatients();

    const search = document.getElementById("patientSearch");
    if (search) {
        let t;
        search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => loadPatients(), 300); });
    }
    const genderFilter = document.getElementById("patientGenderFilter");
    if (genderFilter) genderFilter.addEventListener("change", loadPatients);
    const doctorFilter = document.getElementById("patientDoctorFilter");
    if (doctorFilter) doctorFilter.addEventListener("change", loadPatients);

    window.onLanguageChange = () => loadPatients();
});

async function loadDoctorsForFilter() {
    try {
        const { data } = await db.getClient().from("doctors").select("id, name_ar, name_en");
        doctorsOptions = data || [];
        const select = document.getElementById("patientDoctorFilter");
        if (select) {
            const currentVal = select.value;
            select.innerHTML = `<option value="all">${i18n.currentLang === "en" ? "All doctors" : "كل الأطباء"}</option>` +
                doctorsOptions.map(d => `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`).join("");
            select.value = currentVal;
        }
    } catch (e) {
        console.error("Load doctors for patient filter error:", e);
    }
}

async function loadPatients() {
    const tbody = document.getElementById("patientsTableBody");
    const emptyState = document.getElementById("emptyPatientsState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const query = db.getClient()
            .from("clinic_patients")
            .select("*, doctors(name_ar, name_en)")
            .order("created_at", { ascending: false });

        const search = document.getElementById("patientSearch")?.value.trim();
        if (search) {
            query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        const gender = document.getElementById("patientGenderFilter")?.value;
        if (gender && gender !== "all") query.eq("gender", gender);
        const doctorId = document.getElementById("patientDoctorFilter")?.value;
        if (doctorId && doctorId !== "all") query.eq("doctor_id", doctorId);

        const { data, error } = await query;
        if (error) throw error;

        patientsList = data || [];

        const countBadge = document.getElementById("patientsCountBadge");
        if (countBadge) countBadge.textContent = `${patientsList.length} ${i18n.t("navPatients")}`;

        if (patientsList.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            return;
        }
        if (emptyState) emptyState.style.display = "none";

        tbody.innerHTML = patientsList.map(p => {
            const doctor = p.doctors
                ? (i18n.currentLang === "en" ? (p.doctors.name_en || p.doctors.name_ar) : p.doctors.name_ar)
                : "-";

            const genderLabel = p.gender === "female"
                ? (i18n.currentLang === "en" ? "Female" : "أنثى")
                : (i18n.currentLang === "en" ? "Male" : "ذكر");
            const genderBadge = p.gender === "female"
                ? `<span class="badge badge-female">${genderLabel}</span>`
                : `<span class="badge badge-male">${genderLabel}</span>`;

            const visitBadge = p.is_new_visit === false
                ? `<span class="badge badge-info">${i18n.currentLang === "en" ? "Follow-up" : "إعادة كشف"}</span>`
                : `<span class="badge badge-active">${i18n.currentLang === "en" ? "New visit" : "كشف جديد"}</span>`;

            const hasImages = p.prescription_image || p.lab_image;
            const imgIndicator = hasImages
                ? `<button class="btn btn-secondary btn-sm" onclick="viewPatientImages('${p.id}')" title="الصور"><i class="fa-solid fa-image"></i></button>`
                : `<small style="color:var(--text-muted);">-</small>`;

            return `
                <tr>
                    <td><strong>${p.full_name}</strong></td>
                    <td>${genderBadge} <small style="color:var(--text-muted);">${p.age ? p.age + " " + (i18n.currentLang === "en" ? "y" : "سنة") : "-"}</small></td>
                    <td><a href="tel:${p.phone}" style="color:var(--primary);">${p.phone || "-"}</a></td>
                    <td><span class="badge badge-info">${doctor}</span></td>
                    <td style="display:flex;gap:0.3rem;align-items:center;">${visitBadge} ${imgIndicator}</td>
                    <td><span class="badge badge-active">${i18n.currentLang === "en" ? "Active" : "نشط"}</span></td>
                    <td>
                        <div style="display:flex;gap:0.35rem;">
                            <button class="btn btn-secondary btn-sm" onclick="openPatientModal('${p.id}')" title="${i18n.t("viewDetails")}"><i class="fa-solid fa-eye"></i></button>
                            <button class="btn btn-primary btn-sm" onclick="openPrescriptionFor('${p.id}')" title="${i18n.t("navPrescription")}"><i class="fa-solid fa-prescription"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Load patients error:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#EF4444;padding:2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function openPatientModal(patientId) {
    const p = patientsList.find(x => x.id === patientId);
    if (!p) return;

    const doctor = p.doctors
        ? (i18n.currentLang === "en" ? (p.doctors.name_en || p.doctors.name_ar) : p.doctors.name_ar)
        : "-";
    const genderLabel = p.gender === "female" ? (i18n.currentLang === "en" ? "Female" : "أنثى") : (i18n.currentLang === "en" ? "Male" : "ذكر");
    const visitLabel = p.is_new_visit === false ? (i18n.currentLang === "en" ? "Follow-up" : "إعادة كشف") : (i18n.currentLang === "en" ? "New visit" : "كشف جديد");
    const created = p.created_at ? new Date(p.created_at).toLocaleDateString(i18n.currentLang === "en" ? "en-GB" : "ar-EG") : "-";

    const imageUrl = (u) => u ? `https://lbjeykexbkhyvuafndjr.supabase.co/storage/v1/object/public/${u}` : null;
    const rxImg = imageUrl(p.prescription_image);
    const labImg = imageUrl(p.lab_image);

    document.getElementById("patientModalTitle").textContent = `${i18n.t("navPatients")} - ${p.full_name}`;
    document.getElementById("patientModalBody").innerHTML = `
        <div class="detail-grid" style="margin-bottom:1rem;">
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Phone" : "الهاتف"}</strong><br>${p.phone || "-"}</p></div>
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Age" : "العمر"}</strong><br>${p.age ? p.age + " " + (i18n.currentLang === "en" ? "y" : "سنة") : "-"}</p></div>
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Gender" : "الجنس"}</strong><br>${genderLabel}</p></div>
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Visit type" : "نوع الكشف"}</strong><br>${visitLabel}</p></div>
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Doctor" : "الطبيب"}</strong><br>${doctor}</p></div>
            <div class="detail-item"><p><strong>${i18n.currentLang === "en" ? "Visits" : "عدد الزيارات"}</strong><br>${p.visits_count || 1}</p></div>
            <div class="detail-item" style="grid-column:1/-1;"><p><strong>${i18n.currentLang === "en" ? "Complaint" : "الشكوى"}</strong><br>${p.complaint_details || "-"}</p></div>
            <div class="detail-item" style="grid-column:1/-1;"><p><strong>${i18n.currentLang === "en" ? "Registered" : "تاريخ التسجيل"}</strong><br>${created}</p></div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <div style="flex:1;min-width:160px;">
                <strong><small>${i18n.currentLang === "en" ? "Prescription image" : "صورة الروشتة"}</small></strong>
                ${rxImg
                    ? `<div class="patient-image-thumb" onclick="openImageViewer('${rxImg}', '${i18n.currentLang === "en" ? "Prescription" : "الروشتة"}')" style="background:url('${rxImg}') center/cover no-repeat;width:100%;height:130px;border-radius:10px;cursor:pointer;"></div>`
                    : `<small style="color:var(--text-muted);">-</small>`}
            </div>
            <div style="flex:1;min-width:160px;">
                <strong><small>${i18n.currentLang === "en" ? "Lab image" : "صورة التحاليل"}</small></strong>
                ${labImg
                    ? `<div class="patient-image-thumb" onclick="openImageViewer('${labImg}', '${i18n.currentLang === "en" ? "Lab" : "التحاليل"}')" style="background:url('${labImg}') center/cover no-repeat;width:100%;height:130px;border-radius:10px;cursor:pointer;"></div>`
                    : `<small style="color:var(--text-muted);">-</small>`}
            </div>
        </div>
    `;
    document.getElementById("patientModal").classList.add("active");
}

function closePatientModal() {
    document.getElementById("patientModal").classList.remove("active");
}

function openPrescriptionFor(patientId) {
    const p = patientsList.find(x => x.id === patientId);
    if (!p) return;
    localStorage.setItem("clinic_prefill_patient", JSON.stringify({
        full_name: p.full_name,
        age: p.age,
        phone: p.phone,
        doctor_id: p.doctor_id
    }));
    window.location.href = "prescription.html";
}

function viewPatientImages(patientId) {
    openPatientModal(patientId);
}

function openImageViewer(url, title) {
    document.getElementById("imageViewerTitle").textContent = title;
    document.getElementById("imageViewerImg").src = url;
    document.getElementById("imageViewerModal").classList.add("active");
}

function closeImageViewer() {
    document.getElementById("imageViewerModal").classList.remove("active");
}
