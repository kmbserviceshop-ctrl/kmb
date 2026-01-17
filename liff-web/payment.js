/* =========================
PAYMENT FLOW (A)
========================= */

let CURRENT_BILL = null;

// 🔹 QR ร้าน (ฐาน)
const SHOP_PROMPTPAY_QR =
  "00020101021130870016A00000067701011201150105546149531300220M00000000004284003820320S000000000000013142553037645802TH6304CAF8";

/* =========================
CRC16 (PromptPay)
========================= */
function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

/* =========================
GENERATE PROMPTPAY QR
========================= */
function generatePromptPayQR(baseQR, amountBaht) {
  if (!amountBaht || amountBaht <= 0) return baseQR;

  // แปลง บาท → สตางค์ (integer)
  const satang = Math.round(Number(amountBaht) * 100);
  const amt = String(satang);

  // ตัด CRC เดิม
  let qr = baseQR.replace(/6304[0-9A-F]{4}$/i, "");

  // ตัด field 54 เดิม (ถ้ามี)
  qr = qr.replace(/54\d{2}\d+$/, "");

  // สร้าง field 54 ใหม่
  const field54 = `54${amt.length.toString().padStart(2, "0")}${amt}`;

  // รวม payload + CRC
  const payload = `${qr}${field54}6304`;
  const crc = crc16(payload);

  return payload + crc;
}

function openPayment(bill) {
  CURRENT_BILL = bill;

  const item = bill.pawn_items || {};
  const dueDate = new Date(bill.due_date);
  const newDueDate = new Date(dueDate);
  newDueDate.setDate(newDueDate.getDate() + 15);

  // 🔥 แยกหน่วยให้ชัด
  const serviceFeeSatang = Number(bill?.service_fee ?? 0); // สตางค์ (ของจริง)
  const serviceFeeBaht = serviceFeeSatang / 100;          // บาท (ไว้แสดงผล)
  

  // ❗ QR รับ "บาท" แล้วไปแปลงเป็นสตางค์ข้างใน
  const qrData = generatePromptPayQR(SHOP_PROMPTPAY_QR, serviceFeeBaht);

  renderCard(`
    <div class="top-bar">
      <button class="back-btn" onclick="goBackToBills()">←</button>
      <div class="top-title">ต่ออายุบิล / ชำระค่างวด </div>
    </div>

    <div class="section-card">
      <h3>${item.brand || ""} ${item.model || ""}</h3>
      <p>ID : ${item.imei || item.sn || "-"}</p>

      <hr/>

      <div class="bill-row">
        <span>ครบกำหนดเดิม</span>
        <span>${formatPaymentDate(bill.due_date)}</span>
      </div>

      <div class="bill-row">
        <span>กำหนดใหม่</span>
        <span>${formatPaymentDate(newDueDate)}</span>
      </div>

      <div class="bill-row" style="font-weight:600">
        <span>ยอดต้องชำระ</span>
        <span>${serviceFeeSatang.toLocaleString()} บาท</span>
      </div>

      <hr style="opacity:.3"/>

      <div style="text-align:center;margin:20px 0">
        <div style="color:#888">สแกนเพื่อชำระค่าบริการQR</div>
        ${
          serviceFeeSatang > 0
            ? `<div id="qrBox" style="margin:10px auto;width:180px;height:180px"></div>`
            : `<div style="color:#aaa;margin-top:20px">ไม่มีค่าบริการ</div>`
        }
      </div>

      <input type="file" id="slipFile" accept="image/*"/>
      <button class="primary-btn" onclick="submitPawnPayment(this)">
  💳 ดำเนินการต่อ
</button>

    </div>
  `);

  if (serviceFeeSatang > 0) {
    const waitForQRCode = () => {
      if (typeof QRCode === "undefined") {
        setTimeout(waitForQRCode, 100);
        return;
      }
      const qrEl = document.getElementById("qrBox");
      if (!qrEl) return;

      qrEl.innerHTML = "";
      new QRCode(qrEl, {
        text: qrData,
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.M,
      });
    };
    waitForQRCode();
  }
}


/* =========================
HELPER(TEST)
========================= */
function formatPaymentDate(date) {
  return new Date(date).toLocaleDateString("th-TH");
}

function goBackToBills() {
  // กลับไปหน้าบิล โดยไม่ผูกกับปุ่ม
  openMyBills(null);
}

/* =========================
AUTH (LINE → SUPABASE)
========================= */
async function getSupabaseTokenFromLine() {
  const accessToken = liff.getAccessToken();
  if (!accessToken) throw new Error("no_line_token");

  const profile = await liff.getProfile();

  const res = await fetch(
    "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1/line-auth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "YOUR_SUPABASE_ANON_KEY",
      },
      body: JSON.stringify({
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw data;

  localStorage.setItem("sb_access_token", data.access_token);
  return data.access_token;
}

/* =========================
SUBMIT PAYMENT (BACKEND)
========================= */
async function submitPawnPayment(btn) {
  if (!btn) return;

  if (btn.classList.contains("loading")) return;

  if (!CURRENT_BILL) {
    showAlertModal("เกิดข้อผิดพลาด", "ไม่พบข้อมูลบิล");
    return;
  }

  const lineAccessToken = liff.getAccessToken();
  if (!lineAccessToken) {
    showAlertModal("เกิดข้อผิดพลาด", "ไม่พบ LINE access token");
    return;
  }

  const fileInput = document.getElementById("slipFile");
  let slipBase64 = null;

  if (fileInput && fileInput.files.length > 0) {
    slipBase64 = await fileToBase64(fileInput.files[0]);
  }

  // ✅ เช็คสลิปก่อน
  if (!slipBase64) {
    showAlertModal(
      "กรุณาแนบสลิป",
      "กรุณาแนบหลักฐานการชำระเงินก่อนดำเนินการต่อ"
    );
    return;
  }

  // ✅ ค่อยเริ่ม loading หลังผ่านทุกเงื่อนไข
  setButtonLoading(btn, "กำลังส่งข้อมูล");

  const payload = {
    pawn_transaction_id: CURRENT_BILL.id,
    amount: Number(CURRENT_BILL.service_fee ?? 0),
    slip_base64: slipBase64,
  };

  try {
    const res = await fetch(
      "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1/payment-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-line-access-token": lineAccessToken,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok) throw data;

    showAlertModal(
      "รับแจ้งชำระเงินแล้ว",
      "ระบบได้รับข้อมูลการชำระเงินเรียบร้อย\nรอร้านตรวจสอบ",
      () => liff.closeWindow()
    );

  } catch (err) {
    const errorCode = err?.error || err?.message || "";

    if (errorCode === "slip_required") {
      showAlertModal(
        "กรุณาแนบสลิป",
        "กรุณาแนบหลักฐานการชำระเงินก่อนดำเนินการต่อ"
      );
    } else {
      showAlertModal(
        "เกิดข้อผิดพลาด",
        errorCode || "ไม่สามารถดำเนินการได้"
      );
    }

    resetButton(btn, "💳 ดำเนินการต่อ");
  }
}

/* =========================
FILE → BASE64
========================= */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}