// Same engine as Mahjong Capybaras (same author), two new songs and new SFX.
// All audio is synthesized at runtime with the Web Audio API: original, no samples, no third-party licences.
// Mix: music (EP, bass, soft drums, mallet melody; no noise layer) and SFX each go through their own tone-shaping and volume,
// then a clean trim and a safety limiter (peaks only) so stacked combos never clip. Sub-bass is filtered out of
// the music: phone speakers cannot reproduce it and turn it into buzz/distortion when the volume is turned up.
export type Sfx = 'legend' | 'buy' | 'unlock' | 'select' | 'match' | 'invalid' | 'shuffle' | 'hint' | 'win' | 'star' | 'click' | 'lose' | 'place' | 'card' | 'drip' | 'horn' | 'alert';
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---------- harmony: jazzy 7th/9th/13th chords, two 4-bar progressions per world
const PC: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, 'D#': 3, 'A#': 10, A: 9, Bb: 10, B: 11 };
const QUAL: Record<string, number[]> = { maj9: [4, 7, 11, 14], m9: [3, 7, 10, 14], '13': [4, 10, 14, 21], m11: [3, 7, 10, 17], '7b9': [4, 10, 13, 19], '69': [4, 9, 14, 19], maj7: [4, 7, 11, 16], m7: [3, 7, 10, 15] };
interface Chord { root: number; notes: number[] }
const chord = (s: string): Chord => {
  const [r, q] = s.split(':'); const root = PC[r];
  if (root === undefined || !QUAL[q]) throw new Error('bad chord ' + s);
  const notes = QUAL[q].map((iv) => { let n = 48 + root + iv; while (n < 53) n += 12; while (n > 72) n -= 12; return n; }).sort((a, b) => a - b);
  return { root, notes: [...new Set(notes)] };
};
interface Song { bpm: number; key: number; A: Chord[]; B: Chord[] }
const song = (bpm: number, key: string, A: string, B: string): Song => ({ bpm, key: PC[key], A: A.split(' ').map(chord), B: B.split(' ').map(chord) });
export const SONGS: Song[] = [
  song(72, 'F', 'G:m9 C:13 F:maj9 D:m9', 'Bb:maj9 A:m7 G:m9 C:7b9'), // 0 · L'agence (briefing, planning)
  song(84, 'G', 'C:maj9 B:m7 E:m9 A:13', 'A:m9 D:13 G:maj9 E:m9'), // 1 · La tournée (resolution)
];
const PENTA = [0, 2, 4, 7, 9];
const RHY = [[0, 3, 6], [1, 4], [0, 2, 5], [3, 4, 6], [2, 6], [0, 5]];

/** Default volumes (0..1 sliders). Gains follow v^1.5 (perceptual) times a calibrated ceiling. */
const TRIM = 1.8;
export const DEFAULT_MUSIC = 0.45, DEFAULT_SFX = 0.6;
const MUSIC_MAX = 0.38, SFX_MAX = 0.52; // slider 100% = MAX; defaults land where the mix was tuned

export class Sound {
  ctx: AudioContext | null = null;
  sfxOn = true; musicOn = true; musicVol = DEFAULT_MUSIC; sfxVol = DEFAULT_SFX;
  private mix!: GainNode; private sfxBus!: GainNode; private sfxVolG!: GainNode; private musicIn!: GainNode; private musicVolG!: GainNode; private fade!: GainNode;
  private epBus!: GainNode; private bassBus!: GainNode; private echo!: GainNode; private noise!: AudioBuffer; // noise is only used by short SFX (select, buy, shuffle), never by the music
  private timer = 0; private world = -1; private next = 0; private step = 0; private r = rng(1); private lastMel = 0;
  ensure() {
    // iOS: the context can be 'suspended' (no gesture yet / page hidden) or 'interrupted' (call, Siri, other app took audio):
    // every user gesture calls ensure(), which resumes it.
    if (this.ctx) { if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !document.hidden) this.ctx.resume().catch(() => {}); return this.ctx; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    // Safari 17+: 'ambient' = the game follows the ring/silent switch and mixes with the player's podcast or music
    try { const as = (navigator as Navigator & { audioSession?: { type: string } }).audioSession; if (as) as.type = 'ambient'; } catch { /* older */ }
    const ctx = (this.ctx = new C());
    // master: clean gain staging + a safety limiter that only touches rare peaks (no glue compressor: the Web Audio
    // compressor adds automatic make-up gain, which lifted the quiet tails and pumped the floor up)
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 2; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    const trim = ctx.createGain(); trim.gain.value = TRIM;
    this.mix = ctx.createGain(); this.mix.connect(trim).connect(lim).connect(ctx.destination);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });
    // iOS unlock: a silent one-sample buffer started inside the gesture fully opens the audio session
    try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch { /* ignore */ }
    // SFX: soften transients (low-pass), user volume
    this.sfxVolG = ctx.createGain(); this.sfxVolG.connect(this.mix);
    const sLp = ctx.createBiquadFilter(); sLp.type = 'lowpass'; sLp.frequency.value = 6500; sLp.Q.value = 0.5; sLp.connect(this.sfxVolG);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(sLp);
    // music: 2x high-pass (no sub-bass) -> warm low-pass ~7 kHz -> fade -> user volume
    this.musicVolG = ctx.createGain(); this.musicVolG.connect(this.mix);
    this.fade = ctx.createGain(); this.fade.gain.value = 0; this.fade.connect(this.musicVolG);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.5; lp.connect(this.fade);
    const hp2 = ctx.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 90; hp2.Q.value = 0.6; hp2.connect(lp);
    const hp1 = ctx.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 90; hp1.Q.value = 0.6; hp1.connect(hp2);
    this.musicIn = ctx.createGain(); this.musicIn.connect(hp1);
    const epLp = ctx.createBiquadFilter(); epLp.type = 'lowpass'; epLp.frequency.value = 5000; epLp.Q.value = 0.3; epLp.connect(this.musicIn);
    this.epBus = ctx.createGain(); this.epBus.connect(epLp);
    const bLp = ctx.createBiquadFilter(); bLp.type = 'lowpass'; bLp.frequency.value = 800; bLp.Q.value = 0.4; bLp.connect(this.musicIn);
    this.bassBus = ctx.createGain(); this.bassBus.connect(bLp);
    // tape-ish echo (dotted eighth set per song), darkened on every repeat
    const dl = ctx.createDelay(2); const fb = ctx.createGain(); fb.gain.value = 0.32; const eLp = ctx.createBiquadFilter(); eLp.type = 'lowpass'; eLp.frequency.value = 2200;
    this.echo = ctx.createGain(); this.echo.gain.value = 0.22; this.echo.connect(dl); dl.connect(eLp).connect(fb).connect(dl); eLp.connect(this.musicIn); (this.echo as unknown as { d: DelayNode }).d = dl;
    const R = rng(7); const n = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = R() * 2 - 1;
    this.setVolumes(this.musicVol, this.sfxVol);
    return ctx;
  }
  setVolumes(music: number, sfx: number) {
    this.musicVol = music; this.sfxVol = sfx; if (!this.ctx) return; const t = this.ctx.currentTime;
    this.musicVolG.gain.setTargetAtTime(music ** 1.5 * MUSIC_MAX, t, 0.05); this.sfxVolG.gain.setTargetAtTime(sfx ** 1.5 * SFX_MAX, t, 0.02); // perceptual curve
  }
  // ---------- primitives
  private env(g: GainNode, t: number, a: number, peak: number, tau: number, end: number) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, tau); g.gain.setValueAtTime(0, end);
  }
  private tone(bus: AudioNode, f: number, t: number, dur: number, vol: number, type: OscillatorType = 'sine', attack = 0.006, slideTo?: number) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    this.env(g, t, attack, vol, dur / 4, t + dur + 0.3); o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.3);
  }
  private burst(bus: AudioNode, t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'highpass', q = 0.7, a = 0.002) {
    const ctx = this.ctx!; const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain();
    this.env(g, t, a, vol, dur / 3, t + dur + 0.1); s.connect(f).connect(g).connect(bus); s.start(t, this.r() * 1.5); s.stop(t + dur + 0.1);
  }
  // ---------- SFX (soft attacks, rounded timbres)
  /** Called for every sound cue, even muted (haptics follow the same cues). */
  onCue: (n: Sfx) => void = () => {};
  play(n: Sfx, combo = 0) {
    this.onCue(n); if (!this.sfxOn || !this.ensure()) return; const t = this.ctx!.currentTime + 0.005; const b = this.sfxBus;
    switch (n) {
      case 'select': this.tone(b, 720, t, 0.09, 0.2, 'sine', 0.004, 540); this.burst(b, t, 0.025, 0.025, 1800, 'bandpass', 1); break;
      case 'click': this.tone(b, 620, t, 0.06, 0.13, 'sine', 0.004, 470); break;
      case 'match': { const base = 72 + Math.min(combo, 6) * 2; [0, 7, 12].forEach((iv, i) => { this.tone(b, mtof(base + iv), t + i * 0.06, 0.45, 0.11); this.tone(b, mtof(base + iv) * 2, t + i * 0.06, 0.2, 0.02); }); break; }
      case 'invalid': this.tone(b, 210, t, 0.16, 0.2, 'sine', 0.008, 150); this.tone(b, 420, t, 0.08, 0.04, 'sine', 0.008, 300); break;
      case 'shuffle': { const ctx = this.ctx!; const s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.12); g.gain.linearRampToValueAtTime(0, t + 0.42); s.connect(f).connect(g).connect(b); s.start(t); s.stop(t + 0.45);
        for (let i = 0; i < 5; i++) this.tone(b, 880 + i * 90, t + 0.05 + i * 0.07, 0.04, 0.04, 'sine', 0.003); break; }
      case 'hint': [79, 84, 88, 91].forEach((m, i) => this.tone(b, mtof(m), t + i * 0.07, 0.32, 0.08)); break;
      case 'win': [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => { this.tone(b, mtof(m), t + i * 0.09, 0.6, 0.11); this.tone(b, mtof(m), t + i * 0.09, 0.4, 0.03, 'triangle', 0.01); }); break;
      case 'star': this.tone(b, mtof(79 + combo * 4), t, 0.7, 0.14); this.tone(b, mtof(91 + combo * 4), t, 0.3, 0.025); break;
      case 'unlock': [79, 84, 88, 91].forEach((m, i) => { this.tone(b, mtof(m), t + i * 0.1, 0.5, 0.1); this.tone(b, mtof(m) * 2, t + i * 0.1, 0.25, 0.015); }); break;
      case 'legend': for (let i = 0; i < 6; i++) this.tone(b, mtof(70 + (i % 2) * 5), t + i * 0.055, 0.07, 0.06, 'triangle', 0.006, mtof(64)); [79, 83, 86, 91, 95].forEach((m, i) => { this.tone(b, mtof(m), t + 0.36 + i * 0.08, 0.7, 0.09); this.tone(b, mtof(m) * 2, t + 0.36 + i * 0.08, 0.35, 0.015); }); break;
      case 'buy': [76, 83].forEach((m, i) => this.tone(b, mtof(m), t + i * 0.08, 0.35, 0.12)); this.burst(b, t, 0.04, 0.03, 3000, 'bandpass', 1); break;
      case 'place': [76, 81].forEach((m, i) => this.tone(b, mtof(m), t + i * 0.05, 0.25, 0.11)); this.burst(b, t, 0.03, 0.02, 2400, 'bandpass', 1); break;
      case 'card': this.burst(b, t, 0.09, 0.05, 1400, 'bandpass', 0.8); [72, 79].forEach((m, i) => this.tone(b, mtof(m), t + 0.04 + i * 0.06, 0.3, 0.09)); break;
      case 'drip': this.tone(b, 520, t, 0.12, 0.16, 'sine', 0.003, 1300); this.tone(b, 1500, t + 0.09, 0.08, 0.03, 'sine', 0.003, 900); break;
      case 'horn': [0, 0.16].forEach((dt, i) => { this.tone(b, mtof(i ? 69 : 74), t + dt, 0.13, 0.08, 'triangle', 0.01); this.tone(b, mtof(i ? 69 : 74) * 1.5, t + dt, 0.13, 0.025, 'square', 0.01); }); break;
      case 'alert': [81, 77, 81].forEach((m, i) => this.tone(b, mtof(m), t + i * 0.12, 0.14, 0.09, 'triangle', 0.006)); break;
      case 'lose': [67, 63, 60].forEach((m, i) => this.tone(b, mtof(m), t + i * 0.18, 0.5, 0.12, 'triangle', 0.012)); break;
    }
  }
  // ---------- music
  music(world: number) {
    if (this.world === world && this.timer) return;
    const was = !!this.timer; this.stopMusic(); this.world = world; if (!this.musicOn || !this.ensure()) return;
    const ctx = this.ctx!; const now = ctx.currentTime; const start = now + (was ? 0.5 : 0.1);
    this.next = start; this.step = 0; this.r = rng(1000 + world); this.lastMel = 72 + SONGS[world].key;
    const spb = 60 / SONGS[world].bpm / 2; (this.echo as unknown as { d: DelayNode }).d.delayTime.setValueAtTime(spb * 3, start);
    this.fade.gain.cancelScheduledValues(start); this.fade.gain.setValueAtTime(0, start); this.fade.gain.linearRampToValueAtTime(1, start + 2.5);
    this.timer = window.setInterval(() => this.schedule(), 100);
  }
  stopMusic() {
    clearInterval(this.timer); this.timer = 0; if (!this.ctx) return; const t = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(t); this.fade.gain.setValueAtTime(this.fade.gain.value, t); this.fade.gain.linearRampToValueAtTime(0, t + 0.4);
  }
  setMusic(on: boolean) { this.musicOn = on; if (!on) this.stopMusic(); else if (this.world >= 0) { const w = this.world; this.world = -1; this.music(w); } }
  private schedule() {
    const ctx = this.ctx!; const S = SONGS[this.world]; const spb = 60 / S.bpm / 2; // eighth notes
    if (this.next < ctx.currentTime - 0.05) this.next = ctx.currentTime + 0.05; // after a suspend: skip, never burst-schedule the past
    while (this.next < ctx.currentTime + 0.3) {
      const s = this.step, beat = s % 8, barN = Math.floor(s / 8), bar = barN % 16, cycle = Math.floor(barN / 16), sec = Math.floor(bar / 4);
      const t = this.next + (beat % 2 ? spb * 0.22 : 0) + (this.r() - 0.5) * 0.008; // swing + humanize
      const prog = sec % 2 ? S.B : S.A; const ch = prog[bar % 4]; const nextCh = prog[(bar + 1) % 4];
      const breakdown = sec === 3, intro = cycle === 0 && bar < 2;
      // electric piano: strum on 1, soft re-strike on the "and of 2" in sections B/C
      if (beat === 0) ch.notes.forEach((m, i) => this.ep(mtof(m), t + i * 0.014, spb * 7.4, 0.12 + this.r() * 0.02, i));
      if (beat === 3 && (sec === 1 || sec === 2) && this.r() < 0.6) ch.notes.slice(1).forEach((m, i) => this.ep(mtof(m), t + i * 0.012, spb * 3.6, 0.04, i + 1));
      // bass (C2-B2, octave & approach notes)
      const root = 36 + ch.root;
      if (!intro) {
        if (beat === 0) this.bass(mtof(root), t, spb * (breakdown ? 6 : 2.6), 0.075);
        if (beat === 3 && !breakdown) this.bass(mtof(root + (this.r() < 0.5 ? 7 : 12)), t, spb * 1.5, 0.06);
        if (beat === 7 && !breakdown && this.r() < 0.55) { const nr = 36 + nextCh.root; this.bass(mtof(nr + (nr > root ? -1 : 1)), t, spb * 0.8, 0.055); }
      }
      // drums: boom-bap, brushed snare, low hats; breakdown = hats only
      if (!breakdown && !intro) {
        if (beat === 0 || (beat === 5 && this.r() < 0.8)) this.kick(t, beat === 0 ? 0.26 : 0.19);
        if (beat === 2 || beat === 6) this.snare(t, 0.2 + this.r() * 0.03);
      }
      if (!intro && beat % 2 === 1 && (!breakdown || beat === 3 || beat === 7)) this.hat(t, 0.035 * (0.8 + this.r() * 0.4));
      // mallet melody in sections B, A' and C (sparser in breakdown)
      if (sec > 0 && beat === 0) this.melodyBar(S, ch, t, spb, breakdown);
      this.next += spb; this.step++;
    }
  }
  private melodyBar(S: Song, ch: Chord, t0: number, spb: number, sparse: boolean) {
    if (sparse && this.r() < 0.4) return;
    const pat = RHY[Math.floor(this.r() * RHY.length)]; const scale: number[] = [];
    for (let m = 64; m <= 84; m++) if (PENTA.includes((m - S.key + 120) % 12) || ch.notes.some((c) => (c - m) % 12 === 0)) scale.push(m);
    pat.forEach((pos, i) => {
      const near = scale.filter((m) => Math.abs(m - this.lastMel) <= 4 && m !== this.lastMel); const pick = near.length ? near[Math.floor(this.r() * near.length)] : scale[Math.floor(scale.length / 2)];
      const m = i === 0 ? scale.reduce((a, c) => (ch.notes.some((n) => (n - c) % 12 === 0) && Math.abs(c - this.lastMel) < Math.abs(a - this.lastMel) ? c : a), pick) : pick;
      this.lastMel = m; const end = i + 1 < pat.length ? pat[i + 1] : 8; const swing = pos % 2 ? spb * 0.22 : 0;
      this.mallet(mtof(m), t0 + pos * spb + swing, Math.max(1, end - pos) * spb * 0.9, sparse ? 0.08 : 0.11);
    });
  }
  // ---------- instruments
  private ep(f: number, t: number, dur: number, vel: number, i: number) { // FM Rhodes-like tine
    const ctx = this.ctx!; const car = ctx.createOscillator(); const mod = ctx.createOscillator(); const mg = ctx.createGain(); const g = ctx.createGain(); const p = ctx.createStereoPanner();
    car.frequency.value = f; mod.frequency.value = f; mg.gain.setValueAtTime(f * 1.1, t); mg.gain.setTargetAtTime(f * 0.22, t, 0.25);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.008); g.gain.setTargetAtTime(vel * 0.4, t + 0.008, 0.6); g.gain.setTargetAtTime(0, t + dur, 0.2);
    p.pan.value = (i - 1.5) * 0.18; mod.connect(mg).connect(car.frequency); car.connect(g).connect(p).connect(this.epBus);
    const tine = ctx.createOscillator(); const tg = ctx.createGain(); tine.frequency.value = f * 4; this.env(tg, t, 0.003, vel * 0.12, 0.06, t + 0.5); tine.connect(tg).connect(p);
    if (i === 3) g.connect(this.echo);
    const end = t + dur + 1.2; car.start(t); mod.start(t); tine.start(t); car.stop(end); mod.stop(end); tine.stop(t + 0.5);
  }
  private bass(f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.012); g.gain.setTargetAtTime(vel * 0.6, t + 0.012, 0.3); g.gain.setTargetAtTime(0, t + dur, 0.06);
    const a = ctx.createOscillator(); a.frequency.value = f; const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = f; const bg = ctx.createGain(); bg.gain.value = 0.55;
    const h = ctx.createOscillator(); h.frequency.value = f * 2; const hg = ctx.createGain(); hg.gain.value = 0.3; // 2nd harmonic: audible on phone speakers
    a.connect(g); b.connect(bg).connect(g); h.connect(hg).connect(g); g.connect(this.bassBus);
    const end = t + dur + 0.4; [a, b, h].forEach((o) => { o.start(t); o.stop(end); });
  }
  private kick(t: number, vel: number) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.005); g.gain.setTargetAtTime(0, t + 0.005, 0.07); o.connect(g).connect(this.musicIn); o.start(t); o.stop(t + 0.5);
  }
  // drums are pitched (sine partials), no noise: a soft woody rim click and a tiny closed-hat tick
  private ping(f: number, t: number, vel: number, tau: number, a = 0.002) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = f; this.env(g, t, a, vel, tau, t + tau * 7); o.connect(g).connect(this.musicIn); o.start(t); o.stop(t + tau * 7);
  }
  private snare(t: number, vel: number) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(165, t + 0.06); const g = ctx.createGain(); this.env(g, t, 0.004, vel, 0.035, t + 0.25); o.connect(g).connect(this.musicIn); o.start(t); o.stop(t + 0.25);
    this.ping(1180, t, vel * 0.35, 0.018, 0.003); this.ping(1730, t, vel * 0.22, 0.014, 0.003);
  }
  private hat(t: number, vel: number) { this.ping(5300, t, vel, 0.009); this.ping(3700, t, vel * 0.5, 0.007); }
  private mallet(f: number, t: number, dur: number, vel: number) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; o.frequency.value = f; const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.02); g.gain.setTargetAtTime(vel * 0.45, t + 0.02, 0.25); g.gain.setTargetAtTime(0, t + dur, 0.12);
    const p = ctx.createStereoPanner(); p.pan.value = 0.2; o.connect(g); o2.connect(g2).connect(g); g.connect(p).connect(this.musicIn); g.connect(this.echo);
    const end = t + dur + 0.8; o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }
}
