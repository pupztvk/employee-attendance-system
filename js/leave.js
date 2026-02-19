// js/leave.js
async function requestLeave() {
  const user = (await supabase.auth.getUser()).data.user;

  await supabase.from("leaves").insert({
    employee_id: user.id,
    leave_type: document.getElementById("type").value,
    reason: document.getElementById("reason").value
  });

  alert("ส่งคำขอลาแล้ว");
}
