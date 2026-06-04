/* =============================================================================
 * V3 AUDIO — synthesized chiptune music + SFX via Web Audio (ZERO files)
 * Ported verbatim from v2 game.js `Sound`. Phaser runs alongside this untouched
 * (plan §10.1 audio note). Exposed as window.Squid.Sound.
 * ============================================================================= */
(function () {
  "use strict";
  var Squid = (window.Squid = window.Squid || {});

  var midi = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };

  // Each track has its OWN key, tempo, timbre, optional arpeggio (3rd voice) and
  // drum pattern so every scene sounds distinct (intro/menu/map/combat/boss/rest/
  // event/reward/win). `arp` plays an octave up as a plucky counter-melody; `drum`
  // ("drive" = busy hats+kick, "soft" = sparse) adds groove. 0 = rest.
  var SONGS = {
    // hopeful, bright, rising — the "new grad optimism" theme
    intro: { step: 0.17, lt: "triangle", bt: "sine", at: "square", drum: "soft",
      lead: [72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 81, 0, 76, 0],
      bass: [48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 52, 0, 0, 0],
      arp: [72, 76, 79, 84, 76, 79, 84, 88, 74, 77, 81, 84, 76, 79, 83, 86] },
    // calm, sparse, contemplative — front-of-house menu
    menu: { step: 0.22, lt: "triangle", bt: "sine",
      lead: [69, 0, 72, 0, 76, 0, 72, 0, 67, 0, 69, 0, 72, 0, 0, 0],
      bass: [45, 0, 0, 0, 40, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0] },
    // airy, wandering — "pick your next room"
    map: { step: 0.26, lt: "triangle", bt: "sine", at: "triangle",
      lead: [72, 0, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 71, 0],
      bass: [48, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0],
      arp: [0, 0, 79, 0, 0, 0, 83, 0, 0, 0, 81, 0, 0, 0, 78, 0] },
    // standard fight — REWORKED: lower register + syncopated funk "groove" (a
    // walking bass with off-beat stabs) so it no longer feels like the same busy
    // high chiptune as the other tracks. Warm triangle lead, gritty sawtooth bass.
    combat: { step: 0.14, lt: "triangle", bt: "sawtooth", at: "triangle", drum: "groove",
      lead: [57, 0, 0, 60, 0, 55, 0, 57, 0, 0, 60, 0, 62, 0, 60, 0],
      bass: [33, 0, 40, 0, 33, 0, 38, 40, 31, 0, 38, 0, 36, 0, 43, 0],
      arp: [0, 0, 69, 0, 0, 0, 67, 0, 0, 0, 72, 0, 0, 0, 67, 0] },
    // menacing, low, ominous — boss (calibration council)
    boss: { step: 0.15, lt: "sawtooth", bt: "triangle", at: "square", drum: "drive",
      lead: [64, 0, 63, 0, 64, 67, 63, 0, 60, 0, 63, 0, 59, 0, 58, 0],
      bass: [40, 40, 39, 39, 38, 38, 40, 40, 36, 36, 38, 38, 35, 35, 34, 34],
      arp: [0, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0, 71, 0, 70, 0] },
    // warm, slow, restorative — rest node
    rest: { step: 0.34, lt: "sine", bt: "sine",
      lead: [69, 0, 0, 0, 72, 0, 0, 0, 71, 0, 0, 0, 67, 0, 64, 0],
      bass: [45, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0] },
    // mysterious, chromatic, tense — random event dilemma
    event: { step: 0.20, lt: "triangle", bt: "sawtooth", at: "triangle",
      lead: [70, 0, 71, 0, 70, 0, 66, 0, 68, 0, 69, 0, 68, 0, 64, 0],
      bass: [42, 0, 0, 0, 42, 0, 0, 0, 41, 0, 0, 0, 40, 0, 0, 0],
      arp: [0, 0, 82, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0] },
    // upbeat, plucky — post-fight reward
    reward: { step: 0.15, lt: "square", bt: "triangle", at: "triangle", drum: "soft",
      lead: [76, 79, 83, 84, 83, 79, 76, 72, 74, 77, 81, 84, 81, 77, 74, 72],
      bass: [52, 52, 48, 48, 53, 53, 55, 55, 50, 50, 45, 45, 47, 47, 55, 55],
      arp: [88, 0, 84, 0, 91, 0, 84, 0, 89, 0, 86, 0, 84, 0, 88, 0] },
    // triumphant fanfare — made VP
    win: { step: 0.18, lt: "square", bt: "triangle", at: "square", drum: "drive",
      lead: [72, 76, 79, 84, 0, 84, 0, 84, 83, 79, 76, 72, 74, 79, 83, 0],
      bass: [48, 48, 55, 55, 53, 53, 55, 55, 50, 50, 52, 52, 55, 55, 55, 55],
      arp: [84, 88, 91, 96, 0, 0, 0, 0, 83, 86, 91, 95, 0, 0, 0, 0] },
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
    noise: function (dur, gain, dest) {
      if (!this.ctx) return;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = this.ctx.createBufferSource(); src.buffer = buf;
      var g = this.ctx.createGain(); g.gain.value = gain == null ? 0.25 : gain;
      src.connect(g); g.connect(dest || this.sfxGain); src.start();
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
        var i = this.step;
        var li = s.lead[i % s.lead.length];
        var bi = s.bass[i % s.bass.length];
        if (li) this.tone(midi(li), s.step * 0.95, s.lt, 0.5, this.musicGain);
        if (bi) this.tone(midi(bi), s.step * 1.1, s.bt, 0.7, this.musicGain);
        // arpeggio counter-melody (plucky, quieter, octave-ish up)
        if (s.arp && s.arp.length) {
          var ai = s.arp[i % s.arp.length];
          if (ai) this.tone(midi(ai), s.step * 0.6, s.at || "square", 0.16, this.musicGain); // softer (less piercing)
        }
        // percussion groove
        if (s.drum) {
          var beat = i % 4;
          if (beat === 0) this.tone(64, 0.11, "sine", 0.55, this.musicGain, 32); // kick (pitch drop)
          if (s.drum === "drive") {
            if (beat === 2) this.noise(0.05, 0.10, this.musicGain);               // snare-ish
            if (i % 2 === 1) this.noise(0.025, 0.05, this.musicGain);             // hat (offbeats)
          } else if (s.drum === "groove") {
            if (i % 8 === 3) this.tone(58, 0.10, "sine", 0.5, this.musicGain, 30); // syncopated "&" kick
            if (beat === 2) this.noise(0.06, 0.11, this.musicGain);               // backbeat snare
            if (i % 4 === 1) this.noise(0.02, 0.04, this.musicGain);              // light hat
          } else if (beat === 2) {
            this.noise(0.03, 0.06, this.musicGain);                              // soft backbeat
          }
        }
        this.nextT += s.step;
        this.step++;
      }
    },
  };

  Squid.Sound = Sound;
})();
