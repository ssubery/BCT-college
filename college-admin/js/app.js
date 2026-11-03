/* ===== ລະບົບບໍລິຫານວິທະຍາໄລ ===== */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");

const LAO_MONTHS = ["ມັງກອນ","ກຸມພາ","ມີນາ","ເມສາ","ພຶດສະພາ","ມິຖຸນາ","ກໍລະກົດ","ສິງຫາ","ກັນຍາ","ຕຸລາ","ພະຈິກ","ທັນວາ"];
const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const parseDate = (d) => { if (!d) return null; const [y, m, day] = d.split("-").map(Number); return { y, m, d: day }; };
const dobLao = (d) => { const p = parseDate(d); return p ? `${pad(p.d)} ${LAO_MONTHS[p.m - 1]} ${p.y}` : ""; };
const dobEn = (d) => { const p = parseDate(d); return p ? `${pad(p.d)} ${EN_MONTHS[p.m - 1]} ${p.y}` : ""; };

const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.5.6 4 2.6 4 6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  book: '<path d="M4 4h10a4 4 0 014 4v13H8a4 4 0 01-4-4V4z"/><path d="M4 17a4 4 0 014-4h10"/>',
  teacher: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="14" width="10" height="7"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24">${ICON[n] || ""}</svg>`;

/* ---------- ສະຖານະ ---------- */
let session = null, years = [], majors = [];
const isAdmin = () => !!session;

/* ---------- ເມນູ: ເພີ່ມເມນູໃໝ່ ພຽງເພີ່ມ 1 ແຖວ ---------- */
const MENUS = [
  { id: "dashboard", label: "ແດຊບອດ",         icon: "home",    sub: "ພາບລວມຂອງວິທະຍາໄລ",        render: renderDashboard },
  { id: "students",  label: "ປະຫວັດນັກສຶກສາ", icon: "users",   sub: "ຂໍ້ມູນນັກສຶກສາທັງໝົດ",       render: renderStudents, group: "ຂໍ້ມູນຫຼັກ" },
  { id: "teachers",  label: "ອາຈານ",          icon: "teacher", sub: "ລາຍຊື່ອາຈານ ແລະ ພະນັກງານສອນ", render: () => crud(CFG.teachers) },
  { id: "majors",    label: "ສາຂາວິຊາ",       icon: "book",    sub: "ສາຂາວິຊາທີ່ເປີດສອນ",         render: () => crud(CFG.majors) },
  { id: "years",     label: "ສົກຮຽນ",         icon: "cal",     sub: "ຈັດການສົກຮຽນ",              render: () => crud(CFG.years) },
  { id: "reports",   label: "ລາຍງານ",         icon: "chart",   sub: "ສະຫຼຸບ, ພິມ ແລະ ສົ່ງອອກ Excel", render: renderReports, group: "ລາຍງານ" },
];

/* ---------- ເຄື່ອງມື ---------- */
function toast(msg, err = false) {
  const t = $("#toast"); t.textContent = msg; t.className = "show" + (err ? " err" : "");
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ""), 3200);
}
function modal(html, ready) {
  const m = $("#modal"); m.innerHTML = html; m.showModal();
  m.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => m.close()));
  ready?.(m); return m;
}
function empty(text) { return `<div class="empty">${ic("inbox")}<div>${text}</div></div>`; }
function loading() { return `<div class="card"><div class="skeleton" style="width:40%"></div><div class="skeleton"></div><div class="skeleton" style="width:80%"></div></div>`; }
function avatar(s, name) {
  const ch = esc((name || "?").trim().charAt(0));
  return `<div class="av">${s?.photo_url ? `<img src="${esc(s.photo_url)}" alt="">` : ch}</div>`;
}
async function loadRef() {
  const [y, m] = await Promise.all([sb.from("academic_years").select("*").order("name"), sb.from("majors").select("*").order("name")]);
  if (y.error) toast(y.error.message, true); else years = y.data;
  if (m.error) { majors = []; toast("ຍັງບໍ່ມີຕາຕະລາງສາຂາວິຊາ: ກະລຸນາ Run supabase/schema_update.sql", true); } else majors = m.data;
}
const yearOpts = (sel, all) => (all ? `<option value="">ທຸກສົກຮຽນ</option>` : `<option value="">- ເລືອກ -</option>`) +
  years.map((y) => `<option value="${y.id}" ${String(y.id) === String(sel) ? "selected" : ""}>${esc(y.name)}</option>`).join("");
const majorOpts = (sel, all) => (all ? `<option value="">ທຸກສາຂາ</option>` : `<option value="">- ບໍ່ລະບຸ -</option>`) +
  majors.map((y) => `<option value="${y.id}" ${String(y.id) === String(sel) ? "selected" : ""}>${esc(y.name)}</option>`).join("");
function setHead(menu, actions = "") { $("#title").textContent = menu.label; $("#sub").textContent = menu.sub || ""; $("#actions").innerHTML = actions; }
const curMenu = () => MENUS.find((m) => m.id === (location.hash.slice(1) || MENUS[0].id)) || MENUS[0];

/* ---------- ເຂົ້າສູ່ລະບົບ ---------- */
function renderAuth() {
  $("#authBox").innerHTML = isAdmin()
    ? `<div class="who"><div class="av">A</div><div><b>ຜູ້ບໍລິຫານ</b><span>${esc(session.user.email)}</span></div></div><button id="logout" style="width:100%">ອອກຈາກລະບົບ</button>`
    : `<div class="who"><div class="av">👁</div><div><b>ໂໝດເບິ່ງຢ່າງດຽວ</b><span>ແກ້ໄຂ/ລົບບໍ່ໄດ້</span></div></div><button id="login" class="primary" style="width:100%">ເຂົ້າສູ່ລະບົບຜູ້ບໍລິຫານ</button>`;
  $("#login")?.addEventListener("click", openLogin);
  $("#logout")?.addEventListener("click", () => sb.auth.signOut());
}
function openLogin() {
  modal(`<form><h2>ເຂົ້າສູ່ລະບົບຜູ້ບໍລິຫານ</h2><div class="grid">
    <label class="full">ອີເມວ<input type="email" name="email" required autocomplete="username"></label>
    <label class="full">ລະຫັດຜ່ານ<input type="password" name="password" required autocomplete="current-password"></label></div>
    <div class="foot"><button type="button" data-close>ຍົກເລີກ</button><button class="primary" type="submit">ເຂົ້າສູ່ລະບົບ</button></div></form>`,
    (m) => (m.querySelector("form").onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const { error } = await sb.auth.signInWithPassword({ email: f.get("email"), password: f.get("password") });
      if (error) return toast("ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ", true);
      m.close(); toast("ເຂົ້າສູ່ລະບົບສຳເລັດ");
    }));
}

/* ======================================================
   CRUD ທົ່ວໄປ (ສົກຮຽນ / ສາຂາວິຊາ / ອາຈານ)
   ====================================================== */
const CFG = {
  years: {
    table: "academic_years", title: "ສົກຮຽນ", order: "name", file: "academic_years",
    cols: [{ label: "ສົກຮຽນ", get: (r) => esc(r.name), x: (r) => r.name }],
    fields: [{ name: "name", label: "ສົກຮຽນ (ຕົວຢ່າງ: 2026-2027)", required: true, pattern: "\\d{4}-\\d{4}", full: true }],
    delMsg: "ລົບບໍ່ໄດ້: ມີນັກສຶກສາໃນສົກຮຽນນີ້ຢູ່",
  },
  majors: {
    table: "majors", title: "ສາຂາວິຊາ", order: "name", file: "majors",
    cols: [{ label: "ລະຫັດ", get: (r) => esc(r.code), x: (r) => r.code }, { label: "ສາຂາວິຊາ", get: (r) => `<b>${esc(r.name)}</b>`, x: (r) => r.name }],
    fields: [{ name: "code", label: "ລະຫັດສາຂາ" }, { name: "name", label: "ຊື່ສາຂາວິຊາ", required: true }],
  },
  teachers: {
    table: "teachers", title: "ອາຈານ", order: "created_at", file: "teachers", select: "*, majors(name)",
    cols: [
      { label: "ຊື່ ແລະ ນາມສະກຸນ", get: (r) => `<div class="cell-p">${avatar(null, r.first_name)}<b>${esc(r.first_name)} ${esc(r.last_name)}</b></div>`, x: (r) => `${r.first_name} ${r.last_name}` },
      { label: "ເພດ", get: (r) => (r.gender ? `<span class="tag ${r.gender === "ຍິງ" ? "f" : ""}">${esc(r.gender)}</span>` : ""), x: (r) => r.gender },
      { label: "ຕຳແໜ່ງ", get: (r) => esc(r.position), x: (r) => r.position },
      { label: "ສາຂາວິຊາ", get: (r) => esc(r.majors?.name), x: (r) => r.majors?.name },
      { label: "ເບີໂທ", get: (r) => esc(r.phone), x: (r) => r.phone },
      { label: "ອີເມວ", get: (r) => esc(r.email), x: (r) => r.email },
    ],
    fields: [
      { name: "first_name", label: "ຊື່", required: true }, { name: "last_name", label: "ນາມສະກຸນ", required: true },
      { name: "gender", label: "ເພດ", type: "select", options: () => `<option value="">-</option><option>ຊາຍ</option><option>ຍິງ</option>` },
      { name: "position", label: "ຕຳແໜ່ງ" },
      { name: "major_id", label: "ສາຂາວິຊາ", type: "select", options: (v) => majorOpts(v) },
      { name: "phone", label: "ເບີໂທ", type: "tel" }, { name: "email", label: "ອີເມວ", type: "email", full: true },
    ],
  },
};

async function crud(cfg) {
  const menu = curMenu();
  setHead(menu, `<button id="xls">${ic("down")}Excel</button><button class="primary" id="add" ${isAdmin() ? "" : 'disabled title="ຕ້ອງເຂົ້າສູ່ລະບົບຜູ້ບໍລິຫານກ່ອນ"'}>${ic("plus")}ເພີ່ມ${cfg.title}</button>`);
  $("#view").innerHTML = loading();
  await loadRef();
  const { data: rows, error } = await sb.from(cfg.table).select(cfg.select || "*").order(cfg.order);
  if (error) { $("#view").innerHTML = empty(esc(error.message)); return; }
  $("#view").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>ລ/ດ</th>${cfg.cols.map((c) => `<th>${c.label}</th>`).join("")}${isAdmin() ? "<th></th>" : ""}</tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td>${cfg.cols.map((c) => `<td>${c.get(r)}</td>`).join("")}
        ${isAdmin() ? `<td><div class="acts"><button class="sm" data-edit="${r.id}">ແກ້ໄຂ</button><button class="sm danger" data-del="${r.id}">ລົບ</button></div></td>` : ""}</tr>`).join("")}
      </tbody></table></div>`
    : `<div class="card">${empty(`ຍັງບໍ່ມີຂໍ້ມູນ${cfg.title}`)}</div>`;
  $("#xls").onclick = () => exportRows(rows.map((r, i) => Object.fromEntries([["ລ/ດ", i + 1], ...cfg.cols.map((c) => [c.label, c.x(r)])])), cfg.file, cfg.title);
  $("#add")?.addEventListener("click", () => crudForm(cfg));
  document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => crudForm(cfg, rows.find((r) => String(r.id) === b.dataset.edit))));
  document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!confirm(`ລົບ${cfg.title}ນີ້?`)) return;
    const { error } = await sb.from(cfg.table).delete().eq("id", b.dataset.del);
    if (error) return toast(cfg.delMsg || error.message, true);
    toast("ລົບແລ້ວ"); crud(cfg);
  }));
}
function crudForm(cfg, r = {}) {
  const fld = (f) => `<label class="${f.full ? "full" : ""}">${f.label}${f.type === "select"
    ? `<select name="${f.name}">${f.options(r[f.name])}</select>`
    : `<input name="${f.name}" type="${f.type || "text"}" value="${esc(r[f.name])}" ${f.required ? "required" : ""} ${f.pattern ? `pattern="${f.pattern}"` : ""}>`}</label>`;
  modal(`<form><h2>${r.id ? "ແກ້ໄຂ" : "ເພີ່ມ"}${cfg.title}</h2><div class="grid">${cfg.fields.map(fld).join("")}</div>
    <div class="foot"><button type="button" data-close>ຍົກເລີກ</button><button class="primary" type="submit">ບັນທຶກ</button></div></form>`,
    (m) => (m.querySelector("form").onsubmit = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target); const rec = {};
      cfg.fields.forEach((f) => (rec[f.name] = fd.get(f.name) === "" ? null : fd.get(f.name)));
      const { error } = await (r.id ? sb.from(cfg.table).update(rec).eq("id", r.id) : sb.from(cfg.table).insert(rec));
      if (error) return toast(error.message.includes("duplicate") ? "ຂໍ້ມູນນີ້ມີແລ້ວ" : error.message, true);
      m.close(); toast("ບັນທຶກແລ້ວ"); crud(cfg);
    }));
}

/* ======================================================
   ແດຊບອດ
   ====================================================== */
const COLORS = ["#2f5bea", "#c2410c", "#12805c", "#b7791f", "#7c3aed", "#0e7490"];
function bars(obj, limit = 6) {
  const e = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit); const max = Math.max(1, ...e.map((x) => x[1]));
  return e.length ? e.map(([k, v]) => `<div class="brow"><span class="l" title="${esc(k)}">${esc(k)}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><span class="v">${v}</span></div>`).join("") : empty("ຍັງບໍ່ມີຂໍ້ມູນ");
}
const countBy = (rows, fn) => rows.reduce((a, r) => { const k = fn(r) || "ບໍ່ລະບຸ"; a[k] = (a[k] || 0) + 1; return a; }, {});

async function renderDashboard() {
  setHead(curMenu());
  $("#view").innerHTML = loading();
  await loadRef();
  const [st, te] = await Promise.all([
    sb.from("students").select("id,first_name_lo,last_name_lo,gender,birth_province,academic_year_id,major_id,photo_url,created_at").order("created_at", { ascending: false }),
    sb.from("teachers").select("id"),
  ]);
  const rows = st.data || [], teachers = te.data || [];
  const yName = Object.fromEntries(years.map((y) => [y.id, y.name])), mName = Object.fromEntries(majors.map((m) => [m.id, m.name]));
  const male = rows.filter((s) => s.gender === "ຊາຍ").length, female = rows.filter((s) => s.gender === "ຍິງ").length;
  const pM = rows.length ? (male / rows.length) * 100 : 0, pF = rows.length ? (female / rows.length) * 100 : 0;
  $("#view").innerHTML = `
  <div class="stats">
    <div class="card stat"><div class="chip b">${ic("users")}</div><div><b>${rows.length}</b><span>ນັກສຶກສາທັງໝົດ</span></div></div>
    <div class="card stat"><div class="chip g">${ic("teacher")}</div><div><b>${teachers.length}</b><span>ອາຈານ</span></div></div>
    <div class="card stat"><div class="chip o">${ic("book")}</div><div><b>${majors.length}</b><span>ສາຂາວິຊາ</span></div></div>
    <div class="card stat"><div class="chip p">${ic("cal")}</div><div><b>${years.length}</b><span>ສົກຮຽນ</span></div></div>
  </div>
  <div class="cols">
    <div class="card"><h3>ນັກສຶກສາຕາມສົກຮຽນ</h3>${bars(countBy(rows, (s) => yName[s.academic_year_id]))}</div>
    <div class="card"><h3>ເພດ</h3><div class="donut-box">
      <div class="donut" data-c="${rows.length}" style="background:conic-gradient(var(--brand) 0 ${pM}%,var(--pink) ${pM}% ${pM + pF}%,#e4e8f0 ${pM + pF}% 100%)"></div>
      <div class="legend"><div><i class="dot" style="background:var(--brand)"></i>ຊາຍ ${male}</div><div><i class="dot" style="background:var(--pink)"></i>ຍິງ ${female}</div></div></div></div>
  </div>
  <div class="cols">
    <div class="card"><h3>ນັກສຶກສາຕາມສາຂາວິຊາ</h3>${bars(countBy(rows, (s) => mName[s.major_id]))}</div>
    <div class="card"><h3>ນັກສຶກສາຕາມແຂວງເກີດ</h3>${bars(countBy(rows, (s) => s.birth_province))}</div>
    <div class="card recent"><h3>ນັກສຶກສາເພີ່ມຫຼ້າສຸດ</h3>${rows.slice(0, 5).map((s) => `<div class="cell-p">${avatar(s, s.first_name_lo)}<b>${esc(s.first_name_lo)} ${esc(s.last_name_lo)}</b><span>${esc(yName[s.academic_year_id])}</span></div>`).join("") || empty("ຍັງບໍ່ມີນັກສຶກສາ")}</div>
  </div>`;
}

/* ======================================================
   ນັກສຶກສາ
   ====================================================== */
let F = { year: "", major: "", q: "", page: 1 };
const PAGE = 15;
async function fetchStudents(year = "", major = "") {
  let q = sb.from("students").select("*, academic_years(name), majors(name)").order("created_at", { ascending: true });
  if (year) q = q.eq("academic_year_id", year);
  if (major) q = q.eq("major_id", major);
  let { data, error } = await q;
  if (error && /majors/.test(error.message)) { // ຍັງບໍ່ໄດ້ run schema_update.sql
    ({ data, error } = await sb.from("students").select("*, academic_years(name)").order("created_at", { ascending: true }));
  }
  if (error) { toast(error.message, true); return []; }
  return data;
}
const nameLo = (s) => `${s.first_name_lo} ${s.last_name_lo}`;
const nameEn = (s) => `${s.first_name_en ?? ""} ${s.last_name_en ?? ""}`.trim();
const birthPlace = (s) => [s.birth_village, s.birth_district, s.birth_province].filter(Boolean).join(", ");
const genderTag = (g) => (g ? `<span class="tag ${g === "ຍິງ" ? "f" : ""}">${esc(g)}</span>` : "");

async function renderStudents() {
  setHead(curMenu(), `<button id="xls">${ic("down")}Excel</button><button class="primary" id="addStu" ${isAdmin() ? "" : 'disabled title="ຕ້ອງເຂົ້າສູ່ລະບົບຜູ້ບໍລິຫານກ່ອນ"'}>${ic("plus")}ເພີ່ມນັກສຶກສາ</button>`);
  $("#view").innerHTML = loading();
  await loadRef();
  $("#view").innerHTML = `<div class="bar">
    <input id="fQ" class="grow" type="search" placeholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ..." value="${esc(F.q)}">
    <select id="fYear">${yearOpts(F.year, true)}</select><select id="fMajor">${majorOpts(F.major, true)}</select></div><div id="list">${loading()}</div>`;
  const rows = await fetchStudents(F.year, F.major);
  const draw = () => {
    const q = F.q.trim().toLowerCase();
    const shown = rows.filter((s) => !q || [nameLo(s), nameEn(s), s.phone, s.father_phone, s.mother_phone].join(" ").toLowerCase().includes(q));
    const pages = Math.max(1, Math.ceil(shown.length / PAGE)); F.page = Math.min(F.page, pages);
    const slice = shown.slice((F.page - 1) * PAGE, F.page * PAGE), off = (F.page - 1) * PAGE;
    $("#list").innerHTML = shown.length ? `<div class="table-wrap"><table><thead><tr>
      <th>ລ/ດ</th><th>ນັກສຶກສາ</th><th>ເພດ</th><th>ວັນເກີດ</th><th>ທີ່ເກີດ</th><th>ຈົບ ມ.7 ຈາກ</th><th>ສາຂາວິຊາ</th><th>ເບີໂທ</th><th>ສົກຮຽນ</th>${isAdmin() ? "<th></th>" : ""}</tr></thead><tbody>
      ${slice.map((s, i) => `<tr><td>${off + i + 1}</td>
        <td><div class="cell-p">${avatar(s, s.first_name_lo)}<div><b data-view="${s.id}">${esc(nameLo(s))}</b><br><small>${esc(nameEn(s))}</small></div></div></td>
        <td>${genderTag(s.gender)}</td><td>${esc(dobLao(s.dob))}<br><small>${esc(dobEn(s.dob))}</small></td>
        <td>${esc(birthPlace(s))}</td><td>${esc(s.high_school)}</td><td>${esc(s.majors?.name)}</td><td>${esc(s.phone)}</td>
        <td><span class="tag ok">${esc(s.academic_years?.name)}</span></td>
        ${isAdmin() ? `<td><div class="acts"><button class="sm" data-edit="${s.id}">ແກ້ໄຂ</button><button class="sm danger" data-del="${s.id}">ລົບ</button></div></td>` : ""}</tr>`).join("")}
      </tbody></table></div>
      <div class="pager"><span>ທັງໝົດ ${shown.length} ຄົນ</span><div><button class="sm" id="prev" ${F.page <= 1 ? "disabled" : ""}>ກ່ອນໜ້າ</button><span>${F.page} / ${pages}</span><button class="sm" id="next" ${F.page >= pages ? "disabled" : ""}>ຖັດໄປ</button></div></div>`
      : `<div class="card">${empty("ບໍ່ພົບຂໍ້ມູນນັກສຶກສາ")}</div>`;
    $("#prev")?.addEventListener("click", () => { F.page--; draw(); });
    $("#next")?.addEventListener("click", () => { F.page++; draw(); });
    document.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => studentView(rows.find((s) => s.id === b.dataset.view))));
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => studentForm(rows.find((s) => s.id === b.dataset.edit))));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      if (!confirm("ລົບນັກສຶກສາຄົນນີ້?")) return;
      const { error } = await sb.from("students").delete().eq("id", b.dataset.del);
      if (error) return toast(error.message, true);
      toast("ລົບແລ້ວ"); renderStudents();
    }));
  };
  draw();
  $("#fYear").onchange = (e) => { F.year = e.target.value; F.page = 1; renderStudents(); };
  $("#fMajor").onchange = (e) => { F.major = e.target.value; F.page = 1; renderStudents(); };
  $("#fQ").oninput = (e) => { F.q = e.target.value; F.page = 1; draw(); };
  $("#addStu")?.addEventListener("click", () => studentForm());
  $("#xls").onclick = () => exportStudents(rows);
}

function studentView(s) {
  const kv = (k, v) => `<div><small>${k}</small>${esc(v) || "-"}</div>`;
  modal(`<div class="pad"><div class="prof"><div class="ph">${s.photo_url ? `<img src="${esc(s.photo_url)}" alt="">` : esc(s.first_name_lo.charAt(0))}</div>
    <div><h2>${esc(nameLo(s))}</h2><p>${esc(nameEn(s))}</p><p>${genderTag(s.gender)} <span class="tag ok">${esc(s.academic_years?.name)}</span></p><p>${esc(s.majors?.name || "")}</p></div></div>
    <div class="kv">${kv("ວັນເກີດ (ລາວ)", dobLao(s.dob))}${kv("Date of birth", dobEn(s.dob))}${kv("ທີ່ເກີດ", birthPlace(s))}${kv("ຮຽນຈົບ ມ.7 ຈາກ", s.high_school)}
    ${kv("ເບີໂທ", s.phone)}${kv("ເບີໂທສຸກເສີນ", s.emergency_phone)}${kv("ເບີໂທພໍ່", s.father_phone)}${kv("ເບີໂທແມ່", s.mother_phone)}</div>
    <div class="foot"><button data-close>ປິດ</button></div></div>`);
}

function studentForm(s = {}) {
  const f = (name, label, type = "text", extra = "") => `<label>${label}<input name="${name}" type="${type}" value="${esc(s[name])}" ${extra}></label>`;
  modal(`<form><h2>${s.id ? "ແກ້ໄຂ" : "ເພີ່ມ"}ປະຫວັດນັກສຶກສາ</h2><div class="grid">
    <label>ເລືອກສົກຮຽນ<select name="academic_year_id" required>${yearOpts(s.academic_year_id || F.year)}</select></label>
    <label>ສາຂາວິຊາ<select name="major_id">${majorOpts(s.major_id || F.major)}</select></label>
    <label class="full">ຮູບພາບ<input name="photo" type="file" accept="image/*"></label>
    ${f("first_name_lo", "ຊື່ (ລາວ)", "text", "required")}${f("last_name_lo", "ນາມສະກຸນ (ລາວ)", "text", "required")}
    ${f("first_name_en", "Name (English)")}${f("last_name_en", "Surname (English)")}
    <label>ເພດ<select name="gender"><option value="">-</option>${["ຊາຍ", "ຍິງ"].map((g) => `<option ${s.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>
    ${f("dob", "ວັນເດືອນປີເກີດ", "date")}
    ${f("birth_village", "ບ້ານເກີດ")}${f("birth_district", "ເມືອງ")}${f("birth_province", "ແຂວງ")}${f("high_school", "ຮຽນຈົບ ມ.7 ຈາກ ມ.ສ")}
    ${f("phone", "ເບີໂທ", "tel")}${f("father_phone", "ເບີໂທພໍ່", "tel")}${f("mother_phone", "ເບີໂທແມ່", "tel")}${f("emergency_phone", "ເບີໂທສຸກເສີນ", "tel")}
  </div><div class="foot"><button type="button" data-close>ຍົກເລີກ</button><button class="primary" type="submit">ບັນທຶກ</button></div></form>`,
  (m) => (m.querySelector("form").onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const rec = {};
    ["academic_year_id","major_id","first_name_lo","last_name_lo","first_name_en","last_name_en","gender","dob","birth_village","birth_district","birth_province","high_school","phone","father_phone","mother_phone","emergency_phone"]
      .forEach((k) => (rec[k] = fd.get(k) === "" ? null : fd.get(k)));
    const file = fd.get("photo");
    if (file && file.size) {
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const up = await sb.storage.from("student-photos").upload(path, file);
      if (up.error) return toast("ອັບໂຫຼດຮູບບໍ່ສຳເລັດ: " + up.error.message, true);
      rec.photo_url = sb.storage.from("student-photos").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await (s.id ? sb.from("students").update(rec).eq("id", s.id) : sb.from("students").insert(rec));
    if (error) return toast(error.message, true);
    m.close(); toast("ບັນທຶກແລ້ວ"); renderStudents();
  }));
}

/* ======================================================
   ລາຍງານ
   ====================================================== */
let R = { year: "", major: "" };
async function renderReports() {
  setHead(curMenu(), `<button id="print">${ic("print")}ພິມ</button><button class="primary" id="xls">${ic("down")}ສົ່ງອອກ Excel</button>`);
  $("#view").innerHTML = loading();
  await loadRef();
  $("#view").innerHTML = `<div class="bar"><select id="rYear">${yearOpts(R.year, true)}</select><select id="rMajor">${majorOpts(R.major, true)}</select></div><div id="rep">${loading()}</div>`;
  const rows = await fetchStudents(R.year, R.major);
  const g = countBy(rows, (s) => s.gender);
  const tbl = (obj) => `<table><tbody>${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right"><b>${v}</b></td></tr>`).join("") || `<tr><td>-</td></tr>`}</tbody></table>`;
  $("#rep").innerHTML = `<div class="stats">
    <div class="card stat"><div class="chip b">${ic("users")}</div><div><b>${rows.length}</b><span>ນັກສຶກສາທັງໝົດ</span></div></div>
    <div class="card stat"><div class="chip g">${ic("users")}</div><div><b>${g["ຊາຍ"] || 0}</b><span>ຊາຍ</span></div></div>
    <div class="card stat"><div class="chip p">${ic("users")}</div><div><b>${g["ຍິງ"] || 0}</b><span>ຍິງ</span></div></div></div>
  <div class="cols"><div class="card"><h3>ຕາມແຂວງເກີດ</h3>${tbl(countBy(rows, (s) => s.birth_province))}</div>
    <div class="card"><h3>ຕາມ ມ.ສ ທີ່ຈົບ</h3>${tbl(countBy(rows, (s) => s.high_school))}</div>
    <div class="card"><h3>ຕາມສາຂາວິຊາ</h3>${tbl(countBy(rows, (s) => s.majors?.name))}</div></div>
  <div class="table-wrap"><table><thead><tr><th>ລ/ດ</th><th>ຊື່ ແລະ ນາມສະກຸນ</th><th>Name</th><th>ເພດ</th><th>ວັນເກີດ</th><th>ສາຂາ</th><th>ເບີໂທ</th><th>ສົກຮຽນ</th></tr></thead><tbody>
    ${rows.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(nameLo(s))}</td><td>${esc(nameEn(s))}</td><td>${esc(s.gender)}</td><td>${esc(dobLao(s.dob))}</td><td>${esc(s.majors?.name)}</td><td>${esc(s.phone)}</td><td>${esc(s.academic_years?.name)}</td></tr>`).join("")}</tbody></table></div>`;
  $("#rYear").onchange = (e) => { R.year = e.target.value; renderReports(); };
  $("#rMajor").onchange = (e) => { R.major = e.target.value; renderReports(); };
  $("#xls").onclick = () => exportStudents(rows);
  $("#print").onclick = () => window.print();
}

/* ======================================================
   ສົ່ງອອກ Excel
   ====================================================== */
function exportRows(data, file, sheet) {
  if (!data.length) return toast("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ", true);
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0]).map((k) => ({ wch: Math.max(12, k.length + 4) }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, `${file}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function exportStudents(rows) {
  exportRows(rows.map((s, i) => ({
    "ລ/ດ": i + 1, "ສົກຮຽນ": s.academic_years?.name, "ສາຂາວິຊາ": s.majors?.name,
    "ຊື່ (ລາວ)": s.first_name_lo, "ນາມສະກຸນ (ລາວ)": s.last_name_lo, "Name (English)": s.first_name_en, "Surname (English)": s.last_name_en,
    "ເພດ": s.gender, "ວັນເດືອນປີເກີດ (ລາວ)": dobLao(s.dob), "ວັນເດືອນປີເກີດ (ອັງກິດ)": dobEn(s.dob),
    "ບ້ານເກີດ": s.birth_village, "ເມືອງ": s.birth_district, "ແຂວງ": s.birth_province, "ຮຽນຈົບ ມ.7 ຈາກ ມ.ສ": s.high_school,
    "ເບີໂທ": s.phone, "ເບີໂທພໍ່": s.father_phone, "ເບີໂທແມ່": s.mother_phone, "ເບີໂທສຸກເສີນ": s.emergency_phone, "ລິ້ງຮູບພາບ": s.photo_url,
  })), "students", "ນັກສຶກສາ");
}

/* ---------- ເລີ່ມຕົ້ນ ---------- */
function route() {
  const menu = curMenu(); let last = "";
  $("#menu").innerHTML = MENUS.map((m) => {
    const g = m.group && m.group !== last ? ((last = m.group), `<div class="grp">${m.group}</div>`) : "";
    return `${g}<a href="#${m.id}" class="${m.id === menu.id ? "on" : ""}">${ic(m.icon)}${m.label}</a>`;
  }).join("");
  $("#side").classList.remove("open");
  menu.render();
}
$("#burger").onclick = () => $("#side").classList.toggle("open");
window.addEventListener("hashchange", route);
sb.auth.onAuthStateChange((_e, s) => { const was = !!session; session = s; renderAuth(); if (was !== !!s) route(); });
sb.auth.getSession().then(({ data }) => { session = data.session; renderAuth(); route(); });
