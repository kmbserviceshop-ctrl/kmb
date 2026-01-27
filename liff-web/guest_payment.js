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

  <div style="max-width:420px;margin:0 auto;padding:24px 20px 32px;">
    <div style="
      background:#fff;
      border-radius:20px;
      padding:22px 20px 26px;
      box-shadow:0 10px 28px rgba(0,0,0,0.08);
    ">

      <div style="font-size:22px;font-weight:800;margin-bottom:6px;">
        ต่อดอก / ชำระเงิน
      </div>

      <div style="font-size:14px;color:#6b7280;margin-bottom:18px;">
        กรุณากรอกข้อมูลเพื่อทำรายการชำระเงิน
      </div>

      <!-- เลขสัญญา -->
      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:15px;font-weight:600;margin-bottom:6px;">
          เลขที่สัญญา / เลขที่ฝาก
        </label>
        <input
          id="guestContractNo"
          placeholder="เช่น PD123456"
          style="
            width:100%;
            height:52px;
            font-size:16px;
            padding:0 14px;
            border-radius:14px;
            border:1px solid #d1d5db;
            box-sizing:border-box;
          "
        />
      </div>

      <!-- เลขบัตร 4 ตัวท้าย -->
      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:15px;font-weight:600;margin-bottom:6px;">
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
            font-size:16px;
            padding:0 14px;
            border-radius:14px;
            border:1px solid #d1d5db;
            box-sizing:border-box;
          "
        />
      </div>

      <!-- เบอร์ติดต่อ -->
      <div style="margin-bottom:22px;">
        <label style="display:block;font-size:15px;font-weight:600;margin-bottom:6px;">
          เบอร์ติดต่อ
        </label>
        <input
          id="guestPhone"
          inputmode="numeric"
          placeholder="เช่น 08xxxxxxxx"
          style="
            width:100%;
            height:52px;
            font-size:16px;
            padding:0 14px;
            border-radius:14px;
            border:1px solid #d1d5db;
            box-sizing:border-box;
          "
        />
        <div style="font-size:13px;color:#6b7280;margin-top:6px;">
          เบอร์โทรศัพท์ที่ใช้ทำสัญญา
        </div>
      </div>

      <!-- ปุ่ม -->
      <button
        class="primary-btn"
        style="
          width:100%;
          height:54px;
          font-size:17px;
          font-weight:700;
          border-radius:16px;
        "
        onclick="submitGuestLookup(this)"
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
      <div style="font-size:14px;line-height:1.6">
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