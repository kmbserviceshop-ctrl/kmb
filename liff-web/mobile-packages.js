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
 */
function openGuestHomePage() {
  ENTRY_CONTEXT = "guest";

  renderCard(`
    <div class="top-bar">
      <div class="top-title">KPOS Connect</div>
    </div>

    <div class="section-card">
      <div style="font-size:18px;font-weight:600">
        ยินดีต้อนรับ
      </div>
      <div style="font-size:14px;color:#6b7280;margin-top:6px">
        กรุณาเลือกทำรายการ
      </div>
    </div>

    <div class="section-card">
      <button class="primary-btn" onclick="openMobilePackagePage()">
        ➕ เพิ่มเบอร์ใหม่ (ตรวจสอบแพ็กเกจ)
      </button>

      <button
        class="menu-btn secondary"
        style="margin-top:10px"
        onclick="openAddonPackagePage?.()"
      >
        ⚡ เพิ่มความเร็ว / แพ็กเสริม
      </button>
    </div>

    <div class="section-card">
      <div class="menu-title">เบอร์ที่เคยใช้</div>
      <div id="guestPhoneList" style="margin-top:10px">
        <div style="font-size:13px;color:#9ca3af">
          กำลังโหลดรายการ...
        </div>
      </div>
    </div>
  `);

  loadGuestPhoneList();
}

async function loadGuestPhoneList() {
  const container = document.getElementById("guestPhoneList");
  if (!container) return;

  try {
    const result = await callFn("get_guest_mobile_packages", {
      line_user_id: CURRENT_CUSTOMER?.line_user_id || null,
    });

    const list = result?.packages || [];

    if (list.length === 0) {
      container.innerHTML = `
        <div style="font-size:13px;color:#9ca3af">
          ยังไม่มีเบอร์ที่เคยทำรายการ
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(renderGuestPhoneCard).join("");
  } catch (err) {
    container.innerHTML = `
      <div style="font-size:13px;color:#ef4444">
        ไม่สามารถโหลดข้อมูลได้
      </div>
    `;
  }
}

/**
 * เปิดหน้า "เติมแพ็กเกจเน็ต"
 */
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
UI HELPERS
========================= */

function maskPhone(phone) {
  if (!phone || phone.length < 9) return phone;
  return phone.replace(/^(\d{3})\d{4}(\d{2})$/, "$1-×××-$2");
}

function renderGuestPhoneCard(pkg) {
  return `
    <div
      class="bill-card"
      style="cursor:pointer"
      onclick="renderPackageList([${JSON.stringify(pkg).replace(/"/g, '&quot;')}])"
    >
      <div style="display:flex;justify-content:space-between">
        <div style="font-weight:600">
          ${maskPhone(pkg.phone)}
        </div>
        <div style="font-size:12px;color:#2563eb">
          ${pkg.limit_type || ""}
        </div>
      </div>

      <div style="font-size:13px;color:#6b7280;margin-top:4px">
        Package ${pkg.price} บาท (${pkg.duration_days} วัน)
      </div>

      <div style="font-size:13px;color:#374151;margin-top:2px">
        ${pkg.package_detail || ""}
      </div>
    </div>
  `;
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
      line_user_id: profile.userId,   // ✅ แก้จุดเดียวที่ผิด
      customer_id: null,              // guest ต้องเป็น null
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