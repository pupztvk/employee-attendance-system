import { supabase } from "./supabase.js";

/* ===== LOGIN ===== */
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("error");

  errorBox.textContent = "";

  if (!email || !password) {
    errorBox.textContent = "กรุณากรอกอีเมลและรหัสผ่านให้ครบ";
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      errorBox.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    } 
    else if (error.message.includes("missing email")) {
      errorBox.textContent = "กรุณากรอกอีเมลก่อนเข้าสู่ระบบ";
    } 
    else {
      errorBox.textContent = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
    }
    return;
  }

  window.location.href = "dashboard.html";
});


/* ===== FORGOT PASSWORD ===== */
window.forgotPassword = async function () {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("กรุณากรอกอีเมลก่อนกดลืมรหัสผ่าน");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://127.0.0.1:3000/reset.html"
  });

  if (error) {
    if (error.message.includes("invalid format")) {
      alert("รูปแบบอีเมลไม่ถูกต้อง");
    } else {
      alert("ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้");
    }
  } else {
    alert("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว 📧");
  }
};


/* ===== เปิด / ปิด สมัครสมาชิก ===== */
window.showRegister = function () {
  document.getElementById("registerBox").classList.add("show");
  document.getElementById("loginBox").style.display = "none";
};

window.hideRegister = function () {
  document.getElementById("registerBox").classList.remove("show");
  document.getElementById("loginBox").style.display = "block";
};


/* ===== แสดง / ซ่อน password ===== */
window.togglePassword = function () {
  const pass = document.getElementById("regPassword");
  const check = document.getElementById("showPass");

  if (check.checked) {
    pass.type = "text";
  } else {
    pass.type = "password";
  }
};


/* ===== REGISTER ===== */
window.register = async function () {

  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const msg = document.getElementById("regMsg");

  msg.style.color = "red";
  msg.textContent = "";

  if (!email || !password) {
    msg.textContent = "กรุณากรอกอีเมลและรหัสผ่านให้ครบ";
    return;
  }

  const thaiRegex = /[ก-๙]/;
  if (thaiRegex.test(email)) {
    msg.textContent = "อีเมลห้ามใช้ภาษาไทย";
    return;
  }

  if (!email.endsWith("@gmail.com")) {
    msg.textContent = "อีเมลต้องลงท้ายด้วย @gmail.com เท่านั้น";
    return;
  }

  const username = email.split("@")[0];
  if (username.length < 6) {
    msg.textContent = "ชื่ออีเมลต้องยาวอย่างน้อย 6 ตัวอักษร";
    return;
  }

  if (thaiRegex.test(password)) {
    msg.textContent = "รหัสผ่านห้ามใช้ภาษาไทย";
    return;
  }

  const engNumRegex = /^[A-Za-z0-9]+$/;
  if (!engNumRegex.test(password)) {
    msg.textContent = "รหัสผ่านใช้ได้เฉพาะภาษาอังกฤษและตัวเลขเท่านั้น";
    return;
  }

  if (password.length < 6) {
    msg.textContent = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    return;
  }

  /* ===== สมัครสมาชิก ===== */
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    if (error.message.includes("already registered")) {
      msg.textContent = "อีเมลนี้ถูกใช้สมัครแล้ว";
    } 
    else if (error.message.includes("invalid")) {
      msg.textContent = "รูปแบบอีเมลไม่ถูกต้อง";
    } 
    else {
      msg.textContent = "เกิดข้อผิดพลาด: " + error.message;
    }
    return;
  }

  /* ===== บันทึก email ลง database ===== */
  try {

    const { data: existingUser } = await supabase
      .from("user_accounts")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from("user_accounts").insert([
        {
          email: email,
          created_at: new Date()
        }
      ]);
    }

  } catch (err) {
    console.log("save email error:", err);
  }

  msg.style.color = "lime";
  msg.textContent = "สมัครสมาชิกสำเร็จแล้ว 🎉 กรุณาเข้าสู่ระบบ";

  setTimeout(() => {

    hideRegister();

    document.getElementById("regEmail").value = "";
    document.getElementById("regPassword").value = "";

    msg.textContent = "";
    msg.style.color = "red";

  }, 1500);
};