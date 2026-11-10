// viz.js — 可视化组件：钢琴键盘、吉他指板
import { midiToName, midiToPc } from './theory.js';

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const isBlack = (midi) => !WHITE_PCS.includes(midiToPc(midi));

// 吉他标准调弦：E2 A2 D3 G3 B3 E4（低音到高音）
export const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64];
export const GUITAR_STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

const WHITE_W = 44;
const BLACK_W = 28;

/**
 * 渲染钢琴键盘。
 * opts: { startMidi, endMidi, highlight (midi[]), marked (midi->'correct'|'wrong'),
 *         labels (bool), interactive (bool), small (bool) }
 */
export function renderKeyboard(opts = {}) {
  const {
    startMidi = 60, endMidi = 83, highlight = [], marked = {},
    labels = true, interactive = true, small = false,
  } = opts;

  const ww = small ? 32 : WHITE_W;
  const bw = small ? 20 : BLACK_W;

  const whiteKeys = [];
  for (let m = startMidi; m <= endMidi; m++) if (!isBlack(m)) whiteKeys.push(m);
  const blackKeys = [];
  for (let m = startMidi; m <= endMidi; m++) if (isBlack(m)) blackKeys.push(m);

  const whiteIndex = new Map(whiteKeys.map((m, i) => [m, i]));

  const markOf = (m) => marked[m] || '';
  const isHit = (m) => highlight.includes(m);

  const whiteHtml = whiteKeys.map((m) => {
    const cls = ['key', 'white', markOf(m), isHit(m) ? 'hit' : ''].filter(Boolean).join(' ');
    const label = labels ? midiToName(m) : '';
    const octLabel = labels ? midiToName(m).slice(-2) : '';
    return `<button type="button" class="${cls}" data-key="${m}" ${interactive ? '' : 'disabled'}><span class="key-note">${label}</span><span class="key-oct">${octLabel}</span></button>`;
  }).join('');

  const blackHtml = blackKeys.map((m) => {
    const leftWhite = m - 1;
    const wi = whiteIndex.get(leftWhite);
    if (wi === undefined) return '';
    const left = (wi + 1) * ww - bw / 2;
    const cls = ['key', 'black', markOf(m), isHit(m) ? 'hit' : ''].filter(Boolean).join(' ');
    const label = labels ? midiToName(m) : '';
    return `<button type="button" class="${cls}" data-key="${m}" style="left:${left}px" ${interactive ? '' : 'disabled'}><span class="key-note">${label}</span></button>`;
  }).join('');

  const width = whiteKeys.length * ww;
  return `<div class="piano ${small ? 'small' : ''}" style="width:${width}px;--ww:${ww}px;--bw:${bw}px;">
    <div class="piano-whites">${whiteHtml}</div>
    <div class="piano-blacks">${blackHtml}</div>
  </div>`;
}

/**
 * 渲染吉他指板图（弦×品），高亮给定音符的音高类位置。
 * opts: { notes (midi[]), frets (0..N), markNotes }
 */
export function renderFretboard(opts = {}) {
  const { notes = [], frets = 12 } = opts;
  const targetPcs = new Set(notes.map((n) => midiToPc(n)));
  const rootPc = notes.length ? midiToPc(notes[0]) : null;

  const rows = GUITAR_STRINGS.map((openMidi, s) => {
    let cells = '';
    for (let f = 0; f <= frets; f++) {
      const midi = openMidi + f;
      const pc = midiToPc(midi);
      const active = targetPcs.has(pc);
      const isRoot = active && pc === rootPc;
      const cls = ['fret-cell', active ? 'active' : '', isRoot ? 'root' : '', f === 0 ? 'open' : '']
        .filter(Boolean).join(' ');
      const label = active ? (isRoot ? 'R' : '') : '';
      cells += `<div class="${cls}">${label}</div>`;
    }
    return `<div class="fret-row"><span class="string-name">${GUITAR_STRING_NAMES[s]}</span><div class="fret-cells">${cells}</div></div>`;
  }).join('');

  const fretNums = Array.from({ length: frets + 1 }, (_, f) =>
    `<div class="fret-num">${f === 0 ? '空' : f}</div>`).join('');

  return `<div class="fretboard">
    <div class="fret-header"><span class="string-name"></span><div class="fret-cells">${fretNums}</div></div>
    ${rows}
  </div>`;
}

/** 把一组 MIDI 音高类去重成有序名称列表 */
export function notesSummary(midis, flats = false) {
  const seen = [];
  for (const m of midis) {
    const name = midiToName(m, flats);
    if (!seen.includes(name)) seen.push(name);
  }
  return seen;
}
