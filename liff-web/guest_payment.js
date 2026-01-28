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
  <div style="
    min-height:100vh;
    background:#f6f7f9;
    padding:24px 16px;
  ">
    <div style="
      max-width:420px;
      margin:0 auto;
      background:#ffffff;
      border-radius:20px;
      padding:24px 22px 28px;
      box-shadow:0 8px 24px rgba(0,0,0,.06);
    ">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:20px;font-weight:800;color:#111827;">
          ต่ออายุสัญญา / ชำระเงิน
        </div>
        <div style="font-size:14px;color:#6b7280;margin-top:6px;">
          กรอกข้อมูลเพื่อดำเนินการชำระเงิน
        </div>
      </div>

      <!-- Contract -->
      <div style="margin-bottom:18px;">
        <label style="font-size:14px;font-weight:600;color:#111827;">
          เลขที่สัญญา / เลขที่ฝาก
        </label>
        <input
          id="guestContractNo"
          placeholder="PD-2026-000028"
          inputmode="text"
          oninput="formatPawnContract(this)"
          style="
            width:100%;
            height:52px;
            margin-top:8px;
            border-radius:12px;
            border:1px solid #d1d5db;
            padding:10px 14px;
            font-size:16px;
            line-height:1.2;
            box-sizing:border-box;
          "
        >
        <div style="font-size:12px;color:#6b7280;margin-top:6px;">
          ตัวอย่าง: PD-2026-000028
        </div>
      </div>

      <!-- ID CARD -->
      <div style="margin-bottom:18px;">
        <label style="font-size:14px;font-weight:600;color:#111827;">
          เลขบัตรประชาชน / พาสปอร์ต (4 ตัวท้าย)
        </label>
        <input
          id="guestIdCard"
          maxlength="4"
          inputmode="numeric"
          style="
            width:100%;
            height:52px;
            margin-top:8px;
            border-radius:12px;
            border:1px solid #d1d5db;
            padding:10px 14px;
            font-size:16px;
            line-height:1.2;
            box-sizing:border-box;
          "
        >
      </div>

      <!-- PHONE -->
      <div style="margin-bottom:24px;">
        <label style="font-size:14px;font-weight:600;color:#111827;">
          เบอร์ติดต่อ
        </label>
        <input
          id="guestPhone"
          inputmode="numeric"
          placeholder="เช่น 0812345678"
          style="
            width:100%;
            height:52px;
            margin-top:8px;
            border-radius:12px;
            border:1px solid #d1d5db;
            padding:10px 14px;
            font-size:16px;
            line-height:1.2;
            box-sizing:border-box;
          "
        >
      </div>

      <!-- BUTTON -->
      <button
        id="guestLookupBtn"
        onclick="submitGuestLookup(this)"
        style="
          width:100%;
          height:54px;
          border-radius:14px;
          border:none;
          background:#2563eb;
          color:#ffffff;
          font-size:17px;
          font-weight:700;
          cursor:pointer;
        "
      >
        🔍 ตรวจสอบข้อมูล
      </button>

    </div>
  </div>
  `);
}

/* =========================
FORMAT CONTRACT NO
========================= */
function formatPawnContract(input) {
  let v = input.value.toUpperCase();
  v = v.replace(/[^A-Z0-9]/g, "");

  if (!v.startsWith("PD")) {
    v = "PD" + v.replace(/^PD*/, "");
  }

  let rest = v.slice(2).slice(0, 10);
  let year = rest.slice(0, 4);
  let num = rest.slice(4, 10);

  let result = "PD";
  if (year) result += "-" + year;
  if (num) result += "-" + num;

  input.value = result;
}

/* =========================
LOOKUP
========================= */
async function submitGuestLookup(btn) {
  if (btn.classList.contains("loading")) return;

  const contract_no = guestContractNo.value.trim();
  const id_card_last4 = guestIdCard.value.trim();
  const phone = guestPhone.value.trim();

  if (!contract_no || !id_card_last4 || !phone) {
    showAlertModal("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  if (!/^PD-\d{4}-\d{6}$/.test(contract_no)) {
  showAlertModal(
    "รูปแบบไม่ถูกต้อง",
    "กรุณากรอกเลขสัญญาในรูปแบบ PD-2026-000028"
  );
  return;
}

  setButtonLoading(btn, "กำลังตรวจสอบ");

  try {
    const res = await callFn(
      "guest_lookup_pawn",
      { contract_no, id_card_last4, phone },
      { forceAnon: true }
    );

    GUEST_LOOKUP_RESULT = res;

    if (res.already_submitted) {
      openGuestAlreadySubmitted();
    } else {
      openGuestPayment();
    }
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
  const {
    pawn_transaction_id,
    contract_no,
    product_name,
    due_date,
    amount_due_satang,
  } = GUEST_LOOKUP_RESULT;

  openKposPayment({
    title: "ชำระอายุบิล (ไม่ต้องล็อกอิน)",
    service: "pawn_extend_guest",
    reference_id: pawn_transaction_id,
    amount_satang: amount_due_satang,

    description_html: `
      <div style="font-size:14px;line-height:1.7">
        <div><b>เลขที่สัญญา:</b> ${contract_no}</div>
        <div><b>สินค้า:</b> ${product_name}</div>
        <div><b>วันครบกำหนด:</b> ${due_date}</div>
      </div>
    `,

    onSubmit: async ({ amount_satang, slip_base64 }) => {
      return callFn(
        "payment-request",
        { pawn_transaction_id, amount: amount_satang, slip_base64 },
        { forceAnon: true }
      );
    },

    onBack: openGuestLookupPage,
  });
}

/* =========================
ALREADY SUBMITTED
========================= */
function openGuestAlreadySubmitted() {
  const { contract_no, product_name, due_date, payment } = GUEST_LOOKUP_RESULT;

  const submittedAt = payment
    ? new Date(payment.submitted_at).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

  renderCard(`
  <div style="
    max-width:420px;
    margin:40px auto;
    background:#ffffff;
    padding:24px;
    border-radius:20px;
  ">
    <h3 style="margin-bottom:12px;">📌 แจ้งชำระแล้ว</h3>

    <div style="font-size:14px;line-height:1.8;color:#374151">
      <div><b>เลขที่สัญญา:</b> ${contract_no}</div>
      <div><b>สินค้า:</b> ${product_name}</div>
      <div><b>วันครบกำหนด:</b> ${due_date}</div>
      <hr style="margin:12px 0"/>
      <div><b>ยอดที่แจ้ง:</b> ${(payment.amount_satang / 100).toFixed(2)} บาท</div>
      <div><b>วันที่แจ้ง:</b> ${submittedAt}</div>
      <div><b>สถานะ:</b> รอตรวจสอบ</div>
    </div>

    <div style="margin-top:10px;color:#d97706;font-size:13px">
      ⏳ ระบบกำลังตรวจสอบ กรุณารอการยืนยันจากร้าน
    </div>

    <button
      onclick="openGuestLookupPage()"
      style="
        margin-top:20px;
        width:100%;
        height:48px;
        border-radius:12px;
        border:none;
        background:#e5e7eb;
        font-size:15px;
      "
    >
      กลับหน้าหลัก
    </button>
  </div>
  `);
}