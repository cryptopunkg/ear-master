// audio.js — 音频引擎：封装 spessasynth 的 SoundFont 合成器
// 使用 AudioWorklet 线程合成，低延迟；离线加载内置 SF2。
import { WorkletSynthesizer } from 'spessasynth_lib';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const PROCESSOR_URL = BASE + 'spessasynth_processor.min.js';
const SF2_URL = BASE + 'soundfonts/GeneralUser_GS_v1.471.sf2';

// 音色 -> GM 音色库编号
export const INSTRUMENTS = {
  piano: { id: 'piano', name: '钢琴', gm: 0 },
  guitar_acoustic: { id: 'guitar_acoustic', name: '木吉他', gm: 25 },
  guitar_electric: { id: 'guitar_electric', name: '电吉他', gm: 27 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.synth = null;
    this.ready = false;
    this.loadingPromise = null;
    this.program = INSTRUMENTS.piano.gm;
    this.timers = new Set();
    this.onStatusChange = null; // (phase: string, progress: number) => void
  }

  async init() {
    if (this.ready) return this;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this._init();
    return this.loadingPromise;
  }

  async _init() {
    this._report('初始化音频上下文…', 0.05);
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this._report('加载合成器…', 0.12);
    await this.ctx.audioWorklet.addModule(PROCESSOR_URL);

    this.synth = new WorkletSynthesizer(this.ctx);
    this.synth.setSystemParameter('gain', 0.85);

    this._report('加载音色库（约 30MB）…', 0.2);
    const resp = await fetch(SF2_URL);
    if (!resp.ok) throw new Error(`音色库加载失败: ${resp.status}`);
    const buf = await resp.arrayBuffer();

    this._report('解析音色库…', 0.7);
    await this.synth.soundBankManager.addSoundBank(buf, 'main');
    await this.synth.isReady;

    this.synth.programChange(0, this.program);
    this.ready = true;
    this._report('就绪', 1);
    return this;
  }

  _report(phase, progress) {
    if (this.onStatusChange) {
      try { this.onStatusChange(phase, progress); } catch { /* noop */ }
    }
  }

  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** 设置音色 */
  setInstrument(instId) {
    const inst = INSTRUMENTS[instId] || INSTRUMENTS.piano;
    this.program = inst.gm;
    if (this.synth && this.ready) this.synth.programChange(0, inst.gm);
  }

  _schedule(fn, delayMs) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      try { fn(); } catch (e) { console.error('[vibe:audio]', e); }
    }, Math.max(0, delayMs));
    this.timers.add(t);
    return t;
  }

  /** 停止所有已排程的声音 */
  stopAll() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    if (this.synth && this.ready) {
      try { this.synth.stopAllNotes?.(); } catch { /* noop */ }
    }
  }

  noteOn(midi, velocity = 105) {
    if (!this.synth || !this.ready) return;
    this.ensureRunning();
    this.synth.noteOn(0, midi, velocity);
  }

  noteOff(midi) {
    if (!this.synth || !this.ready) return;
    this.synth.noteOff(0, midi);
  }

  /**
   * 播放单个音，duration 为秒。
   * @param {number} midi
   * @param {object} opts {duration, delay, velocity}
   */
  playNote(midi, opts = {}) {
    const { duration = 0.8, delay = 0, velocity = 105 } = opts;
    this._schedule(() => this.noteOn(midi, velocity), delay * 1000);
    this._schedule(() => this.noteOff(midi), (delay + duration) * 1000);
  }

  /** 同时奏响一组音（和弦），duration 秒 */
  playChord(notes, opts = {}) {
    const { duration = 1.4, delay = 0, velocity = 88 } = opts;
    for (const n of notes) this.playNote(n, { duration, delay, velocity });
  }

  /** 依次奏响一组音（旋律 / 音阶） */
  playSequence(notes, opts = {}) {
    const { noteDuration = 0.32, gap = 0.05, delay = 0, velocity = 105 } = opts;
    const step = noteDuration + gap;
    notes.forEach((n, i) => {
      this.playNote(n, { duration: noteDuration, delay: delay + i * step, velocity });
    });
  }

  /** 依次奏响多个和弦（和弦进行） */
  playChords(chords, opts = {}) {
    const { chordDuration = 1.2, gap = 0.15, delay = 0, velocity = 88 } = opts;
    const step = chordDuration + gap;
    chords.forEach((ch, i) => {
      this.playChord(ch, { duration: chordDuration, delay: delay + i * step, velocity });
    });
    return step * chords.length;
  }

  /** 依据题目类型播放音频（由题库对象驱动） */
  playQuestion(q, settings = {}) {
    if (!this.ready) return 0;
    const bpm = settings.bpm || 100;
    const beat = 60 / bpm; // 一拍（秒）
    this.stopAll();

    switch (q.type) {
      case 'note':
        this.playNote(q.notes[0], { duration: 1.0, velocity: 108 });
        return 1.0;
      case 'interval':
        if (q.harmonic) {
          this.playChord(q.notes, { duration: 1.3, velocity: 95 });
          return 1.3;
        }
        this.playSequence(q.notes, { noteDuration: 0.45, gap: 0.05, velocity: 108 });
        return 0.45 + 0.05 + 0.45;
      case 'chord':
        this.playChord(q.notes, { duration: 1.6, velocity: 90 });
        return 1.6;
      case 'scale':
        this.playSequence(q.notes, { noteDuration: 0.22, gap: 0.03, velocity: 100 });
        return (q.notes.length * (0.22 + 0.03)) + 0.2;
      case 'progression': {
        const chordDuration = beat * 2; // 每和弦两拍
        const total = this.playChords(q.chords, { chordDuration, gap: 0.1, velocity: 90 });
        return total;
      }
      default:
        return 0;
    }
  }
}

export const audio = new AudioEngine();

// 调试钩子：便于在浏览器控制台检查音频引擎状态（无副作用）
if (typeof window !== 'undefined') {
  window.__vibeAudio = audio;
}
