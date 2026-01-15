/* =========================
PAYMENT FLOW (A)
========================= */

let CURRENT_BILL = null;

/* =========================
OPEN PAYMENT PAGE
========================= */
function openPayment(bill) {
  CURRENT_BILL = bill;

  const item = bill.pawn_items || {};
  const dueDate = new Date(bill.due_date);
  const newDueDate = new Date(dueDate);
  newDueDate.setDate(newDueDate.getDate() + 15);

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
        <span>${Number(bill.service_fee || 0).toLocaleString()} บาท</span>
      </div>

      <hr style="opacity:.3"/>

      <div style="text-align:center;margin:20px 0">
        <div style="color:#888">สแกนเพื่อชำระ</div>
        <div style="
          margin:10px auto;
          width:180px;
          height:180px;
          background:#eee;
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          QR CODE
        </div>
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
    // 🔸 placeholder upload (ยังไม่อัปจริง)
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