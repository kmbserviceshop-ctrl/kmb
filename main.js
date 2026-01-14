/* =========================
CONFIG
========================= */
const LIFF_ID = "2008883587-vieENd7j";
const FN_BASE =
  "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";

// ❗ anon key 
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib29jcmtnb3JzbG53bnVocWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzYzMTUsImV4cCI6MjA4MzUxMjMxNX0.egN-N-dckBh8mCbY08UbGPScWv6lYpPCxodStO-oeTQ";

/* =========================
HELPER : API CALL
========================= */
async function callFn(path, payload) {
  const res = await fetch(`${FN_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

/* =========================
INIT
========================= */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isInClient()) {
      renderCard(`
        <h3>❌ กรุณาเปิดจาก LINE</h3>
        <p>กรุณาเข้าใช้งานผ่าน Rich Menu</p>
      `);
      return;
    }

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    status.status === "guest"
      ? showGuestForm()
      : showMemberMenu(status.customer_id);

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  }
}
init();

/* =========================
UI HELPERS
========================= */
function renderCard(html) {
  document.getElementById("app").innerHTML = html;
}

/* =========================
GUEST FORM
========================= */
function showGuestForm() {
  renderCard(`
    <h3>สมัครสมาชิก KPOS</h3>

    <label>เลขบัตรประชาชน</label>
    <input id="id_card" />

    <label>เบอร์โทร</label>
    <input id="phone" inputmode="numeric" maxlength="10" />

    <button id="verifyBtn" onclick="verifyCustomer()">ตรวจสอบข้อมูล</button>
  `);
}

/* =========================
VERIFY CUSTOMER
========================= */
async function verifyCustomer() {
  const idCard = document.getElementById("id_card").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const btn = document.getElementById("verifyBtn");

  if (!idCard || !phone) {
    showModal("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    showModal("เบอร์โทรไม่ถูกต้อง", "กรุณากรอกเบอร์โทร 10 หลัก");
    return;
  }

  btn.disabled = true;
  btn.innerText = "กำลังตรวจสอบ...";

  try {
    const result = await callFn("find_customer_for_line", {
      id_card: idCard,
      phone,
    });

    if (!result.found) {
      showModal("ไม่พบข้อมูล", "ไม่พบข้อมูลลูกค้า");
      return;
    }

    if (result.status !== "active") {
      showModal("ไม่สามารถสมัครได้", result.message || "");
      return;
    }

    const profile = await liff.getProfile();
    const bind = await callFn("register_customer_with_line", {
      customer_id: result.customer_id,
      line_user_id: profile.userId,
    });

    bind.success
      ? showModal("สมัครสำเร็จ", "ยินดีต้อนรับสมาชิก KPOS")
      : showModal("ไม่สำเร็จ", "ไม่สามารถสมัครได้");

  } catch (err) {
    showModal("เกิดข้อผิดพลาด", err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "ตรวจสอบข้อมูล";
  }
}

/* =========================
MEMBER MENU
========================= */
function showMemberMenu(customerId) {
  renderCard(`
    <h3>⭐ สมาชิก KPOS</h3>
    <p>Customer ID: ${customerId}</p>

    <button onclick="openPawn()">รายการขายฝาก</button><br/><br/>
    <button onclick="openInstallment()">รายการผ่อน</button><br/><br/>
    <button class="secondary" onclick="logout()">ออกจากระบบ</button>
  `);
}

/* =========================
MODAL
========================= */
function showModal(title, message) {
  modalTitle.innerText = title;
  modalMessage.innerText = message;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

/* =========================
ACTIONS
========================= */
function openPawn() { alert("ไปหน้าขายฝาก"); }
function openInstallment() { alert("ไปหน้าผ่อน"); }
function logout() { liff.logout(); location.reload(); }