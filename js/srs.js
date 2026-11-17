/* Spaced repetition (Anki-style SM-2 variant) + persistent state in localStorage. */
(function (root) {
  'use strict';
  const KEY = 'kwp-v1';
  const MIN = 60 * 1000; const DAY = 24 * 60 * MIN; const DAY_START_HOUR = 4;
  const DEFAULTS = {
    newPerDay: 15, maxRev: 300, recog: true, prod: true, listen: false, autoplay: true, autoplayBack: false, newCats: [], newLv: [],
    rate: 0.85, voice: '', anim: true, theme: 'auto', font: 'sans', learnSteps: [1, 10], relearnSteps: [10],
    order: 'level', sfx: true, showAllSentences: true
  };

  function fresh() { return { v: 1, cards: {}, log: {}, settings: { ...DEFAULTS }, daily: { day: '', newDone: 0 }, known: {}, created: Date.now() }; }
  let S = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); S = { ...fresh(), ...s, settings: { ...DEFAULTS, ...(s.settings || {}) } }; }
  } catch (e) { /* storage unavailable: run in memory */ }

  let saveT = null;
  function save(now) {
    clearTimeout(saveT);
    const doit = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
    if (now) doit(); else saveT = setTimeout(doit, 150);
  }

  function dayStart(ts) {
    const d = new Date(ts - DAY_START_HOUR * 60 * MIN); d.setHours(0, 0, 0, 0);
    return d.getTime() + DAY_START_HOUR * 60 * MIN;
  }
  function dayKey(ts) {
    const d = new Date((ts ?? Date.now()) - DAY_START_HOUR * 60 * MIN);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function rollDay() {
    const k = dayKey();
    if (S.daily.day !== k) S.daily = { day: k, newDone: 0, extraNew: 0 };
  }

  const get = (id) => S.cards[id];
  const stateOf = (id) => (S.cards[id] ? S.cards[id].s : 'new');

  function schedule(card, g, now) {
    const st = S.settings;
    const c = card ? { ...card } : { s: 'new', reps: 0, lapses: 0, ease: 2.5, ivl: 0, step: 0 };
    const graduate = (ivl) => {
      c.s = 'rev'; c.step = 0; c.ivl = ivl;
      if (ivl >= 3) c.ivl = Math.max(1, Math.round(ivl * (0.95 + Math.random() * 0.1)));
      c.due = dayStart(now) + c.ivl * DAY;
    };
    if (c.s === 'new' || c.s === 'learn' || c.s === 'relearn') {
      const steps = c.s === 'relearn' ? st.relearnSteps : st.learnSteps;
      const relearn = c.s === 'relearn';
      if (c.s === 'new') { c.s = 'learn'; c.step = 0; c.ease = 2.5; c.first = now; }
      if (g === 1) { c.step = 0; c.due = now + steps[0] * MIN; } else if (g === 2) {
        const d = c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[c.step] * 1.5;
        c.due = now + d * MIN;
      } else if (g === 3) {
        c.step += 1;
        if (c.step >= steps.length) graduate(relearn ? Math.max(1, c.ivl || 1) : 1); else c.due = now + steps[c.step] * MIN;
      } else graduate(relearn ? Math.max(1, c.ivl || 1) + 1 : 4);
    } else {
      const late = Math.max(0, Math.floor((now - c.due) / DAY));
      let ivl = c.ivl || 1;
      if (g === 1) {
        c.lapses = (c.lapses || 0) + 1; c.ease = Math.max(1.3, c.ease - 0.2);
        c.ivl = Math.max(1, Math.round(ivl * 0.5)); c.s = 'relearn'; c.step = 0; c.due = now + st.relearnSteps[0] * MIN;
      } else {
        if (g === 2) { ivl = Math.max(ivl + 1, Math.round(ivl * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); } else if (g === 3) ivl = Math.max(ivl + 1, Math.round((ivl + late / 2) * c.ease)); else { ivl = Math.max(ivl + 2, Math.round((ivl + late) * c.ease * 1.3)); c.ease += 0.15; }
        graduate(Math.min(ivl, 3650));
      }
    }
    c.reps = (c.reps || 0) + 1; c.last = now;
    return c;
  }

  function fmt(ms) {
    const m = Math.round(ms / MIN);
    if (m < 60) return `${Math.max(1, m)}분`;
    const h = Math.round(m / 60); if (h < 24) return `${h}시간`;
    const d = Math.round(ms / DAY); if (d < 31) return `${d}일`;
    const mo = d / 30; if (mo < 12) return `${Math.round(mo * 10) / 10}달`.replace('.0', '');
    return `${Math.round((d / 365) * 10) / 10}년`.replace('.0', '');
  }
  function preview(id) {
    const now = Date.now(); const c = S.cards[id];
    return [1, 2, 3, 4].map((g) => { const n = schedule(c, g, now); return fmt(n.due - now); });
  }

  let undoStack = [];
  function answer(id, g, ms) {
    rollDay();
    const now = Date.now(); const prev = S.cards[id];
    undoStack.push({ id, prev: prev ? { ...prev } : undefined, daily: { ...S.daily }, log: { ...(S.log[dayKey()] || {}) } });
    if (undoStack.length > 20) undoStack.shift();
    const c = schedule(prev, g, now);
    S.cards[id] = c;
    if (!prev && !id.includes('|')) S.daily.newDone += 1;
    if (S.prio && S.prio.includes(id)) S.prio = S.prio.filter((x) => x !== id);
    const k = dayKey(); const L = S.log[k] || (S.log[k] = { n: 0, ok: 0, nw: 0, t: 0 });
    L.n += 1; if (g > 1) L.ok += 1; if (!prev) L.nw += 1; L.t += Math.min(ms || 0, 60000);
    save();
    return c;
  }
  function undo() {
    const u = undoStack.pop(); if (!u) return null;
    if (u.prev) S.cards[u.id] = u.prev; else delete S.cards[u.id];
    S.daily = u.daily; S.log[dayKey()] = u.log; save();
    return u.id;
  }

  /** card list for a set of words, respecting enabled card types. Reverse cards unlock once the forward card is in review. */
  function allCardIds(words) {
    const st = S.settings; const out = [];
    for (const w of words) {
      if (S.known[w.w]) continue;
      const fwd = S.cards[w.w]; const grad = !st.recog || (fwd && fwd.s !== 'learn' && fwd.s !== 'new');
      if (st.recog) out.push(w.w);
      if (st.prod && (grad || S.cards[w.w + '|r'])) out.push(w.w + '|r');
      if (st.listen && (grad || S.cards[w.w + '|l'])) out.push(w.w + '|l');
    }
    return out;
  }

  function queue(words, opts = {}) {
    rollDay();
    const now = Date.now(); const st = S.settings;
    const ids = allCardIds(words);
    const learn = []; const rev = []; const nw = [];
    for (const id of ids) {
      const c = S.cards[id];
      if (!c) nw.push(id);
      else if (c.s === 'learn' || c.s === 'relearn') learn.push(id);
      else if (c.due <= now) rev.push(id);
    }
    // reverse cards: introduce them as "new" too but they don't count against the new limit too harshly
    const newLeft = Math.max(0, st.newPerDay + (S.daily.extraNew || 0) - S.daily.newDone);
    const byW = new Map(words.map((w) => [w.w, w]));
    const prio = (S.prio || []).filter((id) => nw.includes(id)); const pset = new Set(prio);
    const cats = st.newCats || []; const lvs = st.newLv || [];
    const allowed = (id) => { const w = byW.get(id); return w && (!cats.length || cats.includes(w.c)) && (!lvs.length || lvs.includes(w.l)); };
    const newIds = prio.concat(nw.filter((id) => !id.includes('|') && !pset.has(id) && allowed(id)));
    const newRev = nw.filter((id) => id.includes('|'));
    const newPick = newIds.slice(0, newLeft).concat(newRev.slice(0, Math.max(0, newLeft)));
    rev.sort((a, b) => S.cards[a].due - S.cards[b].due);
    learn.sort((a, b) => S.cards[a].due - S.cards[b].due);
    return { learn, rev: rev.slice(0, st.maxRev), nw: opts.noNew ? [] : newPick, newLeft, totalNew: nw.length };
  }

  function counts(words) {
    const q = queue(words);
    return { nw: q.nw.length, learn: q.learn.length, rev: q.rev.length };
  }

  function streak() {
    let n = 0; let t = Date.now();
    if (!S.log[dayKey(t)]) t -= DAY; // today not done yet doesn't break streak
    while (S.log[dayKey(t)] && S.log[dayKey(t)].n > 0) { n += 1; t -= DAY; }
    return n;
  }

  function wordState(w) {
    if (S.known[w]) return 'known';
    const c = S.cards[w];
    if (!c) return 'new';
    if (c.s === 'learn' || c.s === 'relearn') return 'learn';
    return c.ivl >= 21 ? 'mature' : 'young';
  }

  function prioritize(w) { S.prio = (S.prio || []).filter((x) => x !== w); S.prio.unshift(w); rollDay(); if (S.daily.newDone >= S.settings.newPerDay + (S.daily.extraNew || 0)) S.daily.extraNew = (S.daily.extraNew || 0) + 1; save(); }
  function markKnown(w, on) { if (on) S.known[w] = Date.now(); else delete S.known[w]; save(); }
  function reset(w) { delete S.cards[w]; delete S.cards[w + '|r']; delete S.known[w]; save(); }
  function addExtraNew(n) { rollDay(); S.daily.extraNew = (S.daily.extraNew || 0) + n; save(); }

  function exportJSON() { return JSON.stringify(S); }
  function importJSON(txt) { const s = JSON.parse(txt); if (!s || typeof s !== 'object' || !s.cards) throw new Error('bad file'); S = { ...fresh(), ...s, settings: { ...DEFAULTS, ...(s.settings || {}) } }; save(true); }
  function wipe() { S = fresh(); save(true); }

  root.SRS = {
    get state() { return S; }, get settings() { return S.settings; }, save, get, stateOf, answer, undo, preview, queue, counts,
    streak, wordState, markKnown, prioritize, reset, addExtraNew, exportJSON, importJSON, wipe, dayKey, fmt, DAY, MIN, rollDay
  };
})(window);
