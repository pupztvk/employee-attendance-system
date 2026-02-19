import { supabase } from "./supabase.js";

const qrBtn = document.getElementById("navMobileQR");

const QR_LIFETIME_SECONDS = 120;

const createNonce = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getQrTargetUrl = (expiresAtMs) => {
  const url = new URL("index.html", window.location.href);
  url.searchParams.set("from", "qr");
  url.searchParams.set("exp", String(expiresAtMs));
  url.searchParams.set("nonce", createNonce());
  return url.toString();
};

const formatTimeLeft = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const ensureQrUser = async () => {
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  const currentUser = userRes?.user;

  if (userError || !currentUser?.email) {
    await Swal.fire("ไม่พบผู้ใช้งาน", "กรุณาเข้าสู่ระบบใหม่ก่อนใช้งาน QR", "warning");
    return false;
  }

  return true;
};

const renderQrImage = async (imgEl, text) => {
  if (!imgEl) return;

  if (window.QRCode && typeof window.QRCode.toDataURL === "function") {
    try {
      imgEl.src = await window.QRCode.toDataURL(text, {
        width: 250,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      });
      return;
    } catch (error) {
      console.warn("QRCode lib failed, fallback to remote QR API:", error);
    }
  }

  imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}`;
};

const openQrPopup = async () => {
  const canOpenQr = await ensureQrUser();
  if (!canOpenQr) return;

  let timerId = null;
  let expiresAtMs = 0;
  let currentUrl = "";
  let isExpired = false;

  const clearTimer = () => {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
  };

  await Swal.fire({
    title: "QR สำหรับใช้งานบนมือถือ",
    width: "min(740px, 96vw)",
    showConfirmButton: false,
    showCloseButton: true,
    backdrop: "rgba(15, 23, 42, 0.5)",
    customClass: {
      popup: "swal-qr-popup",
      title: "swal-qr-title",
      htmlContainer: "swal-qr-content"
    },
    html: `
      <div class="qr-shell">
        <p class="qr-desc">สแกน QR จากโทรศัพท์เพื่อเข้าใช้งานระบบได้ทันที</p>
        <div class="qr-layout">
          <div class="qr-preview-card">
            <div class="qr-preview">
              <img id="mobileQrImage" class="qr-image" alt="Mobile QR Code" />
            </div>
          </div>
          <div class="qr-side-panel">
            <div class="qr-meta">
              <div class="qr-status-row">
                <span class="qr-status-label">สถานะ:</span>
                <span id="qrStatusBadge" class="qr-status-badge is-active">ใช้งานได้</span>
              </div>
              <div class="qr-time-row">
                <span class="qr-time-label">เวลาคงเหลือ:</span>
                <strong id="qrCountdown">--:--</strong>
              </div>
            </div>
            <input id="qrUrlInput" class="qr-url-input" readonly />
            <div class="qr-actions">
              <button id="copyQrLinkBtn" type="button" class="qr-btn qr-btn-copy">คัดลอกลิงก์</button>
              <button id="refreshQrBtn" type="button" class="qr-btn qr-btn-refresh" disabled>รีใหม่</button>
            </div>
          </div>
        </div>
        <div id="qrHostWarning" class="qr-host-warning"></div>
      </div>
    `,
    didOpen: async () => {
      const popup = Swal.getPopup();
      if (!popup) return;

      const qrImage = popup.querySelector("#mobileQrImage");
      const qrCountdown = popup.querySelector("#qrCountdown");
      const qrStatusBadge = popup.querySelector("#qrStatusBadge");
      const qrUrlInput = popup.querySelector("#qrUrlInput");
      const copyBtn = popup.querySelector("#copyQrLinkBtn");
      const refreshBtn = popup.querySelector("#refreshQrBtn");
      const hostWarning = popup.querySelector("#qrHostWarning");

      const updateCountdown = () => {
        const remainSec = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));

        if (qrCountdown) qrCountdown.textContent = formatTimeLeft(remainSec);

        if (remainSec > 0) return;
        if (isExpired) return;

        isExpired = true;
        clearTimer();

        if (qrStatusBadge) {
          qrStatusBadge.textContent = "หมดเวลา";
          qrStatusBadge.classList.remove("is-active");
          qrStatusBadge.classList.add("is-expired");
        }
        if (refreshBtn) refreshBtn.disabled = false;
      };

      const issueNewQr = async () => {
        isExpired = false;
        expiresAtMs = Date.now() + QR_LIFETIME_SECONDS * 1000;
        currentUrl = getQrTargetUrl(expiresAtMs);

        await renderQrImage(qrImage, currentUrl);
        if (qrUrlInput) qrUrlInput.value = currentUrl;

        if (qrStatusBadge) {
          qrStatusBadge.textContent = "ใช้งานได้";
          qrStatusBadge.classList.remove("is-expired");
          qrStatusBadge.classList.add("is-active");
        }
        if (refreshBtn) refreshBtn.disabled = true;

        updateCountdown();
        clearTimer();
        timerId = setInterval(updateCountdown, 1000);
      };

      const setCopyBtnLabel = (label) => {
        if (!copyBtn) return;
        copyBtn.textContent = label;
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = "คัดลอกลิงก์";
        }, 1200);
      };

      copyBtn?.addEventListener("click", async () => {
        if (!currentUrl) return;

        let copied = false;

        try {
          await navigator.clipboard.writeText(currentUrl);
          copied = true;
        } catch {
          if (qrUrlInput instanceof HTMLInputElement) {
            qrUrlInput.focus();
            qrUrlInput.select();
            qrUrlInput.setSelectionRange(0, qrUrlInput.value.length);
            copied = document.execCommand("copy");
          }
        }

        setCopyBtnLabel(copied ? "คัดลอกแล้ว" : "คัดลอกไม่สำเร็จ");
      });

      refreshBtn?.addEventListener("click", async () => {
        await issueNewQr();
      });

      const host = window.location.hostname;
      if (hostWarning && (host === "127.0.0.1" || host === "localhost")) {
        hostWarning.textContent = "ถ้าเปิดด้วย 127.0.0.1/localhost โทรศัพท์เครื่องอื่นจะเข้าไม่ได้ ควรใช้ IP เครื่องในวง LAN";
      }

      await issueNewQr();
    },
    willClose: () => {
      clearTimer();
    }
  });
};

if (qrBtn) {
  qrBtn.addEventListener("click", openQrPopup);
}
