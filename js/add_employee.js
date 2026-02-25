import { supabase } from "./supabase.js";

const DEPARTMENT_LABELS = {
    IT: "ฝ่ายเทคนิค",
    บัญชี: "ออฟฟิศ",
    บุคคล: "ซ่อมบำรุง",
    ขาย: "วิศวกร"
};
const getDepartmentLabel = (dept) => DEPARTMENT_LABELS[dept] || dept || "-";

window.switchTab = (tabName) => {
    document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
    document.getElementById(`tab-${tabName}`).classList.add("active");
    const btns = document.querySelectorAll(".tab-btn");
    if (tabName === "add") btns[0].classList.add("active");
    if (tabName === "transfer") btns[1].classList.add("active");
    if (tabName === "remove") btns[2].classList.add("active");
};

// ADD
const saveBtn = document.getElementById("saveNewEmployeeBtn");
if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
        const prefix = document.getElementById("add_prefix").value;
        const code = document.getElementById("add_emp_code").value.trim();
        const fname = document.getElementById("add_first_name").value.trim();
        const lname = document.getElementById("add_last_name").value.trim();
        const dept = document.getElementById("dept_add").value;
        const sDate = document.getElementById("add_start_date").value;

        if (!code || !fname || !lname || !dept || !sDate) {
            return Swal.fire("ข้อมูลไม่ครบ", "กรอกให้ครบทุกช่อง", "warning");
        }

        const { data: exist, error: existError } = await supabase
            .from("employees")
            .select("id")
            .eq("employee_code", code);

        if (existError) return Swal.fire("Error", existError.message, "error");
        if ((exist || []).length > 0) return Swal.fire("รหัสซ้ำ", "รหัสนี้มีแล้ว", "error");

        const payload = {
            employee_code: code,
            full_name: `${prefix} ${fname} ${lname}`,
            department: dept,
            start_date: sDate
        };

        let insertError = null;
        for (let i = 0; i < 4; i += 1) {
            const { error } = await supabase.from("employees").insert([payload]);
            if (!error) {
                insertError = null;
                break;
            }

            insertError = error;
            const missingCol = error.message?.match(/Could not find the '([^']+)' column of 'employees'/)?.[1];
            if (!missingCol || !(missingCol in payload)) break;
            delete payload[missingCol];
        }

        if (insertError) {
            Swal.fire("Error", insertError.message, "error");
        } else {
            Swal.fire("สำเร็จ", "เพิ่มพนักงานเรียบร้อย", "success");
            document.getElementById("add_emp_code").value = "";
        }
    });
}

// TRANSFER
const searchTransBtn = document.getElementById("searchTransBtn");
const confirmTransBtn = document.getElementById("confirmTransBtn");
const transArea = document.getElementById("trans_form_area");
let transEmpCode = null;

if (searchTransBtn) {
    searchTransBtn.addEventListener("click", async () => {
        const code = document.getElementById("trans_search_code").value.trim();
        if (!code) return;

        const { data } = await supabase
            .from("employees")
            .select("*")
            .eq("employee_code", code)
            .single();

        if (!data) {
            transArea.classList.remove("active");
            return Swal.fire("ไม่พบข้อมูล", "", "error");
        }

        transEmpCode = data.employee_code;
        document.getElementById("trans_name").value = data.full_name;
        document.getElementById("trans_current_dept").value = getDepartmentLabel(data.department);
        transArea.classList.add("active");
    });
}

if (confirmTransBtn) {
    confirmTransBtn.addEventListener("click", async () => {
        const newDept = document.getElementById("trans_new_dept").value;
        if (!newDept) return Swal.fire("แจ้งเตือน", "เลือกแผนกใหม่", "warning");

        const { error } = await supabase
            .from("employees")
            .update({ department: newDept })
            .eq("employee_code", transEmpCode);

        if (error) Swal.fire("Error", error.message, "error");
        else {
            Swal.fire("สำเร็จ", "ย้ายแผนกแล้ว", "success");
            transArea.classList.remove("active");
        }
    });
}

// REMOVE
const searchDelBtn = document.getElementById("searchDelBtn");
const confirmDelBtn = document.getElementById("confirmDelBtn");
const delArea = document.getElementById("del_form_area");
let delEmpCode = null;
let delEmpId = null;

if (searchDelBtn) {
    searchDelBtn.addEventListener("click", async () => {
        const code = document.getElementById("del_search_code").value.trim();
        if (!code) return;

        const { data } = await supabase
            .from("employees")
            .select("id, employee_code, full_name, department")
            .eq("employee_code", code)
            .single();

        if (!data) {
            delArea.classList.remove("active");
            confirmDelBtn.disabled = true;
            return Swal.fire("ไม่พบข้อมูล", "", "error");
        }

        delEmpCode = data.employee_code;
        delEmpId = data.id;
        document.getElementById("del_first_name").value = data.full_name;
        document.getElementById("del_dept").value = getDepartmentLabel(data.department);
        delArea.classList.add("active");
        confirmDelBtn.disabled = false;
    });
}

if (confirmDelBtn) {
    confirmDelBtn.addEventListener("click", async () => {
        const res = await Swal.fire({
            title: "ยืนยันลบ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "ลบ"
        });

        if (!res.isConfirmed) return;
        if (!delEmpId) return Swal.fire("Error", "Employee id not found", "error");

        const { count: attendanceCount, error: attendanceCountError } = await supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("employee_id", delEmpId);

        if (attendanceCountError) return Swal.fire("Error", attendanceCountError.message, "error");

        if ((attendanceCount || 0) > 0) {
            const confirmCascade = await Swal.fire({
                title: "ลบประวัติการเช็คชื่อด้วยหรือไม่?",
                text: `พบ ${attendanceCount} รายการ และจะถูกลบพร้อมกัน`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#d33",
                confirmButtonText: "ลบทั้งหมด"
            });

            if (!confirmCascade.isConfirmed) return;

            const { error: attendanceDeleteError } = await supabase
                .from("attendance")
                .delete()
                .eq("employee_id", delEmpId);

            if (attendanceDeleteError) return Swal.fire("Error", attendanceDeleteError.message, "error");
        }

        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", delEmpId);

        if (error) return Swal.fire("Error", error.message, "error");

        delEmpCode = null;
        delEmpId = null;
        document.getElementById("del_search_code").value = "";
        document.getElementById("del_first_name").value = "";
        document.getElementById("del_dept").value = "";
        confirmDelBtn.disabled = true;
        delArea.classList.remove("active");
        Swal.fire("สำเร็จ", "ลบแล้ว", "success");
    });
}
