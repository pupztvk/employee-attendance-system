import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {

  let currentEmail = null;
  const ADMIN_EMAIL = "admin1@gmail.com";

  /* -------------------- บันทึกการเข้าใช้งาน -------------------- */
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (userData?.user?.email) {

      currentEmail = userData.user.email;

      const now = new Date();
      const login_date = now.toISOString().split("T")[0];
      const login_time = now.toTimeString().split(" ")[0];

      await supabase.from("user_logins").insert([
        {
          email: currentEmail,
          login_date: login_date,
          login_time: login_time
        }
      ]);

      /* -------- จำกัดสิทธิ์เมนู Admin -------- */
      if (currentEmail.toLowerCase() !== ADMIN_EMAIL) {
        const adminBtn = document.getElementById("navEmployee");
        if (adminBtn) adminBtn.style.display = "none";
      }

    }
  } catch (err) {
    console.log("log error:", err);
  }

  const navAttendance = document.getElementById("navAttendance");
  const navHistory = document.getElementById("navHistory");
  const navEmployee = document.getElementById("navEmployee");
  const logoutBtn = document.getElementById("logoutBtn");

  const navBtns = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".content-section");

  const showSection = (sectionId, btn) => {
    sections.forEach((sec) => sec.classList.remove("active"));
    navBtns.forEach((b) => b.classList.remove("active"));

    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------- ตรวจสิทธิ์ Admin -------- */
  const requestEmployeeAccess = async () => {

    if (currentEmail.toLowerCase() !== ADMIN_EMAIL) {
      await Swal.fire(
        "ไม่มีสิทธิ์",
        "บัญชีนี้ไม่สามารถเข้าหน้าจัดการพนักงานได้",
        "error"
      );
      return false;
    }

    const { value: password } = await Swal.fire({
      title: "ยืนยันสิทธิ์ผู้ดูแลระบบ",
      text: `กรอกรหัสผ่านของ ${currentEmail}`,
      input: "password",
      inputPlaceholder: "รหัสผ่าน",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก"
    });

    if (!password) return false;

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password
    });

    if (loginError) {
      await Swal.fire("รหัสผ่านไม่ถูกต้อง", "ลองใหม่อีกครั้ง", "error");
      return false;
    }

    return true;
  };

  navAttendance?.addEventListener("click", () => {
    showSection("section-attendance", navAttendance);
  });

  navHistory?.addEventListener("click", () => {
    showSection("section-history", navHistory);
  });

  navEmployee?.addEventListener("click", async () => {
    const allowed = await requestEmployeeAccess();
    if (!allowed) return;
    showSection("section-employee", navEmployee);
  });

  logoutBtn?.addEventListener("click", () => {
    Swal.fire({
      icon: "question",
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบใช่หรือไม่",
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก"
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = "index.html";
      }
    });
  });

});