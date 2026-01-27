/* =========================
Guest Pawn Payment
(no login required)
========================= */

let GUEST_LOOKUP_RESULT = null;

/* =========================
ENTRY PAGE
========================= */
function openGuestLookupPage() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="showGuestForm()">←</button>
      <div class="top-title">ต่อดอก / ชำระเงิน</div>
    </div>

    <div class="section-card">

      <div class="form-group">
        <label>เลขที่สัญญา / เลขที่ฝาก</label>
        <input id="guestContractNo" class="input" placeholder="เช่น PD123456" />
      </div>

      <div class="form-group">
        <label>เลขบัตรประชาชน (4 ตัวท้าย)</label>
        <input id="guestIdCard" class="input" maxlength="4" />
      </div>

      <div class="form-group">
        <label>เบอร์ติดต่อ</label>
        <input id="guestPhone" class="input" />
      </div>

      <button class="primary-btn" onclick="submitGuestLookup(this)">
        🔍 ตรวจสอบข้อมูล
      </button>

    </div>
  `);
}

/* =========================
LOOKUP
========================= */
async function submitGuestLookup(btn) {
  if (btn.classList.contains("loading")) return;

  const contractNo = document.getElementById("guestContractNo").value.trim();
  const idCardLast4 = document.getElementById("guestIdCard").value.trim();
  const phone = document.getElementById("guestPhone").value.trim();

  if (!contractNo || !idCardLast4 || !phone) {
    showAlertModal("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return;
  }

  setButtonLoading(btn, "กำลังตรวจสอบ");

  try {
    const res = await callFn(
      "guest_lookup_pawn",
      {
        contract_no: contractNo,
        id_card_last4: idCardLast4,
        phone: phone,
      },
      { forceAnon: true }
    );

    GUEST_LOOKUP_RESULT = res;
    openGuestPayment();

  } catch (err) {
    showAlertModal(
      "ไม่พบข้อมูล",
      "ข้อมูลไม่ถูกต้องหรือไม่สามารถทำรายการได้"
    );
    resetButton(btn, "🔍 ตรวจสอบข้อมูล");
  }
}

/* =========================
OPEN PAYMENT
========================= */
function openGuestPayment() {
  if (!GUEST_LOOKUP_RESULT) {
    showAlertModal("เกิดข้อผิดพลาด", "ไม่พบข้อมูลสัญญา");
    return;
  }

  const {
    pawn_transaction_id,
    contract_no,
    product_name,
    due_date,
    amount_due_satang,
  } = GUEST_LOOKUP_RESULT;

  openKposPayment({
    title: "ชำระต่อดอก (ไม่ต้องล็อกอิน)",
    service: "pawn_extend_guest",
    reference_id: pawn_transaction_id,
    amount_satang: amount_due_satang,

    description_html: `
      <div style="font-size:13px;line-height:1.6">
        <div><b>เลขที่สัญญา:</b> ${contract_no}</div>
        <div><b>สินค้า:</b> ${product_name}</div>
        <div><b>วันครบกำหนด:</b> ${due_date}</div>
      </div>
    `,

    onSubmit: async ({ amount_satang, slip_base64 }) => {
      return callFn(
        "payment-request",
        {
          pawn_transaction_id,
          amount: amount_satang,
          slip_base64,
        },
        { forceAnon: true }
      );
    },

    onBack: () => openGuestLookupPage(),
  });
}