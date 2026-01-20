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
      showLoginConsentPage();
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
ยอมรับเงือนไข
========================= */
/* =========================
CONSENT PAGE (PDPA)
========================= */

function showLoginConsentPage() {
  renderCard(`
    <div class="app-page">

      <!-- Top Bar -->
      <div class="top-bar">
        <button class="back-btn" onclick="openTopupHomePage()">←</button>
        <div class="top-title">นโยบายความเป็นส่วนตัว</div>
      </div>

      <!-- Content -->
      <div class="section-card" style="margin-bottom:16px">

        <p style="font-size:14px;line-height:1.6">
          KPOS ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
          ระบบจำเป็นต้องขอความยินยอมในการเก็บ ใช้ และประมวลผลข้อมูล
          เพื่อให้สามารถให้บริการได้อย่างถูกต้องและปลอดภัย
          ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </p>

        <h4 style="margin-top:16px">ข้อมูลที่ระบบจะเข้าถึง</h4>
        <ul style="font-size:14px;line-height:1.6;padding-left:18px">
          <li>LINE User ID</li>
          <li>ชื่อโปรไฟล์</li>
          <li>รูปโปรไฟล์</li>
        </ul>

        <h4 style="margin-top:16px">วัตถุประสงค์ในการใช้ข้อมูล</h4>
        <ul style="font-size:14px;line-height:1.6;padding-left:18px">
          <li>ยืนยันตัวตนผู้ใช้งาน</li>
          <li>ให้บริการของร้าน (เช่น เติมแพ็กเกจ / ประวัติการทำรายการ)</li>
          <li>แจ้งเตือนสถานะรายการและบิล</li>
          <li>ติดต่อให้ข้อมูลเกี่ยวกับบริการ</li>
        </ul>

        <p style="font-size:14px;line-height:1.6;margin-top:16px">
          ท่านสามารถขอเข้าถึง แก้ไข หรือถอนความยินยอมได้
          โดยติดต่อร้านค้าที่ท่านใช้บริการในภายหลัง
        </p>

        <div style="margin-top:16px">
          <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px">
            <input
              type="checkbox"
              id="consentCheckbox"
              onchange="toggleConsentAcceptBtn()"
            />
            <span>
              ข้าพเจ้ายินยอมให้ KPOS เก็บ ใช้ และประมวลผลข้อมูลส่วนบุคคล
              ตามนโยบายความเป็นส่วนตัว
            </span>
          </label>
        </div>

      </div>

      <!-- Actions -->
      <button
        class="primary-btn"
        id="consentAcceptBtn"
        disabled
        style="margin-bottom:10px"
        onclick="acceptLoginConsent()"
      >
        ยินยอมและใช้งานต่อ
      </button>

      <button
        class="secondary-btn"
        onclick="openTopupHomePage()"
      >
        ไม่ยินยอม
      </button>

    </div>
  `);
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