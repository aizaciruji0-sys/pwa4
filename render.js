'use strict';
const HIDE = new Set(['idproduk','subkategori','kategori','foto_url']);

const view = () => {
  const key = S.vc + '\x01' + Q.value + '\x01' + SO.value;
  if (key === S.vk) return S.vv;
  S.vk = key;
  const q = qs();
  let f = S.rows.map((_, i) => i);
  if (q.length) {
    const rows = S.rows;
    f = f.filter(i => {
      const s = rows[i].join(' ').toLowerCase();
      return q.every(t => s.includes(t));
    });
  }
  const n = +SO.value;
  if (n === 1) f.reverse();
  else if (n > 1) {
    const c = (n >> 1) - 1, d = n & 1 ? -1 : 1, rows = S.rows;
    f.sort((a, b) => String(rows[a][c] ?? '').localeCompare(String(rows[b][c] ?? '')) * d);
  }
  return (S.vv = f);
};

function _paint() {
  const v = view(), end = Math.min(S.page * 20, v.length);
  document.body.classList.toggle('busy', S.form !== null || S.cur !== null);

  if (S.form) {
    const [k, val] = S.form === 'koneksi' ? ['sheet id / url', S.i] : ['kolom (pisah koma)', K.join(',')];
    M.replaceChildren(el('input', { value: val, placeholder: k }));
    T.replaceChildren();
    FB.replaceChildren(
      el('button', { textContent: 'save', dataset: { f: 'save' } }),
      el('button', { textContent: 'cancel', dataset: { f: 'cancel' } })
    );
    M.querySelector('input').focus();
  } else if (S.cur === null) {
    const vi = K.map((k, i) => HIDE.has(k) ? -1 : i).filter(i => i >= 0);
    M.replaceChildren(...(end
      ? v.slice(0, end).map(i => {
          const r = el('div', { textContent: vi.map(j => S.rows[i][j]).join(' ') });
          r.dataset.i = i;
          return r;
        })
      : [document.createTextNode('kosong')]));
    T.replaceChildren(...(end < v.length ? [el('button', { textContent: 'more', dataset: { f: 'more' } })] : []));
    FB.replaceChildren();
  } else {
    const src = S.cur < 0 ? S.fill : S.rows[S.cur];
    M.replaceChildren(...K.map((k, i) => el('input', { value: src?.[i] ?? '', placeholder: k })));
    T.replaceChildren();
    const a = M.querySelectorAll('input');
    (a[3] || a[0])?.focus();
    FB.replaceChildren(...['save','cancel','dup','del'].map(f => el('button', { textContent: f, dataset: { f } })));
  }

  MSG.textContent = (S.dirty ? '* ' : '') + S.msg;
  persist();
}
