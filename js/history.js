import { supabase } from "./supabase.js";

const searchBtn = document.getElementById("searchHistoryBtn");
const dateInput = document.getElementById("hist_date");
const periodSelect = document.getElementById("hist_period");
const deptSelect = document.getElementById("hist_dept");
const tableBody = document.getElementById("historyTableBody");
const statsContainer = document.getElementById("statsContainer");
const exportBtn = document.getElementById("exportExcelPopupBtn");

let donutChart = null;
let barChart = null;

const STATUS_TEXT = {
  present: "มา",
  sick: "ลาป่วย",
  leave: "ลากิจ",
  absent: "ขาด"
};

const STATUS_MAP = {
  [STATUS_TEXT.present]: "present",
  [STATUS_TEXT.sick]: "sick",
  [STATUS_TEXT.leave]: "leave",
  [STATUS_TEXT.absent]: "absent"
};

const PERIOD_TEXT = {
  morning: "ช่วงเช้า",
  afternoon: "ช่วงบ่าย",
  all: "ทุกช่วงเวลา"
};

const PERIOD_ORDER = {
  morning: 1,
  afternoon: 2
};
const DEPARTMENT_LABELS = {
  IT: "ฝ่ายเทคนิค",
  บัญชี: "ออฟฟิศ",
  บุคคล: "ซ่อมบำรุง",
  ขาย: "วิศวกร"
};

if (dateInput) dateInput.valueAsDate = new Date();

const formatDateThai = (d) =>
  new Date(d).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

const getDepartmentLabel = (dept) => DEPARTMENT_LABELS[dept] || dept || "-";

const createCounter = () => ({
  present: 0,
  sick: 0,
  leave: 0,
  absent: 0,
  ot: 0,
  total: 0
});

const accumulateCounter = (counter, row) => {
  const key = STATUS_MAP[row.status];
  if (key) counter[key]++;
  if (row.ot) counter.ot++;
  counter.total++;
};

const rowsToCounter = (rows) => {
  const counter = createCounter();
  rows.forEach((row) => accumulateCounter(counter, row));
  return counter;
};

const loadHistory = async (deptFilter = "") => {
  const date = dateInput?.value;
  const period = periodSelect?.value || "all";

  if (!date) return Swal.fire("เตือน", "กรุณาเลือกวันที่", "warning");

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">กำลังโหลด...</td></tr>`;
  if (statsContainer) statsContainer.style.display = "none";

  let query = supabase
    .from("attendance")
    .select("*, employees(employee_code)")
    .eq("date", date)
    .order("department");

  if (period !== "all") query = query.eq("time_period", period);
  if (deptFilter) query = query.eq("department", deptFilter);

  const { data, error } = await query;
  if (error || !data?.length) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">ไม่พบข้อมูล</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  const stats = createCounter();

  data.forEach((row) => {
    accumulateCounter(stats, row);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${getDepartmentLabel(row.department)}</td>
      <td>${row.employees?.employee_code || "-"}</td>
      <td style="text-align:center;">${row.employee_name || "-"}</td>
      <td>${PERIOD_TEXT[row.time_period] || row.time_period || "-"}</td>
      <td>${row.status || "-"}</td>
      <td>${row.ot ? "✓" : "-"}</td>
    `;
    tableBody.appendChild(tr);
  });

  renderCharts(stats);
};

const renderCharts = (stats) => {
  if (statsContainer) statsContainer.style.display = "block";
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const come = stats.present;
  const sick = stats.sick;
  const leave = stats.leave;
  const absent = stats.absent;
  const ot = stats.ot;
  const total = stats.total;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = String(value);
  };

  setText("statCome", come);
  setText("statSick", sick);
  setText("statLeave", leave);
  setText("statAbsent", absent);
  setText("statOT", ot);
  setText("statTotal", total);

  const labels = [STATUS_TEXT.present, STATUS_TEXT.sick, STATUS_TEXT.leave, STATUS_TEXT.absent];
  const values = [come, sick, leave, absent];
  const maxValue = Math.max(...values, 1);

  const donutCanvas = document.getElementById("attendanceDonut");
  if (donutCanvas) {
    const ctx1 = donutCanvas.getContext("2d");
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx1, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ["#22c55e", "#facc15", "#06b6d4", "#ef4444"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: isMobile ? "bottom" : "right",
            labels: {
              boxWidth: isMobile ? 10 : 14,
              padding: isMobile ? 10 : 14,
              font: { size: isMobile ? 11 : 12 }
            }
          }
        }
      }
    });
  }

  const barCanvas = document.getElementById("attendanceBar");
  if (!barCanvas) return;

  const ctx2 = barCanvas.getContext("2d");
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx2, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "จำนวนคน",
          data: values,
          backgroundColor: ["#22c55e", "#facc15", "#06b6d4", "#ef4444"],
          hoverBackgroundColor: ["#16a34a", "#eab308", "#0891b2", "#dc2626"],
          borderColor: ["#15803d", "#ca8a04", "#0e7490", "#b91c1c"],
          borderWidth: 1,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 56
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `จำนวน: ${ctx.formattedValue}`
          }
        }
      },
      animation: {
        duration: 650,
        easing: "easeOutQuart"
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#334155",
            font: { weight: "600", size: isMobile ? 11 : 12 }
          }
        },
        y: {
          beginAtZero: true,
          max: maxValue + 1,
          ticks: {
            stepSize: 1,
            color: "#64748b"
          },
          grid: {
            color: "rgba(148, 163, 184, 0.28)"
          }
        }
      }
    }
  });
};

if (searchBtn) searchBtn.addEventListener("click", () => loadHistory(deptSelect?.value || ""));

const toThaiPeriod = (period) => PERIOD_TEXT[period] || period || "-";

const counterToRow = (label, counter) => ({
  รายการ: label,
  มา: counter.present,
  ลาป่วย: counter.sick,
  ลากิจ: counter.leave,
  ขาด: counter.absent,
  OT: counter.ot,
  รวม: counter.total
});

const toDetailRows = (rows) =>
  rows
    .slice()
    .sort((a, b) => {
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;

      const periodCompare = (PERIOD_ORDER[a.time_period] || 99) - (PERIOD_ORDER[b.time_period] || 99);
      if (periodCompare !== 0) return periodCompare;

      const deptCompare = (a.department || "").localeCompare(b.department || "");
      if (deptCompare !== 0) return deptCompare;

      return (a.employee_name || "").localeCompare(b.employee_name || "");
    })
    .map((row) => ({
      วันที่: formatDateThai(row.date),
      ช่วงเวลา: toThaiPeriod(row.time_period),
      แผนก: getDepartmentLabel(row.department),
      รหัสพนักงาน: row.employees?.employee_code || "-",
      ชื่อพนักงาน: row.employee_name || "-",
      สถานะ: row.status || "-",
      OT: row.ot ? "✓" : "-"
    }));

const appendSheet = (workbook, rows, sheetName) => {
  const safeRows = rows?.length ? rows : [{ หมายเหตุ: "ไม่พบข้อมูล" }];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  XLSX.utils.book_append_sheet(workbook, ws, sheetName);
};

const saveWorkbook = (sheets, fileName) => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => appendSheet(wb, rows, name));
  XLSX.writeFile(wb, fileName);
};

const makeSheetNameFactory = () => {
  const used = new Set();
  return (base) => {
    const safeBase = (base || "Sheet").replace(/[\\/:*?[\]]/g, "-");
    let name = safeBase.slice(0, 31) || "Sheet";
    if (!used.has(name)) {
      used.add(name);
      return name;
    }

    let i = 1;
    while (true) {
      const suffix = `-${i}`;
      const candidate = `${safeBase.slice(0, 31 - suffix.length)}${suffix}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
      i++;
    }
  };
};

const applyExportFilters = (query, overrides = {}) => {
  const period = overrides.period ?? (periodSelect?.value || "all");
  const department = overrides.department ?? (deptSelect?.value || "");
  let filtered = query;

  if (period !== "all") filtered = filtered.eq("time_period", period);
  if (department) filtered = filtered.eq("department", department);
  return filtered;
};

const askExportMode = async () => {
  const deptOptions = [
    `<option value="">ทุกแผนก</option>`,
    ...Array.from(deptSelect?.options || [])
      .filter((opt) => opt.value)
      .map((opt) => `<option value="${opt.value}">${opt.textContent}</option>`)
  ].join("");

  const { value } = await Swal.fire({
    title: "เลือกรูปแบบ Excel",
    html: `
      <div style="display:flex; justify-content:center; gap:24px; margin:8px 0 12px;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="radio" name="excel_mode" value="day" checked>
          <span>สรุปแบบวัน</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="radio" name="excel_mode" value="month">
          <span>สรุปแบบเดือน</span>
        </label>
      </div>
      <div id="monthDeptWrap" style="display:none; text-align:left; margin-top:8px;">
        <label for="swalMonthDept" style="display:block; margin-bottom:6px; color:#64748b; font-size:14px;">แผนก (สำหรับสรุปแบบเดือน)</label>
        <select id="swalMonthDept" class="swal2-select" style="width:100%; margin:0;">${deptOptions}</select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "ตกลง",
    cancelButtonText: "ยกเลิก",
    didOpen: () => {
      const wrap = document.getElementById("monthDeptWrap");
      const dept = document.getElementById("swalMonthDept");
      if (dept && deptSelect?.value) dept.value = deptSelect.value;

      const radios = Array.from(document.querySelectorAll('input[name="excel_mode"]'));
      const toggle = () => {
        const mode = document.querySelector('input[name="excel_mode"]:checked')?.value || "day";
        if (wrap) wrap.style.display = mode === "month" ? "block" : "none";
      };
      radios.forEach((radio) => radio.addEventListener("change", toggle));
      toggle();
    },
    preConfirm: () => {
      const mode = document.querySelector('input[name="excel_mode"]:checked')?.value;
      if (!mode) {
        Swal.showValidationMessage("กรุณาเลือกรูปแบบ");
        return false;
      }
      const monthDepartment = document.getElementById("swalMonthDept")?.value || "";
      return { mode, monthDepartment };
    }
  });

  return value;
};

const askDate = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const { value } = await Swal.fire({
    title: "เลือกวันที่",
    html: `<input type="date" id="swalExportDate" class="swal2-input">`,
    showCancelButton: true,
    confirmButtonText: "ตกลง",
    cancelButtonText: "ยกเลิก",
    didOpen: () => {
      const input = document.getElementById("swalExportDate");
      if (input) input.value = dateInput?.value || today;
    },
    preConfirm: () => {
      const input = document.getElementById("swalExportDate");
      if (!input?.value) {
        Swal.showValidationMessage("กรุณาเลือกวันที่");
        return false;
      }
      return input.value;
    }
  });
  return value;
};

const askMonth = async () => {
  const today = new Date();
  const defaultYear = String(today.getFullYear());
  const defaultMonth = String(today.getMonth() + 1).padStart(2, "0");
  const thaiMonths = [
    { value: "01", label: "มกราคม" },
    { value: "02", label: "กุมภาพันธ์" },
    { value: "03", label: "มีนาคม" },
    { value: "04", label: "เมษายน" },
    { value: "05", label: "พฤษภาคม" },
    { value: "06", label: "มิถุนายน" },
    { value: "07", label: "กรกฎาคม" },
    { value: "08", label: "สิงหาคม" },
    { value: "09", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" }
  ];

  const monthOptions = thaiMonths
    .map((m) => `<option value="${m.value}">${m.label}</option>`)
    .join("");

  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = String(today.getFullYear() - 3 + i);
    return `<option value="${year}">${Number(year) + 543}</option>`;
  }).join("");

  const { value } = await Swal.fire({
    title: "เลือกเดือน",
    html: `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
        <select id="swalExportMonthSelect" class="swal2-select" style="width:100%; margin:0;">
          ${monthOptions}
        </select>
        <select id="swalExportYearSelect" class="swal2-select" style="width:100%; margin:0;">
          ${yearOptions}
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "ตกลง",
    cancelButtonText: "ยกเลิก",
    didOpen: () => {
      const monthSelect = document.getElementById("swalExportMonthSelect");
      const yearSelect = document.getElementById("swalExportYearSelect");
      if (monthSelect) monthSelect.value = defaultMonth;
      if (yearSelect) yearSelect.value = defaultYear;
    },
    preConfirm: () => {
      const monthSelect = document.getElementById("swalExportMonthSelect");
      const yearSelect = document.getElementById("swalExportYearSelect");
      if (!monthSelect?.value || !yearSelect?.value) {
        Swal.showValidationMessage("กรุณาเลือกเดือน");
        return false;
      }
      return `${yearSelect.value}-${monthSelect.value}`;
    }
  });
  return value;
};

const getMonthDateRange = (monthValue) => {
  const [year, month] = monthValue.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;
  return { start, end };
};

if (exportBtn) exportBtn.addEventListener("click", async () => {
  const exportChoice = await askExportMode();
  if (!exportChoice?.mode) return;
  const { mode, monthDepartment } = exportChoice;

  if (mode === "day") {
    const selectedDate = dateInput?.value || await askDate();
    if (!selectedDate) return;

    let query = supabase
      .from("attendance")
      .select("date, status, ot, time_period, department, employee_name, employees(employee_code)")
      .eq("date", selectedDate);

    query = applyExportFilters(query);
    const { data, error } = await query;

    if (error) return Swal.fire("เกิดข้อผิดพลาด", error.message || "โหลดข้อมูลไม่สำเร็จ", "error");
    if (!data?.length) return Swal.fire("ไม่พบข้อมูล", "ไม่พบข้อมูลตามวันที่ที่เลือก", "info");

    const detailRows = toDetailRows(data);
    const summaryRows = [counterToRow(`สรุปวันที่ ${formatDateThai(selectedDate)}`, rowsToCounter(data))];

    saveWorkbook(
      [
        { name: "รายชื่อพนักงาน", rows: detailRows },
        { name: "สรุปประจำวัน", rows: summaryRows }
      ],
      `attendance-day-${selectedDate}.xlsx`
    );
    return;
  }

  const selectedMonth = await askMonth();
  if (!selectedMonth) return;

  const { start, end } = getMonthDateRange(selectedMonth);
  let query = supabase
    .from("attendance")
    .select("date, status, ot, time_period, department, employee_name, employees(employee_code)")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  query = applyExportFilters(query, { department: monthDepartment || "" });
  const { data, error } = await query;

  if (error) return Swal.fire("เกิดข้อผิดพลาด", error.message || "โหลดข้อมูลไม่สำเร็จ", "error");
  if (!data?.length) return Swal.fire("ไม่พบข้อมูล", "ไม่พบข้อมูลตามเดือนที่เลือก", "info");

  const byDepartment = new Map();
  data.forEach((row) => {
    const dept = row.department || "ไม่ระบุแผนก";
    if (!byDepartment.has(dept)) byDepartment.set(dept, []);
    byDepartment.get(dept).push(row);
  });

  const makeSheetName = makeSheetNameFactory();
  const sheets = [];

  Array.from(byDepartment.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dept, rows]) => {
      const deptLabel = getDepartmentLabel(dept);
      const grouped = new Map();
      rows.forEach((row) => {
        const key = row.date;
        if (!grouped.has(key)) grouped.set(key, createCounter());
        accumulateCounter(grouped.get(key), row);
      });

      const summaryRows = Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counter]) => counterToRow(formatDateThai(date), counter));

      summaryRows.push(counterToRow(`รวมทั้งเดือน (${deptLabel})`, rowsToCounter(rows)));

      sheets.push({
        name: makeSheetName(`รายชื่อ-${deptLabel}`),
        rows: toDetailRows(rows)
      });
      sheets.push({
        name: makeSheetName(`สรุป-${deptLabel}`),
        rows: summaryRows
      });
    });

  saveWorkbook(sheets, `attendance-month-${selectedMonth}.xlsx`);
});
