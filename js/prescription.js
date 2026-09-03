// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Prescription Writing Controller
// ==========================================================================

let rxDoctors = [];
let sigFileUrl = null;

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    setTodayDate();
    await loadRxDoctors();
    addMedicineRow();

    // Signature upload chip
    const sigInput = document.getElementById("rxSigFile");
    if (sigInput) {
        sigInput.addEventListener("change", () => {
            const file = sigInput.files[0];
            const chip = document.getElementById("sigChip");
            if (file) {
                chip.classList.add("has-file");
                chip.querySelector("span").textContent = file.name;
            } else {
                chip.classList.remove("has-file");
                chip.querySelector("span").textContent = i18n.t("rxDoctorSignature");
            }
        });
    }

    window.onLanguageChange = () => {
        setTodayDate();
    };
});

function setTodayDate() {
    const dt = document.getElementById("rxDate");
    if (dt) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        dt.value = `${yyyy}-${mm}-${dd}`;
    }
}

async function loadRxDoctors() {
    try {
        const { data, error } = await db.getClient()
            .from("doctors")
            .select("id, name_ar, name_en")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        rxDoctors = data || [];
        const select = document.getElementById("rxDoctor");
        if (select) {
            select.innerHTML = rxDoctors.map(d =>
                `<option value="${d.id}">${i18n.currentLang === "en" ? (d.name_en || d.name_ar) : d.name_ar}</option>`
            ).join("");
            updateDoctorNameDisplay();
        }
    } catch (e) {
        console.error("Load doctors (rx) error:", e);
    }
}

function updateDoctorNameDisplay() {
    const select = document.getElementById("rxDoctor");
    const display = document.getElementById("rxDoctorNameDisplay");
    if (!select || !display) return;
    const doc = rxDoctors.find(d => d.id === select.value);
    display.value = doc ? (i18n.currentLang === "en" ? (doc.name_en || doc.name_ar) : doc.name_ar) : "";
}

// Bind doctor select change
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const select = document.getElementById("rxDoctor");
        if (select) select.addEventListener("change", updateDoctorNameDisplay);
    }, 0);
});

function addMedicineRow() {
    const list = document.getElementById("medicinesList");
    const row = document.createElement("div");
    row.className = "med-item";
    row.innerHTML = `
        <input type="text" class="med-name" placeholder="${i18n.currentLang === "ar" ? "اسم الدواء" : "Medicine name"}">
        <input type="text" class="med-dosage" placeholder="${i18n.currentLang === "ar" ? "الجرعة" : "Dosage"}">
        <input type="text" class="med-instructions" placeholder="${i18n.currentLang === "ar" ? "طريقة الاستخدام" : "Instructions"}">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.med-item').remove()" title="حذف">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    list.appendChild(row);
}

async function generatePrescriptionPdf() {
    const name = document.getElementById("rxPatientName").value.trim();
    if (!name) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم المريض" : "Please provide patient name", "error");
        return;
    }

    // Collect medicines
    const rows = document.querySelectorAll("#medicinesList .med-item");
    const medicines = [];
    rows.forEach(r => {
        const mName = r.querySelector(".med-name").value.trim();
        const dosage = r.querySelector(".med-dosage").value.trim();
        const instr = r.querySelector(".med-instructions").value.trim();
        if (mName || dosage || instr) {
            medicines.push({ name: mName, dosage: dosage, instructions: instr });
        }
    });

    if (medicines.length === 0) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى إضافة دواء واحد على الأقل" : "Please add at least one medicine", "error");
        return;
    }

    // Upload signature if present
    sigFileUrl = null;
    const sigInput = document.getElementById("rxSigFile");
    if (sigInput && sigInput.files && sigInput.files[0]) {
        sigFileUrl = await db.uploadClinicFile(sigInput.files[0], "signatures");
    }

    const age = document.getElementById("rxPatientAge").value;
    const phone = document.getElementById("rxPatientPhone").value.trim();
    const notes = document.getElementById("rxNotes").value.trim();
    const doctorName = document.getElementById("rxDoctorNameDisplay").value.trim() || "د. ";
    const doctorId = document.getElementById("rxDoctor")?.value || null;
    const today = document.getElementById("rxDate")?.value || new Date().toISOString();

    // Save to DB
    try {
        await db.getClient().from("clinic_prescriptions").insert({
            patient_name: name,
            patient_age: age ? parseInt(age, 10) : null,
            patient_phone: phone,
            doctor_name: doctorName,
            doctor_id: doctorId,
            doctor_signature_image: sigFileUrl,
            medicines: medicines,
            notes: notes
        });
    } catch (err) {
        console.warn("Could not persist prescription (continuing to preview):", err);
    }

    // Build print preview
    document.getElementById("printName").textContent = name;
    document.getElementById("printAge").textContent = age || "-";
    document.getElementById("printPhone").textContent = phone || "-";
    document.getElementById("printDate").textContent = today;
    document.getElementById("printDoctorName").textContent = doctorName;

    const medsHtml = medicines.map(m => `
        <div class="rx-med-row">
            <span class="m-name">${m.name || "-"}</span>
            <span>${m.dosage ? `<span class="m-label">جرعة:</span> ${m.dosage}` : "-"}</span>
            <span>${m.instructions ? `<span class="m-label">استخدام:</span> ${m.instructions}` : "-"}</span>
        </div>
    `).join("");
    document.getElementById("printMeds").innerHTML = medsHtml;

    const notesEl = document.getElementById("printNotes");
    if (notes) {
        notesEl.textContent = `ملاحظات: ${notes}`;
        notesEl.style.display = "block";
    } else {
        notesEl.textContent = "";
        notesEl.style.display = "none";
    }

    const sigEl = document.getElementById("printSignature");
    if (sigFileUrl) {
        sigEl.innerHTML = `<img src="${sigFileUrl}" alt="signature">`;
    } else {
        sigEl.innerHTML = "";
    }

    // Trigger browser print dialog (user can Save as PDF)
    window.print();
}
