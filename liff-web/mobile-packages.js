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

        <button class="menu-tile" onclick="openGameTopup()">
  <div class="tile-icon">🎮</div>
  <div class="tile-text">เติมเกม</div>
</button>

<button class="menu-tile disabled" disabled>
  <div class="tile-icon">📱</div>
  <div class="tile-text">มือถือ/อุปกรณ์เสริม<br><small>เร็ว ๆ นี้</small></div>
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
หน้า “กรอกเบอร์โทร” PAGES
========================= */
function openMobilePackagePage() {
  CURRENT_PHONE = null;
  CURRENT_MOBILE_PACKAGE = null;

  renderCard(`
    <div class="app-page">

      <div class="top-bar">
        <button class="back-btn" onclick="goBackSmart()">←</button>
        <div class="top-title">ต่อแพ็กเน็ต</div>
      </div>

      <div class="section-card">

        <label style="font-size:14px">เบอร์โทรศัพท์</label>
        <input
          id="mobilePhoneInput"
          inputmode="numeric"
          maxlength="10"
          placeholder="กรอกเบอร์โทร 10 หลัก"
          style="
            width:100%;
            height:44px;
            border-radius:10px;
            border:1px solid #e5e7eb;
            padding:0 12px;
            font-size:16px;
            margin-top:6px;
          "
        />

        <button
          class="primary-btn"
          style="margin-top:16px"
          onclick="submitPhoneForPackage()"
        >
          ดำเนินการต่อ
        </button>

      </div>
    </div>
  `);
}
//ตรวจแพ็กเกจจากเบอร์
async function submitPhoneForPackage() {
  const phone = document.getElementById("mobilePhoneInput").value.trim();

  if (!/^\d{10}$/.test(phone)) {
    showAlertModal("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเบอร์โทร 10 หลัก");
    return;
  }

  try {
    const res = await callFn("get_mobile_packages_by_phone", { phone });

    if (res.packages && res.packages.length > 0) {
      // ✅ พบแพ็กเกจ
      CURRENT_PHONE = phone;
      CURRENT_MOBILE_PACKAGE = res.packages[0];
      openMobilePackageDetail();
    } else {
      // ❌ ไม่พบแพ็กเกจ
      openNoPackageFound(phone);
    }

  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message);
  }
}
//หน้า “พบแพ็กเกจ” (แค่แสดงรายละเอียดก่อน)
function openMobilePackageDetail() {
  const p = CURRENT_MOBILE_PACKAGE;

  renderCard(`
    <div class="app-page">

      <div class="top-bar">
        <button class="back-btn" onclick="openMobilePackagePage()">←</button>
        <div class="top-title">รายละเอียดแพ็กเกจ</div>
      </div>

      <div class="section-card">

        <div style="font-size:18px;font-weight:700">
          ${p.package_name}
        </div>

        <div style="margin-top:6px;color:#6b7280">
          ${p.package_detail || "-"}
        </div>

        <div style="margin-top:12px;font-weight:600">
          ราคา ${Number(p.price).toLocaleString()} บาท
        </div>

        <div style="margin-top:6px;font-size:13px;color:#6b7280">
          ระยะเวลา ${p.duration_days} วัน
        </div>

      </div>
    </div>
  `);
}
//หน้า “ไม่พบแพ็กเกจ”
function openNoPackageFound(phone) {
  renderCard(`
    <div class="app-page">

      <div class="top-bar">
        <button class="back-btn" onclick="openMobilePackagePage()">←</button>
        <div class="top-title">ไม่พบแพ็กเกจ</div>
      </div>

      <div class="section-card" style="text-align:center">

        <p style="font-size:15px">
          ไม่พบแพ็กเกจของหมายเลข<br>
          <strong>${maskPhone(phone)}</strong>
        </p>

        <p style="font-size:14px;color:#6b7280;margin-top:8px">
          กรุณาส่งคำขอให้ร้านค้าตรวจโปรเน็ตของท่าน
        </p>

        <button
          class="primary-btn"
          style="margin-top:16px"
          onclick="submitPackageRequest('${phone}')"
        >
          ส่งคำขอ
        </button>

        <button
          class="menu-btn secondary"
          style="margin-top:10px;width:100%"
          onclick="openMobilePackagePage()"
        >
          ยกเลิก
        </button>

      </div>
    </div>
  `);
}
//ส่งคำขอ →
async function submitPackageRequest(phone) {
  try {
    const profile = await getLineProfileSafe();

    await callFn("request_mobile_package_review", {
      phone,
      line_user_id: profile?.userId || null,
      customer_id: CURRENT_CUSTOMER?.customer_id || null,
    });

    showAlertModal(
      "ส่งคำขอสำเร็จ",
      `ส่งคำขอเช็คโปรเน็ตหมายเลข ${maskPhone(phone)} เรียบร้อยแล้ว
ร้านจะทำการบันทึกโปรของท่านภายใน 1 ชั่วโมง
สามารถดูผลคำขอได้ที่ “คำขอของฉัน”`,
      () => openTopupHomePage()
    );

  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message);
  }
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