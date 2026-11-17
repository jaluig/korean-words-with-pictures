/* Reading: short picture stories built from the word list. Every known word can be hovered. */
(function (root) {
  'use strict';
  const A = root.App; const { $, esc, speakBtn } = A;

  function coverage(st) {
    const lemmas = new Set();
    st.p.forEach((p) => String(p.s).replace(/\{([^}|]+)(?:\|([^}]+))?\}/g, (m, f, l) => { lemmas.add(l || f); return m; }));
    const arr = [...lemmas].filter((l) => A.DICT.has(l));
    const known = arr.filter((l) => SRS.wordState(l) !== 'new');
    return { total: arr.length, known: known.length };
  }

  A.views.read = (app) => {
    const list = (root.STORIES || []).slice().sort((a, b) => (a.l || 1) - (b.l || 1));
    const read = SRS.state.read || {};
    app.innerHTML = `<h1>읽기 <span class="en">Picture stories</span></h1>
      <p class="sub">밑줄 친 단어에 마우스를 올리면 그림이 보여요. Hover or tap the dotted words.</p>
      <div class="row" style="margin:6px 0 16px"><a class="btn sm" href="#/sentences">📝 배운 단어 예문 읽기 <span class="en">Sentences of words you know</span></a></div>
      <div class="story-list">${list.map((s) => { const c = coverage(s); return `<a class="story-card" href="#/story/${encodeURIComponent(s.id)}">${Scene.render(s.cover || s.p[0].pic, { seed: s.id, lazy: true })}<div class="st"><b>${read[s.id] ? '✅ ' : ''}${esc(s.t)}</b><span>${s.l || 1}단계 · ${s.p.length}장면 · 아는 단어 ${c.known}/${c.total}</span></div></a>`; }).join('') || '<div class="empty">이야기가 아직 없어요</div>'}</div>`;
  };

  A.views.story = (app, [id]) => {
    const st = (root.STORIES || []).find((s) => s.id === id);
    if (!st) { app.innerHTML = '<div class="empty">없어요</div>'; return; }
    const all = st.p.map((p) => A.plain(p.s)).join(' ');
    SRS.state.read = SRS.state.read || {}; SRS.state.read[st.id] = Date.now(); SRS.save();
    app.innerHTML = `<div class="story">
      <div class="row"><a class="icon-btn sm" href="#/read">←</a><h1 class="grow" style="margin:0">${esc(st.t)}</h1><button class="btn" data-playall>▶ 전체 듣기</button></div>
      ${st.p.map((p, i) => `<div class="para" data-i="${i}"><div class="pic-wrap">${Scene.render(p.pic, { seed: st.id + i, lazy: true })}</div><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="sent grow">${A.sentHTML(p.s)}</div>${speakBtn(p.s, 'sm')}</div></div>`).join('')}
      <div class="row" style="justify-content:center;margin-top:20px"><a class="btn pri" href="#/storyquiz/${encodeURIComponent(st.id)}">🧩 이야기 퀴즈</a><a class="btn" href="#/read">다른 이야기</a></div>
    </div>`;
    let playing = false;
    app.querySelector('[data-playall]').onclick = () => {
      if (playing) { TTS.stop(); playing = false; return; }
      playing = true; let i = 0;
      const step = () => {
        if (!playing || i >= st.p.length) { playing = false; document.querySelectorAll('.para').forEach((x) => x.style.outline = ''); return; }
        document.querySelectorAll('.para').forEach((x, k) => { x.style.outline = k === i ? '3px solid var(--pri)' : ''; });
        const el = document.querySelector(`.para[data-i="${i}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        TTS.speak(A.plain(st.p[i].s), { onend: () => { i++; setTimeout(step, 350); } });
      };
      step();
    };
    void all;
    return () => { playing = false; TTS.stop(); };
  };
  /* story quiz: match each sentence to its picture */
  A.views.storyquiz = (app, [id]) => {
    const st = (root.STORIES || []).find((s) => s.id === id);
    if (!st || st.p.length < 3) { app.innerHTML = '<div class="empty">없어요</div>'; return; }
    const order = A.shuffle(st.p.map((p, i) => i)); let k = 0; let score = 0; let locked = false; let alive = true;
    function draw() {
      locked = false;
      const i = order[k]; const others = A.shuffle(st.p.map((p, j) => j).filter((j) => j !== i)).slice(0, 3);
      const opts = A.shuffle([i, ...others]);
      app.innerHTML = `<div class="gamebox">
        <div class="ghead"><a class="icon-btn sm" href="#/story/${encodeURIComponent(st.id)}">←</a><b class="grow">${esc(st.t)}</b><span class="muted">${k + 1}/${order.length}</span><span class="score">⭐ ${score}</span></div>
        <div class="panel" style="text-align:center;margin-bottom:14px"><div class="row" style="flex-wrap:nowrap;justify-content:center"><div class="sent" style="font-size:22px">${A.sentHTML(st.p[i].s)}</div>${speakBtn(st.p[i].s, 'sm')}</div></div>
        <div class="opts">${opts.map((j) => `<button class="opt" data-j="${j}">${Scene.render(st.p[j].pic, { seed: st.id + j })}</button>`).join('')}</div>
        <div class="feedback" id="fb"></div></div>`;
      TTS.speak(A.plain(st.p[i].s));
    }
    app.onclick = (e) => {
      const b = e.target.closest('[data-j]'); if (!b || locked) return;
      locked = true; const ok = +b.dataset.j === order[k];
      if (ok) { score++; A.sfx(true); } else A.sfx(false);
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) { const r = app.querySelector(`[data-j="${order[k]}"]`); if (r) r.classList.add('right'); }
      $('#fb').className = `feedback ${ok ? 'ok' : 'no'}`; $('#fb').textContent = ok ? '맞아요! ⭕' : '틀렸어요 ❌';
      setTimeout(() => {
        if (!alive) return;
        k++;
        if (k < order.length) return draw();
        if (score === order.length) { A.confetti(); SRS.state.ach = SRS.state.ach || {}; SRS.state.ach.perfect = true; SRS.save(); }
        app.innerHTML = `<div class="gamebox"><div class="panel result"><div class="big">${score} / ${order.length}</div>
          <p class="sub">${score === order.length ? '완벽해요! 🎉' : '잘했어요!'}</p>
          <div class="row" style="justify-content:center;margin-top:14px"><a class="btn pri" href="#/story/${encodeURIComponent(st.id)}">📖 다시 읽기</a><a class="btn" href="#/read">다른 이야기</a></div></div></div>`;
      }, ok ? 900 : 1700);
    };
    draw();
    return () => { alive = false; TTS.stop(); };
  };

  /* sentences of learned words */
  A.views.sentences = (app) => {
    const known = A.words.filter((w) => ['young', 'mature', 'known', 'learn'].includes(SRS.wordState(w.w)));
    function draw() {
      const picks = A.shuffle(known.flatMap((w) => w.ex.map((s) => ({ w, s })))).slice(0, 20);
      app.innerHTML = `<div class="story">
        <div class="row"><a class="icon-btn sm" href="#/read">←</a><h1 class="grow" style="margin:0">배운 단어 예문 <span class="en">${known.length} words</span></h1><button class="btn" data-more>🔀 새로</button></div>
        ${picks.length ? picks.map(({ w, s }) => `<div class="para sline-para"><div class="pic-wrap" data-open="${esc(w.w)}" style="cursor:pointer">${A.pic(w, { lazy: true })}</div><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="sent grow">${A.sentHTML(s, w.w)}</div>${speakBtn(s, 'sm')}</div></div>`).join('') : '<div class="empty">아직 배운 단어가 없어요. 먼저 공부해 보세요! <br><br><a class="btn" href="#/study">공부 시작</a></div>'}
      </div>`;
    }
    app.onclick = (e) => {
      if (e.target.closest('[data-more]')) { draw(); window.scrollTo(0, 0); }
      const o = e.target.closest('[data-open]'); if (o) A.openWord(o.dataset.open);
    };
    draw();
  };
})(window);
