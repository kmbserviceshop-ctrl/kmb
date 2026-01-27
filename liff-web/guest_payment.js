/* =========================
Guest Pawn Payment
(no login required)
========================= */

let GUEST_LOOKUP_RESULT = null;

/* =========================
ENTRY PAGE (SG CAPITAL STYLE)
========================= */
function openGuestLookupPage() {
  renderCard(`
    <div style="
      min-height:100vh;
      background:#f6f7f9;
      padding:24px 16px;
      box-sizing:border-box;
    ">

      <div style="
        max-width:420px;
        margin:0 auto;
        background:#ffffff;
        border-radius:20px;
        padding:24px 20px 28px;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);
      ">

        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:20px;font-weight:800;color:#111827;">
            ต่อดอก / ชำระเงิน
          </div>
          <div style="font-size:14px;color:#6b7280;margin-top:6px;">
            กรอกข้อมูลเพื่อดำเนินการชำระเงิน
          </div>
        </div>

        <!-- Contract -->
        <div style="margin-bottom:16px;">
          <label style="font-size:14px;font-weight:600;color:#111827;">
            เลขที่สัญญา / เลขที่ฝาก
          </label>
          <input
            id="guestContractNo"
            placeholder="เช่น PD123456"
            style="
              width:100%;
              height:52px;
              margin-top:8px;
              border-radius:12px;
              border:1px solid #e5e7eb;
              padding:0 14px;
              font-size:16px;
              box-sizing:border-box;
            "
          />
        </div>

        <!-- ID CARD -->
        <div style="margin-bottom:16px;">
          <label style="font-size:14px;font-weight:600;color:#111827;">
            เลขบัตรประชาชน (4 ตัวท้าย)
          </label>
          <input
            id="guestIdCard"
            maxlength="4"
            inputmode="numeric"
            placeholder="เช่น 1234"
            style="
              width:100%;
              height:52px;
              margin-top:8px;
              border-radius:12px;
              border:1px solid #e5e7eb;
              padding:0 14px;
              font-size:16px;
              box-sizing:border-box;
            "
          />
        </div>

        <!-- PHONE -->
        <div style="margin-bottom:22px;">
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
              border:1px solid #e5e7eb;
              padding:0 14px;
              font-size:16px;
              box-sizing:border-box;
            "
          />
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
            background:linear-gradient(135deg,#2563eb,#1d4ed8);
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
        phone,
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
      <div style="font-size:14px;line-height:1.7">
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