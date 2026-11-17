/* Text-to-speech using the browser's Korean voice (Web Speech API). */
(function (root) {
  'use strict';
  const synth = root.speechSynthesis;
  let voices = []; let warned = false;
  function load() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
    // prefer natural / online voices
    voices.sort((a, b) => score(b) - score(a));
  }
  function score(v) { let s = 0; if (/natural|online|neural|google|siri|yuna|sora|heami|injoon|sunhi/i.test(v.name)) s += 2; if (v.localService === false) s += 1; return s; }
  if (synth) { load(); synth.onvoiceschanged = load; }

  function pick() {
    const want = root.SRS ? root.SRS.settings.voice : '';
    return voices.find((v) => v.name === want) || voices[0] || null;
  }

  function speak(text, opts = {}) {
    if (!synth || !text) return;
    if (!voices.length && !warned && root.App) { warned = true; setTimeout(() => { if (!voices.length && synth.getVoices().length) root.App.toast('한국어 음성이 없어요 — add a Korean voice in your system settings', 3500); }, 600); }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      const v = pick(); if (v) u.voice = v;
      u.rate = opts.rate || (root.SRS ? root.SRS.settings.rate : 0.9);
      if (opts.onend) u.onend = opts.onend;
      synth.speak(u);
    } catch (e) { /* ignore */ }
  }

  root.TTS = { speak, get voices() { return voices; }, get available() { return !!synth; }, hasKorean: () => voices.length > 0, stop: () => synth && synth.cancel() };
})(window);
