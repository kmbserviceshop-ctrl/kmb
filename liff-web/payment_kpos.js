/* =========================
PAYMENT KPOS (CORE)
ใช้ร่วมทุกบริการ
========================= */

/**
 * CURRENT_PAYMENT
 * {
 *   title,
 *   amount_satang,
 *   description_html,
 *   onSubmit,
 *   onBack
 * }
 */
let CURRENT_PAYMENT = null;

/* =========================
CONFIG
========================= */

// 🔹 PromptPay QR ร้าน (ฐาน)
const SHOP_PROMPTPAY_QR =
  "00020101021130870016A00000067701011201150105546149531300220M00000000004284003820320S000000000000013142553037645802TH6304CAF8";

/* =========================
CRC16 (PromptPay)
========================= */
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/* =========================
GENERATE PROMPTPAY QR
========================= */
function generatePromptPayQR(baseQR, amountBaht) {
  if (!amountBaht || amountBaht <= 0) return baseQR;

  const satang = Math.round(Number(amountBaht) * 100);
  const amt = String(satang);

  // ตัด CRC เดิม
  let qr = baseQR.replace(/6304[0-9A-F]{4}$/i, "");

  // ตัด field 54 เดิม
  qr = qr.replace(/54\d{2}\d+$/, "");

  const field54 = `54${amt.length.toString().padStart(2, "0")}${amt}`;
  const payload = `${qr}${field54}6304`;
  const crc = crc16(payload);

  return payload + crc;
}

/* =========================
OPEN PAYMENT (GENERIC)
========================= */
function openKposPayment(config) {
  /**
   * config = {
   *   title: string,
   *   amount_satang: number,        // ยอดทำรายการ (สตางค์)
   *   service_fee_satang?: number,  // ค่าบริการ (สตางค์)
   *   description_html: string,
   *   onSubmit: async function(payload),
   *   onBack: function()
   * }
   */

  CURRENT_PAYMENT = config;

  const amountSatang = Number(config.amount_satang ?? 0);
  const serviceFeeSatang = Number(config.service_fee_satang ?? 0);

  const amountBaht = amountSatang / 100;
  const serviceFeeBaht = serviceFeeSatang / 100;
  const totalBaht = (amountSatang + serviceFeeSatang) / 100;
  const totalBahtQR = (amountSatang + serviceFeeSatang) / 10000;

  const qrData =
    totalBaht > 0
      ? generatePromptPayQR(SHOP_PROMPTPAY_QR, totalBahtQR)
      : null;

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="kposPaymentBack()">←</button>
      <div class="top-title">${config.title || "ชำระเงิน"}</div>
    </div>

    <div class="section-card">

      ${config.description_html || ""}

      <hr/>

      <!-- Summary -->
      <div style="margin-top:12px">

        <div class="bill-row">
          <span>ยอดทำรายการ</span>
          <span>${amountBaht.toFixed(2)} บาท</span>
        </div>

        <div class="bill-row">
          <span>ค่าบริการ</span>
          <span>${serviceFeeBaht.toFixed(2)} บาท</span>
        </div>

        <hr style="margin:10px 0;opacity:.3"/>

        <div class="bill-row" style="font-weight:600">
          <span>ยอดรวม</span>
          <span>${totalBaht.toFixed(2)} บาท</span>
        </div>

      </div>

      <!-- Total Pay -->
      <div style="text-align:center;margin:16px 0 8px">
        <div style="font-size:13px;color:#9ca3af">
          ยอดต้องชำระ
        </div>
        <div style="font-size:26px;font-weight:700">
          ${totalBaht.toFixed(2)} บาท
        </div>
      </div>

      <hr style="opacity:.3"/>

      <!-- QR -->
      <div style="text-align:center;margin:20px 0">
        <div style="color:#888">สแกนเพื่อชำระเงิน (QR PromptPay)</div>
        ${
          totalBaht > 0
            ? `<div id="qrBox" style="margin:10px auto;width:180px;height:180px"></div>`
            : `<div style="color:#aaa;margin-top:20px">ไม่มียอดชำระ</div>`
        }
      </div>

      <!-- แนบสลิป -->
      <div style="margin-top:16px">
        <input
          type="file"
          id="kposSlipFile"
          accept="image/*"
          style="display:none"
          onchange="onKposSlipSelected(this)"
        />

        <button
          class="primary-btn secondary-btn"
          type="button"
          onclick="document.getElementById('kposSlipFile').click()"
          style="width:100%"
        >
          📎 แนบสลิปการชำระเงิน
        </button>

        <div
          id="kposSlipFilename"
          style="margin-top:6px;font-size:13px;color:#6b7280;text-align:center"
        >
          ยังไม่ได้เลือกไฟล์
        </div>
      </div>

      <button
        class="primary-btn"
        style="margin-top:18px"
        onclick="submitKposPayment(this)"
      >
        💳 ดำเนินการต่อ
      </button>

    </div>
  `);

  // render QR
  if (totalBaht > 0) {
    const waitForQRCode = () => {
      if (typeof QRCode === "undefined") {
        setTimeout(waitForQRCode, 100);
        return;
      }
      const qrEl = document.getElementById("qrBox");
      if (!qrEl) return;

      qrEl.innerHTML = "";
      new QRCode(qrEl, {
        text: qrData,
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.M,
      });
    };
    waitForQRCode();
  }
}

/* =========================
SUBMIT PAYMENT (GENERIC)
========================= */
async function submitKposPayment(btn) {
  if (!btn || btn.classList.contains("loading")) return;

  if (!CURRENT_PAYMENT || typeof CURRENT_PAYMENT.onSubmit !== "function") {
    showAlertModal("เกิดข้อผิดพลาด", "ไม่พบ handler การชำระเงิน");
    return;
  }

  const fileInput = document.getElementById("kposSlipFile");
  let slipBase64 = null;

  if (fileInput && fileInput.files.length > 0) {
    slipBase64 = await fileToBase64(fileInput.files[0]);
  }

  if (!slipBase64) {
    showAlertModal(
      "กรุณาแนบสลิป",
      "กรุณาแนบหลักฐานการชำระเงินก่อนดำเนินการต่อ"
    );
    return;
  }

  setButtonLoading(btn, "กำลังส่งข้อมูล");

  try {
    await CURRENT_PAYMENT.onSubmit({
      amount_satang: CURRENT_PAYMENT.amount_satang,
      slip_base64: slipBase64,
    });

    showAlertModal(
      "รับแจ้งชำระเงินแล้ว",
      "ระบบได้รับข้อมูลเรียบร้อย\nรอร้านตรวจสอบ",
      () => kposPaymentBack()
    );
  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err?.message || err || "ไม่สามารถดำเนินการได้"
    );
    resetButton(btn, "💳 ดำเนินการต่อ");
  }
}

/* =========================
BACK
========================= */
function kposPaymentBack() {
  if (CURRENT_PAYMENT?.onBack) {
    CURRENT_PAYMENT.onBack();
  }
}

/* =========================
FILE HELPERS
========================= */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function onKposSlipSelected(input) {
  const label = document.getElementById("kposSlipFilename");
  if (!input.files || input.files.length === 0) {
    label.innerText = "ยังไม่ได้เลือกไฟล์";
    return;
  }
  label.innerText = `เลือกไฟล์แล้ว: ${input.files[0].name}`;
}