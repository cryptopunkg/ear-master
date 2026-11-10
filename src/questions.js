// questions.js — 题库生成器：根据设置生成各类型练习题
import {
  INTERVALS, PROGRESSIONS_MINOR,
  pcName, midiToName, chordName, chordById, scaleById, progressionById,
  romanNumeral, majorDegreePc, minorDegreePc,
  randInt, pick, pickChoices, buildNotes, buildScaleNotes,
} from './theory.js';

let seq = 0;
function newId() {
  seq += 1;
  return `${Date.now().toString(36)}-${seq}-${randInt(0, 99999)}`;
}

// ---------------------------------------------------------------------------
// 难度 -> 内容池
// ---------------------------------------------------------------------------
const DIFF_INTERVALS = {
  easy: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'],
  medium: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8', 'm6', 'm7', 'M7', 'TT'],
  hard: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8', 'm6', 'm7', 'M7', 'TT', 'm9', 'M9', 'm10', 'M10'],
};

const DIFF_CHORDS = {
  easy: ['major', 'minor'],
  medium: ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'],
  hard: ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'dom7', 'min7', 'm7b5', 'dim7'],
};

const DIFF_SCALES = {
  easy: ['major', 'natural_minor'],
  medium: ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor', 'major_penta', 'minor_penta'],
  hard: ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor', 'major_penta', 'minor_penta',
    'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'],
};

const DIFF_PROGRESSIONS = {
  easy: ['I-V-I', 'I-IV-V-I'],
  medium: ['I-V-I', 'I-IV-V-I', 'I-vi-IV-V', 'I-V-vi-IV', 'ii-V-I'],
  hard: ['I-V-I', 'I-IV-V-I', 'I-vi-IV-V', 'I-V-vi-IV', 'ii-V-I', 'I-vi-ii-V', 'vi-IV-I-V', 'I-IV-ii-V',
    'i-iv-v-i', 'i-VI-III-VII', 'i-VII-VI-VII'],
};

const DIFF_NOTE_RANGE = {
  easy: { min: 60, max: 71, whiteOnly: true },   // C4..B4 白键
  medium: { min: 60, max: 71, whiteOnly: false }, // C4..B4 半音阶
  hard: { min: 60, max: 83, whiteOnly: false },   // C4..B5 半音阶
};

export function difficultyPool(map, difficulty) {
  return map[difficulty] || map.medium;
}

/** 解析调设置：'random' 或 0..11 或音名 */
export function resolveKeyPc(keySetting) {
  if (keySetting === 'random' || keySetting == null) return randInt(0, 11);
  const n = Number(keySetting);
  if (!Number.isNaN(n) && n >= 0 && n <= 11) return n;
  const byName = 'CDEFGAB'.indexOf(String(keySetting)[0]?.toUpperCase());
  if (byName >= 0) {
    let pc = byName;
    if (String(keySetting).includes('#')) pc = (pc + 1) % 12;
    if (String(keySetting).includes('b')) pc = (pc + 11) % 12;
    return pc;
  }
  return randInt(0, 11);
}

// ---------------------------------------------------------------------------
// 单音识别
// ---------------------------------------------------------------------------
export function genNoteQuestion(settings) {
  const range = DIFF_NOTE_RANGE[settings.difficulty] || DIFF_NOTE_RANGE.medium;
  const flats = !!settings.flats;
  let midi;
  if (range.whiteOnly) {
    const whitePcs = [0, 2, 4, 5, 7, 9, 11];
    const candidates = [];
    for (let m = range.min; m <= range.max; m++) {
      if (whitePcs.includes(m % 12)) candidates.push(m);
    }
    midi = pick(candidates);
  } else {
    midi = randInt(range.min, range.max);
  }
  return {
    id: newId(),
    type: 'note',
    title: '单音识别',
    prompt: '听这个音，在键盘上点出它的音名',
    notes: [midi],
    answerPc: midi % 12,
    answerId: pcName(midi % 12, flats),
    answerMidi: midi,
    explanation: `这个音是 ${midiToName(midi, flats)}（音高类 ${pcName(midi % 12, flats)}）。`,
    keyboardFrom: 60,
    keyboardTo: 83,
  };
}

// ---------------------------------------------------------------------------
// 音程识别
// ---------------------------------------------------------------------------
export function genIntervalQuestion(settings) {
  const pool = difficultyPool(DIFF_INTERVALS, settings.difficulty);
  const intervalId = pick(pool);
  const interval = INTERVALS.find((i) => i.id === intervalId);
  const harmonic = settings.difficulty === 'hard' && Math.random() < 0.5;
  const flats = !!settings.flats;

  // 根音范围：保证上方音不超出 C6 (84)
  const rootPc = resolveKeyPc(settings.key);
  const maxRoot = 84 - interval.semitones;
  const minRoot = 55; // G3
  let rootMidi = randInt(minRoot, Math.min(maxRoot, 72));
  // 让根音落在所选调内（可选）——这里保留随机八度，仅固定音高类
  rootMidi = (Math.floor(rootMidi / 12)) * 12 + rootPc;

  const topMidi = rootMidi + interval.semitones;
  const choices = pickChoices(pool, interval.id, 4, (id) => id)
    .map((id) => INTERVALS.find((i) => i.id === id));

  return {
    id: newId(),
    type: 'interval',
    title: '音程识别',
    prompt: harmonic
      ? `听这两个音（同时奏响），它们的音程是？`
      : `听这两个音（先后奏响），它们的音程是？`,
    notes: [rootMidi, topMidi],
    harmonic,
    answerId: interval.id,
    choices: choices.map((c) => ({ id: c.id, label: c.name, sub: c.alt || '' })),
    explanation: `${midiToName(rootMidi, flats)} → ${midiToName(topMidi, flats)}，相差 ${interval.semitones} 个半音，是「${interval.name}」${interval.alt ? '（' + interval.alt + '）' : ''}。`,
  };
}

// ---------------------------------------------------------------------------
// 和弦识别
// ---------------------------------------------------------------------------
export function genChordQuestion(settings) {
  const pool = difficultyPool(DIFF_CHORDS, settings.difficulty);
  const chord = chordById(pick(pool));
  const flats = !!settings.flats;
  const rootPc = resolveKeyPc(settings.key);
  const rootMidi = randInt(48, 64) - ((randInt(48, 64) - rootPc) % 12 + 12) % 12;
  const notes = buildNotes(rootPc, chord.intervals, Math.floor(rootMidi / 12) - 1);
  const choices = pickChoices(pool, chord.id, 4, (id) => id)
    .map((id) => chordById(id));

  return {
    id: newId(),
    type: 'chord',
    title: '和弦识别',
    prompt: '听这个和弦，判断它的性质（根音会在答案中显示）',
    notes,
    answerId: chord.id,
    rootPc,
    rootName: pcName(rootPc, flats),
    chordName: chordName(rootPc, chord, flats),
    choices: choices.map((c) => ({ id: c.id, label: c.name, sub: c.symbol ? `如 C${c.symbol}` : '如 C' })),
    explanation: `根音 ${pcName(rootPc, flats)} 的「${chord.name}」（${chordName(rootPc, chord, flats)}），构成音：${chord.intervals.map((iv) => pcName((rootPc + iv) % 12, flats)).join('、')}。`,
  };
}

// ---------------------------------------------------------------------------
// 音阶 / 调式识别
// ---------------------------------------------------------------------------
export function genScaleQuestion(settings) {
  const pool = difficultyPool(DIFF_SCALES, settings.difficulty);
  const scale = scaleById(pick(pool));
  const flats = !!settings.flats;
  const rootPc = resolveKeyPc(settings.key);
  const octave = randInt(3, 4);
  const notes = buildScaleNotes(rootPc, scale.intervals, octave, true);
  const choices = pickChoices(pool, scale.id, 4, (id) => id)
    .map((id) => scaleById(id));

  return {
    id: newId(),
    type: 'scale',
    title: '音阶 / 调式识别',
    prompt: '听这段音阶（上行再下行），它是什么音阶 / 调式？',
    notes,
    answerId: scale.id,
    rootPc,
    rootName: pcName(rootPc, flats),
    choices: choices.map((c) => ({ id: c.id, label: c.name, sub: c.alt || '' })),
    explanation: `这是 ${pcName(rootPc, flats)} 上的「${scale.name}」${scale.alt ? '（' + scale.alt + '）' : ''}，音阶结构：${scale.intervals.join('、')} 半音距。`,
  };
}

// ---------------------------------------------------------------------------
// 和弦进行识别
// ---------------------------------------------------------------------------
export function genProgressionQuestion(settings) {
  const pool = difficultyPool(DIFF_PROGRESSIONS, settings.difficulty);
  const prog = progressionById(pick(pool));
  const flats = !!settings.flats;
  const isMinor = PROGRESSIONS_MINOR.some((p) => p.id === prog.id);
  const keyPc = resolveKeyPc(settings.key);
  const keyName = pcName(keyPc, flats);

  // 构建每个和弦的 MIDI 音（根位置，集中在 C3..C5 区域）
  const chords = prog.degrees.map((deg, idx) => {
    const quality = prog.qualities[idx];
    const chord = chordById(quality);
    const degreePc = isMinor ? minorDegreePc(keyPc, deg) : majorDegreePc(keyPc, deg);
    return buildNotes(degreePc, chord.intervals, randInt(3, 4) - 1);
  });

  const numerals = prog.degrees.map((deg, idx) => romanNumeral(deg, prog.qualities[idx], isMinor));
  const choices = pickChoices(pool, prog.id, 4, (id) => id)
    .map((id) => progressionById(id));

  return {
    id: newId(),
    type: 'progression',
    title: '和弦进行识别',
    prompt: `听这段和弦进行（${keyName} 调），它对应的罗马数字进行是？`,
    chords,
    answerId: prog.id,
    answerLabel: prog.label,
    isMinor,
    keyName,
    numerals,
    choices: choices.map((c) => ({ id: c.id, label: c.label })),
    explanation: `${keyName} ${isMinor ? '小' : '大'}调中，这段进行是「${prog.label}」。各和弦根音：${chords.map((c) => pcName(c[0] % 12, flats)).join(' – ')}。`,
  };
}

// ---------------------------------------------------------------------------
// 分发器
// ---------------------------------------------------------------------------
export function genQuestion(type, settings) {
  switch (type) {
    case 'note': return genNoteQuestion(settings);
    case 'interval': return genIntervalQuestion(settings);
    case 'chord': return genChordQuestion(settings);
    case 'scale': return genScaleQuestion(settings);
    case 'progression': return genProgressionQuestion(settings);
    default: throw new Error(`未知题型: ${type}`);
  }
}

export const EXERCISE_TYPES = [
  { id: 'note', name: '单音识别', icon: '🎹', desc: '听单个音，判断音名', color: '#4f8ef7' },
  { id: 'interval', name: '音程识别', icon: '🎼', desc: '判断两音之间的音程', color: '#7c5cf0' },
  { id: 'chord', name: '和弦识别', icon: '🎸', desc: '判断和弦性质（三/七和弦）', color: '#e06a3f' },
  { id: 'scale', name: '音阶 / 调式', icon: '🎵', desc: '判断音阶与调式', color: '#2fae7c' },
  { id: 'progression', name: '和弦进行', icon: '🔁', desc: '判断和弦进行的罗马数字', color: '#d15a86' },
];
