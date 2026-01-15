/* =========================
CONFIG
========================= */
let CURRENT_CUSTOMER = null;
const LIFF_ID = "2008883587-vieENd7j";
const FN_BASE =
  "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";

// ❗ anon key 
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib29jcmtnb3JzbG53bnVocWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzYzMTUsImV4cCI6MjA4MzUxMjMxNX0.egN-N-dckBh8mCbY08UbGPScWv6lYpPCxodStO-oeTQ";

/* =========================
HELPER : API CALL
========================= */
async function callFn(path, payload) {
  const res = await fetch(`${FN_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

/* =========================
INIT
========================= */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isInClient()) {
      renderCard(`
        <h3>❌ กรุณาเปิดจาก LINE</h3>
        <p>กรุณาเข้าใช้งานผ่าน Rich Menu</p>
      `);
      return;
    }

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    status.status === "guest"
  ? showGuestForm()
  : (CURRENT_CUSTOMER = status.customer, showMemberMenu(status.customer));

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  }
}
init();

/* =========================
UI HELPERS
========================= */
function renderCard(html) {
  document.getElementById("app").innerHTML = html;
}

/* =========================
GUEST FORM
========================= */
function showGuestForm() {
  renderCard(`
    <h3>สมัครสมาชิก KPOS</h3>

    <label>เลขบัตรประชาชน</label>
    <input id="id_card" />

    <label>เบอร์โทร</label>
    <input id="phone" inputmode="numeric" maxlength="10" />

    <button id="verifyBtn" onclick="verifyCustomer()">ตรวจสอบข้อมูล</button>
  `);
}

/* =========================
VERIFY CUSTOMER
========================= */
async function verifyCustomer() {
  const idCard = document.getElementById("id_card").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const btn = document.getElementById("verifyBtn");

  if (!idCard || !phone) {
    showModal("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    showModal("เบอร์โทรไม่ถูกต้อง", "กรุณากรอกเบอร์โทร 10 หลัก");
    return;
  }

  btn.disabled = true;
  btn.innerText = "กำลังตรวจสอบ...";

  try {
    const result = await callFn("find_customer_for_line", {
      id_card: idCard,
      phone,
    });

    if (!result.found) {
      showModal("ไม่พบข้อมูล", "ไม่พบข้อมูลลูกค้า");
      return;
    }

    if (result.status !== "active") {
      showModal("ไม่สามารถสมัครได้", result.message || "");
      return;
    }

    const profile = await liff.getProfile();
    const bind = await callFn("register_customer_with_line", {
      customer_id: result.customer_id,
      line_user_id: profile.userId,
    });

    bind.success
      ? showModal("สมัครสำเร็จ", "ยินดีต้อนรับสมาชิก KPOS")
      : showModal("ไม่สำเร็จ", "ไม่สามารถสมัครได้");

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "ตรวจสอบข้อมูล";
  }
}

/* =========================
MEMBER MENU (UI ONLY)
========================= */
function showMemberMenu(customer) {
  const name = customer.name || "ลูกค้า KPOS";
  const phone = maskPhone(customer.phone || "");

  renderCard(`
    <div class="app-page">

      <!-- Welcome Card -->
      <div class="section-card">
        <div class="member-header">
          <h3>ยินดีต้อนรับ</h3>
          <div class="member-name">คุณ ${name}</div>
          <div class="member-phone">เบอร์: ${phone}</div>

          <button class="logout-btn" onclick="logout()">
            ออกจากระบบ
          </button>
        </div>
      </div>

      <!-- Menu Card -->
      <div class="section-card">
        <div class="menu-title">เมนูบริการ</div>

        <button class="menu-btn" onclick="openMyBills()">
          📄 บิลของฉัน
        </button>

        <button class="menu-btn secondary" disabled>
          🚧 บริการอื่น ๆ (เร็ว ๆ นี้)
        </button>
      </div>

    </div>
  `);
}

/* =========================
MODAL
========================= */
function showModal(title, message) {
  modalTitle.innerText = title;
  modalMessage.innerText = message;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

/* =========================
ACTIONS
========================= */
function openPawn() { alert("ไปหน้าขายฝาก"); }
function openInstallment() { alert("ไปหน้าผ่อน"); }
function logout() { liff.logout(); location.reload(); }

/* =========================
HELPER
========================= */
function maskPhone(phone) {
  if (phone.length < 10) return phone;
  return phone.slice(0,3) + "*****" + phone.slice(-2);
}

/* =========================
MENU ACTIONS
========================= */
function maskLast6(value) {
  if (!value) return "-";
  return "••••••" + value.slice(-6);
}

async function openMyBills() {
  const res = await callFn("get_my_pawn_bills", {
    customer_id: CURRENT_CUSTOMER.customer_id,
  });

  const bills = res.bills || [];

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
          : bills.map(renderPawnBill).join("")
      }
    </div>
  `);
}


function renderPawnBill(bill) {
  const item = bill.pawn_items || {};
  const statusText =
    bill.status === "normal" ? "ปกติ" : "เกินกำหนด";

  const statusClass =
    bill.status === "normal" ? "bill-status" : "bill-status warning";

  return `
    <div class="bill-card">
      <div class="bill-row" style="font-weight:600; display:flex; justify-content:space-between;">
        <span>เลขที่บิล ${bill.contract_no}</span>
        <span class="${statusClass}">${statusText}</span>
      </div>

      <div class="bill-row">
        <span>วันที่</span>
        <span>${bill.deposit_date}</span>
      </div>

      <div style="margin:10px 0;font-weight:600">
        ${item.brand || ""} ${item.model || ""}
      </div>

      <div class="bill-row">
        <span>IMEI / SN</span>
        <span>${maskLast6(item.imei || item.sn)}</span>
      </div>

      <div class="bill-row">
        <span>จำนวนเงิน</span>
        <span>${Number(bill.deposit_amount).toLocaleString()} บาท</span>
      </div>

      <div class="bill-row">
        <span>ครบกำหนด</span>
        <span>${bill.due_date}</span>
      </div>
    </div>
  `;
}