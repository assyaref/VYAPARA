// Self-contained "VYAPARA Sync Owner Dashboard" served inline by the sync server.
// No external assets — runs fully offline, talks only to /admin/api/*.
// The admin token is entered by the owner and held in memory only (never persisted).

export const ADMIN_DASHBOARD_HTML = /*html*/ `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>VYAPARA — Sync Owner Dashboard</title>
<style>
  :root {
    --navy: #0D47A1; --navy2: #123E73; --blue: #1976D2; --blue-soft: #E3F2FD;
    --orange: #FF8F00; --ok: #1B5E20; --ok-bg: #E8F5E9;
    --warn: #E65100; --warn-bg: #FFF3E0; --bad: #B71C1C; --bad-bg: #FFEBEE;
    --ink: #1A2B45; --mut: #64748B; --line: #E2E8F0;
    --font: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font); color: var(--ink); background: #F4F8FD; }
  .topbar {
    background: linear-gradient(135deg, var(--navy) 0%, var(--navy2) 100%);
    color: #fff; padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; letter-spacing: .04em; }
  .brand .dot { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#1E88E5,#0D47A1); display: grid; place-items: center; font-size: 17px; }
  .brand small { display: block; font-weight: 500; opacity: .8; letter-spacing: .1em; font-size: 10px; text-transform: uppercase; }
  .status { display: flex; gap: 10px; align-items: center; font-size: 12px; }
  .pill { padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.14); font-weight: 700; font-size: 11px; letter-spacing: .05em; }
  main { padding: 22px 28px 40px; max-width: 1180px; margin: 0 auto; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .sub { color: var(--mut); font-size: 12px; margin-bottom: 18px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
  @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(13,71,161,.05); }
  .kpi .label { font-size: 10px; font-weight: 700; color: var(--mut); letter-spacing: .09em; text-transform: uppercase; }
  .kpi .value { font-size: 26px; font-weight: 800; color: var(--navy2); margin-top: 4px; }
  .kpi .foot { font-size: 11px; color: var(--mut); margin-top: 4px; }
  .panel { background: #fff; border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 1px 2px rgba(13,71,161,.05); overflow: hidden; }
  .panel h2 { font-size: 13px; margin: 0; padding: 12px 16px; border-bottom: 1px solid var(--line); background: #FAFCFF; color: var(--navy2); letter-spacing: .06em; text-transform: uppercase; display:flex; justify-content: space-between; align-items:center; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--line); }
  th { background: #F1F5FB; color: var(--mut); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .04em; }
  .ok { background: var(--ok-bg); color: var(--ok); } .warn { background: var(--warn-bg); color: var(--warn); } .bad { background: var(--bad-bg); color: var(--bad); } .mut { background: #ECEFF4; color: var(--mut); }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; }
  .row > .panel { flex: 1 1 420px; }
  .empty { padding: 34px; text-align: center; color: var(--mut); font-size: 13px; }
  #gate { max-width: 460px; margin: 12vh auto; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px; box-shadow: 0 10px 30px rgba(13,71,161,.12); }
  #gate h1 { font-size: 18px; margin: 0 0 4px; }
  #gate p { font-size: 12px; color: var(--mut); margin: 0 0 14px; }
  #gate label { font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--mut); display: block; margin-bottom: 6px; }
  #token { width: 100%; padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; margin-bottom: 10px; }
  #gate button { width: 100%; padding: 12px; border: 0; border-radius: 10px; background: linear-gradient(135deg, var(--blue), var(--navy)); color: #fff; font-weight: 700; cursor: pointer; }
  #gateErr { color: var(--bad); font-size: 12px; min-height: 18px; margin-top: 8px; }
  .foot { margin-top: 18px; color: var(--mut); font-size: 11px; text-align: center; }
  .dim { opacity: .55; }
</style>
</head>
<body>
<div id="gate">
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
    <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#1E88E5,#0D47A1);display:grid;place-items:center;color:#fff;font-weight:800">VY</div>
    <div><h1>VYAPARA Sync</h1><div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#64748B">Owner Dashboard</div></div>
  </div>
  <p>Area internal pemilik. Masukkan <strong>SYNC_ADMIN_TOKEN</strong> server. Token disimpan di memori saja (tidak pernah ditulis ke storage).</p>
  <label for="token">Admin Token</label>
  <input id="token" type="password" autocomplete="off" placeholder="••••••••••••••" />
  <button id="enter">Masuk</button>
  <div id="gateErr"></div>
</div>

<div id="app" style="display:none">
  <div class="topbar">
    <div class="brand"><div class="dot">VY</div><div>VYAPARA<small>Sync Owner Dashboard</small></div></div>
    <div class="status"><span id="generated" class="dim">—</span><span class="pill" id="poll">LIVE</span></div>
  </div>
  <main>
    <h1>Pantauan Antar-Outlet</h1>
    <div class="sub">Metrik replikasi cloud: perangkat aktif, volume sync, status peroutlet. Diperbarui tiap 10 detik.</div>
    <div class="kpis">
      <div class="kpi"><div class="label">Outlet Terdaftar</div><div class="value" id="k-orgs">–</div><div class="foot">organisasi pada server</div></div>
      <div class="kpi"><div class="label">Perangkat Aktif</div><div class="value" id="k-dev">–</div><div class="foot"><span id="k-dev-sub">–</span></div></div>
      <div class="kpi"><div class="label">Event Diterima</div><div class="value" id="k-events">–</div><div class="foot">total sejak server hidup</div></div>
      <div class="kpi"><div class="label">Konflik / Duplikat</div><div class="value" id="k-conflicts">–</div><div class="foot"><span id="k-duplicates">–</span> duplikat terdeteksi</div></div>
    </div>

    <div class="panel" style="margin-bottom:16px">
      <h2>Detail per Outlet <span style="text-transform:none;font-weight:500;color:#64748B;font-size:11px" id="outletCount"></span></h2>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Outlet</th><th>Perangkat</th><th>Event</th><th>Konflik</th><th>Duplikat</th><th>Event Terakhir</th><th>Status</th></tr></thead>
          <tbody id="orgRows"><tr><td colspan="7" class="empty">Memuat…</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="row">
      <div class="panel">
        <h2>Jenis Event Teratas</h2>
        <div style="overflow-x:auto">
          <table><thead><tr><th>Jenis Event</th><th style="text-align:right">Jumlah</th></tr></thead><tbody id="typeRows"></tbody></table>
        </div>
      </div>
      <div class="panel">
        <h2>Perangkat Terdaftar</h2>
        <div style="overflow-x:auto">
          <table><thead><tr><th>Outlet</th><th>Perangkat</th><th>Status</th><th>Expires</th></tr></thead><tbody id="devRows"></tbody></table>
        </div>
      </div>
    </div>
    <div class="foot">VYAPARA Sync · Area pemilik · Akses admin terbatas · Token tidak disimpan</div>
  </main>
</div>

<script>
let token = null;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtNum = (n) => Number(n ?? 0).toLocaleString('id-ID');
const rel = (iso) => { if (!iso) return '—'; const d = Math.round((Date.now() - Date.parse(iso)) / 60000); if (isNaN(d)) return '—'; if (d < 1) return 'baru saja'; if (d < 60) return d + ' mnt lalu'; const h = Math.floor(d / 60); if (h < 24) return h + ' jam lalu'; return Math.floor(h / 24) + ' hari lalu'; };

async function fetchJson(url) {
  const res = await fetch(url, { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' });
  if (res.status === 401 || res.status === 403) { logout('Token ditolak server'); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const body = await res.json();
  return body.data;
}

function logout(msg) {
  token = null;
  $('app').style.display = 'none';
  $('gate').style.display = 'block';
  $('gateErr').textContent = msg || '';
}

function render(d) {
  $('k-orgs').textContent = fmtNum(d.totals.organizations);
  $('k-dev').textContent = fmtNum(d.totals.activeDevices);
  $('k-dev-sub').textContent = 'dari ' + fmtNum(d.totals.devices) + ' perangkat · ' + fmtNum(d.totals.revokedDevices) + ' dicabut';
  $('k-events').textContent = fmtNum(d.totals.events);
  $('k-conflicts').textContent = fmtNum(d.totals.conflicts);
  $('k-duplicates').textContent = fmtNum(d.totals.duplicates);
  $('generated').textContent = 'Diperbarui: ' + new Date(d.generatedAt).toLocaleString('id-ID');
  $('outletCount').textContent = '· ' + d.organizations.length + ' outlet';

  $('orgRows').innerHTML = d.organizations.length === 0
    ? '<tr><td colspan="7" class="empty">Belum ada outlet terdaftar. Daftarkan POS pertama lewat aplikasi desktop.</td></tr>'
    : d.organizations.map(o => {
        const status = o.revokedAll ? '<span class="badge bad">SEMUA DICABUT</span>'
          : o.lastEventAt ? (Date.now() - Date.parse(o.lastEventAt) < 24*3600*1000 ? '<span class="badge ok">AKTIF</span>' : '<span class="badge warn">JARANG</span>')
          : '<span class="badge mut">BELUM SYNC</span>';
        return '<tr>'
          + '<td class="mono">' + esc(o.name || o.organizationId.slice(0,8)) + '</td>'
          + '<td>' + fmtNum(o.activeDevices) + '/' + fmtNum(o.devices) + '</td>'
          + '<td>' + fmtNum(o.events) + '</td>'
          + '<td>' + fmtNum(o.conflicts) + '</td>'
          + '<td>' + fmtNum(o.duplicates) + '</td>'
          + '<td>' + rel(o.lastEventAt) + '</td>'
          + '<td>' + status + '</td>'
          + '</tr>';
      }).join('');

  $('typeRows').innerHTML = d.topEventTypes.length
    ? d.topEventTypes.map(t => '<tr><td class="mono">' + esc(t.event_type) + '</td><td style="text-align:right">' + fmtNum(t.count) + '</td></tr>').join('')
    : '<tr><td class="empty" colspan="2">Belum ada event</td></tr>';

  $('devRows').innerHTML = d.devices.length
    ? d.devices.map(dev => '<tr><td class="mono">' + esc((dev.organizationName || dev.organizationId).slice(0, 16)) + '</td><td class="mono">' + esc(dev.deviceName || dev.deviceId.slice(0,8)) + '</td><td>' + (dev.status === 'active' ? '<span class="badge ok">aktif</span>' : '<span class="badge bad">' + esc(dev.status) + '</span>') + '</td><td>' + esc(dev.tokenExpiresAt ? new Date(dev.tokenExpiresAt).toLocaleDateString('id-ID') : '—') + '</td></tr>').join('')
    : '<tr><td class="empty" colspan="4">Belum ada perangkat</td></tr>';
}

async function refresh() {
  try { render(await fetchJson('/admin/api/overview')); } catch (e) { /* logout handled in fetchJson */ }
}

$('enter').addEventListener('click', async () => {
  const value = $('token').value.trim();
  $('gateErr').textContent = '';
  if (!value) { $('gateErr').textContent = 'Token wajib diisi'; return; }
  token = value;
  try {
    const res = await fetch('/admin/api/overview', { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' });
    if (!res.ok) { $('gateErr').textContent = res.status === 401 || res.status === 403 ? 'Token ditolak server' : 'Server error (' + res.status + ')'; token = null; return; }
    $('gate').style.display = 'none';
    $('app').style.display = 'block';
    await refresh();
    $('token').value = '';
    setInterval(refresh, 10000);
  } catch (e) {
    $('gateErr').textContent = 'Tidak dapat terhubung ke server';
    token = null;
  }
});
$('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('enter').click(); });
</script>
</body>
</html>`;
