import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
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

  const requestEmployeeAccess = async () => {
    const { data: userRes, error: userError } = await supabase.auth.getUser();
    const currentUser = userRes?.user;

    if (userError || !currentUser?.email) {
      await Swal.fire("ไม่พบผู้ใช้งาน", "กรุณาเข้าสู่ระบบใหม่ก่อนเข้าหน้าจัดการพนักงาน", "warning");
      return false;
    }

    const { value: password } = await Swal.fire({
      title: "ยืนยันสิทธิ์เข้าหน้าจัดการพนักงาน",
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
