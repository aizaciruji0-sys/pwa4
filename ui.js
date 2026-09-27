'use strict';
function rebuildSort() {
  const o = [['sort', 0], ['rev', 1]];
  K.forEach((k, i) => o.push([k + '+', i * 2 + 2], [k + '-', i * 2 + 3]));
  SO.replaceChildren(...o.map(([t, v]) => el('option', { value: v, textContent: t })));
  SO.value = 0;
}

const call = (fn, ok) => {
  say('...');
  api(fn)
    .then(r => r && r.ok ? ok(r) : say('fail ' + (r && r.err || '')))
    .catch(e => say('off ' + (e?.message || e || '')));
};

const escCsv = (v, sep) => {
  v = String(v ?? '');
  return /["\r\n]/.test(v) || v.includes(sep) ? '"' + v.replace(/"/g, '""') + '"' : v;
};

const parseDelimited = (text, sep) => {
  const out = [], row = [];
  let cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && n === '\n') i++;
      row.push(cell); out.push(row.splice(0, row.length));
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out.filter(r => r.some(x => x !== ''));
};

function act(k) {
  if (k === 'menu') { setMenu(SB.hidden); return; }
  if (k === 'clear') { Q.value = ''; S.page = 1; filtMenu(); render(); return; }

  if (k !== 'more' && k !== 'add' && k !== 'dup' && k !== 'save' && k !== 'cancel') setMenu(false);

  if (k === 'install') {
    if (ip) ip.prompt().catch(() => {}).finally(() => { ip = null; const b = SB.querySelector('[data-a=install]'); if (b) b.hidden = true; });
    return;
  }

  if (k === 'del' || k === 'wipe') {
    if (S.pend !== k) { S.pend = k; say(k + '?'); return; }
    S.pend = null; S.msg = '';
    if (k === 'del') {
      if (S.cur >= 0 && S.rows[S.cur]?.[0]) { mark(S.rows[S.cur][0], true); delRow(S.cur); }
      S.cur = null;
    } else {
      S.rows.forEach(r => { if (r[0]) mark(r[0], true); });
      setRows([]);
    }
    render(); sync(); return;
  }

  S.msg = ''; S.pend = null;

  if (k === 'push') {
    if (!S.i) return say('sheet');
    say('...');
    sync(true).then(ok => say(ok ? 'ok' : 'fail'));
    return;
  }

  if (k === 'pull') { pull(); return; }
  if (k === 'koneksi') { S.form = 'koneksi'; S.cur = null; S.fill = null; render(); return; }
  if (k === 'schema') { S.form = 'schema'; S.cur = null; S.fill = null; render(); return; }

  if (k === 'add') {
    S.form = null; S.cur = -1; S.fill = Array(K.length).fill('');
    S.fill[0] = nextId();
    render(); return;
  }

  if (k === 'dup') {
    const p = (S.cur >= 0 ? S.rows[S.cur] : ins()).slice();
    p.length = K.length;
    while (p.length < K.length) p.push('');
    p[0] = nextId();
    S.fill = p; S.cur = -1; render(); return;
  }

  if (k === 'save') {
    if (S.form === 'koneksi') {
      const v = M.querySelector('input').value.trim();
      const m = v.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || v.match(/^([a-zA-Z0-9_-]{20,})$/);
      if (!m) return say('url?');
      S.i = m[1];
      setRows([]); S.ts = {}; S.td = {}; S.dirty = false; S.page = 1;
      S.form = null; render(); pull(); return;
    }

    if (S.form === 'schema') {
      const a = M.querySelector('input').value.split(',').map(s => s.trim()).filter(Boolean);
      if (a.length) {
        K.length = 0; a.forEach(x => K.push(x));
        localStorage.setItem('K', K.join(','));
        rebuildSort();
        const nw = S.rows.map(r => { const n = r.slice(0, K.length); while (n.length < K.length) n.push(''); return n; });
        setRows(nw);
        nw.forEach(r => { if (r[0]) mark(r[0]); });
        S.dirty = true; S.form = null;
        render(); sync(true); return;
      }
      S.form = null; render(); return;
    }

    const p = ins();
    while (p.length < K.length) p.push('');
    p.length = K.length;
    if (!p[0]) p[0] = nextId();

    if (p.slice(1).some(Boolean)) {
      if (S.cur < 0) addRow(p);
      else { S.rows[S.cur] = p; mark(p[0]); }
    } else if (S.cur >= 0) {
      mark(S.rows[S.cur][0], true);
      delRow(S.cur);
    }
    S.cur = null; S.fill = null;
  }
  else if (k === 'cancel') { S.cur = null; S.form = null; S.fill = null; }
  else if (k === 'imp') return F.click();
  else if (k === 'more') { S.page++; render(); return; }
  else if (k === 'duplikat') {
    call('dupProject', r => { say('ok'); open(r.url, '_blank'); });
    return;
  }
  else if (k === 'json') {
    call('dumpAll', r => { dl(JSON.stringify(r.files, null, 2), 'app.json', 'application/json'); say('ok'); });
    return;
  }
  else if (k === 'csv' || k === 'tsv' || k === 'txt') {
    const sep = k === 'csv' ? ',' : k === 'tsv' ? '\t' : '|';
    const rows = [K, ...view().map(i => S.rows[i])];
    dl(rows.map(r => r.map(v => escCsv(v, sep)).join(sep)).join('\r\n'), 'db.' + k, 'text/plain;charset=utf-8');
    return;
  }

  render();
  sync();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) return act(b.dataset.a || b.dataset.f);

  if (!e.target.closest('header') && !e.target.closest('aside')) setMenu(false);
  if (S.cur !== null || S.form) return;

  const r = e.target.closest('div[data-i]');
  if (r) { S.pend = null; S.cur = Number(r.dataset.i); render(); }
});

F.onchange = async () => {
  const file = F.files[0];
  if (!file) return;
  F.value = '';

  const text = await file.text();
  const ext = file.name.toLowerCase().split('.').pop();
  const sep = ext === 'tsv' ? '\t' : ext === 'csv' ? ',' : '|';
  const rows = parseDelimited(text, sep);
  if (!rows.length) return;

  const first = rows[0].map(String);
  const hasHeader = first.length && first.every((x, i) => x === K[i]);
  const nw = (hasHeader ? rows.slice(1) : rows).map(r => {
    const n = r.slice(0, K.length).map(String);
    while (n.length < K.length) n.push('');
    return n;
  }).filter(r => r[0]);

  const incoming = new Set(nw.map(r => r[0]));
  S.rows.forEach(r => { if (r[0] && !incoming.has(r[0])) mark(r[0], true); });
  nw.forEach(r => mark(r[0]));

  setRows(nw);
  S.page = 1;
  render();
  sync();
};

Q.addEventListener('input', () => { S.page = 1; filtMenu(); render(); });
SO.addEventListener('change', () => { S.page = 1; render(); });
addEventListener('online', () => { if (S.dirty) sync(); });
addEventListener('resize', fit);

const syncCfg = next => {
  api('getCfg')
    .then(c => {
      if (c && c.ok && c.sid && c.sid !== S.i) {
        S.i = c.sid;
        setRows([]); S.ts = {}; S.td = {}; S.dirty = false; S.page = 1;
        persist(); render();
      }
      next();
    })
    .catch(() => next());
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncCfg(() => { if (S.i) pull(); });
});

S.rows.forEach(r => { if (r[0] && !S.ts[r[0]] && !S.td[r[0]]) S.ts[r[0]] = 1; });
rebuildSort();
fit();
filtMenu();
render();
syncCfg(() => { if (S.i) pull(); });
