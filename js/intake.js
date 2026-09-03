// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Patient Intake Controller
// ==========================================================================

let doctorsOptions = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadDoctors();

    // Attach file upload chips
    setupUploadChip("intakeRxFile", "rxChip", i18n.t("prescriptionImageUpload"));
    setupUploadChip("intakeLabFile", "labChip", i18n.t("labImageUpload"));

    window.onLanguageChange = () => {
        setupUploadChip("intakeRxFile", "rxChip", i18n.t("prescriptionImageUpload"));
        setupUploadChip("intakeLabFile", "labChip", i18n.t("labImageUpload"));
    };
});

function setupUploadChip(inputId, chipId, defaultLabel) {
    const input = document.getElementById(inputId);
    const chip = document.getElementById(chipId);
    if (!input || !chip) return;

    input.addEventListener("change", () => {
        if (input.files && input.files[0]) {
            chip.classList.add("has-file");
            chip.querySelector("span").textContent = input.files[0].name;
        } else {
            chip.classList.remove("has-file");
            chip.querySelector("span").textContent = defaultLabel;
        }
    });
}

async function loadDoctors() {
    try {
        const { data, error } = await db.getClient()
            .from("doctors")
            .select("id, name_ar, name_en")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        doctorsOptions = data || [];
        const select = document.getElementById("intakeDoctor");
        if (select) {
            select.innerHTML = `<option value="">-- ${i18n.currentLang === "ar" ? "بدون تحديد" : "Unassigned"} --</option>` +
                doctorsOptions.map(d =>
                    `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`
                ).join("");
        }
    } catch (e) {
        console.error("Load doctors (intake) error:", e);
    }
}

async function handleIntakeSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("intakeName").value.trim();
    const gender = document.getElementById("intakeGender").value;
    const age = parseInt(document.getElementById("intakeAge").value, 10) || null;
    const phone = document.getElementById("intakePhone").value.trim();
    const isNew = document.getElementById("intakeVisitType").value === "new";
    const complaint = document.getElementById("intakeComplaint").value.trim();
    const details = document.getElementById("intakeDetails").value.trim();
    const doctorId = document.getElementById("intakeDoctor").value || null;

    if (!name) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم المريض" : "Please provide patient name", "error");
        return;
    }

    const btn = document.getElementById("btnIntakeSubmit");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n.t("loadingData")}`;

    try {
        // Optional image uploads (config bucket)
        let rxUrl = null;
        let labUrl = null;

        const rxFile = document.getElementById("intakeRxFile").files[0];
        if (rxFile) rxUrl = await db.uploadClinicFile(rxFile, "prescriptions");

        const labFile = document.getElementById("intakeLabFile").files[0];
        if (labFile) labUrl = await db.uploadClinicFile(labFile, "labs");

        const payload = {
            full_name: name,
            gender: gender,
            age: age,
            phone: phone,
            is_new_visit: isNew,
            complaint_type: complaint,
            complaint_details: details,
            doctor_id: doctorId,
            prescription_image: rxUrl,
            lab_image: labUrl,
            status: "active"
        };

        const { error } = await db.getClient().from("clinic_patients").insert(payload);
        if (error) throw error;

        utils.showToast(i18n.t("patientSaved"), "success");
        e.target.reset();

        // Reset upload chips
        ["rxChip", "labChip"].forEach(id => {
            const chip = document.getElementById(id);
            if (chip) chip.classList.remove("has-file");
        });
        if (document.getElementById("rxChip")) document.getElementById("rxChip").querySelector("span").textContent = i18n.t("prescriptionImageUpload");
        if (document.getElementById("labChip")) document.getElementById("labChip").querySelector("span").textContent = i18n.t("labImageUpload");

        // Redirect to patients page
        setTimeout(() => { window.location.href = "patients.html"; }, 1200);

    } catch (err) {
        console.error("Intake submit error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span>${i18n.t("savePatient")}</span>`;
    }
}
