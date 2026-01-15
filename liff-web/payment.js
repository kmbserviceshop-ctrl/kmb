/* =========================
PAYMENT FLOW (A)
========================= */

let CURRENT_BILL = null;

// 🔹 QR ร้าน (ฐาน) ของคุณ
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
GENERATE PROMPTPAY QR (FIX AMOUNT)
========================= */
function generatePromptPayQR(baseQR, amount) {
  if (!amount || amount <= 0) return baseQR;

  // ตัด CRC เดิม
  const cleanQR = baseQR.replace(/6304[0-9A-F]{4}$/, "");

  // amount → 2 decimal → ไม่มีจุด
  const amt = Number(amount).toFixed(2).replace(".", "");
  const field54 = `54${amt.length.toString().padStart(2, "0")}${amt}`;

  const payload = `${cleanQR}${field54}6304`;
  const crc = crc16(payload);

  return payload + crc;
}

/* =========================
OPEN PAYMENT PAGE
========================= */
function openPayment(bill) {
  CURRENT_BILL = bill;

  const item = bill.pawn_items || {};
  const dueDate = new Date(bill.due_date);
  const newDueDate = new Date(dueDate);
  newDueDate.setDate(newDueDate.getDate() + 15);

  const serviceFee = Number(bill?.service_fee ?? 0);
  const qrData = generatePromptPayQR(SHOP_PROMPTPAY_QR, serviceFee);
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

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
        <span>${serviceFee.toLocaleString()} บาท</span>
      </div>

      <hr style="opacity:.3"/>

      <div style="text-align:center;margin:20px 0">
        <div style="color:#888">สแกนเพื่อชำระ</div>
        ${
          serviceFee > 0
            ? `<img src="${qrImg}" style="margin:10px auto;width:180px;height:180px"/>`
            : `<div style="color:#aaa;margin-top:20px">ไม่มีค่าบริการ</div>`
        }
      </div>

      <p style="color:#888;text-align:center">
        กรุณากดดำเนินการต่อ เมื่อโอนเงินสำเร็จ
      </p>

      <input type="file" id="slipFile" accept="image/*"/>

      <button class="menu-btn" onclick="submitPawnPayment()">
        ดำเนินการต่อ
      </button>
    </div>
  `);
}

function renderPawnPaymentPage({ bill, customer }) {
  openPayment(bill);
}

/* =========================
SUBMIT PAYMENT (PLACEHOLDER)
========================= */
async function submitPawnPayment() {
  const fileInput = document.getElementById("slipFile");
  if (!fileInput.files.length) {
    showModal("ยังไม่ได้แนบสลิป", "กรุณาอัปโหลดหลักฐานการชำระเงิน");
    return;
  }

  try {
    const slipPath = "placeholder/slip.jpg";

    await callFn("submit_pawn_payment", {
      pawn_transaction_id: CURRENT_BILL.id,
      slip_path: slipPath,
      status: "pending_review",
    });

    showModal(
      "ส่งข้อมูลสำเร็จ",
      "ระบบได้รับข้อมูลแล้ว รอการตรวจสอบจากพนักงาน"
    );

    openMyBills();
  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  }
}

/* =========================
HELPER
========================= */
function formatPaymentDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH");
}