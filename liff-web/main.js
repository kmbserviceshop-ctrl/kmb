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

    // 🔹 Debug mode (ไม่เปิดจาก LINE)
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

    // 🔹 ยังไม่ login
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 🔹 ได้ profile จาก LINE
    const profile = await liff.getProfile();

    // 🔹 เช็คสถานะจาก backend
    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    /* =========================
       GUEST (ยังไม่ผูกบัญชี)
    ========================= */
    if (status.status === "guest") {
      showGuestForm();
      return;
    }

    /* =========================
       MEMBER
    ========================= */
    CURRENT_CUSTOMER = status.customer;

    const consentStatus =
      status.customer?.consent_status || "pending";

    /* =========================
       REVOKED (ถอนความยินยอม)
    ========================= */
    if (consentStatus === "revoked") {
      showModal(
        "ไม่สามารถใช้งานได้",
        "คุณได้ถอนความยินยอมในการใช้ข้อมูล\nระบบไม่สามารถให้บริการได้"
      );

      const originalClose = closeModal;
      closeModal = function () {
        modal.style.display = "none";
        closeModal = originalClose;
        liff.closeWindow();
      };
      return;
    }

    /* =========================
       PENDING (ยังไม่ให้ความยินยอม)
    ========================= */
    if (consentStatus === "pending") {
      showConsentPage(CURRENT_CUSTOMER); // 👈 หน้า PDPA (C2)
      return;
    }

    /* =========================
       ACCEPTED (ใช้งานได้ปกติ)
    ========================= */
    showMemberMenu(CURRENT_CUSTOMER);

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

      <!-- เลขบัตร / Passport -->
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;color:#374151;">
          เลขบัตรประชาชน / Passport
        </label>
        <input
          id="id_card"
          placeholder="กรอกเลขบัตรประชาชน หรือ Passport"
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

      <!-- เบอร์โทร -->
      <div style="margin-bottom:14px;">
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

      <!-- ยอมรับเงื่อนไข -->
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:18px;">
        <input
          type="checkbox"
          id="acceptTerms"
          style="margin-top:4px;"
        />
        <label for="acceptTerms" style="font-size:13px;color:#374151;line-height:1.4;">
          ยอมรับเงื่อนไขการให้บริการ
        </label>
      </div>

      <!-- ปุ่ม -->
      <button
        id="verifyBtn"
        class="primary-btn"
        onclick="verifyCustomer()"
        disabled
      >
        ตรวจสอบข้อมูล
      </button>

    </div>
  `);

  // เปิด/ปิดปุ่มตามการติ๊ก
  const checkbox = document.getElementById("acceptTerms");
  const btn = document.getElementById("verifyBtn");

  checkbox.addEventListener("change", () => {
    btn.disabled = !checkbox.checked;
  });
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

    resetButton(btn, "ตรวจสอบข้อมูล");
  }
}

/* =========================
MEMBER MENU (UI ONLY)
========================= */
function showMemberMenu(customer) {
  const name = customer.name || "ลูกค้า KPOS";
  const phone = maskPhone(customer.phone || "");

  renderCard(`
    <div class="app-page home-page">

      <!-- Header -->
      <div class="home-header">
        <div>
          <div class="home-title">หน้าหลัก</div>
          <div class="home-sub">ยินดีต้อนรับ</div>
        </div>

        <div class="home-avatar">
          <span>👤</span>
        </div>
      </div>

      <!-- Profile Card -->
      <div class="section-card">
        <div class="member-name">คุณ ${name}</div>
        <div class="member-phone">เบอร์: ${phone}</div>
      </div>

      <!-- Menu Grid -->
      <div class="menu-grid">

        <button class="menu-tile active" onclick="openMyBills(this)">
          <div class="tile-icon">📄</div>
          <div class="tile-text">บิลของฉัน</div>
        </button>

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">💳</div>
          <div class="tile-text">ชำระเงิน</div>
        </button>

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">📦</div>
          <div class="tile-text">รายการอื่น</div>
        </button>

        <button class="menu-tile" onclick="openSettings()">
  <div class="tile-icon">⚙️</div>
  <div class="tile-text">ตั้งค่า</div>
</button>

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">📞</div>
          <div class="tile-text">ติดต่อร้าน</div>
        </button>

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">🚧</div>
          <div class="tile-text">เร็ว ๆ นี้</div>
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

async function openMyBills(btn) {
  // ✅ เพิ่ม: loading บนปุ่ม
  setButtonLoading(btn, "กำลังโหลด");

  try {
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

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message || "ไม่สามารถโหลดบิลได้");
    resetButton(btn, "📄 บิลของฉัน");
  }
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
/* =========================
Settings Page
========================= */
function openSettings() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="showMemberMenu(CURRENT_CUSTOMER)">←</button>
      <div class="top-title">ตั้งค่า</div>
    </div>

    <div class="settings-card">

      <!-- การตั้งค่าทั่วไป -->
      <div class="menu-title" style="padding: 12px 18px 6px;">
        การตั้งค่าทั่วไป
      </div>

      <div class="settings-item"
           onclick="showModal('เร็ว ๆ นี้','ตั้งค่าการแจ้งเตือน')">
        <div class="settings-icon">🔔</div>
        <div class="settings-text">ตั้งค่าการแจ้งเตือน</div>
        <div class="settings-arrow">›</div>
      </div>
      <div class="settings-divider"></div>

      <div class="settings-item"
           onclick="showModal('ความยินยอม','การจัดการความยินยอมข้อมูล')">
        <div class="settings-icon">👤</div>
        <div class="settings-text">การจัดการความยินยอม</div>
        <div class="settings-arrow">›</div>
      </div>

      <!-- ข้อกำหนด -->
      <div class="menu-title" style="padding: 18px 18px 6px;">
        ข้อกำหนดและความเป็นส่วนตัว
      </div>

      <div class="settings-item"
           onclick="showModal('ข้อกำหนดและเงื่อนไข','รายละเอียดข้อกำหนดการใช้งาน')">
        <div class="settings-icon">📄</div>
        <div class="settings-text">ข้อกำหนดและเงื่อนไข</div>
        <div class="settings-arrow">›</div>
      </div>

      <div class="settings-divider"></div>

<div class="settings-item"
     onclick="confirmRevokeConsent()">
  <div class="settings-icon">⚠️</div>
  <div class="settings-text">ถอนความยินยอมในการใช้ข้อมูล</div>
</div>



      <div class="settings-divider"></div>

      <!-- Logout -->
      <div class="settings-item"
           onclick="logout()">
        <div class="settings-icon">🚪</div>
        <div class="settings-text">ออกจากระบบ</div>
      </div>

    </div>
  `);
}

/* =========================
PDPA CONSENT UI
========================= */
function showConsentPage() {
  renderCard(`
    <div class="top-bar">
      <div class="top-title">ความเป็นส่วนตัว</div>
    </div>

    <div class="section-card">

      <div class="menu-title">
        การขอความยินยอมในการเก็บข้อมูลส่วนบุคคล
      </div>

      <div style="font-size:14px; color:#374151; line-height:1.6; margin-bottom:16px;">
        KPOS จำเป็นต้องใช้ข้อมูลของท่านเพื่อให้บริการ เช่น
        การฝากสินค้า การผ่อนสินค้า การแจ้งเตือนสถานะบิล และการติดต่อร้านค้า
      </div>

      <div style="font-size:14px; color:#374151; line-height:1.6; margin-bottom:16px;">
        <strong>ข้อมูลที่จัดเก็บ</strong>
        <ul style="padding-left:18px; margin-top:8px;">
          <li>ชื่อ – นามสกุล</li>
          <li>เบอร์โทรศัพท์</li>
          <li>ข้อมูลสัญญาและประวัติการทำรายการ</li>
        </ul>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:20px;">
        <input type="checkbox" id="consentCheck" />
        <label for="consentCheck" style="font-size:14px;">
          ข้าพเจ้ายินยอมให้ KPOS เก็บและใช้ข้อมูลส่วนบุคคล
        </label>
      </div>

      <button
  id="consentAcceptBtn"
  class="primary-btn"
  disabled
  onclick="acceptConsent()"
>
  ยินยอมและใช้งานต่อ
</button>

<button
  class="primary-btn secondary-btn"
  style="margin-top:12px"
  onclick="declineConsent()"
>
  ไม่ยินยอม
</button>

    </div>
  `);

  const checkbox = document.getElementById("consentCheck");
  const btn = document.getElementById("consentAcceptBtn");

  checkbox.addEventListener("change", () => {
    btn.disabled = !checkbox.checked;
  });
}

async function acceptConsent() {
  try {
    const profile = await liff.getProfile();

    await callFn("accept_consent", {
      line_user_id: profile.userId,
    });

    showModal("ขอบคุณ", "คุณได้ให้ความยินยอมเรียบร้อยแล้ว");

    const originalClose = closeModal;
    closeModal = function () {
      modal.style.display = "none";
      closeModal = originalClose;
      showMemberMenu(CURRENT_CUSTOMER);
    };

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message || "ไม่สามารถบันทึกความยินยอมได้");
  }
}

function declineConsent() {
  showModal(
    "ไม่สามารถใช้งานได้",
    "หากไม่ยินยอม ระบบจะไม่สามารถให้บริการได้"
  );

  const originalClose = closeModal;
  closeModal = function () {
    modal.style.display = "none";
    closeModal = originalClose;
    liff.closeWindow();
  };
}

function confirmRevokeConsent() {
  showConfirmModal(
    "ถอนความยินยอม",
    `หากคุณถอนความยินยอม:
• คุณจะไม่สามารถใช้บริการ KPOS ได้อีก
• ไม่สามารถฝาก / ผ่อน / ดูบิล
• การดำเนินการนี้ไม่สามารถย้อนกลับได้

ต้องการดำเนินการต่อหรือไม่?`,
    revokeConsent // 👈 กดยืนยันเท่านั้นถึงเรียก
  );
}

async function revokeConsent() {
  try {
    const profile = await liff.getProfile();

    await callFn("revoke_consent", {
      line_user_id: profile.userId,
    });

    showModal(
      "ถอนความยินยอมแล้ว",
      "ระบบได้บันทึกการถอนความยินยอมของคุณเรียบร้อย"
    );

    const originalClose = closeModal;
    closeModal = function () {
      modal.style.display = "none";
      closeModal = originalClose;
      liff.closeWindow(); // ⛔ ปิดทันที
    };

  } catch (err) {
    showModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถถอนความยินยอมได้"
    );
  }
}

function showConfirmModal(title, message, onConfirm) {
  modalTitle.innerText = title;
  modalMessage.innerText = message;

  modal.innerHTML = `
    <div class="modal">
      <h4>${title}</h4>
      <p style="white-space:pre-line">${message}</p>

      <button class="primary-btn" id="confirmBtn">
        ยืนยันทำรายการ
      </button>

      <button
        class="menu-btn secondary"
        style="margin-top:8px"
        id="cancelBtn"
      >
        ยกเลิกทำรายการ
      </button>
    </div>
  `;

  modal.style.display = "flex";

  document.getElementById("cancelBtn").onclick = () => {
    modal.style.display = "none"; // ❌ ไม่แตะ backend
  };

  document.getElementById("confirmBtn").onclick = () => {
    modal.style.display = "none";
    onConfirm(); // ✅ ค่อยไปแตะ backend
  };
}