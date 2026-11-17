/* Tiny Hangul input method: on-screen 2-beolsik keyboard + QWERTY→jamo mapping with syllable composition. */
(function (root) {
  'use strict';
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const VC = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const JC = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  const JSPLIT = Object.fromEntries(Object.entries(JC).map(([k, v]) => [v, [k[0], k[1]]]));
  const isV = (j) => JUNG.includes(j);
  const syl = (c, v, f) => String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + JONG.indexOf(f || ''));

  function compose(jamos) {
    let out = ''; let c = null; let v = null; let f = null;
    const flush = () => { if (c && v) out += syl(c, v, f); else { if (c) out += c; if (v) out += v; } c = v = f = null; };
    for (const j of jamos) {
      if (j === ' ') { flush(); out += ' '; continue; }
      if (isV(j)) {
        if (c && !v) v = j;
        else if (v && !f && VC[v + j]) v = VC[v + j];
        else if (c && v && f) { const sp = JSPLIT[f]; let move; if (sp) { f = sp[0]; move = sp[1]; } else { move = f; f = null; } flush(); c = move; v = j; }
        else { flush(); v = j; }
      } else if (!c && !v) c = j;
      else if (!v) { flush(); c = j; }
      else if (!c) { flush(); c = j; }
      else if (!f) { if (JONG.includes(j)) f = j; else { flush(); c = j; } }
      else if (JC[f + j]) f = JC[f + j];
      else { flush(); c = j; }
    }
    flush();
    return out;
  }

  const QWERTY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ', Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ' };
  const SHIFT = { 'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ', 'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ' };
  const ROWS = [['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'], ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'], ['⇧', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', '⌫']];

  /** attach to an <input>; returns { reset } */
  function attach(input, host, opts = {}) {
    let jamos = []; let shift = false;
    const sync = () => { input.value = compose(jamos); if (opts.onchange) opts.onchange(input.value); };
    const draw = () => {
      host.innerHTML = ROWS.map((r) => `<div class="kb-row">${r.map((k) => `<button type="button" class="kb-k${k === '⇧' && shift ? ' on' : ''}${k.length > 1 || '⇧⌫'.includes(k) ? ' wide' : ''}" data-k="${k}">${shift && SHIFT[k] ? SHIFT[k] : k}</button>`).join('')}</div>`).join('')
        + '<div class="kb-row"><button type="button" class="kb-k space" data-k=" ">space</button><button type="button" class="kb-k ok" data-k="⏎">확인</button></div>';
    };
    const press = (k) => {
      if (k === '⇧') { shift = !shift; draw(); return; }
      if (k === '⌫') { jamos.pop(); sync(); return; }
      if (k === '⏎') { if (opts.onenter) opts.onenter(input.value); return; }
      jamos.push(shift && SHIFT[k] ? SHIFT[k] : k);
      if (shift) { shift = false; draw(); }
      sync();
    };
    host.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); press(b.dataset.k); });
    input.addEventListener('keydown', (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (QWERTY[e.key]) { e.preventDefault(); jamos.push(QWERTY[e.key]); sync(); } else if (e.key === 'Backspace' && jamos.length) { e.preventDefault(); jamos.pop(); sync(); } else if (e.key === ' ') { e.preventDefault(); jamos.push(' '); sync(); }
    });
    // typing with a real Korean IME: keep jamos in sync with whatever is in the box
    input.addEventListener('input', () => { jamos = Array.from(decompose(input.value)); });
    draw();
    return { reset: () => { jamos = []; shift = false; draw(); sync(); }, set: (v) => { jamos = Array.from(decompose(v)); sync(); } };
  }

  function decompose(str) {
    let out = '';
    for (const ch of str) {
      const code = ch.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) { out += ch; continue; }
      const c = CHO[Math.floor(code / 588)]; const v = JUNG[Math.floor((code % 588) / 28)]; const f = JONG[code % 28];
      const vs = Object.entries(VC).find(([, x]) => x === v); const fs = JSPLIT[f];
      out += c + (vs ? vs[0] : v) + (fs ? fs.join('') : f);
    }
    return out;
  }

  root.Hangul = { compose, decompose, attach };
})(window);
