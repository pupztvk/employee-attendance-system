// js/report.js
async function loadReport() {
  const { data } = await supabase.from("attendance").select("*");
  document.getElementById("report").innerHTML =
    JSON.stringify(data, null, 2);
}
loadReport();
