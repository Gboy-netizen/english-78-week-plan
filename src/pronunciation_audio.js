(function (root) {
  "use strict";

  let samples = {};
  let onError = () => {};
  let active = null;
  let sequence = 0;

  function state(button, value) {
    if (!button) return;
    button.dataset.audioState = value;
    button.setAttribute("aria-busy", value === "loading" ? "true" : "false");
    button.setAttribute("aria-pressed", value === "playing" ? "true" : "false");
  }

  function stop() {
    sequence += 1;
    if (active?.timer) root.clearTimeout(active.timer);
    if (active?.audio && typeof active.audio.pause === "function") {
      active.audio.pause();
      try { active.audio.currentTime = 0; } catch (error) { /* Stream may not be seekable. */ }
    }
    if (root.speechSynthesis) root.speechSynthesis.cancel();
    if (active?.button) state(active.button, "idle");
    active = null;
  }

  function fail(token, message, unavailable = false) {
    if (token !== sequence) return;
    state(active?.button, unavailable ? "unavailable" : "error");
    active = null;
    onError(message);
  }

  function playFile(url, button, token, message) {
    if (token !== sequence) return;
    let audio;
    try { audio = new root.Audio(url); } catch (error) { fail(token, message); return; }
    active = { button, audio };
    state(button, "loading");
    audio.onplaying = () => { if (token === sequence) state(button, "playing"); };
    audio.onended = () => { if (token === sequence) { state(button, "idle"); active = null; } };
    audio.onerror = () => fail(token, message);
    try {
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result.then(() => { if (token === sequence) state(button, "playing"); }).catch(() => fail(token, message));
      }
    } catch (error) { fail(token, message); }
  }

  function playWord(text, accent = "US", button = null) {
    stop();
    const token = sequence;
    const word = String(text || "").trim();
    const region = accent === "UK" ? "en-GB" : "en-US";
    const onlineType = accent === "UK" ? 1 : 2;
    if (!word) { fail(token, "没有可播放的词或句子。", true); return; }
    state(button, "loading");
    const online = () => {
      if (token !== sequence) return;
      if (active?.timer) root.clearTimeout(active.timer);
      const url = `https://dict.youdao.com/dictvoice?type=${onlineType}&audio=${encodeURIComponent(word)}`;
      playFile(url, button, token, `${accent} 发音暂时不可用，请检查网络或设备语音。`);
    };
    const synth = root.speechSynthesis;
    const voice = synth?.getVoices?.().find((item) => item.lang?.toLowerCase() === region.toLowerCase());
    if (!synth || !root.SpeechSynthesisUtterance) { online(); return; }
    const utterance = new root.SpeechSynthesisUtterance(word);
    utterance.lang = region;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (token !== sequence) return;
      if (active?.timer) root.clearTimeout(active.timer);
      state(button, "playing");
    };
    utterance.onend = () => {
      if (token === sequence) { state(button, "idle"); active = null; }
    };
    utterance.onerror = online;
    active = { button, timer: root.setTimeout(() => { synth.cancel(); online(); }, 5000) };
    try { synth.speak(utterance); } catch (error) { online(); }
  }

  function playPhoneme(key, button = null) {
    stop();
    const token = sequence;
    const uri = samples[key];
    if (!uri) { fail(token, "这个音素暂时没有可靠的单音录音。", true); return; }
    playFile(uri, button, token, "单音录音暂时无法播放，请检查浏览器音频设置。 ");
  }

  root.PronunciationAudio = {
    configure(options) {
      samples = options.phonemes || {};
      onError = options.onError || (() => {});
    },
    playWord,
    playUS(text, button) { playWord(text, "US", button); },
    playUK(text, button) { playWord(text, "UK", button); },
    playExample(text, accent, button) { playWord(text, accent, button); },
    playPhoneme,
    stop,
  };
})(typeof window !== "undefined" ? window : globalThis);
