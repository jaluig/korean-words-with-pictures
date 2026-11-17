/* Mini games: picture quiz, word quiz, listening, sentence cloze, memory, typing, speed true/false. */
(function (root) {
  'use strict';
  const A = root.App; const { $, esc, pic, shuffle, sfx, confetti, speakBtn } = A;

  const GAMES = [
    { id: 'pic', name: '그림 고르기', sub: '단어를 보고 그림을 골라요', icon: '🖼️ 50 50 80' },
    { id: 'word', name: '단어 고르기', sub: '그림을 보고 단어를 골라요', icon: '💬 50 50 80' },
    { id: 'listen', name: '듣고 고르기', sub: '듣고 그림을 골라요', icon: '🎧 50 50 80' },
    { id: 'cloze', name: '빈칸 채우기', sub: '예문의 빈칸에 맞는 그림', icon: '🧩 50 50 80' },
    { id: 'memory', name: '짝 맞추기', sub: '단어와 그림 짝을 찾아요', icon: '🃏 50 50 80' },
    { id: 'type', name: '단어 쓰기', sub: '그림을 보고 한글로 써요', icon: '⌨️ 50 50 80' },
    { id: 'speed', name: '스피드 O/X', sub: '60초! 맞아요? 틀려요?', icon: '⚡ 50 50 80' },
    { id: 'order', name: '문장 만들기', sub: '단어를 순서대로 놓아요', icon: '🧱 50 50 80' }
  ];

  function poolFor(mode) {
    const all = A.words;
    const learned = all.filter((w) => SRS.wordState(w.w) !== 'new');
    if (mode === 'learned') return learned;
    if (mode === 'all') return all;
    if (mode && mode.startsWith('c:')) return all.filter((w) => w.c === mode.slice(2));
    if (mode && mode.startsWith('l:')) return all.filter((w) => String(w.l) === mode.slice(2));
    return learned.length >= 8 ? learned : all.filter((w) => w.l === 1);
  }
  function distract(w, pool, n) {
    const all = A.words;
    const same = shuffle(all.filter((x) => x.c === w.c && x.w !== w.w));
    const other = shuffle(pool.filter((x) => x.w !== w.w && x.c !== w.c));
    const rest = shuffle(all.filter((x) => x.w !== w.w));
    const out = [];
    for (const x of [...same.slice(0, 2), ...other, ...rest]) { if (out.length >= n) break; if (!out.includes(x) && x.pic !== w.pic) out.push(x); }
    return out;
  }

  root.App.views.games = (app) => {
    let mode = sessionStorage.getItem('kwp-gpool') || '';
    const cats = Object.keys(A.CATS).filter((c) => A.words.some((w) => w.c === c));
    app.innerHTML = `<h1>게임 <span class="en">Games</span></h1>
      <div class="row" style="margin-bottom:16px"><span class="sub">단어:</span>
        <select id="gpool">
          <option value="">자동 (배운 단어)</option><option value="learned">배운 단어만</option><option value="all">모든 단어</option>
          ${[...new Set(A.words.map((w) => w.l))].sort().map((l) => `<option value="l:${l}">${l}단계</option>`).join('')}
          ${cats.map((c) => `<option value="c:${c}">${A.CATS[c][1]} ${A.CATS[c][0]}</option>`).join('')}
        </select><span class="sub" id="gcount"></span></div>
      <div class="game-menu">${GAMES.map((g) => `<a class="game-tile" href="#/game/${g.id}"><div class="gi">${Scene.render(g.icon, { cls: 'still-bg' })}</div><b>${g.name}</b><span>${g.sub}</span></a>`).join('')}</div>`;
    const sel = $('#gpool'); sel.value = mode;
    const upd = () => { $('#gcount').textContent = `${poolFor(mode).length}개`; };
    sel.onchange = () => { mode = sel.value; sessionStorage.setItem('kwp-gpool', mode); upd(); };
    upd();
  };

  root.App.views.game = (app, [id]) => {
    const pool = poolFor(sessionStorage.getItem('kwp-gpool') || '');
    if (pool.length < 4) { app.innerHTML = '<div class="empty">단어가 부족해요. 먼저 공부를 조금 해 보세요! <br><br><a class="btn" href="#/games">←</a></div>'; return; }
    const g = GAMES.find((x) => x.id === id) || GAMES[0];
    if (id === 'memory') return memory(app, pool, g);
    if (id === 'speed') return speed(app, pool, g);
    if (id === 'order') return order(app, pool, g);
    return quiz(app, pool, g);
  };

  function header(g, score, i, n) {
    return `<div class="ghead"><a class="icon-btn sm" href="#/games">←</a><b class="grow">${g.name}</b>${n ? `<span class="muted">${i}/${n}</span>` : ''}<span class="score">⭐ ${score}</span></div>`;
  }

  function results(app, g, score, n, wrong) {
    app.innerHTML = `<div class="gamebox"><div class="panel result">
      <div style="width:120px;margin:0 auto">${Scene.render(score >= n * 0.8 ? '🏆 50 50 80 b' : score >= n * 0.5 ? '👍 50 50 80 b' : '💪 50 50 80 b', { cls: 'still-bg' })}</div>
      <div class="big">${score} / ${n}</div>
      <p class="sub">${score === n ? '완벽해요! 🎉' : score >= n * 0.8 ? '아주 잘했어요!' : score >= n * 0.5 ? '잘했어요!' : '다시 해 봐요!'}</p>
      ${wrong.length ? `<h3 style="margin-top:16px">다시 볼 단어</h3><div class="wgrid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${wrong.map((w) => `<div class="wcard" data-open="${esc(w.w)}">${pic(w, { lazy: true })}<div class="ww">${esc(w.w)}</div></div>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:18px"><button class="btn pri" data-again>다시 하기 🔁</button><a class="btn" href="#/games">다른 게임</a></div>
    </div></div>`;
    if (score >= n * 0.8) confetti();
    if (score === n && n >= 5) { SRS.state.ach = SRS.state.ach || {}; SRS.state.ach.perfect = true; SRS.save(); }
    app.onclick = (e) => {
      const o = e.target.closest('[data-open]'); if (o) A.openWord(o.dataset.open);
      if (e.target.closest('[data-again]')) A.go(location.hash);
    };
  }

  /* ---- 4-option quiz family ---- */
  function quiz(app, pool, g) {
    const N = 10; let i = 0; let score = 0; const wrong = [];
    let items = shuffle(pool);
    if (g.id === 'cloze') items = items.filter((w) => w.ex.length && /\{/.test(w.ex[0]) && w.ex.some((s) => s.includes(`|${w.w}}`) || s.includes(`{${w.w}}`)));
    items = items.slice(0, N);
    if (!items.length) { app.innerHTML = '<div class="empty">문제가 없어요</div>'; return; }
    let locked = false; let typedHint = 0; let alive = true; let ime = null;
    function draw() {
      locked = false; typedHint = 0;
      const w = items[i]; const opts = shuffle([w, ...distract(w, pool, 3)]);
      let q = ''; let o = '';
      if (g.id === 'pic') {
        q = `<div class="q-word">${esc(w.w)} ${speakBtn(w.w)}</div>`;
        o = `<div class="opts">${opts.map((x) => `<button class="opt" data-a="${esc(x.w)}">${pic(x)}</button>`).join('')}</div>`;
      } else if (g.id === 'word') {
        q = `<div class="q-pic">${pic(w)}</div>`;
        o = `<div class="opts">${opts.map((x) => `<button class="opt txt" data-a="${esc(x.w)}">${esc(x.w)}</button>`).join('')}</div>`;
      } else if (g.id === 'listen') {
        q = `<div class="q-word"><button class="btn pri big" data-say="${esc(w.w)}">🔊 듣기</button></div>`;
        o = `<div class="opts">${opts.map((x) => `<button class="opt" data-a="${esc(x.w)}">${pic(x)}</button>`).join('')}</div>`;
        setTimeout(() => TTS.speak(w.w), 250);
      } else if (g.id === 'cloze') {
        const s = w.ex.find((x) => x.includes(`|${w.w}}`) || x.includes(`{${w.w}}`));
        q = `<div class="panel" style="text-align:center;margin-bottom:14px"><div class="sent" style="font-size:24px">${A.clozeHTML(s, w.w)}</div></div>`;
        o = `<div class="opts">${opts.map((x) => `<button class="opt" data-a="${esc(x.w)}">${pic(x)}</button>`).join('')}</div>`;
      } else if (g.id === 'type') {
        q = `<div class="q-pic" style="width:min(52%,230px)">${pic(w)}</div><div class="sub" style="text-align:center">${Array.from(w.w).map(() => '◻︎').join(' ')}</div>`;
        const kbOn = localStorage.getItem('kwp-kb') !== '0';
        o = `<div class="type-in"><input type="text" id="tin" autocomplete="off" autocapitalize="off" spellcheck="false" lang="ko" placeholder="한글로 쓰세요" ${kbOn ? 'inputmode="none"' : ''}><button class="btn pri" data-check>확인</button></div>
             <div class="row" style="justify-content:center;margin-top:8px"><button class="btn sm ghost" data-hint>💡 힌트</button><button class="btn sm ghost" data-skip>모르겠어요</button><button class="btn sm ghost" data-kb>⌨️ ${kbOn ? '자판 숨기기' : '한글 자판'}</button></div>
             <div class="kb" id="kb" ${kbOn ? '' : 'hidden'}></div>`;
      }
      app.innerHTML = `<div class="gamebox">${header(g, score, i + 1, items.length)}${q}${o}<div class="feedback" id="fb"></div></div>`;
      const tin = $('#tin');
      if (tin) {
        ime = root.Hangul ? root.Hangul.attach(tin, $('#kb'), { onenter: (v) => check(v) }) : null;
        tin.focus(); tin.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) check(tin.value); };
      }
    }
    function after(ok, w, el) {
      locked = true;
      if (ok) { score++; sfx(true); } else { wrong.push(w); sfx(false); }
      const fb = $('#fb');
      fb.className = `feedback ${ok ? 'ok' : 'no'}`;
      fb.innerHTML = ok ? '맞아요! ⭕' : `틀렸어요 ❌ — <b>${esc(w.w)}</b>`;
      if (g.id !== 'listen' || !ok) TTS.speak(w.w);
      if (el) el.classList.add(ok ? 'right' : 'wrong');
      setTimeout(() => { if (!alive) return; i++; if (i >= items.length) results(app, g, score, items.length, wrong); else draw(); }, ok ? 900 : 1900);
    }
    function check(val) {
      if (locked) return; const w = items[i];
      const ok = val.trim().replace(/\s+/g, '') === w.w.replace(/\s+/g, '');
      if (!ok && g.id === 'type') { if (!val.trim()) return; }
      if (!ok) { $('#tin').value = w.w; }
      after(ok, w);
    }
    app.onclick = (e) => {
      if (e.target.closest('[data-say]')) return;
      const b = e.target.closest('[data-a]');
      if (b && !locked) {
        const w = items[i]; const ok = b.dataset.a === w.w;
        if (!ok) { const r = app.querySelector(`[data-a="${CSS.escape(w.w)}"]`); if (r) r.classList.add('right'); }
        app.querySelectorAll('.opt').forEach((x) => { if (x !== b && x.dataset.a !== w.w) x.classList.add('dim'); });
        if (g.id === 'word' || g.id === 'cloze') { /* show word labels under pictures after answering */ }
        return after(ok, w, b);
      }
      if (e.target.closest('[data-check]')) return check($('#tin').value);
      if (e.target.closest('[data-hint]')) { const w = items[i]; typedHint = Math.min(w.w.length, typedHint + 1); if (ime) ime.set(w.w.slice(0, typedHint)); else $('#tin').value = w.w.slice(0, typedHint); $('#tin').focus(); return; }
      if (e.target.closest('[data-kb]')) { const on = localStorage.getItem('kwp-kb') === '0'; localStorage.setItem('kwp-kb', on ? '1' : '0'); const kb = $('#kb'); kb.hidden = !on; const t = $('#tin'); if (on) t.setAttribute('inputmode', 'none'); else t.removeAttribute('inputmode'); e.target.closest('[data-kb]').textContent = on ? '⌨️ 자판 숨기기' : '⌨️ 한글 자판'; t.focus(); return; }
      if (e.target.closest('[data-skip]')) { if (!locked) { $('#tin').value = items[i].w; after(false, items[i]); } }
    };
    const key = (e) => {
      if (e.target.matches('input')) return;
      if (/^[1-4]$/.test(e.key)) { const b = app.querySelectorAll('.opt')[+e.key - 1]; if (b) b.click(); }
      if (e.key === 'r') { const w = items[i]; if (w) TTS.speak(w.w); }
    };
    document.addEventListener('keydown', key);
    draw();
    return () => { alive = false; document.removeEventListener('keydown', key); };
  }

  /* ---- memory ---- */
  function memory(app, pool, g) {
    const words = shuffle(pool).slice(0, 6);
    const cards = shuffle([...words.map((w) => ({ w, t: 'w' })), ...words.map((w) => ({ w, t: 'p' }))]);
    let open = []; let done = 0; let moves = 0; const t0 = Date.now(); let lock = false; let alive = true;
    app.innerHTML = `<div class="gamebox">${header(g, 0)}<div class="mem">${cards.map((c, i) => `<button class="mcard" data-i="${i}">?</button>`).join('')}</div><p class="sub" style="text-align:center;margin-top:12px">단어와 그림 짝을 찾으세요</p></div>`;
    const els = Array.from(app.querySelectorAll('.mcard'));
    function face(i) { const c = cards[i]; return c.t === 'w' ? `<span class="mw">${esc(c.w.w)}</span>` : pic(c.w); }
    app.onclick = (e) => {
      const b = e.target.closest('.mcard'); if (!b || lock) return;
      const i = +b.dataset.i; if (b.classList.contains('done') || open.includes(i)) return;
      b.classList.add('open'); b.innerHTML = face(i); open.push(i);
      if (cards[i].t === 'w') TTS.speak(cards[i].w.w);
      if (open.length === 2) {
        moves++; const [a, c] = open;
        if (cards[a].w.w === cards[c].w.w) {
          els[a].classList.add('done'); els[c].classList.add('done'); open = []; done++; sfx(true);
          app.querySelector('.score').textContent = `⭐ ${done}`;
          if (done === words.length) {
            const sec = Math.round((Date.now() - t0) / 1000);
            setTimeout(() => {
              if (!alive) return;
              confetti();
              app.querySelector('.gamebox').insertAdjacentHTML('beforeend', `<div class="panel result" style="margin-top:14px"><div class="big">🎉 ${sec}초</div><p class="sub">${moves}번 만에 성공!</p><button class="btn pri" data-again>다시 하기 🔁</button></div>`);
              app.querySelector('[data-again]').onclick = () => A.go(location.hash);
            }, 400);
          }
        } else {
          lock = true; sfx(false);
          els[a].classList.add('bad'); els[c].classList.add('bad');
          setTimeout(() => { [a, c].forEach((k) => { els[k].classList.remove('open', 'bad'); els[k].innerHTML = '?'; }); open = []; lock = false; }, 1000);
        }
      }
    };
    return () => { alive = false; };
  }

  /* ---- sentence building ---- */
  function order(app, pool, g) {
    const N = 8; let i = 0; let score = 0; const wrong = [];
    const pickS = (w) => w.ex.find((x) => A.plain(x).split(' ').length >= 3 && A.plain(x).split(' ').length <= 7);
    const items = shuffle(pool.filter(pickS)).slice(0, N);
    if (!items.length) { app.innerHTML = '<div class="empty">문제가 없어요</div>'; return; }
    let parts = []; let bank = []; let picked = []; let done = false; let sent = ''; let alive = true;
    function draw() {
      const w = items[i]; sent = pickS(w); parts = A.plain(sent).split(' ');
      do { bank = shuffle(parts.map((t, k) => ({ t, k }))); } while (bank.length > 1 && bank.map((b) => b.t).join(' ') === parts.join(' '));
      picked = []; done = false; paint();
    }
    function paint() {
      const w = items[i];
      app.innerHTML = `<div class="gamebox">${header(g, score, i + 1, items.length)}
        <div class="q-pic" style="width:min(48%,200px)">${pic(w)}</div>
        <div class="order-line">${picked.map((p, k) => `<button class="chunk on" data-back="${k}">${esc(p.t)}</button>`).join('') || '<span class="muted">단어를 눌러서 문장을 만드세요</span>'}</div>
        <div class="order-bank">${bank.map((b, k) => `<button class="chunk" data-pick="${k}" ${picked.includes(b) ? 'disabled' : ''}>${esc(b.t)}</button>`).join('')}</div>
        <div class="feedback" id="fb"></div>
        ${done ? `<div class="panel" style="margin-top:10px;text-align:center"><div class="sent">${A.sentHTML(sent, w.w)}</div></div>` : ''}
      </div>`;
    }
    function check() {
      const ok = picked.map((p) => p.t).join(' ') === parts.join(' ');
      done = true; if (ok) { score++; sfx(true); } else { sfx(false); wrong.push(items[i]); }
      paint();
      const fb = $('#fb'); fb.className = `feedback ${ok ? 'ok' : 'no'}`; fb.textContent = ok ? '맞아요! ⭕' : '틀렸어요 ❌';
      TTS.speak(A.plain(sent));
      setTimeout(() => { if (!alive) return; i++; if (i >= items.length) results(app, g, score, items.length, wrong); else draw(); }, ok ? 1800 : 3200);
    }
    app.onclick = (e) => {
      if (done) return;
      const p = e.target.closest('[data-pick]'); const b = e.target.closest('[data-back]');
      if (p) { picked.push(bank[+p.dataset.pick]); paint(); if (picked.length === parts.length) check(); }
      if (b) { picked.splice(+b.dataset.back, 1); paint(); }
    };
    draw();
    return () => { alive = false; };
  }

  /* ---- speed true/false ---- */
  function speed(app, pool, g) {
    let score = 0; let n = 0; let left = 60; const wrong = []; let cur = null; let truth = true;
    function nextQ() {
      const w = shuffle(pool)[0]; truth = Math.random() < 0.5;
      const shown = truth ? w : distract(w, pool, 1)[0];
      cur = { w, shown };
      app.querySelector('#sq').innerHTML = `<div class="q-pic" style="width:min(60%,240px)">${pic(shown)}</div><div class="q-word">${esc(w.w)}</div>`;
    }
    app.innerHTML = `<div class="gamebox">${header(g, 0)}<div class="progress" style="margin-bottom:12px"><i id="tbar" style="width:100%"></i></div><div id="sq"></div>
      <div class="opts"><button class="opt txt" data-tf="1" style="color:var(--green)">⭕ 맞아요</button><button class="opt txt" data-tf="0" style="color:var(--red)">❌ 틀려요</button></div>
      <p class="sub" style="text-align:center">← / → 키도 돼요</p></div>`;
    nextQ();
    const timer = setInterval(() => {
      left -= 0.1; const bar = $('#tbar'); if (bar) bar.style.width = `${(left / 60) * 100}%`;
      if (left <= 0) { clearInterval(timer); results(app, g, score, n, wrong.slice(0, 12)); }
    }, 100);
    function ans(v) {
      n++; const ok = v === truth;
      if (ok) { score++; sfx(true); } else { sfx(false); if (!wrong.includes(cur.w)) wrong.push(cur.w); }
      app.querySelector('.score').textContent = `⭐ ${score}`;
      const sq = $('#sq'); sq.style.transition = 'none'; sq.style.opacity = '.3'; setTimeout(() => { sq.style.transition = 'opacity .15s'; sq.style.opacity = '1'; }, 30);
      nextQ();
    }
    app.onclick = (e) => { const b = e.target.closest('[data-tf]'); if (b && left > 0) ans(b.dataset.tf === '1'); };
    const key = (e) => { if (left <= 0) return; if (e.key === 'ArrowLeft' || e.key === 'o') ans(true); if (e.key === 'ArrowRight' || e.key === 'x') ans(false); };
    document.addEventListener('keydown', key);
    return () => { clearInterval(timer); document.removeEventListener('keydown', key); };
  }
})(window);
