/* =========================
CONFIG
========================= */
let CURRENT_CUSTOMER = null;
let CURRENT_BILLS = [];
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

function setButtonLoading(btn, text) {
  btn.classList.add("loading");
  btn.innerHTML = `
    <span class="spinner"></span>
    <span>${text}</span>
  `;
}

function resetButton(btn, text) {
  btn.classList.remove("loading");
  btn.innerText = text;
}

/* =========================
INIT
========================= */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isInClient()) {
  renderCard(`
    <div class="section-card">
      <h3>⚠️ Debug Mode</h3>
      <p>ไม่ได้เปิดจาก LINE</p>
      <button class="primary-btn" onclick="showGuestForm()">
        เข้าโหมดทดสอบ
      </button>
    </div>
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

function showCheckingPopup() {
  showModal(
    "กำลังตรวจสอบการทำรายการ",
    "สัญญานี้กำลังตรวจสอบการทำรายการ\nท่านจะได้รับการแจ้งภายใน 24 ชั่วโมง"
  );
}

function showGuestForm() {
  renderCard(`
    <div class="section-card">

      <div style="text-align:center; margin-bottom:16px;">
        <h3 style="margin:0;">สมัครสมาชิก KPOS</h3>
        <p style="font-size:14px;color:#6b7280;margin-top:6px;">
          กรุณากรอกข้อมูลเพื่อผูกบัญชีกับ LINE
        </p>
      </div>

      <div style="margin-bottom:14px;">
        <label style="font-size:13px;color:#374151;">
          เลขบัตรประชาชน
        </label>
        <input
          id="id_card"
          inputmode="numeric"
          maxlength="13"
          placeholder="กรอกเลขบัตรประชาชน"
          style="
            width:100%;
            height:44px;
            border-radius:10px;
            border:1px solid #e5e7eb;
            padding:0 12px;
            font-size:15px;
            margin-top:6px;
          "
        />
      </div>

      <div style="margin-bottom:18px;">
        <label style="font-size:13px;color:#374151;">
          เบอร์โทรศัพท์
        </label>
        <input
          id="phone"
          inputmode="numeric"
          maxlength="10"
          placeholder="กรอกเบอร์โทรศัพท์"
          style="
            width:100%;
            height:44px;
            border-radius:10px;
            border:1px solid #e5e7eb;
            padding:0 12px;
            font-size:15px;
            margin-top:6px;
          "
        />
      </div>

      <button
        id="verifyBtn"
        class="primary-btn"
        onclick="verifyCustomer()"
      >
        ตรวจสอบข้อมูล
      </button>

    </div>
  `);
}

/* =========================
VERIFY CUSTOMER
========================= */
const accept = document.getElementById("acceptTerms");
if (!accept || !accept.checked) {
  showModal("กรุณายอมรับเงื่อนไข", "กรุณายอมรับเงื่อนไขการให้บริการก่อนดำเนินการ");
  return;
}

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

  setButtonLoading(btn, "กำลังตรวจสอบ");

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

    if (bind.success) {
  showModal("สมัครสำเร็จ", "ยินดีต้อนรับสมาชิก KPOS");

  // 🔹 set customer ให้ session ปัจจุบัน
  CURRENT_CUSTOMER = {
    customer_id: result.customer_id,
    name: result.name,
    phone: phone,
  };

  // 🔹 เด้งเข้า Home หลังจากกดตกลง
  const originalClose = closeModal;
  closeModal = function () {
    modal.style.display = "none";
    closeModal = originalClose;
    showMemberMenu(CURRENT_CUSTOMER);
  };
} else {
  showModal("ไม่สำเร็จ", "ไม่สามารถสมัครได้");
}

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  } finally {
    setButtonLoading(btn, "กำลังตรวจสอบ");
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

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
}


function renderPawnBill(bill, index) {
  const item = bill.pawn_items || {};

  const today = new Date();
  const dueDate = new Date(bill.due_date);

  const isOverdue = today > dueDate;

  const statusText = isOverdue ? "เกินกำหนด" : "ปกติ";
  const statusClass = isOverdue
    ? "bill-status warning"
    : "bill-status";

  return `
    <div class="bill-card">
      <div class="bill-row" style="font-weight:600; display:flex; justify-content:space-between;">
        <span>เลขที่บิล ${bill.contract_no}</span>
        <span class="${statusClass}">${statusText}</span>
      </div>

      <!-- ชื่อสินค้า ต้องอยู่ก่อน -->
      <div style="margin:10px 0;font-weight:600">
        ${item.brand || ""} ${item.model || ""}
      </div>

      <div class="bill-row">
        <span>วันที่</span>
        <span>${formatDate(bill.deposit_date)}</span>
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
        <span>${formatDate(bill.due_date)}</span>
      </div>

     ${
  bill.is_checking_payment
    ? `
      <button
        class="menu-btn secondary"
        style="margin-top:10px"
        onclick="showCheckingPopup()"
      >
        ⏳ กำลังตรวจสอบ
      </button>
    `
    : `
      <button
        class="menu-btn"
        style="margin-top:10px"
        onclick="openPawnPaymentByIndex(${index})"
      >
        💳 ชำระค่างวด / ต่ออายุบิล
      </button>
    `
}


    </div>
  `;
}

function openPawnPayment(bill) {
  if (typeof openPayment !== "function") {
    showModal("ผิดพลาด", "ไม่พบหน้า payment");
    return;
  }

  openPayment(bill);
}

function openPawnPaymentByIndex(index) {
  const bill = CURRENT_BILLS[index];

  if (!bill) {
    showModal("ผิดพลาด", "ไม่พบบิลที่เลือก");
    return;
  }

  openPawnPayment(bill);
}

async function init() {
  try {
    console.log("INIT START");

    await liff.init({ liffId: LIFF_ID });
    console.log("LIFF INIT OK");

    if (!liff.isInClient()) {
      renderCard(`<h3>❌ กรุณาเปิดจาก LINE</h3>`);
      return;
    }

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    console.log("LOGGED IN");

    const profile = await liff.getProfile();
    console.log("PROFILE OK", profile);

    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    console.log("STATUS", status);

    status.status === "guest"
      ? showGuestForm()
      : showMemberMenu(status.customer);

  } catch (err) {
    console.error(err);
    showModal("เกิดข้อผิดพลาด", err.message);
  }
}