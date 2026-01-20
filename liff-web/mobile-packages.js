/* =========================
MOBILE PACKAGES (TOPUP)
========================= */

/**
 * State เฉพาะระบบเติมแพ็กเกจ
 */
let CURRENT_MOBILE_PACKAGE = null;
let CURRENT_PHONE = null;

/**
 * context การเข้า flow
 * guest | member
 */
let ENTRY_CONTEXT = "guest";

/* =========================
NAVIGATION HELPERS
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

function openTopupHomePage() {
  if (CURRENT_CUSTOMER?.name) {
    ENTRY_CONTEXT = "member";
  } else {
    ENTRY_CONTEXT = "guest";
  }

  const isMember = ENTRY_CONTEXT === "member" && CURRENT_CUSTOMER?.name;

  renderCard(`
    <div class="app-page home-page">

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
        <div class="home-avatar">🔔</div>
      </div>

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

      <div class="menu-grid" style="margin-top:18px">
        <button class="menu-tile active" onclick="openMobilePackagePage()">
          <div class="tile-icon">📶</div>
          <div class="tile-text">ต่อแพ็กเน็ต</div>
        </button>
      </div>

      <div class="section-card" style="margin-top:20px">
        <div class="menu-title">ประวัติคำขอ</div>
        <div class="divider"></div>
        <div id="guestPhoneList" style="font-size:13px;color:#9ca3af">
          กำลังโหลดข้อมูล...
        </div>
      </div>
    </div>
  `);

  if (ENTRY_CONTEXT === "member") {
    loadMyPackageRequests();
  }
}

function openGuestHomePage() {
  openTopupHomePage();
}

/* =========================
LOAD REQUEST HISTORY
========================= */

async function loadMyPackageRequests() {
  const container = document.getElementById("guestPhoneList");
  if (!container) return;

  try {
    const profile = await liff.getProfile();
    const result = await callFn("get_my_mobile_package_requests", {
      line_user_id: profile.userId,
    });

    const list = result?.requests || [];
    if (list.length === 0) {
      container.innerHTML = `<div style="color:#9ca3af">ยังไม่มีคำขอ</div>`;
      return;
    }

    container.innerHTML = list.map(renderMyRequestCard).join("");
  } catch {
    container.innerHTML = `<div style="color:#ef4444">โหลดข้อมูลไม่ได้</div>`;
  }
}

function renderMyRequestCard(req) {
  const map = {
    pending: "รอร้านตรวจสอบ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่ผ่าน",
  };

  return `
    <div class="bill-card">
      <div style="font-weight:600">${req.phone}</div>
      <div style="font-size:12px;color:#6b7280">
        ${map[req.status] || req.status}
      </div>
    </div>
  `;
}

/* =========================
OPEN TOPUP FLOW
========================= */

function openMobilePackagePage() {
  CURRENT_PHONE = null;
  CURRENT_MOBILE_PACKAGE = null;

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="goBackSmart()">←</button>
      <div class="top-title">เติมแพ็กเกจเน็ต</div>
    </div>

    <div class="section-card">
      <input
        id="topupPhone"
        placeholder="กรอกเบอร์โทรศัพท์"
        style="width:100%;padding:12px"
      />
      <button class="primary-btn" style="margin-top:14px"
        onclick="searchMobilePackage(this)">
        ตรวจสอบแพ็กเกจ
      </button>
    </div>
  `);
}

/* =========================
SEARCH PACKAGE
========================= */

async function searchMobilePackage(btn) {
  const phone = document.getElementById("topupPhone").value.trim();
  if (!/^[0-9]{9,10}$/.test(phone)) {
    showAlertModal("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเบอร์ให้ถูกต้อง");
    return;
  }

  CURRENT_PHONE = phone;
  setButtonLoading(btn, "กำลังตรวจสอบ");

  try {
    const result = await callFn("get_mobile_packages_by_phone", { phone });
    const packages = result.packages || [];

    if (packages.length === 0) {
      renderNoPackageFound(phone);
    } else {
      renderPackageList(packages);
    }
  } catch (err) {
    showAlertModal("ผิดพลาด", err.message);
  } finally {
    resetButton(btn, "ตรวจสอบแพ็กเกจ");
  }
}

/* =========================
NO PACKAGE
========================= */

function renderNoPackageFound(phone) {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMobilePackagePage()">←</button>
      <div class="top-title">ไม่พบแพ็กเกจ</div>
    </div>

    <div class="section-card">
      เบอร์ ${phone} ยังไม่มีแพ็กเกจในระบบ
      <button class="primary-btn" style="margin-top:16px"
        onclick="openPackageRequestConsent()">
        ส่งคำขอให้ร้านตรวจสอบ
      </button>
    </div>
  `);
}

/* =========================
REQUEST REVIEW
========================= */

function openPackageRequestConsent() {
  renderCard(`
    <div class="section-card">
      <input type="checkbox" id="pkgConsentCheck" />
      ยินยอมให้ร้านตรวจสอบข้อมูล
      <button class="primary-btn" style="margin-top:16px"
        onclick="confirmRequestPackageReview()">
        ยืนยัน
      </button>
    </div>
  `);
}

async function confirmRequestPackageReview() {
  if (!document.getElementById("pkgConsentCheck").checked) {
    showAlertModal("กรุณายินยอม", "ต้องยินยอมก่อน");
    return;
  }

  const profile = await liff.getProfile();
  await callFn("request_mobile_package_review", {
    phone: CURRENT_PHONE,
    line_user_id: profile.userId,
    customer_id: null,
  });

  showAlertModal(
    "ส่งคำขอแล้ว",
    "ร้านจะตรวจสอบแพ็กเกจให้",
    goBackSmart
  );
}

/* =========================
PACKAGE LIST
========================= */

function renderPackageList(packages) {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMobilePackagePage()">←</button>
      <div class="top-title">เลือกแพ็กเกจ</div>
    </div>

    <div class="section-card">
      ${packages.map(pkg => `
        <div class="bill-card"
          onclick="confirmSelectPackage(${JSON.stringify(pkg).replace(/"/g, '&quot;')})">
          <div style="font-weight:600">${pkg.package_name}</div>
          <div>${pkg.price} บาท / ${pkg.duration_days} วัน</div>
        </div>
      `).join("")}
    </div>
  `);
}

/* =========================
FINAL CONFIRM (NO PAYMENT)
========================= */

function confirmSelectPackage(pkg) {
  CURRENT_MOBILE_PACKAGE = pkg;

  showAlertModal(
    "รับคำขอเรียบร้อย",
    `
    ร้านได้รับคำขอแพ็กเกจแล้ว<br/><br/>
    <strong>${pkg.package_name}</strong><br/>
    ${pkg.price} บาท / ${pkg.duration_days} วัน<br/><br/>
    กรุณารอร้านตรวจสอบ
    `,
    goBackSmart
  );
}