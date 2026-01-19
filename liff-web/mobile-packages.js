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
 * ร้านกรอกเบอร์ → เช็คแพ็กเกจที่ร้านเคยบันทึกไว้
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
    // 🔗 เรียก backend จริง
    const result = await callFn(
      "get_mobile_packages_by_phone",
      { phone }
    );

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
UI STATES
========================= */

/**
 * ไม่พบแพ็กเกจ → ลูกค้าส่งคำขอให้ร้านตรวจสอบ
 */
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
        กรุณาส่งคำขอให้ร้านตรวจสอบแพ็กเกจ<br/>
        ก่อนทำรายการเติมเงิน
      </div>

      <!-- ปุ่มหลัก -->
      <button
        class="primary-btn"
        style="margin-top:16px"
        onclick="openPackageRequestConsent()"
      >
        📩 ส่งคำขอให้ร้านตรวจสอบแพ็กเกจ
      </button>

      <!-- ปุ่มรอง -->
      <button
        class="secondary-btn"
        style="margin-top:10px"
        onclick="openMobilePackagePage()"
      >
        ← กลับไปตรวจสอบใหม่
      </button>
    </div>
  `);
}
function openPackageRequestConsent() {
  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="renderNoPackageFound(CURRENT_PHONE)">←</button>
      <div class="top-title">ขอความยินยอม</div>
    </div>

    <div class="section-card">
      <div style="font-size:14px;color:#374151;line-height:1.6">
        ร้านจำเป็นต้องตรวจสอบข้อมูลแพ็กเกจจากระบบเครือข่าย
        และบันทึกประวัติการทำรายการของเบอร์นี้
      </div>

      <div style="font-size:13px;color:#6b7280;margin-top:10px">
        ข้อมูลที่ใช้:
        <ul style="padding-left:18px">
          <li>หมายเลขโทรศัพท์</li>
          <li>รายละเอียดแพ็กเกจ</li>
          <li>ประวัติการขอตรวจสอบ</li>
        </ul>
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
        class="secondary-btn"
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
    showAlertModal(
      "กรุณายินยอม",
      "กรุณายินยอมให้ร้านตรวจสอบข้อมูลก่อนส่งคำขอ"
    );
    return;
  }

  try {
    await callFn("request_mobile_package_review", {
      phone: CURRENT_PHONE,
      line_user_id: CURRENT_CUSTOMER?.line_user_id || null,
      customer_id: CURRENT_CUSTOMER?.customer_id || null,
    });

    showAlertModal(
      "ส่งคำขอสำเร็จ",
      "ร้านจะตรวจสอบแพ็กเกจให้คุณ\nเมื่อบันทึกแล้วคุณจะสามารถกลับมาเติมได้"
    );
  } catch (err) {
    showAlertModal("เกิดข้อผิดพลาด", err.message);
  }
}

/**
 * แสดงรายการแพ็กเกจที่ร้านเคยบันทึก
 */
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
STEP 2 : CONFIRM
========================= */

/**
 * ลูกค้ายืนยันแพ็กเกจที่ใช้อยู่
 */
function confirmPackage(pkg) {
  CURRENT_MOBILE_PACKAGE = pkg;

  showAlertModal(
    "ยืนยันการเติมแพ็กเกจ",
    `กรุณายืนยันแพ็กเกจที่ใช้งานอยู่\n\n${pkg.package_name}\n${pkg.price} บาท`,
    () => openPackagePayment()
  );
}

/* =========================
STEP 3 : PAYMENT
========================= */

/**
 * ขั้นถัดไป (จะ reuse payment.js)
 */
function openPackagePayment() {
  showAlertModal(
    "ขั้นตอนถัดไป",
    "จะแสดง QR ชำระเงิน\nและรอร้านเติมแพ็กเกจให้ลูกค้า"
  );
}

/* =========================
MANUAL INPUT (ร้านเท่านั้น)
========================= */

/**
 * กันไม่ให้ลูกค้าเรียกฟังก์ชันนี้
 * (เผื่อมีคนยิง JS ตรง)
 */
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