'use strict';
const applyServer = (sR = [], sT = {}, sD = {}) => {
  const idx = S.imap;

  for (const r of sR) {
    const id = r[0];
    if (!id) continue;
    const lt = +S.ts[id] || 0;
    const ld = +S.td[id] || 0;
    const st = +sT[id] || 0;
    if (ld >= st && ld) continue;
    if (lt > st) continue;
    const p = idx.get(id);
    if (p === undefined) {
      idx.set(id, S.rows.length);
      S.rows.push(r);
    } else {
      S.rows[p] = r;
    }
  }

  for (const id in sD) {
    const sd = +sD[id] || 0;
    const lt = +S.ts[id] || 0;
    const ld = +S.td[id] || 0;
    if (ld >= sd || lt > sd) continue;
    delete S.ts[id];
    S.td[id] = sd;
    const p = idx.get(id);
    if (p === undefined) continue;
    S.rows.splice(p, 1);
    idx.delete(id);
    for (const [k, v] of idx) if (v > p) idx.set(k, v - 1);
  }

  for (const id in sT) {
    if (!S.td[id]) S.ts[id] = Math.max(+S.ts[id] || 0, +sT[id] || 0);
  }
};

const push = () => {
  if (!S.i) return Promise.resolve(false);
  const v0 = S.vc;
  return api('pushData', { sid: S.i, header: K, rows: S.rows, ts: S.ts, td: S.td })
    .then(r => {
      if (!r || !r.ok) { say('fail ' + (r && r.err || '')); return false; }
      if (S.vc === v0) { setRows(r.rows); S.ts = r.ts; S.td = r.td; S.dirty = false; }
      else { applyServer(r.rows, r.ts, r.td); S.vc++; }
      return true;
    })
    .catch(e => { say('off ' + (e?.message || e || '')); return false; });
};

let pushing = false, queued = false, retry = 0, tmr = 0;

function sync(force) {
  if (!S.i || (!force && !S.dirty)) return Promise.resolve(true);
  if (tmr) { clearTimeout(tmr); tmr = 0; }
  if (pushing) { queued = true; return Promise.resolve(false); }
  pushing = true;
  return push().then(ok => {
    pushing = false;
    if (ok) {
      retry = 0;
      render();
      if (queued) { queued = false; return sync(force); }
      return true;
    }
    const backoff = Math.min(30000, 1000 * (1 << Math.min(retry++, 5)));
    tmr = setTimeout(() => { tmr = 0; sync(); }, backoff);
    return false;
  });
}

function pull() {
  if (!S.i) return say('sheet');
  if (S.dirty) { sync().then(ok => { if (ok) pull(); else say('fail'); }); return; }
  say('...');
  api('pullData', S.i)
    .then(j => {
      if (!j || !j.ok) return say('fail ' + (j && j.err || ''));
      setRows(j.rows);
      S.ts = j.ts || {}; S.td = j.td || {};
      S.page = 1;
      say('ok');
    })
    .catch(e => say('off ' + (e?.message || e || '')));
}
