const LIFF_ID = "2008883587-vieENd7j";
const FN_BASE = "https://gboocrkgorslnwnuhqic.supabase.co/functions/v1";
const SUPABASE_ANON_KEY = "YOUR_KEY";

/* API */
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

/* INIT */
async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isInClient()) {
      renderCard(`<h3>❌ เปิดผ่าน LINE เท่านั้น</h3>`);
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

/* UI */
function renderCard(html) {
  document.getElementById("app").innerHTML =
    `<div class="card">${html}</div>`;
}

/* GUEST */
function showGuestForm() {
  renderCard(`
    <h3>สมัครสมาชิก KPOS</h3>

    <label>เลขบัตรประชาชน</label>
    <input id="id_card" />

    <label>เบอร์โทร</label>
    <input id="phone" />

    <button onclick="verifyCustomer()">ตรวจสอบข้อมูล</button>

    <div id="msg" class="message error"></div>
  `);
}

async function verifyCustomer() {
  const idCard = id_card.value.trim();
  const phone = phone.value.trim();
  const msg = document.getElementById("msg");

  msg.style.display = "none";

  if (!idCard || !phone) {
    msg.innerText = "กรุณากรอกข้อมูลให้ครบ";
    msg.style.display = "block";
    return;
  }

  try {
    const result = await callFn("find_customer_for_line", {
      id_card: idCard,
      phone,
    });

    if (!result.found) {
      msg.innerText = "❌ ไม่พบข้อมูลลูกค้า";
      msg.style.display = "block";
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
  }
}

/* MEMBER */
function showMemberMenu(id) {
  renderCard(`
    <h3>⭐ สมาชิก KPOS</h3>
    <p>Customer ID: ${id}</p>

    <button onclick="openPawn()">รายการขายฝาก</button><br/><br/>
    <button onclick="openInstallment()">รายการผ่อน</button><br/><br/>
    <button class="secondary" onclick="logout()">ออกจากระบบ</button>
  `);
}

/* MODAL */
function showModal(title, message) {
  modalTitle.innerText = title;
  modalMessage.innerText = message;
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
  location.reload();
}

/* ACTION */
function openPawn() { alert("ไปหน้าขายฝาก"); }
function openInstallment() { alert("ไปหน้าผ่อน"); }
function logout() { liff.logout(); location.reload(); }