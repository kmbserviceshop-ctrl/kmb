/* =========================
PAWN.JS MODULE
========================= */

// ⚠️ ใช้ตัวแปรจาก main.js โดยตรง
// CURRENT_CUSTOMER
// CURRENT_BILLS
// callFn
// renderCard
// showAlertModal
// setButtonLoading
// resetButton
// formatDate
// maskLast6
// openKposPayment
// SUPABASE_ANON_KEY
/* =========================
MENU : MY PAWN BILLS
========================= */
async function openMyBills(btn) {
  // ✅ FIX: ไม่ต้องเช็ค ACCESS_TOKEN
  if (!CURRENT_CUSTOMER?.customer_id) {
    showAlertModal(
      "ไม่พบข้อมูลผู้ใช้",
      "กรุณาปิดแล้วเปิดใหม่จาก LINE อีกครั้ง"
    );
    return;
  }

  if (btn) {
    setButtonLoading(btn, "กำลังโหลด");
  }

  try {
    const res = await callFn(
      "get_my_pawn_bills",
      {
        customer_id: CURRENT_CUSTOMER.customer_id,
      },
      { forceAnon: true } // 🔒 ใช้ anon เท่านั้น
    );

    const bills = res.bills || [];
    CURRENT_BILLS = bills;

    renderCard(`
      <div class="top-bar">
        <button class="back-btn" onclick="showMemberMenu(CURRENT_CUSTOMER)">←</button>
        <div class="top-title">บิลของฉัน</div>
      </div>

      <div class="bill-section">
        <h4>📦 บิลขายฝาก</h4>
        ${
          bills.length === 0
            ? `<p style="color:#888">ไม่มีรายการฝาก</p>`
            : bills.map((bill, i) => renderPawnBill(bill, i)).join("")
        }
      </div>
    `);

  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถโหลดบิลได้"
    );
  } finally {
    if (btn) resetButton(btn, "📄 บิลของฉัน");
  }
}

/* =========================
RENDER PAWN BILL CARD
========================= */
function renderPawnBill(bill, index) {
  const item = bill.pawn_items || {};
  const today = new Date();
  const dueDate = new Date(bill.due_date);

  let statusText = "ปกติ";
  let statusColor = "#16a34a";
  let statusIcon = "✔️";

  if (bill.is_checking_payment) {
    statusText = "กำลังตรวจสอบ";
    statusColor = "#6b7280";
    statusIcon = "⏳";
  } else if (today > dueDate) {
    statusText = "เกินกำหนด";
    statusColor = "#fc3f05";
    statusIcon = "⚠️";
  } else {
    const diffDays = Math.ceil(
      (dueDate - today) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 3) {
      statusText = "ใกล้ครบกำหนด";
      statusColor = "#f59e0b";
      statusIcon = "⏰";
    }
  }

  return `
    <div class="bill-card" style="background:#fff;border-radius:18px;padding:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:600;">เลขที่บิล ${bill.contract_no}</div>
        <div style="color:${statusColor};font-weight:600;">
          ${statusIcon} ${statusText}
        </div>
      </div>

      <div style="font-size:16px;font-weight:700;margin-bottom:10px;">
        ${item.brand || ""} ${item.model || ""}
      </div>

      <div style="font-size:14px;">
        <div style="display:flex;justify-content:space-between;">
          <span>วันที่</span>
          <span>${formatDate(bill.deposit_date)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>IMEI / SN</span>
          <span>${maskLast6(item.imei || item.sn)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>จำนวนเงิน</span>
          <span>${Number(bill.deposit_amount).toLocaleString()} บาท</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>ครบกำหนด</span>
          <span>${formatDate(bill.due_date)}</span>
        </div>
      </div>

      <div style="height:1px;background:#eceef1;margin:14px 0;"></div>

      ${
        bill.is_checking_payment
          ? `<button class="menu-btn secondary" style="width:100%;" onclick="showCheckingPopup()">⏳ กำลังตรวจสอบ</button>`
          : `<button class="menu-btn" style="width:100%;" onclick="openPawnPaymentByIndex(${index})">ชำระค่างวด / ต่ออายุบิล</button>`
      }
    </div>
  `;
}

/* =========================
PAWN PAYMENT
========================= */
function openPawnPaymentByIndex(index) {
  const bill = CURRENT_BILLS[index];
  if (!bill) {
    showAlertModal("ผิดพลาด", "ไม่พบบิลที่เลือก");
    return;
  }
  openPawnPayment(bill);
}

function openPawnPayment(bill) {
  openKposPayment({
    service: "pawn_interest",
    reference_id: bill.id,
    title: "ต่ออายุบิล / ชำระค่างวด",
    amount_satang: Math.round(Number(bill.service_fee ?? 0) * 100),
    service_fee_satang: 0,
    meta: {
      pawn_id: bill.id,
      contract_no: bill.contract_no,
      due_date: bill.due_date,
    },
    description_html: renderPawnPaymentSummary(bill),
    onSubmit: submitPawnInterestPayment,
    onBack: () => openMyBills(null),
  });
}

function renderPawnPaymentSummary(bill) {
  const item = bill.pawn_items || {};
  const dueDate = new Date(bill.due_date);
  const newDueDate = new Date(dueDate);
  newDueDate.setDate(newDueDate.getDate() + 15);

  return `
    <h3>${item.brand || ""} ${item.model || ""}</h3>
    <p>IMEI / SN : ${item.imei || item.sn || "-"}</p>
    <hr/>
    <div class="bill-row">
      <span>ครบกำหนดเดิม</span>
      <span>${formatDate(bill.due_date)}</span>
    </div>
    <div class="bill-row">
      <span>กำหนดใหม่</span>
      <span>${formatDate(newDueDate)}</span>
    </div>
  `;
}

async function submitPawnInterestPayment(payload) {
  const { reference_id, amount_satang, slip_base64 } = payload;
  if (!reference_id || !slip_base64) throw new Error("invalid_payload");

  const lineAccessToken = liff.getAccessToken();
  const res = await fetch(
    "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1/payment-request",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "x-line-access-token": lineAccessToken,
      },
      body: JSON.stringify({
        pawn_transaction_id: reference_id,
        amount: amount_satang,
        slip_base64,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}
/* =========================
PAYMENT Requests
========================= */
function openMyPaymentRequests(btn) {
  if (btn) setButtonLoading(btn, "กำลังโหลด");

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="showMemberMenu(CURRENT_CUSTOMER)">←</button>
      <div class="top-title">รายการคำขอชำระ</div>
    </div>

    <div class="section-card">
      <div id="paymentRequestList">
        <div style="text-align:center;padding:12px;">
          กำลังโหลด...
        </div>
      </div>
    </div>
  `);

  setTimeout(loadMyPaymentRequests, 0);
}

async function loadMyPaymentRequests() {
  const box = document.getElementById("paymentRequestList");
  if (!box) return;

  try {
    const res = await callFn("get_my_payment_requests", {
      customer_id: CURRENT_CUSTOMER.id,
       }, { forceAnon: true }
    );

    const list = res.requests || [];

    if (!list.length) {
      box.innerHTML = `
        <div style="text-align:center;color:#9ca3af;font-size:13px;">
          ยังไม่มีรายการแจ้งชำระ
        </div>`;
      return;
    }

    box.innerHTML = list.map((r) => {
      const badge =
        r.status === "pending"
          ? `<span style="background:#fde047;color:#92400e;">รอการตรวจสอบ</span>`
          : r.status === "approved"
          ? `<span style="background:#dcfce7;color:#166534;">อนุมัติแล้ว</span>`
          : `<span style="background:#fee2e2;color:#991b1b;">ไม่ผ่าน</span>`;

      return `
        <div class="list-item">
          <div>
            <div class="list-sub">${formatDate(r.created_at)}</div>
            <div class="list-title">
              ยอดชำระ ${Number(r.amount).toLocaleString()} บาท
            </div>
          </div>
          <div class="list-badge">${badge}</div>
        </div>
      `;
    }).join("");

  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "โหลดรายการไม่สำเร็จ"
    );
  }
}