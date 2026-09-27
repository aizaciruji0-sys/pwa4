'use strict';
const API = 'https://script.google.com/macros/s/AKfycbzY0TQQ9UTRVK1LTtiYeFcSyju-lpeLrqTr6exJZ3K83bssJIId47e8FUzBat7i0Ebo-g/exec';
const api = (fn, arg) => fetch(API, {
  method: 'POST',
  body: JSON.stringify({ fn, arg })
}).then(r => {
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
});

const K = ['idproduk','subkategori','kategori','namaproduk','hargabeli','hargajual','foto_url'];
const $ = id => document.getElementById(id);
const M=$('list'),T=$('tail'),FB=$('fb'),SO=$('so'),Q=$('q'),F=$('f'),MSG=$('msg'),SB=$('sb'),H=$('h'),FT=$('ft');
const S = {
  rows: [], imap: new Map(), cur: null, fill: null, page: 1,
  i: '', msg: '', form: null, pend: null, dirty: false,
  ts: {}, td: {}, vc: 0,
  qv: '', qc: null, vk: '', vv: null
};

try {
  const l = JSON.parse(localStorage.getItem('L') || 'null');
  if (l && Array.isArray(l.r)) {
    S.rows = l.r; S.i = l.i || ''; S.dirty = !!l.w; S.ts = l.t || {}; S.td = l.x || {};
  }
  const sk = localStorage.getItem('K');
  if (sk) { K.length = 0; sk.split(',').forEach(x => K.push(x)); }
} catch (_) {}
S.rows.forEach((r, i) => r[0] && S.imap.set(r[0], i));

const el = (t, o = {}) => { const e = document.createElement(t); for (const k in o) k === 'dataset' ? Object.assign(e.dataset, o[k]) : (e[k] = o[k]); return e; };
const ins = () => [...M.querySelectorAll('input')].map(x => x.value);
const say = m => { S.msg = m; render(); };
const dl = (t, n, y) => {
  const u = URL.createObjectURL(new Blob([t], { type: y }));
  const a = el('a', { href: u, download: n });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 0);
};

const setRows = rows => {
  S.rows = rows;
  S.imap.clear();
  for (let i = 0; i < rows.length; i++) if (rows[i][0]) S.imap.set(rows[i][0], i);
  S.vc++;
};
const addRow = r => {
  S.imap.set(r[0], S.rows.length);
  S.rows.push(r);
  mark(r[0]);
};
const delRow = i => {
  const r = S.rows[i];
  if (r && r[0]) S.imap.delete(r[0]);
  S.rows.splice(i, 1);
  for (const [k, v] of S.imap) if (v > i) S.imap.set(k, v - 1);
  S.vc++;
};

let pk = '';
const persist = () => {
  const k = S.vc + '|' + S.i + '|' + (S.dirty ? 1 : 0);
  if (k === pk) return;
  try {
    localStorage.setItem('L', JSON.stringify({ r: S.rows, i: S.i, w: S.dirty ? 1 : 0, t: S.ts, x: S.td }));
    pk = k;
  } catch (_) {}
};
const mark = (id, d) => {
  if (!id) return;
  const t = Date.now();
  if (d) { S.td[id] = t; delete S.ts[id]; } else { S.ts[id] = t; delete S.td[id]; }
  S.dirty = true; S.vc++;
};
const nextId = () => {
  const d = new Date(), t = String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0');
  let id; do { id = t + Math.random().toString(36).slice(2,7); } while (S.imap.has(id));
  return id;
};
const fit = () => {
  const h = H.offsetHeight, f = FT.offsetHeight;
  document.documentElement.style.setProperty('--hh', h + 'px');
  document.documentElement.style.setProperty('--fh', f + 'px');
  MSG.style.top = h + 'px';
};
const setMenu = v => { SB.hidden = !v; document.body.classList.toggle('menu', v); fit(); };
const qs = () => {
  const v = Q.value;
  if (v === S.qv) return S.qc;
  S.qv = v;
  return (S.qc = v.toLowerCase().match(/\S+/g) || []);
};
const filtMenu = () => { const q = qs(); for (const b of SB.children) b.hidden = q.length && !q.every(t => b.textContent.toLowerCase().includes(t)); };

let rp = 0;
const defer = typeof queueMicrotask === 'function' ? queueMicrotask : fn => Promise.resolve().then(fn);
const render = () => { if (rp) return; rp = 1; defer(() => { rp = 0; _paint(); }); };

let ip = null;
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  ip = e;
  const b = SB.querySelector('[data-a=install]');
  if (b) b.hidden = false;
});
addEventListener('appinstalled', () => {
  ip = null;
  const b = SB.querySelector('[data-a=install]');
  if (b) b.hidden = true;
});
