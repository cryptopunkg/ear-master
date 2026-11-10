// theory.js — 音乐理论基础：音名、音程、音阶、和弦、和弦进行
// 纯逻辑模块，不依赖 DOM/音频，可在 Node 中单元测试。

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// MIDI 约定：A4 = 69 = 440Hz；C4（中央C）= 60
export const MIDI_A4 = 69;
export const MIDI_C4 = 60;

/** 音高类 0..11 -> 音名（默认升号） */
export function pcName(pc, flats = false) {
  const arr = flats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return arr[((pc % 12) + 12) % 12];
}

/** MIDI 编号 -> 音名 + 八度，如 60 -> "C4" */
export function midiToName(midi, flats = false) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${pcName(pc, flats)}${octave}`;
}

export function midiToPc(midi) {
  return ((midi % 12) + 12) % 12;
}

/** 音名（如 "C#4" / "Db4" / "C"）-> MIDI，可带可选八度。 */
export function nameToMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)?$/.exec(name.trim());
  if (!m) return null;
  let pc = 'CDEFGAB'.indexOf(m[1].toUpperCase());
  if (m[2] === '#') pc = (pc + 1) % 12;
  if (m[2] === 'b') pc = (pc + 11) % 12;
  const octave = m[3] === undefined ? 4 : parseInt(m[3], 10);
  return (octave + 1) * 12 + pc;
}

// ---------------------------------------------------------------------------
// 音程
// ---------------------------------------------------------------------------
export const INTERVALS = [
  { id: 'P1', semitones: 0, name: '纯一度', alt: '同度' },
  { id: 'm2', semitones: 1, name: '小二度' },
  { id: 'M2', semitones: 2, name: '大二度' },
  { id: 'm3', semitones: 3, name: '小三度' },
  { id: 'M3', semitones: 4, name: '大三度' },
  { id: 'P4', semitones: 5, name: '纯四度' },
  { id: 'TT', semitones: 6, name: '三全音', alt: '增四度/减五度' },
  { id: 'P5', semitones: 7, name: '纯五度' },
  { id: 'm6', semitones: 8, name: '小六度' },
  { id: 'M6', semitones: 9, name: '大六度' },
  { id: 'm7', semitones: 10, name: '小七度' },
  { id: 'M7', semitones: 11, name: '大七度' },
  { id: 'P8', semitones: 12, name: '纯八度' },
  { id: 'm9', semitones: 13, name: '小九度' },
  { id: 'M9', semitones: 14, name: '大九度' },
  { id: 'm10', semitones: 15, name: '小十度' },
  { id: 'M10', semitones: 16, name: '大十度' },
];

export function intervalBySemitones(s) {
  return INTERVALS.find((i) => i.semitones === s) || null;
}

// ---------------------------------------------------------------------------
// 音阶 / 调式
// ---------------------------------------------------------------------------
export const SCALES = [
  { id: 'major', name: '自然大调', alt: 'Ionian 伊奥尼亚', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'natural_minor', name: '自然小调', alt: 'Aeolian 爱奥利亚', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic_minor', name: '和声小调', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic_minor', name: '旋律小调', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'major_penta', name: '大调五声音阶', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor_penta', name: '小调五声音阶', intervals: [0, 3, 5, 7, 10] },
  { id: 'dorian', name: '多利亚调式', alt: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: '弗里几亚调式', alt: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: '利底亚调式', alt: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: '混合利底亚调式', alt: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', name: '洛克里亚调式', alt: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
];

export function scaleById(id) {
  return SCALES.find((s) => s.id === id) || null;
}

// ---------------------------------------------------------------------------
// 和弦
// ---------------------------------------------------------------------------
export const CHORDS = [
  { id: 'major', name: '大三和弦', symbol: '', intervals: [0, 4, 7], degreeName: '大三' },
  { id: 'minor', name: '小三和弦', symbol: 'm', intervals: [0, 3, 7], degreeName: '小三' },
  { id: 'dim', name: '减三和弦', symbol: 'dim', intervals: [0, 3, 6], degreeName: '减三' },
  { id: 'aug', name: '增三和弦', symbol: 'aug', intervals: [0, 4, 8], degreeName: '增三' },
  { id: 'sus2', name: '挂二和弦', symbol: 'sus2', intervals: [0, 2, 7], degreeName: '挂二' },
  { id: 'sus4', name: '挂四和弦', symbol: 'sus4', intervals: [0, 5, 7], degreeName: '挂四' },
  { id: 'maj7', name: '大七和弦', symbol: 'maj7', intervals: [0, 4, 7, 11], degreeName: '大七' },
  { id: 'dom7', name: '属七和弦', symbol: '7', intervals: [0, 4, 7, 10], degreeName: '属七' },
  { id: 'min7', name: '小七和弦', symbol: 'm7', intervals: [0, 3, 7, 10], degreeName: '小七' },
  { id: 'm7b5', name: '半减七和弦', symbol: 'm7♭5', intervals: [0, 3, 6, 10], degreeName: '半减七' },
  { id: 'dim7', name: '减七和弦', symbol: 'dim7', intervals: [0, 3, 6, 9], degreeName: '减七' },
  { id: 'mmaj7', name: '小大七和弦', symbol: 'mMaj7', intervals: [0, 3, 7, 11], degreeName: '小大七' },
];

export function chordById(id) {
  return CHORDS.find((c) => c.id === id) || null;
}

/** 和弦名称，如 rootPc=0, chord=major -> "C"；minor -> "Cm" */
export function chordName(rootPc, chord, flats = false) {
  return pcName(rootPc, flats) + (chord.symbol || '');
}

// ---------------------------------------------------------------------------
// 和弦进行（罗马数字 + 音级功能）
// ---------------------------------------------------------------------------
// 每个条目：degrees 为音级（1..7），qualities 为对应和弦 id。
// major 调内自然和弦：1=major 2=minor 3=minor 4=major 5=major 6=minor 7=dim
export const PROGRESSIONS = [
  { id: 'I-V-I', label: 'I – V – I', degrees: [1, 5, 1], qualities: ['major', 'major', 'major'] },
  { id: 'I-IV-V-I', label: 'I – IV – V – I', degrees: [1, 4, 5, 1], qualities: ['major', 'major', 'major', 'major'] },
  { id: 'I-vi-IV-V', label: 'I – vi – IV – V', degrees: [1, 6, 4, 5], qualities: ['major', 'minor', 'major', 'major'] },
  { id: 'I-V-vi-IV', label: 'I – V – vi – IV', degrees: [1, 5, 6, 4], qualities: ['major', 'major', 'minor', 'major'] },
  { id: 'ii-V-I', label: 'ii – V – I', degrees: [2, 5, 1], qualities: ['minor', 'major', 'major'] },
  { id: 'I-vi-ii-V', label: 'I – vi – ii – V', degrees: [1, 6, 2, 5], qualities: ['major', 'minor', 'minor', 'major'] },
  { id: 'vi-IV-I-V', label: 'vi – IV – I – V', degrees: [6, 4, 1, 5], qualities: ['minor', 'major', 'major', 'major'] },
  { id: 'I-IV-ii-V', label: 'I – IV – ii – V', degrees: [1, 4, 2, 5], qualities: ['major', 'major', 'minor', 'major'] },
];

// 小调进行（自然小调）
export const PROGRESSIONS_MINOR = [
  { id: 'i-iv-v-i', label: 'i – iv – v – i', degrees: [1, 4, 5, 1], qualities: ['minor', 'minor', 'minor', 'minor'] },
  { id: 'i-VI-III-VII', label: 'i – VI – III – VII', degrees: [1, 6, 3, 7], qualities: ['minor', 'major', 'major', 'major'] },
  { id: 'i-VII-VI-VII', label: 'i – VII – VI – VII', degrees: [1, 7, 6, 7], qualities: ['minor', 'major', 'major', 'major'] },
];

export function progressionById(id) {
  return [...PROGRESSIONS, ...PROGRESSIONS_MINOR].find((p) => p.id === id) || null;
}

// ---------------------------------------------------------------------------
// 调与音级工具
// ---------------------------------------------------------------------------
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/** 大调某音级（1..7）的根音音高类 */
export function majorDegreePc(rootPc, degree) {
  return (rootPc + MAJOR_INTERVALS[(degree - 1) % 7]) % 12;
}
export function minorDegreePc(rootPc, degree) {
  return (rootPc + MINOR_INTERVALS[(degree - 1) % 7]) % 12;
}

/** 罗马数字标注（带大小写），如 major 调 2 级 -> "ii"，minor 调 6 级 -> "VI" */
export function romanNumeral(degree, quality, isMinorKey) {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  let base = numerals[(degree - 1) % 7];
  if (isMinorKey) {
    // 小调中大三和弦用大写，其余小写；减和弦加 °
    if (quality === 'major') base = base; // 保持大写
    else base = base.toLowerCase();
  } else {
    if (quality === 'minor' || quality === 'dim' || quality === 'm7b5') base = base.toLowerCase();
  }
  if (quality === 'dim' || quality === 'm7b5') base += '°';
  return base;
}

// ---------------------------------------------------------------------------
// 随机工具
// ---------------------------------------------------------------------------
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

/** 洗牌（Fisher–Yates），返回新数组 */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 从 pool 中取 n 个不同元素（含 answer），返回洗牌后的数组 */
export function pickChoices(pool, answer, n, keyFn = (x) => x.id) {
  const answerId = keyFn(answer);
  const others = shuffle(pool.filter((x) => keyFn(x) !== answerId));
  const chosen = [answer, ...others.slice(0, n - 1)];
  return shuffle(chosen);
}

/** 取数组不重复样本 n 个 */
export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

// ---------------------------------------------------------------------------
// 音高范围与声部
// ---------------------------------------------------------------------------
/** 把一个音高类 + 八度约束转成合适 MIDI（用于根音） */
export function clampMidi(midi, min, max) {
  return Math.max(min, Math.min(max, midi));
}

/** 按音程列表在指定八度构建 MIDI 序列（升序），可能超出范围的会整体下移 */
export function buildNotes(rootPc, intervals, octave = 4, maxMidi = 84, minMidi = 36) {
  const rootMidi = (octave + 1) * 12 + rootPc;
  let notes = intervals.map((iv) => rootMidi + iv);
  // 若超出上限，整体下移一个八度
  const top = Math.max(...notes);
  const bottom = Math.min(...notes);
  if (top > maxMidi) {
    const diff = Math.ceil((top - maxMidi) / 12) * 12;
    notes = notes.map((n) => n - diff);
  }
  if (bottom < minMidi) {
    const diff = Math.ceil((minMidi - bottom) / 12) * 12;
    notes = notes.map((n) => n + diff);
  }
  return notes;
}

/** 构建完整音阶（上行再下行到根音），返回 MIDI 数组 */
export function buildScaleNotes(rootPc, intervals, octave = 4, descend = true) {
  const rootMidi = (octave + 1) * 12 + rootPc;
  const up = [rootMidi, ...intervals.slice(1).map((iv) => rootMidi + iv), rootMidi + 12];
  if (!descend) return up;
  const down = up.slice(1, -1).reverse();
  return [...up, ...down];
}
