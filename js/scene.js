/*
 * Scene renderer: turns a tiny text DSL into a picture made of 3D emoji + SVG shapes.
 *
 * A scene is a list of items separated by "|". Coordinates are percent of the square (0-100).
 *
 *   EMOJI x y size [flags...]     an emoji image centred at (x,y), size = % of width
 *       flags: f (flip)  r30 (rotate)  o.5 (opacity)  g (grayscale)  sil (silhouette)
 *              hl (glow)  x (crossed out)  z3 (z-index)
 *              animations: m30,0 (move & fade, loop)  mm30,0 (move back & forth)
 *              b (bounce) sh (shake) p (pulse) sp (spin) fl (float) sw (swing) gr (grow)
 *              hop (jump) bl (blink)  d1.2 (delay s)  du3 (duration s)
 *   @name x y size [flags]        custom svg image from img/c/name.svg
 *   bg NAME                        background preset (sky, grass, room, night, sea, street ...)
 *   arrow x1 y1 x2 y2 [color] [c20 bend] [w2 width] [dash]
 *   line  x1 y1 x2 y2 [color] [w2] [dash]
 *   rect  x y w h color [r4] [o.5]
 *   circle cx cy r color [o.5]
 *   ring  cx cy r [color]          dashed highlight ring
 *   t x y size TEXT [color]        text label (use _ for spaces)
 *   say x y w EMOJI.. [:r|:t]      speech bubble with emoji inside (tail left by default)
 *   think x y w EMOJI.. [:r]       thought bubble
 *   clock cx cy size H:MM
 *   grid EMOJI N x y w h           N copies laid out in a box
 *   motion x y size [l|r|u|d]      speed lines
 */
(function (root) {
  'use strict';
  const KW = new Set(['bg', 'arrow', 'line', 'rect', 'circle', 'ring', 't', 'say', 'think', 'clock', 'grid', 'motion']);
  const COLORS = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#facc15', orange: '#fb923c',
    purple: '#a855f7', pink: '#f472b6', gray: '#9ca3af', grey: '#9ca3af', black: '#1f2937',
    white: '#ffffff', brown: '#a16207', sky: '#7dd3fc', navy: '#1e3a8a', wood: '#c08a5a',
    dark: '#374151', mint: '#5eead4', gold: '#f59e0b', lime: '#a3e635', beige: '#f5e6c8'
  };
  const col = (c, d) => (c ? (COLORS[c] || c) : d);
  const isNum = (t) => /^-?\d+(\.\d+)?$/.test(t);

  function code(e) {
    return Array.from(e).map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== 'fe0f').join('-');
  }

  function parse(src) {
    if (!src) return [];
    return String(src).split('|').map((s) => s.trim()).filter(Boolean).map((seg) => {
      const tok = seg.split(/\s+/);
      const head = tok[0];
      if (KW.has(head)) return { k: head, a: tok.slice(1) };
      const nums = []; const flags = [];
      for (const t of tok.slice(1)) {
        if (isNum(t) && nums.length < 3 && flags.length === 0) nums.push(+t); else flags.push(t);
      }
      return { k: 'e', e: head, x: nums[0] ?? 50, y: nums[1] ?? 50, s: nums[2] ?? 62, f: flags };
    });
  }

  /** all emoji glyphs used in a scene (for the asset builder) */
  function emojis(src) {
    const out = [];
    for (const it of parse(src)) {
      if (it.k === 'e' && it.e[0] !== '@') out.push(it.e);
      if (it.k === 'e' && it.f.includes('x')) out.push('❌');
      if (it.k === 'grid') out.push(it.a[0]);
      if (it.k === 'say' || it.k === 'think') it.a.slice(3).filter((t) => t[0] !== ':').forEach((t) => out.push(t));
    }
    return out;
  }

  let BASE = '';
  function imgFor(e, lazy) {
    const ld = lazy ? ' loading="lazy"' : '';
    if (e[0] === '@') return `<img class="pt" src="${BASE}img/c/${e.slice(1)}.svg" alt="" draggable="false"${ld}>`;
    const c = code(e);
    const ok = root.EMOJI_OK;
    if (ok && ok.has(c)) return `<img class="pt" src="${BASE}img/e/${c}.webp" alt="" draggable="false"${ld}>`;
    return `<span class="pt txt">${e}</span>`;
  }

  const ANIMS = { b: 'bounce', sh: 'shake', p: 'pulse', sp: 'spin', fl: 'float', sw: 'swing', gr: 'grow', hop: 'hop', bl: 'blink' };

  function emojiItem(it, lazy) {
    const cls = ['pe']; const st = [`left:${it.x}%`, `top:${it.y}%`, `--s:${it.s}`];
    const tf = []; const filt = []; let anim = ''; const ast = []; let crossed = false;
    for (const fl of it.f) {
      if (fl === 'f') tf.push('scaleX(-1)');
      else if (fl === 'fv') tf.push('scaleY(-1)');
      else if (/^r-?\d+$/.test(fl)) tf.push(`rotate(${fl.slice(1)}deg)`);
      else if (/^o[\d.]+$/.test(fl)) st.push(`opacity:${fl.slice(1)}`);
      else if (fl === 'g') filt.push('grayscale(1)');
      else if (fl === 'sil') filt.push('brightness(0) opacity(.55)');
      else if (fl === 'blur') filt.push('blur(2px)');
      else if (fl === 'hl') cls.push('hl');
      else if (fl === 'x') crossed = true;
      else if (/^z-?\d+$/.test(fl)) st.push(`z-index:${fl.slice(1)}`);
      else if (/^mm?-?[\d.]+,-?[\d.]+$/.test(fl)) {
        const back = fl.startsWith('mm');
        const [dx, dy] = fl.slice(back ? 2 : 1).split(',');
        anim = back ? 'mvb' : 'mv'; ast.push(`--dx:${dx}cqw`, `--dy:${dy}cqw`);
      } else if (/^d[\d.]+$/.test(fl)) ast.push(`--de:${fl.slice(1)}s`);
      else if (/^du[\d.]+$/.test(fl)) ast.push(`--du:${fl.slice(2)}s`);
      else if (ANIMS[fl]) anim = ANIMS[fl];
    }
    const ptStyle = [];
    if (tf.length) ptStyle.push(`transform:${tf.join(' ')}`);
    if (filt.length) ptStyle.push(`filter:${filt.join(' ')} drop-shadow(0 .6cqw .5cqw rgba(0,0,0,.18))`);
    let img = imgFor(it.e, lazy);
    if (ptStyle.length) img = img.replace(/^<(img|span) class="pt( txt)?"/, (m) => `${m} style="${ptStyle.join(';')}"`);
    const cross = crossed ? `<span class="xmark">${imgFor('❌', lazy)}</span>` : '';
    const inner = anim ? `<span class="pa a-${anim}" style="${ast.join(';')}">${img}</span>` : img;
    return `<span class="${cls.join(' ')}" style="${st.join(';')}">${inner}${cross}</span>`;
  }

  const svgWrap = (body, extra = '') => `<svg class="ps${extra}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;

  function optsOf(a, from) {
    const o = { color: null, bend: 0, w: null, dash: false, r: 0, op: 1, tail: '' };
    for (const t of a.slice(from)) {
      if (/^c-?\d+$/.test(t)) o.bend = +t.slice(1);
      else if (/^w[\d.]+$/.test(t)) o.w = +t.slice(1);
      else if (/^r[\d.]+$/.test(t)) o.r = +t.slice(1);
      else if (/^o[\d.]+$/.test(t)) o.op = +t.slice(1);
      else if (t === 'dash') o.dash = true;
      else if (t[0] === ':') o.tail = t.slice(1);
      else o.color = t;
    }
    return o;
  }

  function arrow(a, head) {
    const [x1, y1, x2, y2] = a.slice(0, 4).map(Number);
    const o = optsOf(a, 4);
    const c = col(o.color, '#ef4444'); const w = o.w || 2.4;
    let d; let ex = x1; let ey = y1; // ex,ey = point the head comes from
    if (o.bend) {
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len; const ny = (x2 - x1) / len;
      const cx = mx + nx * o.bend; const cy = my + ny * o.bend;
      d = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`; ex = cx; ey = cy;
    } else d = `M${x1} ${y1} L${x2} ${y2}`;
    let body = `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${w * 1.6} ${w * 1.6}"` : ''}/>`;
    if (head) {
      const ang = Math.atan2(y2 - ey, x2 - ex); const L = w * 2.6;
      const p1 = [x2 - L * Math.cos(ang - 0.5), y2 - L * Math.sin(ang - 0.5)];
      const p2 = [x2 - L * Math.cos(ang + 0.5), y2 - L * Math.sin(ang + 0.5)];
      body += `<path d="M${p1[0].toFixed(2)} ${p1[1].toFixed(2)} L${x2} ${y2} L${p2[0].toFixed(2)} ${p2[1].toFixed(2)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return svgWrap(body);
  }

  function bubble(a, think, lazy) {
    const x = +a[0]; const y = +a[1]; const w = +a[2];
    const items = a.slice(3).filter((t) => t[0] !== ':');
    const tail = (a.find((t) => t[0] === ':') || ':l').slice(1);
    const h = w * 0.62;
    let svg = `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h * 0.42}" fill="#fff" stroke="#1f2937" stroke-opacity=".18" stroke-width=".8"/>`;
    if (tail !== 't') {
      const sx = tail === 'r' ? x + w * 0.22 : x - w * 0.22; const dir = tail === 'r' ? 1 : -1; const by = y + h / 2;
      if (think) {
        svg += `<circle cx="${sx + dir * 2}" cy="${by + 3.2}" r="2.4" fill="#fff" stroke="#1f2937" stroke-opacity=".18" stroke-width=".7"/>`;
        svg += `<circle cx="${sx + dir * 5}" cy="${by + 7.2}" r="1.4" fill="#fff" stroke="#1f2937" stroke-opacity=".18" stroke-width=".6"/>`;
      } else {
        svg += `<path d="M${sx - 3} ${by - 0.8} L${sx + dir * 5} ${by + 7} L${sx + 3} ${by - 0.8} Z" fill="#fff"/>`;
        svg += `<path d="M${sx - 3} ${by - 0.1} L${sx + dir * 5} ${by + 7} L${sx + 3} ${by - 0.1}" fill="none" stroke="#1f2937" stroke-opacity=".18" stroke-width=".8"/>`;
      }
    }
    let html = svgWrap(svg, ' sh');
    const n = items.length || 1; const s = Math.min(h * 0.72, (w * 0.84) / n);
    items.forEach((e, i) => {
      const ex = x - ((n - 1) * s) / 2 + i * s;
      html += emojiItem({ e, x: +ex.toFixed(2), y, s: +s.toFixed(2), f: [] }, lazy);
    });
    return html;
  }

  function clock(a) {
    const cx = +a[0]; const cy = +a[1]; const s = +a[2]; const r = s / 2;
    const [hh, mm] = (a[3] || '3:00').split(':').map(Number);
    let b = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#334155" stroke-width="${s * 0.05}"/>`;
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * Math.PI * 2; const r1 = r * 0.8; const r2 = r * (i % 3 === 0 ? 0.64 : 0.72);
      b += `<line x1="${cx + r1 * Math.sin(an)}" y1="${cy - r1 * Math.cos(an)}" x2="${cx + r2 * Math.sin(an)}" y2="${cy - r2 * Math.cos(an)}" stroke="#64748b" stroke-width="${s * 0.025}" stroke-linecap="round"/>`;
    }
    const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2; const ma = (mm / 60) * Math.PI * 2;
    b += `<line x1="${cx}" y1="${cy}" x2="${cx + r * 0.45 * Math.sin(ha)}" y2="${cy - r * 0.45 * Math.cos(ha)}" stroke="#1f2937" stroke-width="${s * 0.06}" stroke-linecap="round"/>`;
    b += `<line x1="${cx}" y1="${cy}" x2="${cx + r * 0.68 * Math.sin(ma)}" y2="${cy - r * 0.68 * Math.cos(ma)}" stroke="#ef4444" stroke-width="${s * 0.04}" stroke-linecap="round"/>`;
    b += `<circle cx="${cx}" cy="${cy}" r="${s * 0.05}" fill="#1f2937"/>`;
    return svgWrap(b, ' sh');
  }

  function item(it, lazy) {
    const a = it.a;
    switch (it.k) {
      case 'e': return emojiItem(it, lazy);
      case 'arrow': return arrow(a, true);
      case 'line': return arrow(a, false);
      case 'rect': {
        const [x, y, w, h] = a.slice(0, 4).map(Number); const o = optsOf(a, 4);
        return svgWrap(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r}" fill="${col(o.color, '#cbd5e1')}" opacity="${o.op}"/>`);
      }
      case 'circle': {
        const [x, y, r] = a.slice(0, 3).map(Number); const o = optsOf(a, 3);
        return svgWrap(`<circle cx="${x}" cy="${y}" r="${r}" fill="${col(o.color, '#cbd5e1')}" opacity="${o.op}"/>`);
      }
      case 'ring': {
        const [x, y, r] = a.slice(0, 3).map(Number); const o = optsOf(a, 3);
        return svgWrap(`<circle class="ringc" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col(o.color, '#ef4444')}" stroke-width="${o.w || 1.8}" stroke-dasharray="4 3" stroke-linecap="round"/>`);
      }
      case 't': {
        const [x, y, s] = a.slice(0, 3).map(Number); const txt = (a[3] || '').replace(/_/g, ' ');
        const c = col(a[4], '#1f2937');
        return `<span class="ptx" style="left:${x}%;top:${y}%;font-size:${s}cqw;color:${c}">${txt}</span>`;
      }
      case 'say': return bubble(a, false, lazy);
      case 'think': return bubble(a, true, lazy);
      case 'clock': return clock(a);
      case 'grid': {
        const e = a[0]; const n = +a[1]; const [x, y, w, h] = (a.length >= 6 ? a.slice(2, 6) : [10, 10, 80, 80]).map(Number);
        const cols = Math.ceil(Math.sqrt((n * w) / h)); const rows = Math.ceil(n / cols);
        const cw = w / cols; const ch = h / rows; const s = Math.min(cw, ch) * 0.86;
        let html = '';
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols); const c = i % cols;
          const inRow = r === rows - 1 ? n - r * cols : cols; const off = ((cols - inRow) * cw) / 2;
          html += emojiItem({ e, x: +(x + off + c * cw + cw / 2).toFixed(2), y: +(y + r * ch + ch / 2).toFixed(2), s: +s.toFixed(2), f: [] }, lazy);
        }
        return html;
      }
      case 'motion': {
        const [x, y, s] = a.slice(0, 3).map(Number); const dir = a[3] || 'l';
        let b = '';
        for (let i = -1; i <= 1; i++) {
          const off = i * s * 0.28; const len = s * (i === 0 ? 0.9 : 0.6);
          let x1; let y1; let x2; let y2;
          if (dir === 'l' || dir === 'r') { const sg = dir === 'l' ? -1 : 1; x1 = x; x2 = x + sg * len; y1 = y2 = y + off; } else { const sg = dir === 'u' ? -1 : 1; y1 = y; y2 = y + sg * len; x1 = x2 = x + off; }
          b += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`;
        }
        return svgWrap(b, ' mot');
      }
      default: return '';
    }
  }

  function hue(str) { let h = 0; for (const ch of String(str)) h = (h * 31 + ch.codePointAt(0)) % 360; return h; }

  function render(src, opts = {}) {
    let bg = 'soft'; let html = '';
    for (const it of parse(src)) {
      if (it.k === 'bg') { bg = it.a[0] || 'soft'; continue; }
      html += item(it, opts.lazy);
    }
    const cls = `pic bg-${bg}${opts.cls ? ' ' + opts.cls : ''}`;
    return `<div class="${cls}" style="--h:${hue(opts.seed || src)}">${html}</div>`;
  }

  const api = { parse, render, emojis, code, setBase: (b) => { BASE = b; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Scene = api;
})(typeof window !== 'undefined' ? window : globalThis);
