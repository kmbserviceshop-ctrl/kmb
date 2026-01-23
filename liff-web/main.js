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
HELPER : API CALL
========================= */
async function callFn(path, payload, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  const token = options.forceAnon
    ? SUPABASE_ANON_KEY
    : ACCESS_TOKEN || SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${FN_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "request failed");
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
    throw err;
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
UI HELPERS
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

    await callFn("register_customer_with_line", {
      customer_id: result.customer_id,
      line_user_id: profile.userId,
    });

    // 🔧 FIX: หลัง bind → re-sync จาก backend
    showAlertModal(
      "เชื่อมต่อสำเร็จ",
      "กรุณาอ่านและให้ความยินยอมก่อนใช้งาน",
      async () => {
        await refreshCustomerStatus();
      }
    );
  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message);
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
          <div class="home-title">${name}</div>
          <div class="home-sub">Gold Community</div>
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

        <button class="menu-tile active" onclick="openMyBills(this)">
  <div class="tile-icon">📄</div>
  <div class="tile-text">บิลของฉัน</div>
</button>

<button class="menu-tile" onclick="openTopupMenu()">
  <div class="tile-icon">📶</div>
  <div class="tile-text">ต่อแพ็กเกจ</div>
</button>

<button class="menu-tile" onclick="openAddonMenu()">
  <div class="tile-icon">➕</div>
  <div class="tile-text">แพ็กเสริม</div>
</button>

<button class="menu-tile" onclick="openGameTopup()">
  <div class="tile-icon">🎮</div>
  <div class="tile-text">เติมเกม</div>
</button>

<button class="menu-tile disabled" disabled>
  <div class="tile-icon">📱</div>
  <div class="tile-text">มือถือ<br><small>เร็ว ๆ นี้</small></div>
</button>

<button class="menu-tile disabled" disabled>
  <div class="tile-icon">🎧</div>
  <div class="tile-text">อุปกรณ์เสริม<br><small>เร็ว ๆ นี้</small></div>
</button>
      </div>

      <!-- Banner -->
      <div
        style="
          margin-top:18px;
          background:#ffffff;
          border-radius:18px;
          padding:14px;
          display:flex;
          align-items:center;
          gap:12px;
        "
      >
        <div style="font-size:34px;">📱</div>
        <div style="font-size:20px;font-weight:700;color:#7c3aed;">
          ผ่อนง่าย<br/>จ่ายสบาย
        </div>
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

function showAlertModal(title, message, onClose) {
  openModal(`
    <h4>${title}</h4>
    <p style="white-space:pre-line">${message}</p>

    <button class="primary-btn" id="alertOkBtn">
      ตกลง
    </button>
  `);

  document.getElementById("alertOkBtn").onclick = () => {
    closeModal();
    if (typeof onClose === "function") onClose();
  };
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
           onclick="showAlertModal(
             'เร็ว ๆ นี้',
             'ฟังก์ชันตั้งค่าการแจ้งเตือนจะเปิดให้ใช้งานในเร็ว ๆ นี้'
           )">
        <div class="settings-icon">🔔</div>
        <div class="settings-text">ตั้งค่าการแจ้งเตือน</div>
        <div class="settings-arrow">›</div>
      </div>

      <div class="settings-divider"></div>

      <!-- 👤 การจัดการความยินยอม (แก้จุดนี้) -->
      <div class="settings-item"
           onclick="showConsentPage()">
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
           onclick="confirmRevokeConsent()">
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

<!-- สถานะ 1: ยังไม่ครบ -->
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

  // ✅ reset ปุ่มให้กลับเป็นสถานะ 1 เสมอ
  resetButton(btn, "อ่านและเข้าใจแล้ว");
  btn.disabled = true;

  let scrolledToEnd = false; // reset ใหม่ทุกครั้ง

  // ✅ ต้องเลื่อนถึงท้าย
  box.addEventListener("scroll", () => {
    const nearBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 5;

    if (nearBottom) {
      scrolledToEnd = true;

      // สถานะ 2: พร้อมกด
      if (READ_TIMER_PASSED) {
        btn.disabled = false;
      }
    }
  });

  // ⏱️ เวลาอ่านขั้นต่ำ 10 วินาที
  setTimeout(() => {
    READ_TIMER_PASSED = true;

    if (scrolledToEnd) {
      btn.disabled = false; // สถานะ 2
    }
  }, 3000);

  btn.onclick = () => {
    // safety guard
    if (!READ_TIMER_PASSED || !scrolledToEnd) return;

    // 🔄 สถานะ 3: กำลังทำงาน
    setButtonLoading(btn, "กำลังบันทึก");
    btn.disabled = true;

    setTimeout(() => {
      // ✅ ยืนยันว่าอ่านแล้ว
      HAS_READ_PDPA = true;

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
    if (res?.access_token) {
      ACCESS_TOKEN = res.access_token;
    }

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

    // 1️⃣ เรียก backend ถอนความยินยอม
    await callFn("revoke_consent", {
      line_user_id: profile.userId,
    });

    // 2️⃣ 🔥 อัปเดต state ฝั่ง frontend (คงโครงเดิม)
    CURRENT_CUSTOMER = {
      ...CURRENT_CUSTOMER,
      consent_status: "revoked",
      consent_version: null,
    };

    HAS_READ_PDPA = false;
    READ_TIMER_PASSED = false;

    // 3️⃣ แจ้งผู้ใช้ + logout + ปิด LIFF
    showAlertModal(
      "ถอนความยินยอมแล้ว",
      "ระบบได้บันทึกการถอนความยินยอมเรียบร้อย\nคุณจะไม่สามารถใช้งานระบบได้",
      () => {
        try {
          liff.logout(); // 🔑 FIX 3: ตัด LINE session
        } catch (e) {
          // ป้องกัน error กรณี environment บางแบบ
        }
        liff.closeWindow(); // 🚪 ปิด LIFF
      }
    );

  } catch (err) {
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถถอนความยินยอมได้"
    );
  }
}

function showConfirmModal(title, message, onConfirm) {
  openModal(`
    <h4>${title}</h4>
    <p style="white-space:pre-line">${message}</p>

    <!-- ปุ่มหลัก -->
    <button class="primary-btn" id="confirmBtn">
      ยืนยันทำรายการ
    </button>

    <!-- ปุ่มรอง -->
    <button
      class="secondary-btn"
      id="cancelBtn"
      style="margin-top:10px"
    >
      ยกเลิกทำรายการ
    </button>
  `);

  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  cancelBtn.onclick = closeModal;

  confirmBtn.onclick = () => {
    // 🔒 lock + loading
    setButtonLoading(confirmBtn, "กำลังดำเนินการ");
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;

    // เรียก action จริง
    onConfirm();
  };
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