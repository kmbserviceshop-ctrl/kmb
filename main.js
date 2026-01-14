/* =========================
   CONFIG
========================= */
const LIFF_ID = "2008883587-vieENd7j";
const FN_BASE =
  "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";

// ❗ ใช้ anon key เท่านั้น (ห้าม service role)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib29jcmtnb3JzbG53bnVocWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzYzMTUsImV4cCI6MjA4MzUxMjMxNX0.egN-N-dckBh8mCbY08UbGPScWv6lYpPCxodStO-oeTQ";

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
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

/* =========================
   INIT
========================= */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    // ❌ ห้ามเปิดนอก LINE
    if (!liff.isInClient()) {
      render(`
        <h3>❌ กรุณาเปิดจากแอป LINE เท่านั้น</h3>
        <p>ให้กดผ่าน Rich Menu ในแชท King Mobile</p>
      `);
      return;
    }

    // 🔐 ยังไม่ login → login แล้วหยุด
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // ✅ login แล้ว
    const profile = await liff.getProfile();

    const status = await callFn("check_line_status", {
      line_user_id: profile.userId,
    });

    if (status.status === "guest") {
      showGuestForm();
    } else if (status.status === "member") {
      showMemberMenu(status.customer_id);
    } else {
      throw new Error("unknown status");
    }
  } catch (err) {
    render(`<pre>ERROR: ${err.message}</pre>`);
  }
}

init();

/* =========================
   UI HELPERS
========================= */
function render(html) {
  document.body.innerHTML = html;
}

/* =========================
   GUEST FORM
========================= */
function showGuestForm() {
  render(`
    <h3>สมัครสมาชิก KPOS</h3>

    <label>เลขบัตรประชาชน</label><br/>
    <input id="id_card" /><br/><br/>

    <label>เบอร์โทร</label><br/>
    <input id="phone" /><br/><br/>

    <button id="verifyBtn">ตรวจสอบข้อมูล</button>
    <pre id="msg"></pre>
  `);

  document
    .getElementById("verifyBtn")
    .addEventListener("click", verifyCustomer);
}

/* =========================
   VERIFY CUSTOMER
========================= */
async function verifyCustomer() {
  const idCard = document.getElementById("id_card").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const msg = document.getElementById("msg");

  msg.innerText = "";

  if (!idCard || !phone) {
    msg.innerText = "กรอกข้อมูลให้ครบ";
    return;
  }

  try {
    const result = await callFn("find_customer_for_line", {
      id_card: idCard,
      phone,
    });

    if (!result.found) {
      msg.innerText = "❌ ไม่พบข้อมูลลูกค้า";
      return;
    }

    if (result.status !== "active") {
      msg.innerText = "❌ " + (result.message || "ไม่สามารถสมัครได้");
      return;
    }

    const profile = await liff.getProfile();

    const bindResult = await callFn("register_customer_with_line", {
      customer_id: result.customer_id,
      line_user_id: profile.userId,
    });

    if (bindResult.success) {
      alert("✅ สมัครสมาชิกสำเร็จ");
      location.reload();
    } else {
      msg.innerText = "❌ สมัครไม่สำเร็จ";
    }
  } catch (err) {
    msg.innerText = "ERROR: " + err.message;
  }
}

/* =========================
   MEMBER MENU
========================= */
function showMemberMenu(customerId) {
  render(`
    <h3>⭐ สมาชิก KPOS</h3>
    <p>Customer ID: ${customerId}</p>

    <button onclick="openPawn()">รายการขายฝาก</button><br/><br/>
    <button onclick="openInstallment()">รายการผ่อน</button><br/><br/>
    <button onclick="logout()">ออกจากระบบ</button>
  `);
}

/* =========================
   ACTIONS
========================= */
function openPawn() {
  alert("ไปหน้าขายฝาก (ขั้น G)");
}

function openInstallment() {
  alert("ไปหน้าผ่อน (ขั้นถัดไป)");
}

function logout() {
  liff.logout();
  location.reload();
}
