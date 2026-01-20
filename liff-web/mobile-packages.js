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
AUTH HELPERS
========================= */

async function isLineLoggedIn() {
  try {
    const profile = await liff.getProfile();
    return !!profile?.userId;
  } catch {
    return false;
  }
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

function handleLoginLogout() {
  isLineLoggedIn().then((loggedIn) => {
    if (!loggedIn) {
      liff.login();
    } else {
      liff.logout();
      location.reload();
    }
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
  if (CURRENT_CUSTOMER?.name) {
    ENTRY_CONTEXT = "member";
  } else {
    ENTRY_CONTEXT = "guest";
  }

  const loggedIn = await isLineLoggedIn();
  const isMember = ENTRY_CONTEXT === "member" && CURRENT_CUSTOMER?.name;

  renderCard(`
    <div class="app-page home-page">

      <!-- Header -->
      <div class="home-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="home-avatar">👤</div>
          <div>
            <div style="font-size:16px;font-weight:600">
              ${isMember ? CURRENT_CUSTOMER.name : "Guest"}
            </div>
            <div style="font-size:13px;color:#6b7280">
              ${isMember ? "ยินดีต้อนรับ" : "สมัครสมาชิกเพื่อใช้งานเต็มรูปแบบ"}
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

  if (ENTRY_CONTEXT === "member" && loggedIn) {
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