// storage.js — 本地持久化（localStorage）：设置、统计、错题、历史
const K = {
  settings: 'vibe.settings.v1',
  stats: 'vibe.stats.v1',
  wrong: 'vibe.wrong.v1',
};

export const DEFAULT_SETTINGS = {
  instrument: 'piano',       // piano | guitar_acoustic | guitar_electric
  difficulty: 'easy',        // easy | medium | hard
  key: 'random',             // 'random' | 0..11 | 'C'
  flats: false,              // 用降号音名
  count: 10,                 // 每组题目数
  bpm: 100,
  autoPlay: true,            // 出题后自动播放
  intervalHarmonic: false,   // 音程默认同时/先后（hard 会随机）
  noteOctave: 4,             // 键盘起始八度（C4 起）
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储满或隐私模式，忽略
  }
}

export function getSettings() {
  const s = read(K.settings, {});
  return { ...DEFAULT_SETTINGS, ...s };
}

export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(K.settings, next);
  return next;
}

// ---------------------------------------------------------------------------
// 统计
// ---------------------------------------------------------------------------
export function emptyStats() {
  return {
    total: 0,
    correct: 0,
    timeMs: 0,
    streak: 0,
    bestStreak: 0,
    byType: {},
    byDay: {}, // 'YYYY-MM-DD' -> { total, correct }
  };
}

export function getStats() {
  const s = read(K.stats, null);
  if (!s || typeof s.total !== 'number') return emptyStats();
  return s;
}

export function recordAnswer(record) {
  // record: { type, correct, timeMs, userAnswer, correctAnswer }
  const s = getStats();
  s.total += 1;
  if (record.correct) {
    s.correct += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  s.timeMs += record.timeMs || 0;

  const t = s.byType[record.type] || { total: 0, correct: 0, timeMs: 0 };
  t.total += 1;
  t.correct += record.correct ? 1 : 0;
  t.timeMs += record.timeMs || 0;
  s.byType[record.type] = t;

  const day = new Date().toISOString().slice(0, 10);
  const d = s.byDay[day] || { total: 0, correct: 0 };
  d.total += 1;
  d.correct += record.correct ? 1 : 0;
  s.byDay[day] = d;

  write(K.stats, s);
  return s;
}

export function resetStats() {
  write(K.stats, emptyStats());
  return emptyStats();
}

// ---------------------------------------------------------------------------
// 错题
// ---------------------------------------------------------------------------
export function getWrongAnswers() {
  return read(K.wrong, []);
}

export function addWrongAnswer(entry) {
  // entry: { ts, type, typeName, question, userAnswerLabel, correctAnswerLabel }
  const list = getWrongAnswers();
  list.unshift({ ...entry, ts: entry.ts || Date.now() });
  // 同类同题去重，保留最新
  const seen = new Set();
  const dedup = list.filter((e) => {
    const k = e.type + '|' + (e.question && e.question.answerId);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  write(K.wrong, dedup.slice(0, 200));
  return dedup;
}

export function removeWrongAnswer(key) {
  const list = getWrongAnswers().filter((e) => (e.type + '|' + e.question?.answerId) !== key);
  write(K.wrong, list);
  return list;
}

export function clearWrongAnswers() {
  write(K.wrong, []);
  return [];
}

// ---------------------------------------------------------------------------
// 练习会话历史（每次结束一组练习记录一条）
// ---------------------------------------------------------------------------
export function addSession(session) {
  // session: { ts, type, typeName, total, correct, accuracy }
  const key = 'vibe.sessions.v1';
  const list = read(key, []);
  list.unshift({ ...session, ts: session.ts || Date.now() });
  write(key, list.slice(0, 100));
  return list;
}

export function getSessions() {
  return read('vibe.sessions.v1', []);
}
