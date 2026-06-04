/* =============================================================================
 * V3 AUDIO — synthesized chiptune music + SFX via Web Audio (ZERO files)
 * Ported verbatim from v2 game.js `Sound`. Phaser runs alongside this untouched
 * (plan §10.1 audio note). Exposed as window.Squid.Sound.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var midi = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };

  var SONGS = {
    menu: { bpm: 84, step: 0.22, lead: [69, 0, 72, 0, 76, 0, 72, 0, 67, 0, 69, 0, 72, 0, 0, 0], bass: [45, 0, 0, 0, 40, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0], lt: "triangle", bt: "sine" },
    combat: { bpm: 122, step: 0.13, lead: [69, 71, 72, 76, 72, 71, 69, 67, 69, 72, 76, 79, 76, 72, 71, 69], bass: [45, 45, 52, 52, 43, 43, 50, 50, 41, 41, 48, 48, 40, 40, 47, 47], lt: "square", bt: "triangle" },
    boss: { bpm: 100, step: 0.15, lead: [64, 0, 63, 0, 64, 67, 63, 0, 60, 0, 63, 0, 59, 0, 58, 0], bass: [40, 40, 39, 39, 38, 38, 40, 40, 36, 36, 38, 38, 35, 35, 34, 34], lt: "sawtooth", bt: "triangle" },
    map: { bpm: 76, step: 0.26, lead: [72, 0, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 71, 0], bass: [48, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0], lt: "triangle", bt: "sine" },
  };

  var Sound = {
    ctx: null, master: null, musicGain: null, sfxGain: null, muted: false,
    timer: null, song: null, step: 0, nextT: 0, curName: null,
    init: function () {
      if (this.ctx || typeof window === "undefined") return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.16; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.32; this.sfxGain.connect(this.master);
      try { this.muted = localStorage.getItem("squid_mute") === "1"; } catch (e) {}
      this.master.gain.value = this.muted ? 0 : 0.7;
    },
    resume: function () { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
      try { localStorage.setItem("squid_mute", this.muted ? "1" : "0"); } catch (e) {}
      return this.muted;
    },
    isMuted: function () { try { return localStorage.getItem("squid_mute") === "1"; } catch (e) { return this.muted; } },
    tone: function (freq, dur, type, gain, dest, slideTo) {
      if (!this.ctx) return;
      var o = this.ctx.createOscillator(); var g = this.ctx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
      var peak = gain == null ? 0.3 : gain;
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(peak, this.ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(dest || this.sfxGain);
      o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
    },
    noise: function (dur, gain) {
      if (!this.ctx) return;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = this.ctx.createBufferSource(); src.buffer = buf;
      var g = this.ctx.createGain(); g.gain.value = gain == null ? 0.25 : gain;
      src.connect(g); g.connect(this.sfxGain); src.start();
    },
    sfx: function (name) {
      if (!this.ctx) return;
      var self = this;
      switch (name) {
        case "draw": this.tone(720, 0.05, "square", 0.18); break;
        case "play": this.tone(520, 0.07, "square", 0.22, null, 700); break;
        case "discard": this.tone(300, 0.08, "triangle", 0.18, null, 180); break;
        case "hit": this.noise(0.12, 0.3); this.tone(160, 0.1, "sawtooth", 0.2, null, 90); break;
        case "block": this.tone(880, 0.08, "sine", 0.2, null, 1200); break;
        case "hurt": this.noise(0.18, 0.35); this.tone(120, 0.18, "square", 0.25, null, 60); break;
        case "select": this.tone(620, 0.05, "square", 0.16); break;
        case "level": [60, 64, 67, 72].forEach(function (n, i) { setTimeout(function () { self.tone(midi(n), 0.16, "square", 0.22); }, i * 70); }); break;
        case "win": [60, 64, 67, 72, 76].forEach(function (n, i) { setTimeout(function () { self.tone(midi(n), 0.22, "triangle", 0.26); }, i * 120); }); break;
        case "lose": [60, 57, 53, 48].forEach(function (n, i) { setTimeout(function () { self.tone(midi(n), 0.3, "sawtooth", 0.24); }, i * 160); }); break;
      }
    },
    playMusic: function (name) {
      if (!this.ctx || this.curName === name) return;
      this.stopMusic();
      this.curName = name; this.song = SONGS[name]; this.step = 0;
      this.nextT = this.ctx.currentTime + 0.06;
      var self = this;
      this.timer = setInterval(function () { self._sched(); }, 25);
    },
    stopMusic: function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.curName = null; },
    _sched: function () {
      if (!this.ctx || !this.song) return;
      var s = this.song;
      while (this.nextT < this.ctx.currentTime + 0.12) {
        var li = s.lead[this.step % s.lead.length];
        var bi = s.bass[this.step % s.bass.length];
        if (li) this.tone(midi(li), s.step * 0.95, s.lt, 0.5, this.musicGain);
        if (bi) this.tone(midi(bi), s.step * 1.1, s.bt, 0.7, this.musicGain);
        this.nextT += s.step;
        this.step++;
      }
    },
  };

  Squid.Sound = Sound;
})();
