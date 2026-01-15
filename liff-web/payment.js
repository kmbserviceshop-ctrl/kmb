/* =========================
PAYMENT FLOW (A)
========================= */

let CURRENT_BILL = null;

// 🔹 QR ร้าน (ฐาน)
const SHOP_PROMPTPAY_QR =
  "00020101021130870016A00000067701011201150105546149531300220M00000000004284003820320S000000000000013142553037645802TH6304CAF8";

/* =========================
CRC16 (PromptPay)
========================= */
function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

/* =========================
GENERATE PROMPTPAY QR
========================= */
function generatePromptPayQR(baseQR, amount) {
  if (!amount || amount <= 0) return baseQR;

  const cleanQR = baseQR.replace(/6304[0-9A-F]{4}$/, "");

  // ✅ บาท → สตางค์ (ถูกต้อง)
  const satang = Math.round(Number(amount) * 100);
  const amt = String(satang);

  const field54 = `54${amt.length.toString().padStart(2, "0")}${amt}`;

  const payload = `${cleanQR}${field54}6304`;
  const crc = crc16(payload);

  return payload + crc;
}

function openPayment(bill) {
  CURRENT_BILL = bill;

  const item = bill.pawn_items || {};
  const dueDate = new Date(bill.due_date);
  const newDueDate = new Date(dueDate);
  newDueDate.setDate(newDueDate.getDate() + 15);

  // 🔥 แยกหน่วยให้ชัด
  const serviceFeeBaht = Number(bill?.service_fee ?? 0); 
  const serviceFeeSatang = serviceFeeBaht; 

  // ❗ QR รับ "บาท" แล้วไปแปลงเป็นสตางค์ข้างใน
  const qrData = generatePromptPayQR(SHOP_PROMPTPAY_QR, serviceFeeBaht);

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMyBills()">←</button>
      <div class="top-title">ต่ออายุบิล / ชำระค่างวด</div>
    </div>

    <div class="section-card">
      <h3>${item.brand || ""} ${item.model || ""}</h3>
      <p>ID : ${item.imei || item.sn || "-"}</p>

      <hr/>

      <div class="bill-row">
        <span>ครบกำหนดเดิม</span>
        <span>${formatPaymentDate(bill.due_date)}</span>
      </div>

      <div class="bill-row">
        <span>กำหนดใหม่</span>
        <span>${formatPaymentDate(newDueDate)}</span>
      </div>

      <div class="bill-row" style="font-weight:600">
        <span>ยอดต้องชำระ</span>
        <span>${serviceFeeBaht.toLocaleString()} บาท</span>
      </div>

      <hr style="opacity:.3"/>

      <div style="text-align:center;margin:20px 0">
        <div style="color:#888">สแกนเพื่อชำระ</div>
        ${
          serviceFeeSatang > 0
            ? `<div id="qrBox" style="margin:10px auto;width:180px;height:180px"></div>`
            : `<div style="color:#aaa;margin-top:20px">ไม่มีค่าบริการ</div>`
        }
      </div>

      <input type="file" id="slipFile" accept="image/*"/>
      <button class="menu-btn" onclick="submitPawnPayment()">ดำเนินการต่อจ้า</button>
    </div>
  `);

  if (serviceFeeSatang > 0) {
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
HELPER(TEST)
========================= */
function formatPaymentDate(date) {
  return new Date(date).toLocaleDateString("th-TH");
}