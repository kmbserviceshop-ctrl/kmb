/* =========================
MOBILE PACKAGES (TOPUP)
========================= */

let CURRENT_MOBILE_PACKAGE = null;
let CURRENT_PHONE = null;

/**
 * guest | member
 */
let ENTRY_CONTEXT = "guest";

/* =========================
LINE AUTH + CONSENT
========================= */

async function getLineProfileSafe() {
  try {
    return await liff.getProfile();
  } catch {
    return null;
  }
}

async function isLineLoggedIn() {
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}

function handleLoginLogout() {
  isLineLoggedIn().then((loggedIn) => {
    if (!loggedIn) {
      openConsentPage();
    } else {
      liff.logout();
      location.reload();
    }
  });
}

function requireLogin(action) {
  isLineLoggedIn().then((loggedIn) => {
    if (!loggedIn) {
      showAlertModal(
        "กรุณาล็อกอิน",
        "กรุณาล็อกอิน LINE เพื่อใช้บริการ"
      );
      return;
    }
    action();
  });
}

/* =========================
NAVIGATION
========================= */

function goBackSmart() {
  if (ENTRY_CONTEXT === "member") {
    showMemberMenu(CURRENT_CUSTOMER);
  } else {
    openTopupHomePage();
  }
}

/* =========================
TOPUP HOME
========================= */

async function openTopupHomePage() {
  const loggedIn = await isLineLoggedIn();
  const profile = loggedIn ? await getLineProfileSafe() : null;

  ENTRY_CONTEXT = CURRENT_CUSTOMER?.name ? "member" : "guest";

  const displayName = profile?.displayName || "Guest";
  const avatarUrl = profile?.pictureUrl || "";

  renderCard(`
    <div class="app-page home-page">

      <!-- Header -->
      <div class="home-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="home-avatar">
            ${
              avatarUrl
                ? `<img src="${avatarUrl}" style="width:36px;height:36px;border-radius:50%" />`
                : "👤"
            }
          </div>
          <div>
            <div style="font-size:16px;font-weight:600">
              ${displayName}
            </div>
            <div style="font-size:13px;color:#6b7280">
              ${loggedIn ? "ยินดีต้อนรับ" : "สมัครสมาชิกเพื่อใช้งานเต็มรูปแบบ"}
            </div>
          </div>
        </div>

        <button
          class="icon-btn"
          onclick="handleLoginLogout()"
          title="${loggedIn ? "Logout" : "Login"}"
        >
          ${loggedIn ? "🚪" : "🔐"}
        </button>
      </div>

      <!-- Points -->
      <div style="
        margin-top:12px;
        background:linear-gradient(135deg,#111827,#000);
        color:#fff;
        border-radius:18px;
        padding:18px;
      ">
        <div style="font-size:22px;font-weight:700">0 Points</div>
        <div style="font-size:13px;opacity:.8">Redeem your points now!</div>
      </div>

      <!-- Menu -->
      <div class="menu-grid" style="margin-top:18px">

        <button class="menu-tile active"
          onclick="requireLogin(openMobilePackagePage)">
          <div class="tile-icon">📶</div>
          <div class="tile-text">ต่อแพ็กเน็ต</div>
        </button>

        <button class="menu-tile"
          onclick="requireLogin(showMyBills)">
          <div class="tile-icon">🧾</div>
          <div class="tile-text">บิลของฉัน</div>
        </button>

        <button class="menu-tile"
          onclick="requireLogin(showAddonPackage)">
          <div class="tile-icon">➕</div>
          <div class="tile-text">แพ็กเสริม</div>
        </button>

        <button class="menu-tile"
          onclick="requireLogin(showMyRequests)">
          <div class="tile-icon">📋</div>
          <div class="tile-text">คำขอของฉัน</div>
        </button>

      </div>

      <!-- History -->
      <div class="section-card" style="margin-top:20px">
        <div class="menu-title">ประวัติคำขอ</div>
        <div class="divider"></div>
        <div id="guestPhoneList" style="font-size:13px;color:#9ca3af">
          กำลังโหลดข้อมูล...
        </div>
      </div>

    </div>
  `);

  if (loggedIn && ENTRY_CONTEXT === "member") {
    loadMyPackageRequests();
  }
}

/* =========================
PLACEHOLDER PAGES
========================= */

function showMyBills() {
  showAlertModal("เร็ว ๆ นี้", "ระบบบิลของฉันกำลังพัฒนา");
}

function showAddonPackage() {
  showAlertModal("เร็ว ๆ นี้", "ระบบแพ็กเสริมกำลังพัฒนา");
}

function showMyRequests() {
  showAlertModal("เร็ว ๆ นี้", "ระบบคำขอของฉันกำลังพัฒนา");
}

/* =========================
CONSENT PAGE (PDPA)
========================= */

function openConsentPage() {
  renderCard(`
    <div class="app-page" style="height:100vh;display:flex;flex-direction:column">

      <!-- Top Bar -->
      <div class="top-bar">
        <button class="back-btn" onclick="closeConsentPage()">←</button>
        <div class="top-title">ความเป็นส่วนตัว</div>
      </div>

      <div class="section-card"
        style="
          flex:1;
          display:flex;
          flex-direction:column;
          padding:0;
        "
      >

        <!-- 🔽 SCROLL เฉพาะตรงนี้ -->
        <div
          class="consent-scroll"
          style="
            padding:20px 18px;
            overflow-y:auto;
            -webkit-overflow-scrolling:touch;
            flex:1;
          "
        >
          <h3>การขอความยินยอมในการเก็บข้อมูลส่วนบุคคล</h3>

          <p>
            KPOS จำเป็นต้องใช้ข้อมูลของท่านเพื่อให้บริการ เช่น
            การฝากสินค้า การผ่อนสินค้า การแจ้งเตือนสถานะบิล
            และการติดต่อร้านค้า
          </p>

          <h4>ข้อมูลที่ระบบจะเข้าถึง</h4>
          <ul>
            <li>LINE User ID</li>
            <li>ชื่อโปรไฟล์</li>
            <li>รูปโปรไฟล์</li>
          </ul>

          <h4>วัตถุประสงค์ในการใช้ข้อมูล</h4>
          <ul>
            <li>ยืนยันตัวตนผู้ใช้งาน</li>
            <li>ให้บริการของร้าน (เช่น เติมแพ็กเกจ / ประวัติการทำรายการ)</li>
            <li>แจ้งเตือนสถานะรายการและบิล</li>
            <li>ติดต่อให้ข้อมูลเกี่ยวกับบริการ</li>
          </ul>

          <p>
            ท่านสามารถขอเข้าถึง แก้ไข หรือถอนความยินยอมได้
            โดยติดต่อร้านค้าที่ท่านใช้บริการในภายหลัง
            ทั้งนี้เป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>

          <label style="display:flex;gap:10px;align-items:flex-start">
            <input
              type="checkbox"
              id="consentCheck"
              onchange="toggleConsentSubmit()"
            />
            <span>
              ข้าพเจ้ายินยอมให้ KPOS เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล
              ตามนโยบายความเป็นส่วนตัว
            </span>
          </label>
        </div>

        <!-- 🔒 ปุ่มตรึงล่าง (ไม่เลื่อน) -->
        <div style="padding:16px;border-top:1px solid #eceef1">
          <button
            class="primary-btn"
            id="consentSubmitBtn"
            disabled
            onclick="acceptConsentAndLogin()"
          >
            ยินยอมและใช้งานต่อ
          </button>

          <button
            class="menu-btn secondary"
            style="margin-top:10px"
            onclick="declineConsent()"
          >
            ไม่ยินยอม
          </button>
        </div>

      </div>
    </div>
  `);
}

/* =========================
CONSENT ACTIONS
========================= */

function toggleConsentSubmit() {
  const checked = document.getElementById("consentCheck").checked;
  document.getElementById("consentSubmitBtn").disabled = !checked;
}

function acceptConsentAndLogin() {
  // ตรงนี้ถ้าจะ log consent ลง backend ค่อยเพิ่ม
  liff.login();
}

function declineConsent() {
  // UX เดียวกับหน้าอื่น: ไม่บังคับ
  closeConsentPage();
}

function closeConsentPage() {
  openTopupHomePage();
}

function toggleConsentAcceptBtn() {
  const cb = document.getElementById("consentCheckbox");
  const btn = document.getElementById("consentAcceptBtn");
  btn.disabled = !cb.checked;
}

function acceptLoginConsent() {
  liff.login();
}

function toggleConsentButton() {
  const checkbox = document.getElementById("consentCheckbox");
  const btn = document.getElementById("consentAcceptBtn");
  btn.disabled = !checkbox.checked;
}

function acceptLoginConsent() {
  closeModal();
  liff.login();
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
}