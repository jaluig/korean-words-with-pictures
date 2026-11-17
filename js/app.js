/* Main app: routing, views (home, study, words, stats, settings), sentence hover pictures. */
(function (root) {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CATS = {
    people: ['사람', '🧑‍🤝‍🧑'], family: ['가족', '👨‍👩‍👧'], body: ['몸', '💪'], food: ['음식', '🍚'], drink: ['음료', '🥤'],
    fruit: ['과일·채소', '🍎'], animal: ['동물', '🐶'], nature: ['자연', '🌳'], weather: ['날씨·계절', '⛅'],
    place: ['장소', '🏠'], home: ['집·물건', '🛋️'], thing: ['물건', '🎒'], clothes: ['옷', '👕'], transport: ['교통', '🚌'],
    time: ['시간', '⏰'], number: ['숫자', '🔢'], color: ['색깔', '🎨'], action: ['동작', '🏃'], daily: ['생활', '🪥'],
    feeling: ['감정', '😊'], describe: ['모양·상태', '📏'], position: ['위치', '📍'], question: ['질문', '❓'],
    job: ['직업', '🧑‍⚕️'], school: ['학교', '🏫'], hobby: ['취미', '🎨'], shop: ['쇼핑', '🛍️'], other: ['기타', '✨']
  };
  const POS = { n: '명사', v: '동사', a: '형용사', ad: '부사', pr: '대명사', nu: '수사', d: '관형사', x: '감탄사', p: '표현' };

  const DICT = new Map();
  let WORDLIST = [];

  function prepare() {
    const seen = new Set();
    WORDLIST = (root.WORDS || []).filter((w) => { if (!w || !w.w || seen.has(w.w)) return false; seen.add(w.w); return true; });
    WORDLIST.forEach((w, i) => { w.i = i; w.l = w.l || 1; w.c = w.c || 'other'; w.ex = w.ex || []; DICT.set(w.w, w); });
  }
  function orderedWords() {
    return WORDLIST.slice().sort((a, b) => (a.l - b.l) || (a.i - b.i));
  }

  /* ---------- sentence markup:  {form|lemma} or {form} ---------- */
  const TOK = /\{([^}|]+)(?:\|([^}]+))?\}/g;
  function sentHTML(s, focus) {
    return esc(s).replace(TOK, (m, form, lem) => {
      lem = lem || form;
      const has = DICT.has(lem);
      const cls = ['tok']; if (has) cls.push('has'); if (focus && lem === focus) cls.push('focus');
      return `<span class="${cls.join(' ')}" data-l="${esc(lem)}">${form}</span>`;
    });
  }
  const plain = (s) => String(s).replace(TOK, '$1');
  function clozeHTML(s, focus) {
    return esc(s).replace(TOK, (m, form, lem) => ((lem || form) === focus ? '<span class="blank">&nbsp;</span>' : `<span class="tok${DICT.has(lem || form) ? ' has' : ''}" data-l="${esc(lem || form)}">${form}</span>`));
  }

  const pic = (w, opts = {}) => Scene.render(w.pic, { seed: w.w, ...opts });

  /* ---------- hover / tap popup for words inside sentences ---------- */
  const pop = () => $('#pop');
  let popFor = null; let hideT = null;
  function showPop(el) {
    const w = DICT.get(el.dataset.l); if (!w) return;
    clearTimeout(hideT);
    $$('.tok.act').forEach((t) => t.classList.remove('act'));
    el.classList.add('act');
    const p = pop(); popFor = el;
    const form = el.textContent;
    p.innerHTML = `${pic(w)}<div class="pw">${esc(w.w)}${form !== w.w ? '' : ''}</div>`;
    p.hidden = false;
    const r = el.getBoundingClientRect(); const pw = p.offsetWidth; const ph = p.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2; x = Math.max(8, Math.min(window.innerWidth - pw - 8, x));
    let y = r.top - ph - 8; if (y < 8) y = r.bottom + 8;
    p.style.left = `${x}px`; p.style.top = `${y}px`;
  }
  function hidePop(delay = 0) {
    clearTimeout(hideT);
    hideT = setTimeout(() => { pop().hidden = true; popFor = null; $$('.tok.act').forEach((t) => t.classList.remove('act')); }, delay);
  }
  function bindPop() {
    let touch = false;
    document.addEventListener('touchstart', () => { touch = true; }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      if (touch) return;
      const t = e.target.closest('.tok.has'); if (t) showPop(t);
    });
    document.addEventListener('mouseout', (e) => {
      if (touch) return;
      const t = e.target.closest('.tok.has'); if (t && !t.contains(e.relatedTarget)) hidePop(80);
    });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.tok.has');
      if (t) { e.stopPropagation(); if (popFor === t && !pop().hidden) { openWord(t.dataset.l); hidePop(); } else showPop(t); return; }
      if (e.target.closest('#pop')) { if (popFor) { openWord(popFor.dataset.l); hidePop(); } return; }
      hidePop();
    }, true);
    window.addEventListener('scroll', () => hidePop(), { passive: true });
  }

  /* ---------- small helpers ---------- */
  function toast(msg, ms = 1800) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
  }
  function confetti(n = 40) {
    if (!SRS.settings.anim) return;
    const em = ['🎉', '✨', '⭐', '💜', '🎊', '🌸'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div'); s.className = 'confetti';
      s.textContent = em[i % em.length]; s.style.left = `${Math.random() * 100}vw`;
      s.style.animationDuration = `${1.8 + Math.random() * 2}s`; s.style.animationDelay = `${Math.random() * 0.6}s`;
      s.style.fontSize = `${16 + Math.random() * 18}px`;
      document.body.appendChild(s); setTimeout(() => s.remove(), 4500);
    }
  }
  let actx = null;
  function sfx(ok) {
    if (!SRS.settings.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime;
      if (ok) { o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.09); } else { o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(160, t + 0.12); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.start(t); o.stop(t + 0.3);
    } catch (e) { /* ignore */ }
  }
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const speakBtn = (text, cls = '') => `<button class="icon-btn ${cls}" data-say="${esc(plain(text))}" title="듣기">🔊</button>`;
  function stateLabel(s) { return { new: '새 단어', learn: '학습 중', young: '복습 중', mature: '잘 알아요', known: '이미 알아요' }[s]; }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-say]');
    if (b) { e.preventDefault(); e.stopPropagation(); TTS.speak(b.dataset.say); }
  });

  /* ---------- router ---------- */
  const views = {};
  let current = null; let cleanup = null;
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, ...rest] = h.split('/');
    const v = name || 'home';
    if (cleanup) { cleanup(); cleanup = null; }
    hidePop(); closeModal();
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === v || (v === 'game' && a.dataset.v === 'games') || (v === 'story' && a.dataset.v === 'read')));
    const fn = views[v] || views.home; current = v;
    const app = $('#app');
    app.innerHTML = '';
    const r = fn(app, rest.map(decodeURIComponent));
    if (typeof r === 'function') cleanup = r;
    window.scrollTo(0, 0);
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }

  /* ---------- modal: word detail ---------- */
  function closeModal() { const m = $('#modal'); if (m) { m.hidden = true; m.innerHTML = ''; } }
  function openWord(wkey) {
    const w = DICT.get(wkey); if (!w) return;
    const m = $('#modal'); const st = SRS.wordState(w.w); const c = SRS.get(w.w);
    const rel = WORDLIST.filter((x) => x.c === w.c && x.w !== w.w).slice(0, 12);
    let due = '';
    if (c && c.due) { const d = c.due - Date.now(); due = d <= 0 ? '지금 복습' : `다음 복습: ${SRS.fmt(d)} 후`; }
    m.innerHTML = `<div class="modal-box">
      <button class="icon-btn sm modal-close" data-close>✕</button>
      <div class="detail-word">${esc(w.w)} ${speakBtn(w.w)}</div>
      <div class="row" style="gap:6px"><span class="chip">${POS[w.p] || ''}</span><span class="chip">${CATS[w.c] ? CATS[w.c][0] : ''}</span><span class="chip">${w.l}단계</span><span class="chip"><i class="dot ${st}" style="width:9px;height:9px;border-radius:50%;display:inline-block"></i> ${stateLabel(st)}</span></div>
      <div class="detail-pic">${pic(w)}</div>
      <div class="stack">${w.ex.map((s) => `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="sent grow">${sentHTML(s, w.w)}</div>${speakBtn(s, 'sm')}</div>`).join('')}</div>
      <div class="sub" style="margin-top:12px">${due}</div>
      <div class="row" style="margin-top:12px">
        ${st === 'new' ? '<button class="btn sm pri" data-learn>지금 배우기 ▶</button>' : ''}
        ${st === 'known' ? '<button class="btn sm" data-unknown>다시 공부하기</button>' : '<button class="btn sm" data-known>이미 알아요 ✓</button>'}
        ${c ? '<button class="btn sm ghost" data-reset>초기화</button>' : ''}
      </div>
      ${rel.length ? `<h3 style="margin-top:18px;font-size:15px">${CATS[w.c] ? CATS[w.c][0] : ''}</h3><div class="related">${rel.map((r) => `<div class="wcard" data-open="${esc(r.w)}">${pic(r, { lazy: true })}<div class="ww">${esc(r.w)}</div></div>`).join('')}</div>` : ''}
    </div>`;
    m.hidden = false;
    m.onclick = (e) => {
      if (e.target === m || e.target.closest('[data-close]')) return closeModal();
      const o = e.target.closest('[data-open]'); if (o) return openWord(o.dataset.open);
      if (e.target.closest('[data-learn]')) { SRS.prioritize(w.w); closeModal(); go('#/study'); return; }
      if (e.target.closest('[data-known]')) { SRS.markKnown(w.w, true); toast('이미 아는 단어로 표시했어요'); openWord(w.w); refreshIfWords(); }
      if (e.target.closest('[data-unknown]')) { SRS.markKnown(w.w, false); openWord(w.w); refreshIfWords(); }
      if (e.target.closest('[data-reset]')) { SRS.reset(w.w); openWord(w.w); refreshIfWords(); }
    };
    if (SRS.settings.autoplay) TTS.speak(w.w);
  }
  function refreshIfWords() { if (current === 'words' && views.words.refresh) views.words.refresh(); }

  /* ================= HOME ================= */
  views.home = (app) => {
    const words = orderedWords(); const cnt = SRS.counts(words); const total = cnt.nw + cnt.learn + cnt.rev;
    const S = SRS.state; const today = S.log[SRS.dayKey()] || { n: 0, nw: 0 };
    const states = { new: 0, learn: 0, young: 0, mature: 0, known: 0 };
    words.forEach((w) => { states[SRS.wordState(w.w)]++; });
    const learned = states.young + states.mature + states.known;
    const lv = {};
    words.forEach((w) => { const L = lv[w.l] || (lv[w.l] = { t: 0, m: 0, y: 0, l: 0 }); L.t++; const s = SRS.wordState(w.w); if (s === 'mature' || s === 'known') L.m++; else if (s === 'young') L.y++; else if (s === 'learn') L.l++; });
    const pool = words.filter((w) => SRS.wordState(w.w) !== 'new');
    const wotdPool = pool.length > 4 ? pool : words.filter((w) => w.l === 1);
    const day = Math.floor(Date.now() / SRS.DAY);
    const wotd = wotdPool.length ? wotdPool[(day * 7919) % wotdPool.length] : null;
    const hr = new Date().getHours();
    const greet = hr < 5 ? '늦은 밤이에요 🌙' : hr < 11 ? '좋은 아침이에요! ☀️' : hr < 18 ? '안녕하세요! 👋' : '좋은 저녁이에요 🌆';
    app.innerHTML = `
    <div class="home-grid">
      <section class="hero">
        <h1>${greet}</h1>
        <div class="sub">${total ? '오늘 공부할 카드가 있어요.' : '오늘 공부 끝! 내일 또 만나요.'}</div>
        <div class="dues">
          <div class="due"><b>${cnt.nw}</b><span>새 카드</span></div>
          <div class="due"><b>${cnt.learn}</b><span>학습 중</span></div>
          <div class="due"><b>${cnt.rev}</b><span>복습</span></div>
        </div>
        <a class="btn big" href="#/study">${total ? '공부 시작 ▶' : '더 공부하기 ▶'}</a>
        <div class="hero-deco">${Scene.render(total ? '📚 50 55 70 fl' : '🏆 50 55 70 fl', { cls: 'still-bg' })}</div>
      </section>
      <section class="panel">
        <h2>오늘 <span class="en">Today</span></h2>
        <div class="stat-tiles">
          <div class="tile"><b>🔥 ${SRS.streak()}</b><span>연속 일수</span></div>
          <div class="tile"><b>${today.n || 0}</b><span>오늘 복습</span></div>
          <div class="tile"><b>${learned}</b><span>배운 단어</span></div>
        </div>
        <a class="ach-link" href="#/stats">🏅 업적 ${achievements().filter((a) => a[3]).length}/${achievements().length} →</a>
        <h2 style="margin-top:18px">단계 <span class="en">Levels</span></h2>
        ${Object.keys(lv).sort((a, b) => a - b).map((k) => { const L = lv[k]; const p = (x) => (x / L.t) * 100; return `<div class="lvl"><b>${k}단계</b><div class="bar"><i class="b-m" style="width:${p(L.m)}%"></i><i class="b-y" style="width:${p(L.y)}%"></i><i class="b-l" style="width:${p(L.l)}%"></i></div><span class="muted">${L.m + L.y}/${L.t}</span></div>`; }).join('')}
      </section>
    </div>
    ${wotd ? `<section class="panel" style="margin-top:18px">
      <h2>오늘의 단어 <span class="en">Word of the day</span></h2>
      <div class="wotd"><div data-open="${esc(wotd.w)}" style="cursor:pointer">${pic(wotd)}</div>
      <div><div class="w">${esc(wotd.w)} ${speakBtn(wotd.w, 'sm')}</div>${wotd.ex[0] ? `<div class="sent">${sentHTML(wotd.ex[0], wotd.w)}</div>` : ''}</div></div>
    </section>` : ''}
    <section style="margin-top:18px" class="quick">
      <a href="#/words"><span class="qi">📚</span><b>단어장</b><span>${words.length}개 단어 · Browse</span></a>
      <a href="#/read"><span class="qi">📖</span><b>읽기</b><span>그림 이야기 · Stories</span></a>
      <a href="#/games"><span class="qi">🎮</span><b>게임</b><span>퀴즈 · Games</span></a>
      <a href="#/stats"><span class="qi">📈</span><b>통계</b><span>Progress</span></a>
    </section>
    <section class="panel" style="margin-top:18px">
      <h2>공부 기록 <span class="en">Activity</span></h2>
      ${heatmap(18)}
    </section>
    <div class="foot">그림: Microsoft Fluent Emoji (MIT) · 음성: 브라우저 TTS</div>`;
    app.onclick = (e) => { const o = e.target.closest('[data-open]'); if (o) openWord(o.dataset.open); };
  };

  function heatmap(weeks) {
    const log = SRS.state.log; const out = [];
    const now = new Date(); const dow = (now.getDay() + 6) % 7; // monday=0
    const start = new Date(now); start.setDate(now.getDate() - dow - (weeks - 1) * 7);
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const n = log[k] ? log[k].n : 0;
      const lvl = n === 0 ? '' : n < 10 ? 'h1' : n < 30 ? 'h2' : n < 60 ? 'h3' : 'h4';
      out.push(`<i class="${d > now ? 'fut' : lvl}" title="${k}: ${n}"></i>`);
    }
    return `<div class="heat">${out.join('')}</div>`;
  }

  /* ================= STUDY ================= */
  views.study = (app) => {
    const words = orderedWords();
    let q = null; let cur = null; let flipped = false; let shownAt = 0; let doneCount = 0; let startTotal = 0;
    function build() { q = SRS.queue(words); startTotal = startTotal || (q.nw.length + q.learn.length + q.rev.length); }
    function pick() {
      build();
      const now = Date.now();
      const dueLearn = q.learn.filter((id) => SRS.get(id).due <= now);
      // interleave: learning due first, then mix new into reviews
      if (dueLearn.length) return dueLearn[0];
      const ratio = q.rev.length && q.nw.length ? (doneCount % 3 === 2) : !q.rev.length;
      if (q.nw.length && (ratio || !q.rev.length)) return q.nw[0];
      if (q.rev.length) return q.rev[0];
      if (q.nw.length) return q.nw[0];
      if (q.learn.length) { const soon = q.learn.filter((id) => SRS.get(id).due <= now + 20 * SRS.MIN); if (soon.length) return soon[0]; }
      return null;
    }
    function counts() {
      return `<div class="cnts"><span class="c-n ${cur && !SRS.get(cur) ? 'cur' : ''}">${q.nw.length}</span><span class="c-l ${cur && SRS.get(cur) && /learn/.test(SRS.get(cur).s) ? 'cur' : ''}">${q.learn.length}</span><span class="c-r ${cur && SRS.get(cur) && SRS.get(cur).s === 'rev' ? 'cur' : ''}">${q.rev.length}</span></div>`;
    }
    function next() {
      cur = pick(); flipped = false;
      if (!cur) return finish();
      shownAt = Date.now();
      draw();
      const w = DICT.get(cur.split('|')[0]);
      if (cur.endsWith('|l') || (SRS.settings.autoplay && !cur.endsWith('|r'))) TTS.speak(w.w);
    }
    function draw(anim) {
      const isRev = cur.endsWith('|r'); const isListen = cur.endsWith('|l'); const w = DICT.get(cur.split('|')[0]);
      const left = q.nw.length + q.learn.length + q.rev.length;
      const pct = startTotal ? Math.min(100, (doneCount / (doneCount + left)) * 100) : 0;
      const sents = SRS.settings.showAllSentences ? w.ex : w.ex.slice(0, 1);
      let body;
      if (!flipped) {
        body = isListen
          ? `<div style="margin:auto 0 10px"><button class="btn pri big listen-btn" data-say="${esc(w.w)}">🔊</button></div><div class="hint">듣고 그림을 떠올려 보세요 🎧</div>`
          : isRev
          ? `<div class="pic-wrap" style="margin:auto 0 0">${pic(w)}</div>${w.ex[0] ? `<div class="cloze">${clozeHTML(w.ex[0], w.w)}</div>` : ''}<div class="hint">무슨 단어일까요?</div>`
          : `<div class="front-word">${esc(w.w)}</div><div>${speakBtn(w.w)}</div><div class="hint">이 단어의 그림은? 생각해 보세요 🤔</div>`;
      } else {
        body = `<div class="back-word">${esc(w.w)} ${speakBtn(w.w, 'sm')}</div>
          <div class="pic-wrap">${pic(w)}</div>
          <div class="sents">${sents.map((s) => `<div class="sline"><div class="sent">${sentHTML(s, w.w)}</div>${speakBtn(s, 'sm')}</div>`).join('')}</div>`;
      }
      const pv = flipped ? SRS.preview(cur) : null;
      app.innerHTML = `<div class="study">
        <div class="study-top"><a class="icon-btn sm" href="#/" title="홈">←</a><div class="progress"><i style="width:${pct}%"></i></div>${counts()}</div>
        <div class="card ${anim ? 'flip' : ''}">${body}</div>
        ${flipped
    ? `<div class="answers">
            <button class="g1" data-g="1">다시<small>${pv[0]}</small></button>
            <button class="g2" data-g="2">어려움<small>${pv[1]}</small></button>
            <button class="g3" data-g="3">알맞음<small>${pv[2]}</small></button>
            <button class="g4" data-g="4">쉬움<small>${pv[3]}</small></button></div>`
    : '<button class="btn pri big show-btn" data-show>정답 보기 <span class="kbd">Space</span></button>'}
        <div class="row" style="justify-content:space-between;margin-top:12px">
          <button class="btn sm ghost" data-undo>↶ 되돌리기</button>
          <button class="btn sm ghost" data-info>ℹ︎ 단어 정보</button>
        </div>
      </div>`;
    }
    function flip() {
      if (flipped) return; flipped = true; draw(SRS.settings.anim);
      const w = DICT.get(cur.split('|')[0]);
      if (cur.endsWith('|r') ? SRS.settings.autoplay : SRS.settings.autoplayBack) TTS.speak(cur.endsWith('|r') ? w.w : plain(w.ex[0] || w.w));
      if (cur.endsWith('|l') && !SRS.settings.autoplayBack) TTS.speak(w.w);
    }
    function grade(g) {
      if (!flipped) return;
      SRS.answer(cur, g, Date.now() - shownAt); doneCount++;
      next();
    }
    function finish() {
      build();
      const S = SRS.state; const today = S.log[SRS.dayKey()] || { n: 0, ok: 0, nw: 0 };
      const soon = q.learn.length ? Math.min(...q.learn.map((id) => SRS.get(id).due)) : 0;
      const remainingNew = q.totalNew;
      app.innerHTML = `<div class="study"><div class="panel done">
        <div class="big-emo">${Scene.render('🎉 50 50 80 b', { cls: 'still-bg' })}</div>
        <h1>오늘 공부 끝!</h1>
        <p class="sub">오늘 ${today.n}장 복습 · 새 단어 ${today.nw}개 · 정답률 ${today.n ? Math.round((today.ok / today.n) * 100) : 0}%</p>
        ${soon ? `<p class="sub">학습 중인 카드 ${q.learn.length}장 — ${SRS.fmt(Math.max(0, soon - Date.now()))} 후에 다시 나와요.</p>` : ''}
        <div class="row" style="justify-content:center;margin-top:16px">
          ${remainingNew ? '<button class="btn pri" data-more>새 단어 10개 더 📚</button>' : ''}
          <a class="btn" href="#/games">게임 하기 🎮</a>
          <a class="btn" href="#/read">읽기 📖</a>
        </div>
      </div></div>`;
      if (doneCount > 0) confetti();
    }
    app.onclick = (e) => {
      if (e.target.closest('[data-say]') || e.target.closest('.tok')) return;
      if (e.target.closest('[data-show]')) return flip();
      const g = e.target.closest('[data-g]'); if (g) return grade(+g.dataset.g);
      if (e.target.closest('[data-undo]')) { const id = SRS.undo(); if (id) { doneCount = Math.max(0, doneCount - 1); build(); cur = id; flipped = false; shownAt = Date.now(); draw(); toast('되돌렸어요'); } return; }
      if (e.target.closest('[data-info]')) { if (cur) openWord(cur.split('|')[0]); return; }
      if (e.target.closest('[data-more]')) { SRS.addExtraNew(10); next(); return; }
      if (!flipped && cur && e.target.closest('.card')) flip();
    };
    const key = (e) => {
      if (e.target.matches('input, textarea, select') || !$('#modal').hidden) return;
      if (!cur) return;
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!flipped) flip(); else grade(3); } else if (flipped && /^[1-4]$/.test(e.key)) grade(+e.key);
      else if (e.key === 'r' || e.key === 'p') { const w = DICT.get(cur.split('|')[0]); TTS.speak(w.w); } else if (e.key === 'z') { const b = $('[data-undo]'); if (b) b.click(); }
    };
    document.addEventListener('keydown', key);
    next();
    return () => document.removeEventListener('keydown', key);
  };

  /* ================= WORDS ================= */
  views.words = (app) => {
    const f = { q: '', cat: '', lv: '', st: '', hide: false, group: true };
    try { Object.assign(f, JSON.parse(sessionStorage.getItem('kwp-wf') || '{}')); } catch (e) { /* ignore */ }
    const words = orderedWords();
    const cats = Object.keys(CATS).filter((c) => words.some((w) => w.c === c));
    const lvls = [...new Set(words.map((w) => w.l))].sort((a, b) => a - b);
    app.innerHTML = `<h1>단어장 <span class="en">${words.length} words</span></h1>
      <div class="filters">
        <div class="row"><input type="search" id="wq" placeholder="검색…" value="${esc(f.q)}">
          <select id="wl"><option value="">모든 단계</option>${lvls.map((l) => `<option value="${l}" ${String(f.lv) === String(l) ? 'selected' : ''}>${l}단계</option>`).join('')}</select>
          <select id="ws"><option value="">모든 상태</option>${['new', 'learn', 'young', 'mature', 'known'].map((s) => `<option value="${s}" ${f.st === s ? 'selected' : ''}>${stateLabel(s)}</option>`).join('')}</select>
          <label class="chip ${f.hide ? 'on' : ''}" id="wh">🙈 단어 숨기기</label>
        </div>
        <div class="chips scroll" id="wc"><span class="chip ${f.cat ? '' : 'on'}" data-c="">전체</span>${cats.map((c) => `<span class="chip ${f.cat === c ? 'on' : ''}" data-c="${c}">${CATS[c][1]} ${CATS[c][0]}</span>`).join('')}</div>
        <div class="legend">${['new', 'learn', 'young', 'mature', 'known'].map((s) => `<span><i class="dot ${s}"></i>${stateLabel(s)}</span>`).join('')}</div>
      </div>
      <div id="wlist"></div>`;
    function refresh() {
      sessionStorage.setItem('kwp-wf', JSON.stringify(f));
      const list = words.filter((w) => (!f.cat || w.c === f.cat) && (!f.lv || String(w.l) === String(f.lv)) && (!f.st || SRS.wordState(w.w) === f.st) && (!f.q || w.w.includes(f.q) || w.ex.some((s) => plain(s).includes(f.q))));
      const card = (w) => `<div class="wcard" data-open="${esc(w.w)}"><i class="dot ${SRS.wordState(w.w)}"></i>${pic(w, { lazy: true })}<div class="ww">${esc(w.w)}</div></div>`;
      let html = '';
      if (!list.length) html = '<div class="empty">단어가 없어요 🫥</div>';
      else if (!f.cat && !f.q) {
        for (const c of cats) { const ws = list.filter((w) => w.c === c); if (ws.length) html += `<h2 class="cat-title">${CATS[c][1]} ${CATS[c][0]} <span class="muted" style="font-size:14px">${ws.length}</span></h2><div class="wgrid">${ws.map(card).join('')}</div>`; }
      } else html = `<div class="wgrid">${list.map(card).join('')}</div>`;
      const el = $('#wlist'); el.innerHTML = html; el.classList.toggle('hide-words', f.hide);
    }
    views.words.refresh = refresh;
    $('#wq').oninput = (e) => { f.q = e.target.value.trim(); refresh(); };
    $('#wl').onchange = (e) => { f.lv = e.target.value; refresh(); };
    $('#ws').onchange = (e) => { f.st = e.target.value; refresh(); };
    $('#wh').onclick = (e) => { f.hide = !f.hide; e.currentTarget.classList.toggle('on', f.hide); refresh(); };
    $('#wc').onclick = (e) => { const c = e.target.closest('[data-c]'); if (!c) return; f.cat = c.dataset.c; $$('#wc .chip').forEach((x) => x.classList.toggle('on', x === c)); refresh(); };
    app.addEventListener('click', (e) => { const o = e.target.closest('[data-open]'); if (o) openWord(o.dataset.open); });
    refresh();
  };

  /* ---------- achievements ---------- */
  function achievements() {
    const S = SRS.state; const words = orderedWords();
    const st = (w) => SRS.wordState(w.w);
    const learned = words.filter((w) => ['young', 'mature', 'known'].includes(st(w))).length;
    const mature = words.filter((w) => st(w) === 'mature').length;
    const totalRev = Object.values(S.log).reduce((a, b) => a + b.n, 0);
    const streak = SRS.streak(); if (streak > (S.bestStreak || 0)) { S.bestStreak = streak; SRS.save(); }
    const best = S.bestStreak || 0;
    const fullCats = Object.keys(CATS).filter((c) => { const ws = words.filter((w) => w.c === c); return ws.length >= 5 && ws.every((w) => ['young', 'mature', 'known'].includes(st(w))); });
    const reads = Object.keys(S.read || {}).length; const ach = S.ach || {};
    const lvDone = (l) => { const ws = words.filter((w) => w.l === l); return ws.length && ws.every((w) => ['young', 'mature', 'known'].includes(st(w))); };
    return [
      ['👣', '첫 걸음', 'First review', totalRev >= 1],
      ['🌱', '새싹', '10 words learned', learned >= 10],
      ['🌿', '쑥쑥', '50 words learned', learned >= 50],
      ['🌳', '나무', '100 words learned', learned >= 100],
      ['🏅', '메달', '250 words learned', learned >= 250],
      ['🏆', '트로피', '500 words learned', learned >= 500],
      ['👑', '단어 왕', 'Every word learned', learned >= words.length],
      ['🔥', '3일 연속', '3-day streak', best >= 3],
      ['⭐', '일주일', '7-day streak', best >= 7],
      ['🌟', '한 달', '30-day streak', best >= 30],
      ['💎', '백 일', '100-day streak', best >= 100],
      ['📚', '복습 100', '100 reviews', totalRev >= 100],
      ['🎓', '복습 1000', '1,000 reviews', totalRev >= 1000],
      ['🧠', '튼튼한 기억', '50 mature words (21+ days)', mature >= 50],
      ['🥇', '1단계 완료', 'All of level 1', lvDone(1)],
      ['🗂️', '주제 완료', 'Every word in one topic', fullCats.length >= 1],
      ['📖', '책벌레', 'Read 5 stories', reads >= 5],
      ['💯', '만점', 'Perfect game score', !!ach.perfect]
    ];
  }

  /* ================= STATS ================= */
  views.stats = (app) => {
    const words = orderedWords(); const S = SRS.state;
    const st = { new: 0, learn: 0, young: 0, mature: 0, known: 0 }; words.forEach((w) => st[SRS.wordState(w.w)]++);
    const logs = Object.values(S.log); const totalRev = logs.reduce((a, b) => a + b.n, 0); const totalOk = logs.reduce((a, b) => a + b.ok, 0);
    const totalT = logs.reduce((a, b) => a + (b.t || 0), 0);
    // forecast next 14 days
    const fc = Array(14).fill(0); const now = Date.now();
    Object.values(S.cards).forEach((c) => { if (c.s === 'rev') { const d = Math.max(0, Math.floor((c.due - now) / SRS.DAY) + 1); if (d < 14) fc[d]++; } else fc[0]++; });
    const mx = Math.max(1, ...fc);
    // last 14 days reviews
    const past = []; for (let i = 13; i >= 0; i--) { const k = SRS.dayKey(now - i * SRS.DAY); past.push({ k, n: S.log[k] ? S.log[k].n : 0 }); }
    const pm = Math.max(1, ...past.map((p) => p.n));
    app.innerHTML = `<h1>통계 <span class="en">Stats</span></h1>
      <div class="stack">
      <section class="panel"><div class="kv">
        <div class="tile"><b>🔥 ${SRS.streak()}</b><span>연속 일수</span></div>
        <div class="tile"><b>${st.young + st.mature + st.known}</b><span>배운 단어</span></div>
        <div class="tile"><b>${st.mature}</b><span>잘 아는 단어 (21일+)</span></div>
        <div class="tile"><b>${totalRev}</b><span>총 복습</span></div>
        <div class="tile"><b>${totalRev ? Math.round((totalOk / totalRev) * 100) : 0}%</b><span>정답률</span></div>
        <div class="tile"><b>${Math.round(totalT / 60000)}분</b><span>공부 시간</span></div>
      </div></section>
      <section class="panel"><h2>단어 상태</h2>
        <div class="bar" style="height:18px">${['mature', 'young', 'learn', 'known'].map((s) => `<i class="dot ${s}" style="width:${(st[s] / words.length) * 100}%;border-radius:0;border:0"></i>`).join('')}</div>
        <div class="legend" style="margin-top:10px">${['new', 'learn', 'young', 'mature', 'known'].map((s) => `<span><i class="dot ${s}"></i>${stateLabel(s)} ${st[s]}</span>`).join('')}</div>
      </section>
      <section class="panel"><h2>앞으로 14일 복습 <span class="en">Forecast</span></h2>
        <div class="chart">${fc.map((n, i) => `<div class="col"><b>${n || ''}</b><i style="height:${(n / mx) * 100}%"></i><span>${i === 0 ? '오늘' : `+${i}`}</span></div>`).join('')}</div></section>
      <section class="panel"><h2>지난 14일 <span class="en">Reviews</span></h2>
        <div class="chart">${past.map((p) => `<div class="col"><b>${p.n || ''}</b><i style="height:${(p.n / pm) * 100}%"></i><span>${p.k.slice(8)}</span></div>`).join('')}</div></section>
      <section class="panel"><h2>업적 <span class="en">Achievements ${achievements().filter((a) => a[3]).length}/${achievements().length}</span></h2>
        <div class="ach">${achievements().map(([e, t, en, ok]) => `<div class="ach-i ${ok ? 'ok' : ''}" title="${esc(en)}"><div class="ach-e">${Scene.render(`${e} 50 50 76${ok ? ' b' : ' g o.35'}`, { cls: 'still-bg' })}</div><b>${t}</b><span>${en}</span></div>`).join('')}</div></section>
      <section class="panel"><h2>공부 기록</h2>${heatmap(26)}</section>
      </div>`;
  };

  /* ================= SETTINGS ================= */
  views.settings = (app) => {
    const s = SRS.settings;
    const sw = (k, label, sub) => `<div class="set-row"><label for="s-${k}">${label}<span class="sub">${sub || ''}</span></label><label class="switch"><input type="checkbox" id="s-${k}" data-k="${k}" ${s[k] ? 'checked' : ''}><i></i></label></div>`;
    const voices = TTS.voices;
    app.innerHTML = `<h1>설정 <span class="en">Settings</span></h1>
    <div class="stack">
    <section class="panel">
      <h2>공부 <span class="en">Study</span></h2>
      <div class="set-row"><label>하루 새 카드<span class="sub">New cards per day</span></label><input type="number" min="0" max="200" id="s-new" value="${s.newPerDay}" style="width:90px"></div>
      <div class="set-row"><label>하루 최대 복습<span class="sub">Max reviews per day</span></label><input type="number" min="10" max="9999" id="s-rev" value="${s.maxRev}" style="width:90px"></div>
      ${sw('recog', '단어 → 그림 카드', 'Recognition: see word, recall picture')}
      ${sw('prod', '그림 → 단어 카드', 'Production: see picture, recall word (unlocks after the first card is learned)')}
      ${sw('listen', '듣기 카드', 'Listening: hear the word, recall the picture (unlocks after the first card is learned)')}
      <div class="set-row" style="display:block"><label>새 단어 주제<span class="sub">Only introduce new words from these topics / levels (none selected = all)</span></label>
        <div class="chips" id="s-lv" style="margin-top:8px">${[...new Set(orderedWords().map((w) => w.l))].map((l) => `<span class="chip ${(s.newLv || []).includes(l) ? 'on' : ''}" data-lv="${l}">${l}단계</span>`).join('')}</div>
        <div class="chips" id="s-cat" style="margin-top:8px">${Object.keys(CATS).filter((c) => WORDLIST.some((w) => w.c === c)).map((c) => `<span class="chip ${(s.newCats || []).includes(c) ? 'on' : ''}" data-cat="${c}">${CATS[c][1]} ${CATS[c][0]}</span>`).join('')}</div></div>
      ${sw('showAllSentences', '예문 모두 보기', 'Show all example sentences on the back')}
    </section>
    <section class="panel">
      <h2>소리 <span class="en">Audio</span></h2>
      ${sw('autoplay', '단어 자동 재생', 'Speak the word automatically')}
      ${sw('autoplayBack', '예문 자동 재생', 'Speak the example sentence when the answer is shown')}
      ${sw('sfx', '효과음', 'Sound effects in games')}
      <div class="set-row"><label>목소리<span class="sub">${voices.length ? 'Korean voice' : '한국어 음성이 없어요 — install a Korean voice in your OS settings'}</span></label>
        <select id="s-voice"><option value="">자동</option>${voices.map((v) => `<option ${s.voice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="set-row"><label>속도<span class="sub">Speech rate ${s.rate}</span></label><input type="range" id="s-rate" min="0.5" max="1.3" step="0.05" value="${s.rate}"></div>
      <div class="row"><button class="btn sm" data-say="안녕하세요. 만나서 반가워요.">🔊 테스트</button></div>
    </section>
    <section class="panel">
      <h2>화면 <span class="en">Display</span></h2>
      ${sw('anim', '그림 애니메이션', 'Animated pictures')}
      <div class="set-row"><label>테마<span class="sub">Theme</span></label><select id="s-theme">${[['auto', '자동'], ['light', '밝게'], ['dark', '어둡게']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="set-row"><label>글꼴<span class="sub">Word font — try handwriting to practise reading!</span></label><select id="s-font">${[['sans', '고딕'], ['round', '동글'], ['hand', '손글씨']].map(([v, l]) => `<option value="${v}" ${s.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </section>
    <section class="panel">
      <h2>데이터 <span class="en">Data</span></h2>
      <p class="sub">진도는 이 브라우저에 저장돼요. Progress is stored in this browser — export it to move it to another device.</p>
      <div class="row">
        <button class="btn" id="s-exp">⬇️ 내보내기</button>
        <label class="btn">⬆️ 가져오기<input type="file" id="s-imp" accept="application/json" hidden></label>
        <button class="btn danger" id="s-wipe">🗑️ 전부 초기화</button>
      </div>
    </section>
    <section class="panel">
      <h2>사용법 <span class="en">How to</span></h2>
      <p class="sub">• 단어를 보고 그림을 떠올려 보세요. Look at the word and imagine its picture, then flip.<br>
      • 예문의 밑줄 친 단어에 마우스를 올리면 (또는 탭하면) 그림이 나와요. Hover/tap dotted words in sentences to see their pictures. Tap again to open the word.<br>
      • 단축키: Space = 뒤집기 / 알맞음, 1–4 = 평가, R = 듣기, Z = 되돌리기.</p>
    </section>
    </div>`;
    app.onchange = (e) => {
      const t = e.target;
      if (t.dataset.k) s[t.dataset.k] = t.checked;
      if (t.id === 's-new') s.newPerDay = Math.max(0, +t.value || 0);
      if (t.id === 's-rev') s.maxRev = Math.max(10, +t.value || 10);
      if (t.id === 's-voice') s.voice = t.value;
      if (t.id === 's-theme') s.theme = t.value;
      if (t.id === 's-font') s.font = t.value;
      if (t.id === 's-imp' && t.files[0]) {
        const r = new FileReader();
        r.onload = () => { try { SRS.importJSON(r.result); toast('가져왔어요 ✓'); route(); } catch (err) { toast('파일을 읽을 수 없어요'); } };
        r.readAsText(t.files[0]); return;
      }
      SRS.save(); applyPrefs(); toast('저장했어요 ✓', 1000);
    };
    app.querySelectorAll('[data-lv],[data-cat]').forEach((el) => {
      el.onclick = () => {
        const key = el.dataset.lv ? 'newLv' : 'newCats'; const val = el.dataset.lv ? +el.dataset.lv : el.dataset.cat;
        const arr = new Set(s[key] || []); if (arr.has(val)) arr.delete(val); else arr.add(val);
        s[key] = [...arr]; el.classList.toggle('on', arr.has(val)); SRS.save(); toast('저장했어요 ✓', 1000);
      };
    });
    $('#s-rate').oninput = (e) => { s.rate = +e.target.value; e.target.previousElementSibling.querySelector('.sub').textContent = `Speech rate ${s.rate}`; SRS.save(); };
    $('#s-exp').onclick = () => {
      const blob = new Blob([SRS.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `geurim-danear-${SRS.dayKey()}.json`; a.click();
    };
    $('#s-wipe').onclick = () => { if (confirm('정말 모든 진도를 지울까요? (Delete all progress?)')) { SRS.wipe(); applyPrefs(); toast('초기화했어요'); route(); } };
  };

  function applyPrefs() {
    const s = SRS.settings; const d = document.documentElement;
    if (s.theme === 'auto') d.removeAttribute('data-theme'); else d.setAttribute('data-theme', s.theme);
    d.setAttribute('data-font', s.font || 'sans');
    document.body.classList.toggle('noanim', !s.anim);
  }

  function start() {
    prepare(); applyPrefs(); bindPop();
    window.addEventListener('hashchange', route);
    route();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  root.App = { achievements, start, views, DICT, get words() { return orderedWords(); }, pic, sentHTML, clozeHTML, plain, speakBtn, esc, shuffle, sfx, confetti, toast, openWord, go, CATS, $, $$ };
})(window);
