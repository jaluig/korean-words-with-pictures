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
    app.innerHTML = `<h1>읽기 <span class="en">Picture stories</span></h1>
      <p class="sub">밑줄 친 단어에 마우스를 올리면 그림이 보여요. Hover or tap the dotted words.</p>
      <div class="story-list">${list.map((s) => { const c = coverage(s); return `<a class="story-card" href="#/story/${encodeURIComponent(s.id)}">${Scene.render(s.cover || s.p[0].pic, { seed: s.id, lazy: true })}<div class="st"><b>${esc(s.t)}</b><span>${s.l || 1}단계 · ${s.p.length}장면 · 아는 단어 ${c.known}/${c.total}</span></div></a>`; }).join('') || '<div class="empty">이야기가 아직 없어요</div>'}</div>`;
  };

  A.views.story = (app, [id]) => {
    const st = (root.STORIES || []).find((s) => s.id === id);
    if (!st) { app.innerHTML = '<div class="empty">없어요</div>'; return; }
    const all = st.p.map((p) => A.plain(p.s)).join(' ');
    SRS.state.read = SRS.state.read || {}; SRS.state.read[st.id] = Date.now(); SRS.save();
    app.innerHTML = `<div class="story">
      <div class="row"><a class="icon-btn sm" href="#/read">←</a><h1 class="grow" style="margin:0">${esc(st.t)}</h1><button class="btn" data-playall>▶ 전체 듣기</button></div>
      ${st.p.map((p, i) => `<div class="para" data-i="${i}"><div class="pic-wrap">${Scene.render(p.pic, { seed: st.id + i, lazy: true })}</div><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="sent grow">${A.sentHTML(p.s)}</div>${speakBtn(p.s, 'sm')}</div></div>`).join('')}
      <div class="row" style="justify-content:center;margin-top:20px"><a class="btn" href="#/read">다른 이야기</a></div>
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
})(window);
