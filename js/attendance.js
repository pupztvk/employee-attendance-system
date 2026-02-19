import { supabase } from "./supabase.js";

const dateInput = document.getElementById("dateInput");
const deptSelect = document.getElementById("dept_filter");
const periodSelect = document.getElementById("period_select");
const tableBody = document.getElementById("attendanceTableBody");
const saveBtn = document.getElementById("saveAttendanceBtn");
const editBtn = document.getElementById("editAttendanceBtn");
const thOT = document.getElementById("th_ot");

const STATUS_VALUES = ["มา", "ลาป่วย", "ลากิจ", "ขาด"];
const DEPARTMENT_LABELS = {
  IT: "ฝ่ายเทคนิค",
  บัญชี: "ออฟฟิศ",
  บุคคล: "ซ่อมบำรุง",
  ขาย: "วิศวกร"
};

if (dateInput) dateInput.valueAsDate = new Date();

const getDepartmentLabel = (dept) => DEPARTMENT_LABELS[dept] || dept || "-";
const PRESENT_STATUS = STATUS_VALUES[0];

const buildStatusCells = (radioName, selectedStatus = "") =>
  STATUS_VALUES.map(
    (status) =>
      `<td><input type="radio" name="${radioName}" value="${status}" ${selectedStatus === status ? "checked" : ""}></td>`
  ).join("");

const buildOTCell = (period, checked = false, className = "ot-check") =>
  period === "afternoon"
    ? `<td><input type="checkbox" class="${className}" ${checked ? "checked" : ""}></td>`
    : `<td style="display:none;"></td>`;

const shouldEnableOT = (statusValue, period) =>
  period === "afternoon" && statusValue === PRESENT_STATUS;

const syncOTForRow = (row, period, checkboxClass = "ot-check") => {
  if (!row) return;
  const otCheckbox = row.querySelector(`.${checkboxClass}`);
  if (!(otCheckbox instanceof HTMLInputElement)) return;

  const selectedStatus = row.querySelector("input[type=\"radio\"]:checked")?.value || "";
  const canEnableOT = shouldEnableOT(selectedStatus, period);

  otCheckbox.disabled = !canEnableOT;
  if (!canEnableOT) otCheckbox.checked = false;
};

const toggleOTHeader = (period, headerEl) => {
  if (!headerEl) return;
  headerEl.style.display = period === "afternoon" ? "table-cell" : "none";
};

const renderEmptyDepartmentState = () => {
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" style="padding: 60px; color: #999; text-align:center;">
        <div style="font-size: 40px; margin-bottom: 15px;">📋</div>
        กรุณาเลือก <b>"แผนก"</b> ด้านบนเพื่อแสดงรายชื่อ
      </td>
    </tr>
  `;
};

const validateSelectedStatus = (rows, selectorPrefix = "") => {
  for (const row of rows) {
    if (!row.dataset.empId && !row.dataset.recordId) continue;
    const checked =
      row.querySelector(`input[type="radio"][name^="${selectorPrefix}"]:checked`) ||
      row.querySelector("input[type=\"radio\"]:checked");
    if (!checked) return false;
  }
  return true;
};

const getDepartmentOptionsHTML = () => {
  const options = Array.from(deptSelect?.options || [])
    .filter((opt) => opt.value)
    .map((opt) => `<option value="${opt.value}">${opt.textContent}</option>`);

  if (options.length > 0) return options.join("");
  return `<option value="IT">ฝ่ายเทคนิค</option><option value="บัญชี">ออฟฟิศ</option><option value="บุคคล">ซ่อมบำรุง</option><option value="ขาย">วิศวกร</option>`;
};

const loadEmployees = async () => {
  const dept = deptSelect?.value;
  const period = periodSelect?.value || "morning";

  toggleOTHeader(period, thOT);
  tableBody.innerHTML = "";

  if (!dept) {
    renderEmptyDepartmentState();
    return;
  }

  const { data: employees, error } = await supabase
    .from("employees")
    .select("*")
    .eq("department", dept)
    .order("employee_code", { ascending: true });

  if (error || !employees?.length) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">ไม่พบพนักงาน</td></tr>`;
    return;
  }

  employees.forEach((emp) => {
    const row = document.createElement("tr");
    const radioName = `status_${emp.id}`;
    row.innerHTML = `
      <td>${getDepartmentLabel(emp.department)}</td>
      <td>${emp.employee_code}</td>
      <td style="text-align:center;">${emp.full_name}</td>
      ${buildStatusCells(radioName)}
      ${buildOTCell(period, false, "ot-check")}
    `;
    row.dataset.empId = String(emp.id);
    row.dataset.empName = emp.full_name || "";
    row.dataset.dept = emp.department || "";
    syncOTForRow(row, period, "ot-check");
    tableBody.appendChild(row);
  });
};

if (deptSelect) deptSelect.addEventListener("change", loadEmployees);
if (periodSelect) periodSelect.addEventListener("change", loadEmployees);
if (deptSelect?.value) loadEmployees();
if (tableBody) {
  tableBody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;

    const row = target.closest("tr");
    syncOTForRow(row, periodSelect?.value || "morning", "ot-check");
  });
}

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const date = dateInput?.value;
    const dept = deptSelect?.value;
    const period = periodSelect?.value || "morning";

    if (!date || !dept) {
      return Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาเลือกวันที่และแผนก"
      });
    }

    const rows = Array.from(tableBody.querySelectorAll("tr"));
    const employeeRows = rows.filter((row) => row.dataset.empId);

    if (employeeRows.length === 0) {
      return Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "ไม่พบรายชื่อพนักงานสำหรับบันทึก"
      });
    }

    if (!validateSelectedStatus(employeeRows)) {
      return Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณาเลือกสถานะให้ครบทุกคน"
      });
    }

    const confirm = await Swal.fire({
      icon: "question",
      title: "ยืนยันการบันทึก?",
      text: "คุณต้องการบันทึกข้อมูลการเช็คชื่อใช่หรือไม่",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก"
    });
    if (!confirm.isConfirmed) return;

    const { data: existing, error: existingError } = await supabase
      .from("attendance")
      .select("id")
      .eq("date", date)
      .eq("department", dept)
      .eq("time_period", period);

    if (existingError) {
      return Swal.fire("เกิดข้อผิดพลาด", existingError.message, "error");
    }

    if ((existing || []).length > 0) {
      return Swal.fire(
        "มีข้อมูลบันทึกแล้ว",
        "ชุดข้อมูลนี้ถูกบันทึกไว้แล้ว กรุณาใช้ปุ่ม \"แก้ไขข้อมูลเช็คชื่อ\"",
        "warning"
      );
    }

    const records = employeeRows.map((row) => {
      const status = row.querySelector("input[type=\"radio\"]:checked")?.value || STATUS_VALUES[3];
      const selectedOT = row.querySelector(".ot-check")?.checked || false;
      const ot = shouldEnableOT(status, period) ? selectedOT : false;

      return {
        employee_id: row.dataset.empId,
        employee_name: row.dataset.empName,
        department: row.dataset.dept,
        date,
        thai_date: new Date(date).toLocaleDateString("th-TH"),
        time_period: period,
        status,
        ot
      };
    });

    const { error } = await supabase.from("attendance").insert(records);

    if (error) {
      console.error(error);
      return Swal.fire("เกิดข้อผิดพลาด", error.message, "error");
    }

    Swal.fire("สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว", "success");
    loadEmployees();
  });
}

const requestEditPassword = async () => {
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  const currentUser = userRes?.user;

  if (userError || !currentUser?.email) {
    await Swal.fire("ไม่พบผู้ใช้งาน", "กรุณาเข้าสู่ระบบใหม่ก่อนแก้ไขข้อมูล", "warning");
    return false;
  }

  const { value: password } = await Swal.fire({
    title: "ยืนยันสิทธิ์แก้ไข",
    text: `กรอกรหัสผ่านของบัญชี ${currentUser.email}`,
    input: "password",
    inputPlaceholder: "รหัสผ่าน",
    showCancelButton: true,
    buttonsStyling: false,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    inputValidator: (value) => (!value ? "กรุณากรอกรหัสผ่าน" : undefined),
    backdrop: "rgba(15, 23, 42, 0.48)",
    customClass: {
      popup: "swal-auth-popup",
      title: "swal-auth-title",
      htmlContainer: "swal-auth-description",
      input: "swal-auth-input",
      actions: "swal-actions-row",
      confirmButton: "swal-btn swal-btn-primary",
      cancelButton: "swal-btn swal-btn-muted"
    }
  });

  if (!password) return false;

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password
  });

  if (loginError) {
    await Swal.fire("รหัสผ่านไม่ถูกต้อง", "กรุณาตรวจสอบรหัสผ่านแล้วลองใหม่อีกครั้ง", "error");
    return false;
  }

  return true;
};

const openEditAttendancePopup = async () => {
  const passOk = await requestEditPassword();
  if (!passOk) return;

  const deptOptions = getDepartmentOptionsHTML();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = dateInput?.value || today;
  const defaultPeriod = periodSelect?.value || "morning";
  const defaultDept = deptSelect?.value || "IT";

  const popupResult = await Swal.fire({
    title: "แก้ไขข้อมูลเช็คชื่อ",
    width: "min(1120px, 96vw)",
    showCancelButton: true,
    buttonsStyling: false,
    confirmButtonText: "บันทึกการแก้ไข",
    cancelButtonText: "ปิด",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    backdrop: "rgba(15, 23, 42, 0.5)",
    customClass: {
      popup: "swal-edit-popup",
      title: "swal-edit-title",
      htmlContainer: "swal-edit-content",
      actions: "swal-actions-row",
      confirmButton: "swal-btn swal-btn-primary",
      cancelButton: "swal-btn swal-btn-muted"
    },
    html: `
      <div class="edit-attendance-shell" style="text-align:left;">
        <p class="edit-attendance-note" style="margin:0 0 10px; color:#555;">เลือกวันที่ ช่วงเวลา และแผนก จากนั้นแก้สถานะ/OT ได้ทันที</p>
        <div class="edit-attendance-filters" style="display:grid; grid-template-columns:1fr 1fr 1fr 90px; gap:10px; margin-bottom:12px;">
          <input id="edit_date" type="date" class="swal2-input" style="margin:0; width:100%;">
          <select id="edit_period" class="swal2-select" style="margin:0; width:100%;">
            <option value="morning">เช้า</option>
            <option value="afternoon">บ่าย (+OT)</option>
          </select>
          <select id="edit_dept" class="swal2-select" style="margin:0; width:100%;">${deptOptions}</select>
          <button id="edit_load_btn" type="button" class="swal2-confirm swal2-styled edit-load-btn" style="margin:0; width:100%;">ค้นหา</button>
        </div>
        <div class="edit-attendance-table-wrap" style="max-height:420px; overflow:auto; border:1px solid #e5e7eb; border-radius:10px;">
          <table class="edit-attendance-table" style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr class="edit-attendance-head-row" style="background:#111; color:#fff;">
                <th style="padding:8px;">แผนก</th>
                <th style="padding:8px;">รหัส</th>
                <th style="padding:8px;">ชื่อ-นามสกุล</th>
                <th style="padding:8px;">มา</th>
                <th style="padding:8px;">ลาป่วย</th>
                <th style="padding:8px;">ลากิจ</th>
                <th style="padding:8px;">ขาด</th>
                <th id="edit_th_ot" style="padding:8px;">OT</th>
              </tr>
            </thead>
            <tbody id="edit_attendance_tbody">
              <tr><td colspan="8" style="padding:16px; text-align:center; color:#666;">กดค้นหาเพื่อโหลดข้อมูล</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    didOpen: async () => {
      const popup = Swal.getPopup();
      if (!popup) return;

      const editDate = popup.querySelector("#edit_date");
      const editPeriod = popup.querySelector("#edit_period");
      const editDept = popup.querySelector("#edit_dept");
      const loadBtn = popup.querySelector("#edit_load_btn");
      const editThOT = popup.querySelector("#edit_th_ot");
      const editTbody = popup.querySelector("#edit_attendance_tbody");

      if (editDate) editDate.value = defaultDate;
      if (editPeriod) editPeriod.value = defaultPeriod;
      if (editDept) editDept.value = defaultDept;

      const renderRows = async () => {
        const selectedDate = editDate?.value;
        const selectedPeriod = editPeriod?.value || "morning";
        const selectedDept = editDept?.value;

        toggleOTHeader(selectedPeriod, editThOT);

        if (!selectedDate || !selectedDept) {
          editTbody.innerHTML = `<tr><td colspan="8" style="padding:16px; text-align:center; color:#666;">กรุณาเลือกวันที่และแผนก</td></tr>`;
          return;
        }

        editTbody.innerHTML = `<tr><td colspan="8" style="padding:16px; text-align:center; color:#666;">กำลังโหลด...</td></tr>`;

        const { data, error } = await supabase
          .from("attendance")
          .select("id, employee_name, employee_id, department, status, ot, employees(employee_code)")
          .eq("date", selectedDate)
          .eq("department", selectedDept)
          .eq("time_period", selectedPeriod)
          .order("employee_name", { ascending: true });

        if (error) {
          editTbody.innerHTML = `<tr><td colspan="8" style="padding:16px; text-align:center; color:#dc2626;">${error.message}</td></tr>`;
          return;
        }

        if (!data?.length) {
          editTbody.innerHTML = `<tr><td colspan="8" style="padding:16px; text-align:center; color:#666;">ไม่พบข้อมูลที่บันทึกไว้สำหรับเงื่อนไขนี้</td></tr>`;
          return;
        }

        editTbody.innerHTML = "";
        data.forEach((row) => {
          const tr = document.createElement("tr");
          const radioName = `edit_status_${row.id}`;
          tr.dataset.recordId = String(row.id);
          tr.innerHTML = `
            <td class="edit-cell">${getDepartmentLabel(row.department)}</td>
            <td class="edit-cell">${row.employees?.employee_code || "-"}</td>
            <td class="edit-cell edit-name">${row.employee_name || "-"}</td>
            ${buildStatusCells(radioName, row.status)}
            ${buildOTCell(selectedPeriod, !!row.ot, "edit-ot-check")}
          `;
          syncOTForRow(tr, selectedPeriod, "edit-ot-check");
          editTbody.appendChild(tr);
        });
      };

      loadBtn?.addEventListener("click", renderRows);
      editDate?.addEventListener("change", renderRows);
      editPeriod?.addEventListener("change", renderRows);
      editDept?.addEventListener("change", renderRows);
      editTbody?.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;

        const row = target.closest("tr[data-record-id]");
        syncOTForRow(row, editPeriod?.value || "morning", "edit-ot-check");
      });

      await renderRows();
    },
    preConfirm: async () => {
      const popup = Swal.getPopup();
      if (!popup) return false;
      const selectedPeriod = popup.querySelector("#edit_period")?.value || "morning";

      const rows = Array.from(popup.querySelectorAll("#edit_attendance_tbody tr[data-record-id]"));
      if (rows.length === 0) {
        Swal.showValidationMessage("ไม่พบข้อมูลสำหรับแก้ไข");
        return false;
      }

      if (!validateSelectedStatus(rows, "edit_status_")) {
        Swal.showValidationMessage("กรุณาเลือกสถานะให้ครบทุกคน");
        return false;
      }

      for (const row of rows) {
        const id = row.dataset.recordId;
        const status = row.querySelector("input[type=\"radio\"]:checked")?.value || STATUS_VALUES[3];
        const selectedOT = row.querySelector(".edit-ot-check")?.checked || false;
        const ot = shouldEnableOT(status, selectedPeriod) ? selectedOT : false;

        const { error } = await supabase
          .from("attendance")
          .update({ status, ot })
          .eq("id", id);

        if (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      }

      return true;
    }
  });

  if (popupResult.isConfirmed) {
    await Swal.fire("สำเร็จ", "แก้ไขข้อมูลเช็คชื่อเรียบร้อยแล้ว", "success");
    loadEmployees();
  }
};

if (editBtn) {
  editBtn.addEventListener("click", openEditAttendancePopup);
}
