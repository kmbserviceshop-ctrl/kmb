/* =========================
CONFIG
========================= */
let CURRENT_CUSTOMER = null;
let CURRENT_BILLS = [];
let HAS_READ_PDPA = false;
let READ_TIMER_PASSED = false;
let FROM_PDPA_READ = false;
const LIFF_ID = "2008883587-vieENd7j";
let ACCESS_TOKEN = null; // 🔑 JWT ของ user
const FN_BASE =
  "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";

/* =========================
MAINTENANCE MODE
========================= */
const MAINTENANCE_MODE = false; // 🔴 true = ปิดระบบ | false = เปิดใช้งาน


// ❗ anon key 
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib29jcmtnb3JzbG53bnVocWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzYzMTUsImV4cCI6MjA4MzUxMjMxNX0.egN-N-dckBh8mCbY08UbGPScWv6lYpPCxodStO-oeTQ";

/* =========================
ERROR MESSAGES (GLOBAL)
========================= */
const ERROR_MESSAGES = {
  // 🔐 Auth / LINE / Session
  missing_line_user_id: "ไม่พบข้อมูลผู้ใช้ LINE",
  auth_user_missing: "ไม่พบข้อมูลบัญชีผู้ใช้",
  auth_user_invalid: "บัญชีผู้ใช้ไม่ถูกต้อง กรุณาติดต่อร้าน",
  cannot_generate_magiclink: "ไม่สามารถยืนยันตัวตนได้",
  cannot_issue_access_token: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่",
  session_expired: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",

  // 👤 Customer
  missing_parameters: "บัญชีนี้เคยผูกกับ LINE อื่นแล้วกรุณาใช้ LINE เดิม หรือ ติดต่อร้าน",
  customer_not_found: "ไม่พบข้อมูลลูกค้า",
  customer_not_active: "บัญชีลูกค้าถูกระงับการใช้งาน",
  customer_already_linked: "ลูกค้ารายนี้ถูกผูกบัญชีแล้ว",
  line_already_linked: "บัญชี LINE นี้ถูกผูกกับผู้ใช้อื่นแล้ว",
  organization_id_missing: "ข้อมูลร้านค้าไม่สมบูรณ์ กรุณาติดต่อร้าน",

  // 📝 Consent / PDPA
  consent_required: "กรุณาให้ความยินยอมก่อนใช้งาน",
  consent_revoked: "คุณได้ถอนความยินยอมแล้ว ไม่สามารถใช้งานระบบได้",
  consent_version_mismatch: "ต้องยืนยันนโยบายเวอร์ชันใหม่ก่อนใช้งาน",
  accept_consent_failed: "ไม่สามารถบันทึกความยินยอมได้",

  // 🌐 Network / API
  request_timeout: "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่",
  network_error: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
  unauthorized: "กรุณาเข้าสู่ระบบใหม่",
  forbidden: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้",

  // ⚙️ System
  internal_error: "ระบบขัดข้อง กรุณาลองใหม่ภายหลัง",
  service_unavailable: "ระบบไม่พร้อมใช้งานชั่วคราว",
  unknown_error: "เกิดข้อผิดพลาด กรุณาลองใหม่",
};
function translateError(err) {
  if (!err) return ERROR_MESSAGES.unknown_error;

  // กรณี backend ส่ง JSON: { error: "some_code" }
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.error && ERROR_MESSAGES[parsed.error]) {
      return ERROR_MESSAGES[parsed.error];
    }
  } catch (_) {
    // ไม่ใช่ JSON → ข้าม
  }

  // กรณี error เป็น code ตรง ๆ
  if (ERROR_MESSAGES[err.message]) {
    return ERROR_MESSAGES[err.message];
  }

  return ERROR_MESSAGES.unknown_error;
}

/* =========================
HELPER : API CALL (FULL)
========================= */
async function callFn(path, payload, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  async function doFetch() {
    const token = options.forceAnon
      ? SUPABASE_ANON_KEY
      : (ACCESS_TOKEN || SUPABASE_ANON_KEY);

    return fetch(`${FN_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  }

  try {
    let res = await doFetch();

    // 🔁 token หมด → refresh แล้วลองใหม่ 1 ครั้ง
    if (res.status === 401 && !options.forceAnon) {
      await refreshCustomerStatus();
      res = await doFetch();
    }

    if (!res.ok) {
      const text = await res.text();
      // ส่งต่อ error ดิบเข้า translateError
      throw new Error(text || "internal_error");
    }

    return await res.json();

  } catch (err) {
    // ⏱ timeout
    if (err.name === "AbortError") {
      throw new Error(ERROR_MESSAGES.request_timeout);
    }

    const message = translateError(err);
    throw new Error(message);

  } finally {
    clearTimeout(timer);
  }
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
REFRESH CUSTOMER STATUS
ใช้หลัง bind / acceptConsent
========================= */
async function refreshCustomerStatus() {
  try {
    const profile = await liff.getProfile();

    // 🔧 FIX: ห้าม forceAnon หลัง login แล้ว
    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    // 🔧 FIX: รับ JWT ใหม่ทุกครั้ง
    if (status.access_token) {
      ACCESS_TOKEN = status.access_token;
    }

    if (status.status !== "member") {
      showGuestForm();
      return;
    }

    CURRENT_CUSTOMER = status.customer;

    const {
      consent_status,
      consent_version,
      current_consent_version,
    } = CURRENT_CUSTOMER || {};

    if (consent_status === "revoked") {
      showAlertModal(
        "ไม่สามารถใช้งานได้",
        "คุณได้ถอนความยินยอมในการใช้ข้อมูล\nระบบไม่สามารถให้บริการได้",
        () => liff.closeWindow()
      );
      return;
    }

    const needConsent =
      consent_status !== "accepted" ||
      consent_version !== current_consent_version;

    if (needConsent) {
      showConsentPage();
      return;
    }

    showMemberMenu(CURRENT_CUSTOMER);
  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถอัปเดตสถานะได้"
    );
  }
}
/* =========================
INIT
========================= */
async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const entry = params.get("entry");

    if (MAINTENANCE_MODE) {
      showMaintenancePage();
      return;
    }

    await liff.init({ liffId: LIFF_ID });

    if (!liff.isInClient()) {
      showGuestForm();
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

    // 🔧 FIX: รับ token ตอน init
    if (status.access_token) {
      ACCESS_TOKEN = status.access_token;
    }

    if (status.status === "revoked") {
      showAlertModal(
        "ไม่สามารถใช้งานได้",
        "คุณได้ถอนความยินยอมในการใช้ข้อมูล\nระบบไม่สามารถให้บริการได้",
        () => liff.closeWindow()
      );
      return;
    }

    if (status.status === "guest") {
      showGuestForm();
      return;
    }

    CURRENT_CUSTOMER = status.customer;

    const {
      consent_status,
      consent_version,
      current_consent_version,
    } = CURRENT_CUSTOMER || {};

    const needConsent =
      consent_status !== "accepted" ||
      consent_version !== current_consent_version;

    if (needConsent) {
      showConsentPage();
      return;
    }

    showMemberMenu(CURRENT_CUSTOMER);
  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถเริ่มระบบได้"
    );
  }
}
init();


/* =========================
UI HELPERS//
========================= */
function renderCard(html) {
  document.getElementById("app").innerHTML = html;
}

/* =========================
ปิดปรับปรุงระบบ
========================= */
function showMaintenancePage() {
  renderCard(`
    <div
      style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#f3f4f6;
        padding:20px;
      "
    >
      <div
        style="
          width:100%;
          max-width:360px;
          background:linear-gradient(135deg,#ecfdf5,#ffffff);
          border-radius:24px;
          padding:22px 20px 24px;
          box-shadow:0 20px 40px rgba(0,0,0,0.12);
          text-align:center;
          position:relative;
          overflow:hidden;
        "
      >

        <!-- ICON -->
        <div style="font-size:42px;margin-bottom:10px;">📢</div>

        <!-- TITLE -->
        <div style="font-size:22px;font-weight:800;margin-bottom:6px;">
          ปิดปรับปรุงระบบ
        </div>

        <!-- BRAND -->
        <div
          style="
            font-size:32px;
            font-weight:900;
            color:#22c55e;
            margin-bottom:8px;
          "
        >
          KPOS Connect
        </div>

        <!-- SUB -->
        <div
          style="
            font-size:14px;
            color:#374151;
            margin-bottom:14px;
          "
        >
          ระบบอยู่ระหว่างการปรับปรุง
        </div>

        <!-- TIME BOX -->
        <div
          style="
            background:#f1f5f9;
            border-radius:14px;
            padding:12px 14px;
            margin-bottom:14px;
            font-size:14px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:8px;
            color:#111827;
            font-weight:600;
          "
        >
          ⏰ เวลาให้บริการ 08:00 – 21:00
        </div>

        <!-- MESSAGE -->
        <div
          style="
            font-size:13px;
            color:#6b7280;
            line-height:1.6;
            margin-bottom:18px;
          "
        >
          ขออภัยในความไม่สะดวก<br/>
          กรุณากลับมาใช้งานใหม่ภายหลัง
        </div>

        <!-- CONTACT -->
        <div
          style="
            font-size:13px;
            color:#374151;
            margin-bottom:20px;
          "
        >
          ☎ 096-339-5696
        </div>

        <!-- BUTTON -->
        <button
          class="primary-btn"
          style="
            width:100%;
            height:48px;
            border-radius:14px;
            font-size:16px;
            font-weight:700;
          "
          onclick="closeModal()"
          
        >
          ปิดหน้าต่าง
        </button>

      </div>
    </div>
  `);
}


function showCheckingPopup() {
  showAlertModal("กำลังตรวจสอบการทำรายการ", "สัญญานี้กำลังตรวจสอบการทำรายการ\nท่านจะได้รับการแจ้งภายใน 24 ชั่วโมง");
}

function showGuestForm() {
  renderCard(`
    <div class="section-card">

      <div style="text-align:center; margin-bottom:16px;">
        <h3 style="margin:0;">เชื่อมต่อบัญชี KPOS Connect</h3>
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

      <!-- ยอมรับเงื่อนไข (บังคับอ่านก่อน) -->
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:18px;">
        <input
          type="checkbox"
          id="acceptTerms"
          disabled
          style="margin-top:4px;"
        />
        <label
          for="acceptTerms"
          style="font-size:13px;color:#374151;line-height:1.4;cursor:pointer;"
          onclick="openConsentDetail()"
        >
          ยอมรับเงื่อนไขการใช้งาน KPOS Connect
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
}

/* =========================
VERIFY CUSTOMER
========================= */
async function verifyCustomer() {
  const idCard = document.getElementById("id_card").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const btn = document.getElementById("verifyBtn");

  if (!idCard || !phone) {
    showAlertModal("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  setButtonLoading(btn, "กำลังตรวจสอบ");

  try {
    const result = await callFn("find_customer_for_line", {
      id_card: idCard,
      phone,
    });

    if (!result.found) {
      showAlertModal("ไม่พบข้อมูล", "ไม่พบข้อมูลลูกค้า");
      return;
    }

    const profile = await liff.getProfile();

    const res = await callFn("register_customer_with_line", {
      customer_id: result.customer_id,
      line_user_id: profile.userId,
    });

    // 🔑 FIX สำคัญที่สุด: รับ JWT จาก backend
    if (res?.access_token) {
      ACCESS_TOKEN = res.access_token;
    }

    // ✅ สมัครสำเร็จ → ปิด LIFF ทันที (ทางเลือก A)
    if (res?.success) {
  // 🔑 บังคับ refresh JWT ตัวจริง
  await refreshCustomerStatus();

  showAlertModal(
    "สมัครสมาชิกสำเร็จ",
    "ระบบได้เชื่อมต่อบัญชี LINE ของคุณเรียบร้อยแล้ว",
    () => {
      liff.closeWindow(); // 🚪 ค่อยปิดหลัง JWT ถูก set
    }
  );
  return;
}

    // fallback (กรณีผิดปกติ)
    throw new Error("สมัครสมาชิกไม่สำเร็จ");

  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message || "เกิดข้อผิดพลาด");
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
      <div class="home-sub">สวัสดีคุณ</div>
        <div class="home-title">${name}</div>
      </div>
      <div class="home-avatar" onclick="openSettings()">⚙️</div>
    </div>

    <!-- Point Card -->
    <div
      style="
        background:#0f172a;
        color:#fff;
        border-radius:16px;
        padding:16px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:16px;
      "
    >
      <div>
        <div style="font-size:18px;font-weight:700;">0 Points</div>
        <div style="font-size:13px;color:#cbd5f5;">
          Redeem your points now!
        </div>
      </div>
      <button
        class="menu-btn"
        style="
          background:#111827;
          color:#fff;
          border:none;
          height:36px;
          padding:0 16px;
        "
        onclick="showAlertModal('เร็ว ๆ นี้','ระบบแลกแต้มจะเปิดใช้งานในเร็ว ๆ นี้')"
      >
        Redeem
      </button>
    </div>

    <!-- Menu Grid -->
    <div class="menu-grid">

      <button class="menu-tile" onclick="openMyBills(this)">
        <div class="tile-icon">📄</div>
        <div class="tile-text">บิลของฉัน</div>
      </button>

      <button class="menu-tile" onclick="openMyPaymentRequests(this)">
  <div class="tile-icon">🧾</div>
  <div class="tile-text">รายการคำขอ</div>
</button>

      <button class="menu-tile disabled" disabled>
        <div class="tile-icon">➕</div>
        <div class="tile-text">แจ้งใบหาย</div>
      </button>


      <button class="menu-tile disabled" disabled>
        <div class="tile-icon">📱</div>
        <div class="tile-text">
          มือถือ<br><small>เร็ว ๆ นี้</small>
        </div>
      </button>

      <button class="menu-tile disabled" disabled>
        <div class="tile-icon">🎧</div>
        <div class="tile-text">
          อุปกรณ์เสริม<br><small>เร็ว ๆ นี้</small>
        </div>
      </button>

    </div>

    <!-- การแจ้งเตือน -->
<div style="margin-top:18px;">

  <div
    style="
      background:#fff7ed;
      border:1px solid #fed7aa;
      border-radius:14px;
      padding:14px 16px;
      color:#9a3412;
      font-size:14px;
      line-height:1.6;
      display:flex;
      gap:10px;
      align-items:flex-start;
      margin-bottom:10px;
    "
  >
    <div style="font-size:18px; line-height:1;">⚠️</div>
    <div>
      <div style="font-weight:700; margin-bottom:2px;">
        ระบบอยู่ระหว่างการทดลองใช้งาน
      </div>
      <div style="font-size:13px; color:#7c2d12;">
        บางฟีเจอร์อาจยังไม่สมบูรณ์ หรือมีการเปลี่ยนแปลงโดยไม่ต้องแจ้งล่วงหน้า
      </div>
    </div>
  </div>

  <div id="homePaymentList"></div>
</div>

  </div>
  `);
}

/* =========================
MODAL ใช้ทั้งระบบ
========================= */
function openModal(html) {
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = html;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

const modalEl = document.getElementById("modal");

modalEl.onclick = (e) => {
  if (e.target === modalEl) closeModal();
};

function showAlertModal(title, message, options = {}) {
  const {
    retry = null,
    onConfirm = null,
    canCloseLiff = false
  } = options;

  openModal(`
    <h4>${title}</h4>
    <p style="white-space:pre-line">${message}</p>

    ${
      retry
        ? `<button class="primary-btn" id="retryBtn">ลองใหม่อีกครั้ง</button>`
        : `<button class="primary-btn" id="okBtn">ตกลง</button>`
    }

    ${
      canCloseLiff
        ? `<button class="secondary-btn" id="closeBtn">ปิดหน้าต่าง</button>`
        : ``
    }
  `);

  if (retry) {
    document.getElementById("retryBtn").onclick = () => {
      closeModal();
      retry();
    };
  } else {
    document.getElementById("okBtn").onclick = () => {
      closeModal();
      if (typeof onConfirm === "function") onConfirm();
    };
  }

  if (canCloseLiff) {
    document.getElementById("closeBtn").onclick = () => {
      try { liff.closeWindow(); } catch (_) {}
    };
  }
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

      <!-- 🔔 แจ้งเตือน -->
<div class="settings-item"
onclick="openNotificationSettings()">
  <div class="settings-icon">🔔</div>
  <div class="settings-text">ตั้งค่าการแจ้งเตือน</div>
  <div class="settings-arrow">›</div>
</div>

      <div class="settings-divider"></div>

      <!-- 👤 การจัดการความยินยอม (แก้จุดนี้) -->
      <div class="settings-item"
           onclick="openConsentDetail()">
        <div class="settings-icon">👤</div>
        <div class="settings-text">การจัดการความยินยอม</div>
        <div class="settings-arrow">›</div>
      </div>

      <!-- ข้อกำหนด -->
      <div class="menu-title" style="padding: 18px 18px 6px;">
        ข้อกำหนดและความเป็นส่วนตัว
      </div>

      <!-- 📄 เงื่อนไข -->
<div class="settings-item"
     onclick="showTermsPage()">
     
        <div class="settings-icon">📄</div>
        <div class="settings-text">ข้อกำหนดและเงื่อนไข</div>
        <div class="settings-arrow">›</div>
      </div>

      <div class="settings-divider"></div>

      <!-- ⚠️ ถอนความยินยอม -->
      <div class="settings-item"
           onclick="showRevokeConsentPage()">
        <div class="settings-icon">⚠️</div>
        <div class="settings-text">ถอนความยินยอมในการใช้ข้อมูล</div>
      </div>

      <div class="settings-divider"></div>

      <!-- 🚪 Logout -->
      <div class="settings-item"
           onclick="confirmLogout()">
        <div class="settings-icon">🚪</div>
        <div class="settings-text">ออกจากระบบ</div>
      </div>

    </div>
  `);
}

async function loadNotificationSettings() {
  const res = await callFn(
    "get_notification_settings",
    {},
    { forceAnon: true }
  );

  // backend ต้องส่งมาแบบนี้
  // { notify_due: true, notify_transaction: false }

  CURRENT_CUSTOMER.notify_due = !!res.notify_due;
  CURRENT_CUSTOMER.notify_transaction = !!res.notify_transaction;
}
function openNotificationSettings() {
  const notifyDue = CURRENT_CUSTOMER.notify_due === true;
  const notifyTxn = CURRENT_CUSTOMER.notify_transaction === true;

  renderCard(`
<div class="top-bar">
  <button class="back-btn" onclick="openSettings()">←</button>
  <div class="top-title">การแจ้งเตือน</div>
</div>

<div class="section-card">

<div class="settings-item">
  <div class="settings-text">
    🔔 เตือนก่อนครบชำระ
    <div style="font-size:12px;color:#6b7280">
      แจ้งเตือนก่อนถึงวันครบกำหนดชำระ
    </div>
  </div>
  <label class="switch">
    <input type="checkbox"
      ${notifyDue ? "checked" : ""}
      onchange="toggleNotification('notify_due', this.checked, this)">
    <span class="slider"></span>
  </label>
</div>

<div class="settings-divider"></div>

<div class="settings-item">
  <div class="settings-text">
    🧾 เตือนเมื่อทำรายการ
    <div style="font-size:12px;color:#6b7280">
      แจ้งเตือนเมื่อมีการฝาก / ผ่อน / ต่อสัญญา
    </div>
  </div>
  <label class="switch">
    <input type="checkbox"
      ${notifyTxn ? "checked" : ""}
      onchange="toggleNotification('notify_transaction', this.checked, this)">
    <span class="slider"></span>
  </label>
</div>

</div>
`);
}
async function toggleNotification(type, enabled, checkboxEl) {
  checkboxEl.disabled = true;

  try {
    await callFn("update_notification_settings", {
      type,
      enabled,
    });

    // sync state
    CURRENT_CUSTOMER[type] = enabled;

    showAlertModal(
      "บันทึกสำเร็จ",
      enabled
        ? "เปิดการแจ้งเตือนเรียบร้อยแล้ว"
        : "ปิดการแจ้งเตือนเรียบร้อยแล้ว"
    );
  } catch (err) {
    checkboxEl.checked = !enabled;
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถบันทึกการตั้งค่าได้"
    );
  } finally {
    checkboxEl.disabled = false;
  }
}
function openConsentDetailTest() {
  // 🔁 reset state ทุกครั้งที่เปิด
  READ_TIMER_PASSED = false;

  openModal(`
<h4>นโยบายความเป็นส่วนตัว</h4>

<div
  id="consentScrollBox"
  style="
    font-size:13px;
    color:#374151;
    line-height:1.7;
    text-align:left;
    max-height:240px;
    overflow:auto;
    border:1px solid #e5e7eb;
    padding:12px;
    border-radius:8px;
  "
>

<strong>นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)</strong><br><br>

KPOS ให้ความสำคัญสูงสุดกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน  
การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลจะดำเนินการตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลที่เกี่ยวข้องอย่างเคร่งครัด<br><br>

<strong>1. ประเภทข้อมูลส่วนบุคคลที่เก็บรวบรวม</strong>
<ul style="padding-left:18px;">
  <li>ชื่อ – นามสกุล</li>
  <li>หมายเลขโทรศัพท์</li>
  <li>ข้อมูลบัตรประชาชน หรือ Passport (เฉพาะที่จำเป็นต่อการยืนยันตัวตน)</li>
  <li>ข้อมูลสัญญา ประวัติการทำรายการขายฝากหรือผ่อนสินค้า</li>
  <li>ข้อมูลการใช้งานระบบ KPOS Connect</li>
</ul>

<strong>2. วัตถุประสงค์ในการเก็บและใช้ข้อมูล</strong>
<ul style="padding-left:18px;">
  <li>เพื่อให้บริการขายฝาก ผ่อนสินค้า และบริการอื่นที่เกี่ยวข้อง</li>
  <li>เพื่อยืนยันตัวตนและป้องกันการแอบอ้างหรือทุจริต</li>
  <li>เพื่อแจ้งเตือนสถานะบิล กำหนดชำระ และข้อมูลสำคัญ</li>
  <li>เพื่อการติดต่อประสานงานระหว่างลูกค้าและร้านค้า</li>
  <li>เพื่อปรับปรุงคุณภาพและความปลอดภัยของระบบ</li>
</ul>

<strong>3. การเปิดเผยข้อมูล</strong><br>
KPOS จะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก  
เว้นแต่เป็นกรณีที่จำเป็นตามกฎหมาย หรือได้รับความยินยอมจากท่านโดยชัดแจ้ง<br><br>

<strong>4. ระยะเวลาในการจัดเก็บข้อมูล</strong><br>
ข้อมูลส่วนบุคคลจะถูกจัดเก็บตลอดระยะเวลาที่ท่านยังใช้บริการ  
หรือเท่าที่จำเป็นตามวัตถุประสงค์และข้อกำหนดทางกฎหมาย<br><br>

<strong>5. สิทธิของเจ้าของข้อมูล</strong>
<ul style="padding-left:18px;">
  <li>สิทธิในการเข้าถึงและขอสำเนาข้อมูล</li>
  <li>สิทธิในการแก้ไขข้อมูลให้ถูกต้อง</li>
  <li>สิทธิในการถอนความยินยอมได้ตลอดเวลา</li>
  <li>สิทธิในการขอให้ลบหรือระงับการใช้ข้อมูล</li>
</ul>

<strong>6. การถอนความยินยอม</strong><br>
ท่านสามารถถอนความยินยอมได้ภายหลังผ่านเมนูตั้งค่า  
อย่างไรก็ตาม การถอนความยินยอมอาจส่งผลให้ไม่สามารถใช้บริการ KPOS Connect ได้<br><br>

หากท่านได้อ่านและเข้าใจนโยบายฉบับนี้แล้ว  
กรุณาเลื่อนอ่านให้ครบถ้วนก่อนกดยืนยัน
</div>

<button
  class="primary-btn"
  id="consentReadDoneBtn"
  disabled
>
  อ่านและเข้าใจแล้ว
</button>

<button
  class="secondary-btn"
  style="margin-top:8px"
  onclick="closeModal()"
>
  ปิด
</button>
  `);

  const box = document.getElementById("consentScrollBox");
  const btn = document.getElementById("consentReadDoneBtn");

  resetButton(btn, "อ่านและเข้าใจแล้ว");
  btn.disabled = true;

  let scrolledToEnd = false;

  box.addEventListener("scroll", () => {
    const nearBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 5;

    if (nearBottom) {
      scrolledToEnd = true;
      if (READ_TIMER_PASSED) {
        btn.disabled = false;
      }
    }
  });

  setTimeout(() => {
    READ_TIMER_PASSED = true;
    if (scrolledToEnd) {
      btn.disabled = false;
    }
  }, 3000);

  btn.onclick = () => {
    if (!READ_TIMER_PASSED || !scrolledToEnd) return;

    setButtonLoading(btn, "กำลังบันทึก");
    btn.disabled = true;

    setTimeout(() => {
      HAS_READ_PDPA = true;
      FROM_PDPA_READ = true; // ✅ จุดที่เพิ่ม (สำคัญที่สุด)

      const checkbox =
        document.getElementById("consentCheck") ||
        document.getElementById("acceptTerms");

      if (checkbox) {
        checkbox.disabled = false;
        checkbox.checked = true;

        const verifyBtn = document.getElementById("verifyBtn");
        const acceptBtn = document.getElementById("consentAcceptBtn");

        if (verifyBtn) verifyBtn.disabled = false;
        if (acceptBtn) acceptBtn.disabled = false;
      }

      closeModal();
    }, 600);
  };
}
function openConsentDetail() {
  // 🔁 reset state ทุกครั้งที่เปิด
  READ_TIMER_PASSED = false;

  openModal(`
  <h4>นโยบายความเป็นส่วนตัว</h4>

  <div
    id="consentScrollBox"
    style="
      font-size:13px;
      color:#374151;
      line-height:1.7;
      text-align:left;
      max-height:240px;
      overflow:auto;
      border:1px solid #e5e7eb;
      padding:12px;
      border-radius:8px;
    "
  >

  <strong>นโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)</strong><br><br>

  KPOS Connect ให้ความสำคัญสูงสุดกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
  การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลจะดำเนินการตาม
  พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)<br><br>

  <strong>1. ข้อมูลส่วนบุคคลที่เก็บรวบรวม</strong>
  <ul style="padding-left:18px;">
    <li>ชื่อ – นามสกุล</li>
    <li>หมายเลขโทรศัพท์</li>
    <li>หมายเลขบัตรประชาชน หรือ Passport (เพื่อยืนยันตัวตน)</li>
    <li>ข้อมูลสัญญาและประวัติการทำรายการ</li>
    <li>ข้อมูลการใช้งานระบบ KPOS Connect</li>
  </ul>

  <strong>2. วัตถุประสงค์ในการใช้ข้อมูล</strong>
  <ul style="padding-left:18px;">
    <li>เพื่อยืนยันตัวตนและป้องกันการแอบอ้าง</li>
    <li>เพื่อให้บริการแสดงข้อมูลบิล การฝาก และการผ่อนสินค้า</li>
    <li>เพื่อแจ้งเตือนสถานะบิลและข้อมูลสำคัญ</li>
    <li>เพื่อการติดต่อประสานงานระหว่างลูกค้าและร้านค้า</li>
    <li>เพื่อปรับปรุงความปลอดภัยและคุณภาพของระบบ</li>
  </ul>

  <strong>3. การเปิดเผยข้อมูล</strong><br>
  KPOS Connect จะไม่เปิดเผยข้อมูลส่วนบุคคลแก่บุคคลภายนอก
  เว้นแต่ได้รับความยินยอมจากท่าน หรือเป็นไปตามที่กฎหมายกำหนด<br><br>

  <strong>4. ระยะเวลาในการจัดเก็บข้อมูล</strong><br>
  ข้อมูลส่วนบุคคลจะถูกจัดเก็บตลอดระยะเวลาที่ท่านใช้บริการ
  หรือเท่าที่จำเป็นตามวัตถุประสงค์และข้อกำหนดทางกฎหมาย<br><br>

  <strong>5. สิทธิของเจ้าของข้อมูล</strong>
  <ul style="padding-left:18px;">
    <li>สิทธิในการเข้าถึงและขอสำเนาข้อมูล</li>
    <li>สิทธิในการขอแก้ไขข้อมูลให้ถูกต้อง</li>
    <li>สิทธิในการถอนความยินยอมได้ตลอดเวลา</li>
    <li>สิทธิในการขอให้ลบหรือระงับการใช้ข้อมูล</li>
  </ul>

  <strong>6. การถอนความยินยอม</strong><br>
  ท่านสามารถถอนความยินยอมได้ผ่านเมนูตั้งค่าในระบบ
  การถอนความยินยอมอาจส่งผลให้ไม่สามารถใช้งาน KPOS Connect ได้<br><br>

  <strong>หมายเหตุ:</strong>
  การกด “ยินยอม” และใช้งานระบบ
  ถือว่าท่านได้อ่าน เข้าใจ และยอมรับนโยบายฉบับนี้แล้ว

  </div>

  <button
    class="primary-btn"
    id="consentReadDoneBtn"
    disabled
  >
    อ่านและเข้าใจแล้ว
  </button>

  <button
    class="secondary-btn"
    style="margin-top:8px"
    onclick="closeModal()"
  >
    ปิด
  </button>
  `);

  const box = document.getElementById("consentScrollBox");
  const btn = document.getElementById("consentReadDoneBtn");

  resetButton(btn, "อ่านและเข้าใจแล้ว");
  btn.disabled = true;

  let scrolledToEnd = false;

  box.addEventListener("scroll", () => {
    const nearBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 5;

    if (nearBottom) {
      scrolledToEnd = true;
      if (READ_TIMER_PASSED) {
        btn.disabled = false;
      }
    }
  });

  setTimeout(() => {
    READ_TIMER_PASSED = true;
    if (scrolledToEnd) {
      btn.disabled = false;
    }
  }, 3000);

  btn.onclick = () => {
    if (!READ_TIMER_PASSED || !scrolledToEnd) return;

    setButtonLoading(btn, "กำลังบันทึก");
    btn.disabled = true;

    setTimeout(() => {
      HAS_READ_PDPA = true;
      FROM_PDPA_READ = true; // ✅ สำคัญ

      const checkbox =
        document.getElementById("consentCheck") ||
        document.getElementById("acceptTerms");

      if (checkbox) {
        checkbox.disabled = false;
        checkbox.checked = true;

        const verifyBtn = document.getElementById("verifyBtn");
        const acceptBtn = document.getElementById("consentAcceptBtn");

        if (verifyBtn) verifyBtn.disabled = false;
        if (acceptBtn) acceptBtn.disabled = false;
      }

      closeModal();
    }, 600);
  };
}

/* =========================
PDPA CONSENT
========================= */
async function acceptConsent() {
  const btn = document.getElementById("consentAcceptBtn");

  if (btn) {
    setButtonLoading(btn, "กำลังบันทึก");
    btn.disabled = true;
  }

  try {
    const profile = await liff.getProfile();

    // ✅ รับ response
    const res = await callFn("accept_consent", {
      line_user_id: profile.userId,
    });

    // 🔥 FIX สำคัญมาก: set JWT ใหม่
    //if (res?.access_token) {
      //ACCESS_TOKEN = res.access_token;
    //}

    showAlertModal(
      "ขอบคุณ",
      "คุณได้ให้ความยินยอมเรียบร้อยแล้ว",
      () => {
        // 🔁 sync state ใหม่
        refreshCustomerStatus();
      }
    );
  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถบันทึกความยินยอมได้"
    );
    if (btn) {
      resetButton(btn, "ยินยอมและใช้งานต่อ");
      btn.disabled = false;
    }
  }
}

function declineConsent() {
  showAlertModal(
    "ไม่สามารถใช้งานได้",
    "หากไม่ยินยอม ระบบจะไม่สามารถให้บริการได้",
    () => liff.closeWindow()
  );
}


function showConsentPage() {

  // ✅ FIX: ถ้ายินยอมแล้ว + version ตรง → ห้ามค้างหน้านี้
  if (
    CURRENT_CUSTOMER?.consent_status === "accepted" &&
    CURRENT_CUSTOMER?.consent_version === CURRENT_CUSTOMER?.current_consent_version
  ) {
    showMemberMenu(CURRENT_CUSTOMER);
    return;
  }

  const isAccepted = CURRENT_CUSTOMER?.consent_status === "accepted";

  // 🔎 reset state เฉพาะกรณี
  // - ยังไม่ accepted
  // - และไม่ได้เพิ่งกลับมาจากหน้าอ่านนโยบาย
  if (!isAccepted && !FROM_PDPA_READ) {
    HAS_READ_PDPA = false;
    READ_TIMER_PASSED = false;
  }

  // reset flag หลังใช้
  FROM_PDPA_READ = false;

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="showMemberMenu(CURRENT_CUSTOMER)">←</button>
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

      <!-- อ่านนโยบาย -->
      <button
        class="menu-btn"
        style="margin-bottom:14px"
        onclick="openConsentDetail()"
      >
        📄 อ่านนโยบายความเป็นส่วนตัว
      </button>

      <!-- checkbox -->
      <div style="display:flex; gap:10px; margin-bottom:20px;">
        <input
          type="checkbox"
          id="consentCheck"
          ${isAccepted ? "checked disabled" : HAS_READ_PDPA ? "" : "disabled"}
        />
        <label
          for="consentCheck"
          style="font-size:14px; color:#374151; cursor:pointer;"
          ${!isAccepted ? `onclick="openConsentDetail()"` : ""}
        >
          ข้าพเจ้ายินยอมให้ KPOS เก็บและใช้ข้อมูลส่วนบุคคล
        </label>
      </div>

      ${
        isAccepted
          ? `
            <div style="color:#16a34a; font-size:14px; margin-bottom:12px;">
              ✔️ คุณได้ให้ความยินยอมแล้ว
            </div>
          `
          : `
            <button
              id="consentAcceptBtn"
              class="primary-btn"
              ${HAS_READ_PDPA ? "" : "disabled"}
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
          `
      }

    </div>
  `);

  // 🔒 ถ้า accepted แล้ว ไม่ต้อง bind event ใด ๆ เพิ่ม
  if (isAccepted) return;

  const checkbox = document.getElementById("consentCheck");
  const btn = document.getElementById("consentAcceptBtn");

  if (!checkbox || !btn) return;

  checkbox.addEventListener("change", () => {
    if (!HAS_READ_PDPA) {
      checkbox.checked = false;
      showAlertModal(
        "กรุณาอ่านนโยบายก่อน",
        "กรุณากดอ่านนโยบายความเป็นส่วนตัวให้ครบถ้วนก่อนจึงจะสามารถยินยอมได้"
      );
      return;
    }

    btn.disabled = !checkbox.checked;
  });
}

function showTermsPage() {
  const version =
    CURRENT_CUSTOMER?.current_consent_version || "-";

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openSettings()">←</button>
      <div class="top-title">ข้อกำหนดและเงื่อนไข</div>
    </div>

    <div class="section-card">

      <div style="
        font-size:13px;
        color:#374151;
        line-height:1.7;
      ">

        <strong>ข้อกำหนดและเงื่อนไขการใช้งาน KPOS Connect</strong><br>
        <span style="color:#6b7280;font-size:12px;">
          เวอร์ชันล่าสุด: ${version}
        </span>
        <br><br>

        การใช้งานระบบ KPOS Connect ถือว่าท่านยอมรับข้อกำหนดและเงื่อนไขดังต่อไปนี้<br><br>

        <strong>1. การให้บริการ</strong><br>
        KPOS Connect เป็นระบบสำหรับแสดงข้อมูลการฝากสินค้า การผ่อนสินค้า
        และข้อมูลที่เกี่ยวข้องกับร้านค้าเท่านั้น<br><br>

        <strong>2. ความถูกต้องของข้อมูล</strong><br>
        ข้อมูลที่แสดงในระบบเป็นข้อมูลจากร้านค้า
        หากพบความคลาดเคลื่อน กรุณาติดต่อร้านโดยตรง<br><br>

        <strong>3. การจำกัดความรับผิด</strong><br>
        KPOS Connect ไม่รับผิดชอบต่อความเสียหายใด ๆ
        ที่เกิดจากการใช้งานระบบหรือการตีความข้อมูลผิดพลาด<br><br>

        <strong>4. การเปลี่ยนแปลงข้อกำหนด</strong><br>
        ร้านค้าขอสงวนสิทธิ์ในการแก้ไขข้อกำหนดและเงื่อนไข
        โดยไม่จำเป็นต้องแจ้งให้ทราบล่วงหน้า<br><br>

        <strong>5. การติดต่อ</strong><br>
        หากมีข้อสงสัยเกี่ยวกับการใช้งาน
        กรุณาติดต่อร้านค้าที่ท่านใช้บริการโดยตรง
      </div>

    </div>
  `);
}
/* =========================
PDPA Logout
========================= */

function confirmLogout() {
  showConfirmModal(
    "ออกจากระบบ",
    `คุณต้องการออกจากระบบใช่หรือไม่?

• คุณจะต้องเปิด KPOS Connect ใหม่จาก LINE
• การออกจากระบบไม่กระทบข้อมูลหรือความยินยอม`,
    doLogout
  );
}

function doLogout() {
  try {
    // 🔥 clear frontend state
    CURRENT_CUSTOMER = null;
    CURRENT_BILLS = [];
    ACCESS_TOKEN = null;
    HAS_READ_PDPA = false;
    READ_TIMER_PASSED = false;

    // 🔑 best effort logout
    try {
      liff.logout();
    } catch (e) {}

    // 🚪 ปิด LIFF (สำคัญสุด)
    liff.closeWindow();

  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      "ไม่สามารถออกจากระบบได้"
    );
  }
}
/* =========================
MOBILE PACKAGE ACTIONS
========================= */
function openTopupMenu() {
  ENTRY_CONTEXT = "member"; // ⭐ สำคัญ: ระบุว่าเข้าจาก Member

  openGuestHomePage(); // 👉 Topup Home (ใช้ UI เดียวกับ Guest)
}

/* =========================
ถอนความยินยอม
========================= */
function showRevokeConsentPage() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openSettings()">←</button>
      <div class="top-title">ถอนความยินยอม</div>
    </div>

    <div class="section-card">

      <div style="
        background:#fff7ed;
        border:1px solid #fed7aa;
        border-radius:12px;
        padding:14px;
        margin-bottom:16px;
        color:#9a3412;
        font-size:14px;
        line-height:1.6;
      ">
        ⚠️ การดำเนินการนี้เป็นการยกเลิกความยินยอมในการใช้ข้อมูลส่วนบุคคล
        และจะส่งผลถาวรต่อการใช้งานระบบ
      </div>

      <div style="font-size:14px; line-height:1.7; color:#374151;">
        เมื่อคุณถอนความยินยอมแล้ว จะเกิดผลดังต่อไปนี้:
        <ul style="padding-left:18px; margin-top:10px;">
          <li><strong>ไม่สามารถเข้าใช้งาน KPOS Connect ได้อีก</strong></li>
          <li>ไม่สามารถฝากสินค้า ผ่อนสินค้า หรือดูข้อมูลบิลใด ๆ ได้</li>
          <li>ระบบจะยกเลิกการเชื่อมต่อบัญชีของคุณกับ LINE</li>
        </ul>
      </div>

      <div style="margin-top:14px; font-size:14px; color:#b91c1c; font-weight:600;">
        การดำเนินการนี้ไม่สามารถย้อนกลับได้
      </div>

      <div style="margin-top:10px; font-size:13px; color:#6b7280;">
        หากต้องการใช้งานระบบอีกครั้ง
        กรุณาติดต่อร้านค้าที่ท่านใช้บริการโดยตรง
      </div>

      <button
        class="primary-btn"
        style="margin-top:22px"
        onclick="confirmRevokeConsentFinal()"
      >
        ยืนยันถอนความยินยอม
      </button>

      <div
        style="
          margin-top:14px;
          text-align:center;
          font-size:14px;
          color:#6b7280;
          cursor:pointer;
        "
        onclick="openSettings()"
      >
        ยกเลิกและกลับไปหน้าตั้งค่า
      </div>

    </div>
  `);
}
async function revokeConsent() {
  const profile = await liff.getProfile();

  await callFn("revoke_consent", {
    line_user_id: profile.userId,
  });

  console.log("revoke done"); // 👈 ถ้าไม่ขึ้น = backend / callFn ค้าง

  CURRENT_CUSTOMER = {
    ...CURRENT_CUSTOMER,
    consent_status: "revoked",
    consent_version: null,
  };

  HAS_READ_PDPA = false;
  READ_TIMER_PASSED = false;
}
function confirmRevokeConsentFinal() {
  showConfirmModal(
    "ยืนยันการถอนความยินยอม",
`การดำเนินการนี้ไม่สามารถย้อนกลับได้

• คุณจะไม่สามารถใช้บริการ KPOS ได้อีก
• ต้องเปิดใช้งานใหม่จาก LINE`,
    async () => {
      // ✅ ทำงานจริงอย่างเดียว
      await revokeConsent();
    },
    () => {
      // ✅ UI ทำหลัง modal ปิดแล้วเท่านั้น
      showAlertModal(
        "ถอนความยินยอมแล้ว",
        "ระบบได้บันทึกการถอนความยินยอมเรียบร้อย\nคุณจะไม่สามารถใช้งานระบบได้",
        {
          onConfirm: () => {
            try { liff.logout(); } catch (_) {}
            liff.closeWindow();
          }
        }
      );
    }
  );
}
function showConfirmModal(title, message, onConfirm, afterConfirm) {
  openModal(`
    <h4>${title}</h4>
    <p style="white-space:pre-line">${message}</p>

    <button class="primary-btn" id="confirmBtn">ยืนยันทำรายการ</button>
    <button class="secondary-btn" id="cancelBtn" style="margin-top:10px">
      ยกเลิกทำรายการ
    </button>
  `);

  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  cancelBtn.onclick = closeModal;

  confirmBtn.onclick = async () => {
    setButtonLoading(confirmBtn, "กำลังดำเนินการ");
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      // 🔴 สำคัญ: onConfirm ต้องมี logic อย่างเดียว ห้ามเปิด modal
      await onConfirm();

      // ✅ รีเซ็ตปุ่มให้หลุด loading แน่ ๆ
      resetButton(confirmBtn, "ยืนยันทำรายการ");
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;

      closeModal();              // ปิด confirm modal ก่อน
      if (afterConfirm) afterConfirm(); // แล้วค่อยเปิด alert

    } catch (err) {
      // ✅ error ก็ต้องรีเซ็ตปุ่ม
      resetButton(confirmBtn, "ยืนยันทำรายการ");
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;

      closeModal();
      showAlertModal(
        "เกิดข้อผิดพลาด",
        err?.message || "ไม่สามารถดำเนินการได้"
      );
    }
  };
}