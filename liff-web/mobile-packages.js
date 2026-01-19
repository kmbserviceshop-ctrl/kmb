/* =========================
MOBILE PACKAGES (TOPUP)
========================= */

/**
 * State เฉพาะระบบเติมแพ็กเกจ
 */
let CURRENT_MOBILE_PACKAGE = null;
let CURRENT_PHONE = null;

/* =========================
ENTRY POINT
========================= */

/**
 * เปิดหน้า "เติมแพ็กเกจเน็ต"
 * เรียกจาก main.js
 */
function openMobilePackagePage() {
  CURRENT_MOBILE_PACKAGE = null;
  CURRENT_PHONE = null;

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="goHome()">←</button>
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

/**
 * ร้านกรอกเบอร์ → เช็คว่ามีแพ็กที่เคยบันทึกไว้หรือไม่
 */
async function searchMobilePackage(btn) {
  const phone = document.getElementById("topupPhone")?.value?.trim();

  if (!phone || !/^[0-9]{9,10}$/.test(phone)) {
    showAlertModal("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
    return;
  }

  CURRENT_PHONE = phone;
  setButtonLoading(btn, "กำลังตรวจสอบ");

  try {
    // TODO: ต่อ backend function
    // const result = await callFn("get_mobile_package_by_phone", { phone });

    // MOCK ชั่วคราว
    const result = {
      found: false,
      packages: [],
    };

    if (!result.found) {
      renderNoPackageFound(phone);
    } else {
      renderPackageList(result.packages);
    }

  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message || "ไม่สามารถตรวจสอบข้อมูลได้");
  } finally {
    resetButton(btn, "🔍 ตรวจสอบแพ็กเกจ");
  }
}

/* =========================
UI STATES
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
        ยังไม่เคยมีการบันทึกแพ็กเกจไว้ในระบบ
      </p>

      <button
        class="primary-btn secondary-btn"
        style="margin-top:16px"
        onclick="openManualPackageForm()"
      >
        ➕ บันทึกแพ็กเกจใหม่
      </button>
    </div>
  `);
}

function renderPackageList(packages) {
  const items = packages.map((pkg) => `
    <div
      class="bill-card"
      onclick="confirmPackage('${pkg.id}')"
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
STEP 2 : CONFIRM
========================= */

function confirmPackage(packageId) {
  // TODO: ดึง package detail จาก list / backend
  CURRENT_MOBILE_PACKAGE = { id: packageId };

  showAlertModal(
    "ยืนยันการเติมแพ็กเกจ",
    "กรุณายืนยันว่าเป็นแพ็กเกจที่ลูกค้าใช้งานอยู่",
    () => openPackagePayment()
  );
}

/* =========================
STEP 3 : PAYMENT
========================= */

function openPackagePayment() {
  // reuse payment flow เดิมในอนาคต
  showAlertModal(
    "ขั้นตอนถัดไป",
    "จะแสดง QR ชำระเงิน และรอร้านเติมแพ็กเกจ",
  );
}

/* =========================
MANUAL INPUT (ร้านกรอกเอง)
========================= */

function openManualPackageForm() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="openMobilePackagePage()">←</button>
      <div class="top-title">บันทึกแพ็กเกจ</div>
    </div>

    <div class="section-card">
      <input placeholder="ชื่อแพ็กเกจ" />
      <input placeholder="รายละเอียดแพ็กเกจ" style="margin-top:10px" />
      <input placeholder="ราคา (บาท)" type="number" style="margin-top:10px" />

      <button
        class="primary-btn"
        style="margin-top:14px"
        onclick="saveManualPackage()"
      >
        💾 บันทึกแพ็กเกจ
      </button>
    </div>
  `);
}

function saveManualPackage() {
  showAlertModal("ยังไม่เปิดใช้งาน", "ฟังก์ชันนี้จะทำในขั้นถัดไป");
}