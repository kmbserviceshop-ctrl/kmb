const LIFF_ID = "2008883587-vieENd7j";
const FN_BASE =
  "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";

/* =========================
   INIT (FIX LOOP)
========================= */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    // ❌ กันเปิดนอก LINE (ตัวนี้สำคัญที่สุด)
    if (!liff.isInClient()) {
      document.body.innerHTML = `
        <h3>❌ กรุณาเปิดจากแอป LINE เท่านั้น</h3>
        <p>ให้กดผ่าน Rich Menu ในแชท King Mobile</p>
      `;
      return;
    }

    // 🔐 ยังไม่ login → login ครั้งเดียว แล้วหยุด
    if (!liff.isLoggedIn()) {
      await liff.login();
      return;
    }

    // ✅ login แล้ว ค่อยทำต่อ
    const profile = await liff.getProfile();

    // เช็คสถานะลูกค้า
    const res = await fetch(`${FN_BASE}/check_line_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_user_id: profile.userId }),
    });

    const status = await res.json();

    if (status.status === "guest") {
      showGuestForm();
    } else if (status.status === "member") {
      showMemberMenu(status.customer_id);
    } else {
      throw new Error("unknown status");
    }
  } catch (err) {
    document.body.innerHTML = `<pre>ERROR: ${err}</pre>`;
  }
}

init();

/* =========================
   GUEST : FORM
========================= */
function showGuestForm() {
  document.body.innerHTML = `
    <h3>สมัครสมาชิก KPOS</h3>

    <label>เลขบัตรประชาชน</label><br/>
    <input id="id_card" /><br/><br/>

    <label>เบอร์โทร</label><br/>
    <input id="phone" /><br/><br/>

    <button onclick="verifyCustomer()">ตรวจสอบข้อมูล</button>
    <pre id="msg"></pre>
  `;
}

/* =========================
   VERIFY CUSTOMER
========================= */
async function verifyCustomer() {
  const idCard = document.getElementById("id_card").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const msg = document.getElementById("msg");

  if (!idCard || !phone) {
    msg.innerText = "กรอกข้อมูลให้ครบ";
    return;
  }

  try {
    const res = await fetch(`${FN_BASE}/find_customer_for_line`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_card: idCard, phone }),
    });

    const result = await res.json();

    if (!result.found) {
      msg.innerText = "❌ ไม่พบข้อมูลลูกค้า";
      return;
    }

    if (result.status !== "active") {
      msg.innerText = "❌ " + (result.message || "ไม่สามารถสมัครได้");
      return;
    }

    const profile = await liff.getProfile();

    const bindRes = await fetch(
      `${FN_BASE}/register_customer_with_line`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: result.customer_id,
          line_user_id: profile.userId,
        }),
      }
    );

    const bindResult = await bindRes.json();

    if (bindResult.success) {
      alert("✅ สมัครสมาชิกสำเร็จ");
      location.reload();
    } else {
      msg.innerText = "❌ " + bindResult.error;
    }
  } catch (err) {
    msg.innerText = "ERROR: " + err;
  }
}

/* =========================
   MEMBER MENU
========================= */
function showMemberMenu(customerId) {
  document.body.innerHTML = `
    <h3>⭐ สมาชิก KPOS</h3>
    <p>Customer ID: ${customerId}</p>

    <button onclick="openPawn()">รายการขายฝาก</button><br/><br/>
    <button onclick="openInstallment()">รายการผ่อน</button><br/><br/>
    <button onclick="logout()">ออกจากระบบ</button>
  `;
}

/* =========================
   DUMMY
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