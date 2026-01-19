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
    openGuestHomePage();
  }
}

/* =========================
ENTRY POINT
========================= */

/**
 * หน้า Home สำหรับลูกค้าขาจร
 * UI ต้องเหมือน member แต่จำกัดสิทธิ์
 */
function openGuestHomePage() {
  ENTRY_CONTEXT = "guest";

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

      <!-- Profile Card (guest) -->
      <div class="section-card">
        <div class="member-name">ลูกค้าขาจร</div>
        <div class="member-phone">กรุณาเลือกทำรายการ</div>
      </div>

      <!-- Menu Grid -->
      <div class="menu-grid">

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">📄</div>
          <div class="tile-text">บิลของฉัน</div>
        </button>

        <button class="menu-tile active" onclick="openMobilePackagePage()">
          <div class="tile-icon">📶</div>
          <div class="tile-text">เติมแพ็กเกจ</div>
        </button>

        <button class="menu-tile disabled" disabled>
          <div class="tile-icon">📦</div>
          <div class="tile-text">รายการอื่น</div>
        </button>

        <button class="menu-tile disabled" disabled>
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

      <!-- รายการคำขอ -->
      <div class="section-card" style="margin-top:16px">
        <div class="menu-title">รายการคำขอ</div>
        <div id="guestPhoneList" style="margin-top:10px">
          <div style="font-size:13px;color:#9ca3af">
            กำลังโหลดรายการ...
          </div>
        </div>
      </div>

    </div>
  `);

  loadMyPackageRequests();
}

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
      container.innerHTML = `
        <div style="font-size:13px;color:#9ca3af">
          ยังไม่มีคำขอที่ส่งไว้
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(renderMyRequestCard).join("");
  } catch (err) {
    container.innerHTML = `
      <div style="font-size:13px;color:#ef4444">
        ไม่สามารถโหลดรายการคำขอได้
      </div>
    `;
  }
}

/* =========================
RENDER REQUEST CARD (เพิ่มเท่านั้น)
========================= */

function renderMyRequestCard(req) {
  const statusMap = {
    pending: { text: "รอร้านตรวจสอบ", color: "#f59e0b" },
    approved: { text: "อนุมัติแล้ว", color: "#16a34a" },
    rejected: { text: "ไม่ผ่านการอนุมัติ", color: "#dc2626" },
  };

  const status = statusMap[req.status] || {
    text: req.status,
    color: "#6b7280",
  };

  return `
    <div class="bill-card">
      <div style="display:flex;justify-content:space-between">
        <div style="font-weight:600">${req.phone}</div>
        <div style="font-size:12px;color:${status.color}">
          ${status.text}
        </div>
      </div>

      <div style="font-size:13px;color:#6b7280;margin-top:6px">
        ส่งคำขอเมื่อ ${new Date(req.created_at).toLocaleDateString("th-TH")}
      </div>
    </div>
  `;
}

/* =========================
OPEN TOPUP FLOW
========================= */

function openMobilePackagePage() {
  CURRENT_MOBILE_PACKAGE = null;
  CURRENT_PHONE = null;

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="goBackSmart()">←</button>
      <div class="top-title">เติมแพ็กเกจเน็ต</div>
    </div>

    <div class="section-card">
      <div class="menu-title">กรอกเบอร์โทรศัพท์</div>

      <input
        id="topupPhone"
        type="tel"
        placeholder="เช่น 0612345678"
        style="width:100%;padding:12px;border-radius:10px;border:1px solid #e5e7eb"
      />

      <button
        class="primary-btn"
        style="margin-top:14px"
        onclick="searchMobilePackage(this)"
      >
        🔍 ตรวจสอบแพ็กเกจ
      </button>
    </div>
  `);
}

/* =========================
STEP 1 : SEARCH PACKAGE
========================= */

async function searchMobilePackage(btn) {
  const phone = document.getElementById("topupPhone")?.value?.trim();

  if (!phone || !/^[0-9]{9,10}$/.test(phone)) {
    showAlertModal("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
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
    showAlertModal(
      "เกิดข้อผิดพลาด",
      err.message || "ไม่สามารถตรวจสอบข้อมูลได้"
    );
  } finally {
    resetButton(btn, "🔍 ตรวจสอบแพ็กเกจ");
  }
}

/* =========================
NO PACKAGE FOUND
========================= */

function renderNoPackageFound(phone) {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMobilePackagePage()">←</button>
      <div class="top-title">ไม่พบข้อมูลแพ็กเกจ</div>
    </div>

    <div class="section-card">
      <p style="font-size:14px;color:#374151;line-height:1.6">
        เบอร์ <strong>${phone}</strong><br/>
        ยังไม่มีแพ็กเกจที่ร้านบันทึกไว้ในระบบ
      </p>

      <div style="font-size:13px;color:#6b7280;margin-top:10px">
        กรุณาส่งคำขอให้ร้านตรวจสอบแพ็กเกจ
      </div>

      <button
        class="primary-btn"
        style="margin-top:16px"
        onclick="openPackageRequestConsent()"
      >
        📩 ส่งคำขอให้ร้านตรวจสอบแพ็กเกจ
      </button>

      <button
        class="menu-btn secondary"
        style="margin-top:12px"
        onclick="openMobilePackagePage()"
      >
        ← กลับไปตรวจสอบใหม่
      </button>
    </div>
  `);
}

/* =========================
CONSENT REQUEST
========================= */

function openPackageRequestConsent() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="renderNoPackageFound(CURRENT_PHONE)">←</button>
      <div class="top-title">ขอความยินยอม</div>
    </div>

    <div class="section-card">
      <div style="font-size:14px;color:#374151;line-height:1.6">
        ร้านจำเป็นต้องตรวจสอบข้อมูลแพ็กเกจ
        และบันทึกประวัติการทำรายการของเบอร์นี้
      </div>

      <div style="margin-top:16px">
        <input type="checkbox" id="pkgConsentCheck" />
        <label for="pkgConsentCheck" style="font-size:14px">
          ยินยอมให้ร้านตรวจสอบและบันทึกข้อมูล
        </label>
      </div>

      <button
        class="primary-btn"
        style="margin-top:16px"
        onclick="confirmRequestPackageReview()"
      >
        ยืนยันส่งคำขอ
      </button>

      <button
        class="menu-btn secondary"
        style="margin-top:10px"
        onclick="renderNoPackageFound(CURRENT_PHONE)"
      >
        ยกเลิก
      </button>
    </div>
  `);
}

async function confirmRequestPackageReview() {
  const checked = document.getElementById("pkgConsentCheck")?.checked;
  if (!checked) {
    showAlertModal("กรุณายินยอม", "กรุณายินยอมก่อนส่งคำขอ");
    return;
  }

  try {
    const profile = await liff.getProfile(); // ⭐ ใช้ LINE จริงใน guest flow

    await callFn("request_mobile_package_review", {
      phone: CURRENT_PHONE,
      line_user_id: profile.userId,
      customer_id: null,
    });

    showAlertModal(
      "ส่งคำขอสำเร็จ",
      "ร้านจะตรวจสอบแพ็กเกจให้คุณ\nเมื่อบันทึกแล้วคุณจะสามารถกลับมาเติมได้",
      () => goBackSmart()
    );
  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message);
  }
}

/* =========================
PACKAGE LIST
========================= */

function renderPackageList(packages) {
  const items = packages.map((pkg) => `
    <div
      class="bill-card"
      onclick="confirmPackage(${JSON.stringify(pkg).replace(/"/g, '&quot;')})"
      style="cursor:pointer"
    >
      <div style="font-weight:600">${pkg.package_name}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">
        ${pkg.package_detail || ""}
      </div>
      <div style="margin-top:6px;font-weight:600">
        ${pkg.price} บาท / ${pkg.duration_days} วัน
      </div>
    </div>
  `).join("");

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMobilePackagePage()">←</button>
      <div class="top-title">เลือกแพ็กเกจ</div>
    </div>

    <div class="section-card">
      ${items}
    </div>
  `);
}

/* =========================
CONFIRM & PAYMENT
========================= */

function confirmPackage(pkg) {
  CURRENT_MOBILE_PACKAGE = pkg;

  showAlertModal(
    "ยืนยันการเติมแพ็กเกจ",
    `กรุณายืนยันแพ็กเกจที่ใช้งานอยู่\n\n${pkg.package_name}\n${pkg.price} บาท`,
    () => openPackagePayment()
  );
}

function openPackagePayment() {
  showAlertModal(
    "ขั้นตอนถัดไป",
    "จะแสดง QR ชำระเงิน\nและรอร้านเติมแพ็กเกจให้ลูกค้า"
  );
}

/* =========================
PROTECT MANUAL
========================= */

function openManualPackageForm() {
  showAlertModal(
    "ไม่สามารถทำรายการได้",
    "การบันทึกแพ็กเกจทำได้เฉพาะพนักงานร้านเท่านั้น"
  );
}

function saveManualPackage() {
  showAlertModal(
    "ไม่สามารถทำรายการได้",
    "การบันทึกแพ็กเกจทำได้เฉพาะพนักงานร้านเท่านั้น"
  );
}