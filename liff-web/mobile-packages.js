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

function showLoginConsent() {
  showAlertModal(
    "ยินยอมการใช้งาน",
    `
    ระบบจำเป็นต้องขออนุญาตเข้าถึงข้อมูลต่อไปนี้:<br/><br/>
    • LINE User ID<br/>
    • ชื่อโปรไฟล์<br/>
    • รูปโปรไฟล์<br/><br/>
    เพื่อความปลอดภัยและการให้บริการของร้าน
    `,
    () => {
      liff.login();
    }
  );
}

function handleLoginLogout() {
  isLineLoggedIn().then((loggedIn) => {
    if (!loggedIn) {
      showLoginConsent();
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