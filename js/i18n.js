// ==========================================================================
// عيادات العوضي (Elawadi Clinics) - Internationalization (i18n) & Theme
// Dual Language Support: Arabic (Default / RTL) and English (LTR)
// ==========================================================================

// Apply saved theme immediately on script load to prevent flashing
(function initTheme() {
    const savedTheme = localStorage.getItem("elawadi_clinic_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
})();

function toggleDashboardTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("elawadi_clinic_theme", nextTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        btn.innerHTML = isDark
            ? '<i class="fa-solid fa-sun" style="color: #FBBF24;"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute("title", isDark
            ? (i18n.currentLang === "ar" ? "تفعيل الوضع النهاري" : "Switch to Light Mode")
            : (i18n.currentLang === "ar" ? "تفعيل الوضع الليلي" : "Switch to Dark Mode"));
    }
}

const TRANSLATIONS = {
    ar: {
        brandName: "عيادات العوضي",
        brandSubtitle: "لوحة تحكم العيادات",

        navDashboard: "الرئيسية - طلبات الحجز",
        navAppointments: "طلبات الحجز",
        navPatients: "بيانات المرضى",
        navIntake: "استقبال المرضى",
        navPrescription: "كتابة الروشتة",
        allPrescriptions: "الروشتات",
        navStaffDoctors: "الأطباء",
        navCategories: "أقسام العيادات",
        navClinicBranches: "فروع العيادات",
        navReports: "التقارير",
        navLogout: "تسجيل الخروج",

        roleAdmin: "مدير النظام",
        roleDoctor: "طبيب",
        roleStaff: "عامل / موظف",

        // Dashboard
        statNewAppointments: "حجوزات جديدة",
        statConfirmedAppointments: "حجوزات مؤكدة",
        statCompletedAppointments: "حجوزات مكتملة",
        statCancelledAppointments: "حجوزات ملغاة",
        statTotalPatients: "إجمالي المرضى",
        statFollowupPatients: "مرضى عليهم إعادة كشف",
        recentAppointments: "أحدث طلبات الحجز الواردة",
        viewAllAppointments: "عرض كل الطلبات",

        // Appointments
        appointmentPatient: "المريض",
        appointmentDoctor: "الطبيب",
        appointmentBranch: "الفرع",
        appointmentDay: "اليوم المفضل",
        appointmentPhone: "الهاتف",
        appointmentStatus: "الحالة",
        appointmentDate: "التاريخ",
        appointmentActions: "إجراءات",
        appointmentNotes: "ملاحظات",
        statusNew: "جديد",
        statusConfirmed: "مؤكد",
        statusCompleted: "مكتمل",
        statusCancelled: "ملغي",
        actionConfirm: "تأكيد الحجز",
        actionCancel: "إلغاء الحجز",
        actionComplete: "إتمام الحجز",
        newAppointmentAlert: "طلب حجز عيادة جديد وارد الآن!",

        // Patient intake
        intakeTitle: "استقبال المريض",
        patientName: "اسم المريض",
        patientGender: "الجنس",
        genderMale: "ذكر",
        genderFemale: "أنثى",
        patientAge: "العمر",
        patientWeight: "الوزن (كجم)",
        patientPhone: "رقم الهاتف",
        visitType: "نوع الكشف",
        visitNew: "كشف جديد",
        visitFollowup: "إعادة كشف",
        visitDate: "التاريخ",
        complaintDetails: "تفاصيل الشكوى",
        prescriptionImageUpload: "إضافة صورة الروشتة (اختياري)",
        labImageUpload: "إضافة صورة التحاليل (اختياري)",
        assignedDoctor: "الطبيب المسؤول",
        savePatient: "حفظ بيانات المريض",
        patientSaved: "تم حفظ بيانات المريض بنجاح",

        // Prescription
        rxTitle: "كتابة الروشتة",
        rxDate: "تاريخ اليوم",
        rxPatientName: "اسم المريض",
        rxPatientAge: "عمر المريض",
        rxPatientWeight: "الوزن (كجم)",
        rxPatientPhone: "رقم جوال المريض",
        rxMedicines: "الأدوية الموصوفة",
        rxMedicineName: "اسم الدواء",
        rxDosage: "الجرعة",
        rxInstructions: "طريقة الاستخدام",
        addMedicine: "إضافة دواء",
        rxTests: "التحاليل والاشعة المطلوب عملها",
        addTest: "إضافة تحليل / اشعة",
        rxDoctorName: "اسم الدكتور",
        rxDoctorSignature: "رفع صورة توقيع / ختم الطبيب (اختياري)",
        generatePdf: "إنشاء ملف PDF وطباعته",
        rxNotes: "ملاحظات إضافية (اختياري)",
        rxDiagnosis: "التشخيص",
        downloadPdf: "تحميل / طباعة PDF",
        followupDays: "اعادة الكشف بعد (أيام)",
        followupAfter: "اعادة الكشف بعد",
        noFollowup: "لا يوجد اعادة",
        filterAll: "كل المرضى",
        filterHasFollowup: "عليهم إعادة كشف",
        filterNoFollowup: "بدون إعادة كشف",
        filterOverdue: "متأخر عن إعادة الكشف",
        filterFollowupToday: "اعادة الكشف اليوم",
        filterByDate: "فلتر بالتاريخ",
        today: "اليوم",

        // Staff & Doctors
        doctorNameAr: "الاسم (بالعربية)",
        doctorNameEn: "الاسم (بالإنجليزية)",
        doctorBio: "نبذة مختصرة",
        doctorCategory: "القسم / التخصص",
        doctorBranch: "الفرع",
        doctorWorkingHours: "مواعيد العمل",
        doctorNewFee: "قيمة الكشف الجديد",
        doctorFollowupFee: "قيمة إعادة الكشف",
        addDoctor: "إضافة طبيب / عامل",
        editDoctor: "تعديل بيانات الطبيب",
        addDaySlot: "إضافة موعد",
        dayLabel: "اليوم",
        fromLabel: "من",
        toLabel: "إلى",
        staffAndDoctors: "الأطباء",
        staffCount: "الأطباء والعاملين",

        // Categories
        addCategory: "إضافة قسم جديد",
        editCategory: "تعديل القسم",

        // Clinic branches
        addClinicBranch: "إضافة فرع جديد",
        editClinicBranch: "تعديل بيانات الفرع",

        // Patients profile
        patientProfileTitle: "بيانات المرضى",
        profileShared: "الملف الطبي للمريض",
        sharedPrescriptions: "الروشتات",
        sharedLabs: "التحاليل",
        viewPrescription: "عرض الروشتة",
        viewLab: "عرض التحاليل",

        // Reports
        reportsTitle: "التقارير والإحصائيات",
        reportTotalAppointments: "إجمالي الحجوزات",
        reportNewVisits: "كشوف جديدة",
        reportFollowups: "إعادة كشف",
        reportPerDoctor: "إحصائيات حسب الطبيب",
        reportPerDoctorValue: "قيمة الكشف حسب الطبيب",
        reportPeriod: "الفترة الزمنية",
        periodAll: "الكل",
        periodToday: "اليوم",
        periodThisWeek: "هذا الأسبوع",
        periodThisMonth: "هذا الشهر",
        periodCustom: "فترة مخصصة",
        filterDoctor: "فلترة حسب الطبيب",
        allDoctors: "جميع الأطباء",
        fromDate: "من تاريخ",
        toDate: "إلى تاريخ",
        doctorNewCount: "عدد الكشوف الجديدة",
        doctorFollowupCount: "عدد إعادة الكشف",
        doctorNewValue: "قيمة الكشوف الجديدة",
        doctorFollowupValue: "قيمة إعادة الكشف",
        doctorTotal: "الإجمالي",
        patientsPerDoctor: "بيانات المرضى حسب الطبيب",

        // Common
        save: "حفظ",
        cancel: "إلغاء",
        edit: "تعديل",
        add: "إضافة جديد",
        delete: "حذف",
        deactivate: "إلغاء التنشيط",
        activate: "تنشيط",
        close: "إغلاق",
        viewDetails: "تفاصيل",
        confirmDeleteTitle: "تأكيد العملية",
        confirmDeleteMsg: "هل أنت متأكد من تنفيذ هذا الإجراء؟",
        searchPlaceholder: "بحث...",
        allBranches: "جميع الفروع",
        loadingData: "جاري تحميل البيانات...",
        saveSuccess: "تم حفظ البيانات بنجاح",
        errorGeneric: "حدث خطأ غير متوقع",
        noDataFound: "لا توجد نتائج مطابقة",

        // Notification / audio
        enableAudioBtn: "تفعيل الصوت",
        soundEnabled: "التنبيه الصوتي مفعّل",
        muteAlert: "إيقاف التنبيه",

        // Auth
        loginSubtitle: "أدخل بيانات حسابك للدخول إلى لوحة تحكم العيادات",
        staffEmail: "البريد الإلكتروني",
        emailPlaceholder: "البريد الإلكتروني",
        passwordPlaceholder: "كلمة المرور",
        loginBtn: "دخول لوحة التحكم",
        loginSuccess: "تم تسجيل الدخول بنجاح",
        loginError: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل",
        inactiveAccountError: "عذراً، هذا الحساب معطل حالياً"
    },

    en: {
        brandName: "Elawadi Clinics",
        brandSubtitle: "Clinics Management Dashboard",

        navDashboard: "Dashboard - Appointments",
        navAppointments: "Appointments",
        navPatients: "Patient Profiles",
        navIntake: "Patient Intake",
        navPrescription: "Write Prescription",
        allPrescriptions: "Prescriptions",
        navStaffDoctors: "Doctors",
        navCategories: "Clinic Categories",
        navClinicBranches: "Clinic Branches",
        navReports: "Reports",
        navLogout: "Sign Out",

        roleAdmin: "Administrator",
        roleDoctor: "Doctor",
        roleStaff: "Staff",

        statNewAppointments: "New Appointments",
        statConfirmedAppointments: "Confirmed",
        statCompletedAppointments: "Completed",
        statCancelledAppointments: "Cancelled",
        statTotalPatients: "Total Patients",
        statFollowupPatients: "Patients with Follow-up",
        recentAppointments: "Recent Incoming Appointments",
        viewAllAppointments: "View All Appointments",

        appointmentPatient: "Patient",
        appointmentDoctor: "Doctor",
        appointmentBranch: "Branch",
        appointmentDay: "Preferred Day",
        appointmentPhone: "Phone",
        appointmentStatus: "Status",
        appointmentDate: "Date",
        appointmentActions: "Actions",
        appointmentNotes: "Notes",
        statusNew: "New",
        statusConfirmed: "Confirmed",
        statusCompleted: "Completed",
        statusCancelled: "Cancelled",
        actionConfirm: "Confirm Booking",
        actionCancel: "Cancel Booking",
        actionComplete: "Complete Booking",
        newAppointmentAlert: "New clinic booking received!",

        intakeTitle: "Patient Intake",
        patientName: "Patient Name",
        patientGender: "Gender",
        genderMale: "Male",
        genderFemale: "Female",
        patientAge: "Age",
        patientWeight: "Weight (kg)",
        patientPhone: "Phone",
        visitType: "Visit Type",
        visitNew: "New Visit",
        visitFollowup: "Follow-up Visit",
        visitDate: "Date",
        complaintDetails: "Complaint Details",
        prescriptionImageUpload: "Upload Prescription Image (optional)",
        labImageUpload: "Upload Lab Result Image (optional)",
        assignedDoctor: "Assigned Doctor",
        savePatient: "Save Patient",
        patientSaved: "Patient saved successfully",

        rxTitle: "Write Prescription",
        rxDate: "Today's Date",
        rxPatientName: "Patient Name",
        rxPatientAge: "Patient Age",
        rxPatientWeight: "Weight (kg)",
        rxPatientPhone: "Patient Mobile",
        rxMedicines: "Prescribed Medicines",
        rxMedicineName: "Medicine Name",
        rxDosage: "Dosage",
        rxInstructions: "Instructions",
        addMedicine: "Add Medicine",
        rxTests: "Required Tests & Radiology",
        addTest: "Add Test / Radiology",
        rxDoctorName: "Doctor Name",
        rxDoctorSignature: "Upload Doctor Signature / Stamp (optional)",
        generatePdf: "Generate & Print PDF",
        rxNotes: "Additional Notes (optional)",
        rxDiagnosis: "Diagnosis",
        downloadPdf: "Download / Print PDF",
        followupDays: "Follow-up After (days)",
        followupAfter: "Follow-up after",
        noFollowup: "No follow-up needed",
        filterAll: "All Patients",
        filterHasFollowup: "Has Follow-up",
        filterNoFollowup: "No Follow-up",
        filterOverdue: "Overdue Follow-up",
        filterFollowupToday: "Follow-up Today",
        filterByDate: "Filter by Date",
        today: "Today",

        doctorNameAr: "Name (Arabic)",
        doctorNameEn: "Name (English)",
        doctorBio: "Short Bio",
        doctorCategory: "Category / Specialty",
        doctorBranch: "Branch",
        doctorWorkingHours: "Working Hours",
        doctorNewFee: "New Visit Fee",
        doctorFollowupFee: "Follow-up Fee",
        addDoctor: "Add Doctor / Staff",
        editDoctor: "Edit Doctor",
        addDaySlot: "Add Slot",
        dayLabel: "Day",
        fromLabel: "From",
        toLabel: "To",
        staffAndDoctors: "Doctors",
        staffCount: "Staff & Doctors",

        addCategory: "Add New Category",
        editCategory: "Edit Category",

        addClinicBranch: "Add New Branch",
        editClinicBranch: "Edit Branch Details",

        patientProfileTitle: "Patient Profiles",
        profileShared: "Patient Medical Profile",
        sharedPrescriptions: "Prescriptions",
        sharedLabs: "Lab Results",
        viewPrescription: "View Prescription",
        viewLab: "View Lab Result",

        reportsTitle: "Reports & Analytics",
        reportTotalAppointments: "Total Appointments",
        reportNewVisits: "New Visits",
        reportFollowups: "Follow-ups",
        reportPerDoctor: "Stats by Doctor",
        reportPerDoctorValue: "Visit Value by Doctor",
        reportPeriod: "Time Period",
        periodAll: "All",
        periodToday: "Today",
        periodThisWeek: "This Week",
        periodThisMonth: "This Month",
        periodCustom: "Custom Range",
        filterDoctor: "Filter by Doctor",
        allDoctors: "All Doctors",
        fromDate: "From Date",
        toDate: "To Date",
        doctorNewCount: "New Visits",
        doctorFollowupCount: "Follow-ups",
        doctorNewValue: "New Visits Value",
        doctorFollowupValue: "Follow-ups Value",
        doctorTotal: "Total",
        patientsPerDoctor: "Patient Data by Doctor",

        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        add: "Add New",
        delete: "Delete",
        deactivate: "Deactivate",
        activate: "Activate",
        close: "Close",
        viewDetails: "Details",
        confirmDeleteTitle: "Confirm Action",
        confirmDeleteMsg: "Are you sure you want to proceed?",
        searchPlaceholder: "Search...",
        allBranches: "All Branches",
        loadingData: "Loading data...",
        saveSuccess: "Saved successfully",
        errorGeneric: "An unexpected error occurred",
        noDataFound: "No matching records found",

        enableAudioBtn: "Enable Sound",
        soundEnabled: "Sound alerts enabled",
        muteAlert: "Mute Alert",

        loginSubtitle: "Enter your credentials to access the clinics dashboard",
        staffEmail: "Email address",
        emailPlaceholder: "Email address",
        passwordPlaceholder: "Password",
        loginBtn: "Sign In to Dashboard",
        loginSuccess: "Signed in successfully",
        loginError: "Invalid login credentials or inactive account",
        inactiveAccountError: "Your account is currently inactive"
    }
};

class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem("elawadi_clinic_lang") || "ar";
        this.applyLanguage(this.currentLang, false);
    }

    t(key) {
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.ar;
        return dict[key] || key;
    }

    applyLanguage(lang, triggerRerender = true) {
        this.currentLang = (lang === "en") ? "en" : "ar";
        localStorage.setItem("elawadi_clinic_lang", this.currentLang);

        const html = document.documentElement;
        html.setAttribute("lang", this.currentLang);
        html.setAttribute("dir", this.currentLang === "ar" ? "rtl" : "ltr");

        this.updateDOMTranslations();

        const btnLang = document.getElementById("langSwitcherBtn");
        if (btnLang) {
            btnLang.innerHTML = this.currentLang === "ar"
                ? `<i class="fa-solid fa-globe"></i> <span>English</span>`
                : `<i class="fa-solid fa-globe"></i> <span>العربية</span>`;
        }

        if (triggerRerender && typeof window.onLanguageChange === "function") {
            window.onLanguageChange(this.currentLang);
        }

        if (triggerRerender && typeof auth !== "undefined" && auth && typeof auth.renderUserUI === "function" && (auth.user || auth.profile)) {
            auth.renderUserUI();
        }
    }

    toggleLanguage() {
        const nextLang = this.currentLang === "ar" ? "en" : "ar";
        this.applyLanguage(nextLang, true);
    }

    updateDOMTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            el.textContent = this.t(key);
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            el.setAttribute("placeholder", this.t(key));
        });

        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            el.setAttribute("title", this.t(key));
        });
    }
}

// Global singleton instance
const i18n = new I18nManager();

document.addEventListener("DOMContentLoaded", () => {
    updateThemeIcon();
});
