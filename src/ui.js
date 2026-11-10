// ui.js — 应用主控制器：路由、界面渲染、交互
import { audio, INSTRUMENTS } from './audio.js';
import { genQuestion, EXERCISE_TYPES } from './questions.js';
import * as store from './storage.js';
import { renderKeyboard, renderFretboard } from './viz.js';
import { pcName } from './theory.js';
import './styles.css';

const state = {
  view: 'home',
  settings: store.getSettings(),
  session: null, // { type, typeName, questions, index, correct, answers, startTs, answered }
  lastAnswer: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------------------------------------------------------------------------
// 基础 DOM
// ---------------------------------------------------------------------------
const viewEl = $('#view');
const headerTitle = $('#header-title');
const backBtn = $('#back-btn');
const tabbar = $('#tabbar');
const overlay = $('#overlay');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showOverlay(phase = '加载中…', progress = 0) {
  overlay.classList.add('show');
  $('#overlay-text').textContent = phase;
  $('#overlay-bar-fill').style.width = `${Math.round(progress * 100)}%`;
}

function hideOverlay() {
  overlay.classList.remove('show');
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

async function ensureAudio() {
  if (audio.ready) { audio.ensureRunning(); return true; }
  showOverlay('初始化音频…', 0);
  audio.onStatusChange = (phase, progress) => showOverlay(phase, progress);
  try {
    await audio.init();
    audio.setInstrument(state.settings.instrument);
    return true;
  } catch (e) {
    console.error(e);
    toast('音频初始化失败：' + (e && e.message ? e.message : e));
    return false;
  } finally {
    hideOverlay();
  }
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------
function navigate(view) {
  state.view = view;
  render();
  window.scrollTo(0, 0);
}

function render() {
  switch (state.view) {
    case 'home': return renderHome();
    case 'settings': return renderSettings();
    case 'exercise': return renderExercise();
    case 'results': return renderResults();
    case 'stats': return renderStats();
    case 'wrong': return renderWrong();
    default: return renderHome();
  }
}

function setChrome() {
  const v = state.view;
  const titles = {
    home: 'VibeCoding · 练耳', settings: '设置', exercise: '练习',
    results: '练习结果', stats: '统计', wrong: '错题本',
  };
  headerTitle.textContent = titles[v] || 'VibeCoding';
  backBtn.style.visibility = (v === 'home') ? 'hidden' : 'visible';
  const hideTab = v === 'exercise' || v === 'results';
  tabbar.style.display = hideTab ? 'none' : 'flex';
  $$('#tabbar .tab').forEach((el) => el.classList.toggle('active', el.dataset.tab === tabFor(v)));
}

function tabFor(v) {
  if (v === 'stats') return 'stats';
  if (v === 'wrong') return 'wrong';
  if (v === 'settings') return 'settings';
  return 'home';
}

// ---------------------------------------------------------------------------
// 首页
// ---------------------------------------------------------------------------
function renderHome() {
  setChrome();
  const s = store.getStats();
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  const wrongCount = store.getWrongAnswers().length;

  const cards = EXERCISE_TYPES.map((t) => {
    const by = s.byType[t.id];
    const a = by && by.total ? Math.round((by.correct / by.total) * 100) : null;
    return `
      <button class="type-card" data-action="start" data-type="${t.id}" style="--c:${t.color}">
        <div class="type-icon">${t.icon}</div>
        <div class="type-body">
          <div class="type-name">${t.name}</div>
          <div class="type-desc">${t.desc}</div>
        </div>
        <div class="type-acc">${a == null ? '未练习' : a + '%'}</div>
      </button>`;
  }).join('');

  viewEl.innerHTML = `
    <div class="screen home">
      <div class="hero">
        <h1>VibeCoding</h1>
        <p class="hero-sub">离线练耳 · 吉他 / 钢琴音色</p>
        <div class="hero-stats">
          <div class="stat-chip"><b>${s.total}</b><span>已练习</span></div>
          <div class="stat-chip"><b>${acc}%</b><span>正确率</span></div>
          <div class="stat-chip"><b>${s.streak}</b><span>连对</span></div>
          <div class="stat-chip"><b>${wrongCount}</b><span>错题</span></div>
        </div>
      </div>
      <h2 class="section-title">选择练习</h2>
      <div class="type-grid">${cards}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// 设置
// ---------------------------------------------------------------------------
function renderSettings() {
  setChrome();
  const st = state.settings;
  const instBtns = Object.values(INSTRUMENTS).map((i) =>
    `<button class="seg ${st.instrument === i.id ? 'on' : ''}" data-action="setting" data-key="instrument" data-val="${i.id}">${i.name}</button>`).join('');

  const diffBtns = ['easy', 'medium', 'hard'].map((d) => {
    const names = { easy: '简单', medium: '中级', hard: '高级' };
    return `<button class="seg ${st.difficulty === d ? 'on' : ''}" data-action="setting" data-key="difficulty" data-val="${d}">${names[d]}</button>`;
  }).join('');

  const keyOpts = ['random', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => {
    const label = k === 'random' ? '随机' : pcName(k, st.flats);
    return `<option value="${k}" ${String(st.key) === String(k) ? 'selected' : ''}>${label}</option>`;
  }).join('');

  viewEl.innerHTML = `
    <div class="screen settings">
      <section class="panel">
        <h3>音色</h3>
        <div class="seg-row">${instBtns}</div>
        <p class="hint">切换练习使用的乐器音色（钢琴 / 木吉他 / 电吉他）</p>
      </section>

      <section class="panel">
        <h3>难度</h3>
        <div class="seg-row">${diffBtns}</div>
        <p class="hint">决定音程跨度、和弦复杂度、进行长度与音阶种类</p>
      </section>

      <section class="panel">
        <h3>调式 / 基准调</h3>
        <select class="select" data-action="setting" data-key="key" id="key-select">
          ${keyOpts}
        </select>
        <p class="hint">固定题目根音所在调，或随机出题</p>
      </section>

      <section class="panel">
        <h3>音名记法</h3>
        <label class="switch-row">
          <span>使用降号音名（如 B♭、E♭）</span>
          <input type="checkbox" data-action="setting" data-key="flats" ${st.flats ? 'checked' : ''}>
        </label>
      </section>

      <section class="panel">
        <h3>每轮题数</h3>
        <input type="range" min="5" max="30" step="1" value="${st.count}" data-action="setting" data-key="count" id="count-range">
        <span class="range-val" id="count-val">${st.count} 题</span>
      </section>

      <section class="panel">
        <h3>速度（BPM）</h3>
        <input type="range" min="60" max="160" step="5" value="${st.bpm}" data-action="setting" data-key="bpm" id="bpm-range">
        <span class="range-val" id="bpm-val">${st.bpm}</span>
      </section>

      <section class="panel">
        <h3>自动播放</h3>
        <label class="switch-row">
          <span>出题后自动播放音频</span>
          <input type="checkbox" data-action="setting" data-key="autoPlay" ${st.autoPlay ? 'checked' : ''}>
        </label>
      </section>

      <section class="panel danger">
        <h3>数据</h3>
        <button class="btn-outline" data-action="stats:reset">清空练习统计</button>
      </section>

      <p class="about">VibeCoding · 离线练耳 PWA<br>音源：GeneralUser GS v1.471（免费授权）<br>合成引擎：SpessaSynth（Apache-2.0）</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// 练习
// ---------------------------------------------------------------------------
async function startSession(type) {
  const ok = await ensureAudio();
  if (!ok) return;
  audio.setInstrument(state.settings.instrument);
  const questions = [];
  for (let i = 0; i < state.settings.count; i++) questions.push(genQuestion(type, state.settings));
  const t = EXERCISE_TYPES.find((x) => x.id === type);
  state.session = {
    type, typeName: t.name, questions, index: 0, correct: 0,
    answers: [], startTs: Date.now(), answered: false, questionStartTs: Date.now(),
  };
  state.lastAnswer = null;
  state.view = 'exercise';
  render();
}

function currentQuestion() {
  const s = state.session;
  return s ? s.questions[s.index] : null;
}

function renderExercise() {
  setChrome();
  const s = state.session;
  if (!s) { navigate('home'); return; }
  const q = currentQuestion();
  const total = s.questions.length;
  const progress = ((s.index) / total) * 100;

  const answerArea = renderAnswerArea(q, s.answered);
  const feedback = s.answered ? renderFeedback(q) : '';
  const nextLabel = s.index + 1 >= total ? '查看结果' : '下一题 ▶';

  viewEl.innerHTML = `
    <div class="screen exercise">
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="ex-meta">
        <span class="ex-count">第 ${s.index + 1} / ${total} 题</span>
        <span class="ex-score">✅ ${s.correct}</span>
      </div>
      <div class="ex-prompt">
        <h2>${q.title}</h2>
        <p>${q.prompt}</p>
      </div>
      <button class="btn-play" data-action="play">🔊 再听一遍</button>
      <div class="answer-area">${answerArea}</div>
      ${feedback}
      <div class="ex-nav">
        ${s.answered ? `<button class="btn-primary" data-action="next">${nextLabel}</button>` : '<span class="hint">选择你的答案</span>'}
      </div>
    </div>`;

  if (state.settings.autoPlay && !s.answered) {
    setTimeout(() => playCurrent(), 180);
  }
}

function renderAnswerArea(q, answered) {
  if (q.type === 'note') {
    const marked = {};
    if (state.lastAnswer && state.lastAnswer.pressedMidi != null) {
      marked[state.lastAnswer.pressedMidi] = state.lastAnswer.correct ? 'correct' : 'wrong';
    }
    const highlight = answered ? [q.answerMidi] : [];
    const kb = renderKeyboard({
      startMidi: q.keyboardFrom, endMidi: q.keyboardTo,
      highlight, marked, labels: true, interactive: !answered, small: false,
    });
    return `<div class="kb-scroll">${kb}</div>`;
  }
  const opts = q.choices.map((c) => {
    let cls = 'choice';
    if (answered) {
      if (c.id === q.answerId) cls += ' correct';
      else if (state.lastAnswer && c.id === state.lastAnswer.chosenId) cls += ' wrong';
    }
    return `<button class="${cls}" data-action="answer" data-id="${esc(c.id)}" ${answered ? 'disabled' : ''}>
      <span class="choice-label">${esc(c.label)}</span>
      ${c.sub ? `<span class="choice-sub">${esc(c.sub)}</span>` : ''}
    </button>`;
  }).join('');
  return `<div class="choices">${opts}</div>`;
}

function renderFeedback(q) {
  const la = state.lastAnswer;
  const correct = la && la.correct;
  const flats = state.settings.flats;

  let viz = '';
  if (q.type === 'note') {
    const marked = { [q.answerMidi]: 'correct' };
    if (la && la.pressedMidi != null && la.pressedMidi !== q.answerMidi) marked[la.pressedMidi] = 'wrong';
    viz = `<div class="kb-scroll">${renderKeyboard({ startMidi: q.keyboardFrom, endMidi: q.keyboardTo, highlight: [q.answerMidi], marked, interactive: false, small: true })}</div>`;
  } else {
    const playNotes = q.type === 'progression' ? q.chords.flat() : q.notes;
    const min = Math.min(...playNotes), max = Math.max(...playNotes);
    const start = Math.max(36, Math.floor(min / 12) * 12);
    const end = Math.min(96, Math.ceil(max / 12) * 12 + 11);
    viz = `<div class="kb-scroll">${renderKeyboard({ startMidi: start, endMidi: end, highlight: playNotes, interactive: false, small: true })}</div>`;
  }

  let extraViz = '';
  if (q.type === 'chord') {
    extraViz = `<div class="fret-wrap"><h4>吉他指板（${esc(q.chordName)} 音位）</h4>${renderFretboard({ notes: q.notes, frets: 12 })}</div>`;
  }
  if (q.type === 'progression') {
    extraViz = `<div class="prog-numerals"><h4>罗马数字进行</h4><div class="numerals">${q.numerals.map((n) => `<span>${esc(n)}</span>`).join('')}</div></div>`;
  }

  const correctLabel = q.type === 'note' ? q.answerId : (q.choices.find((c) => c.id === q.answerId)?.label || q.answerId);

  return `
    <div class="feedback ${correct ? 'ok' : 'bad'}">
      <div class="fb-head">
        <span class="fb-badge">${correct ? '✅ 正确' : '❌ 错误'}</span>
        <span class="fb-correct">正确答案：<b>${esc(correctLabel)}</b></span>
      </div>
      <p class="fb-explain">${esc(q.explanation)}</p>
      ${viz}
      ${extraViz}
      <button class="btn-ghost" data-action="play">🔊 重听</button>
    </div>`;
}

function playCurrent() {
  const q = currentQuestion();
  if (!q) return;
  audio.ensureRunning();
  audio.playQuestion(q, state.settings);
}

function submitAnswer(chosenId, chosenLabel, extra = {}) {
  const s = state.session;
  if (!s || s.answered) return;
  const q = currentQuestion();
  const correct = chosenId === q.answerId;
  const timeMs = Date.now() - s.questionStartTs;
  if (correct) s.correct += 1;
  s.answered = true;
  s.answers.push({ q, chosenId, chosenLabel, correct, timeMs });
  state.lastAnswer = { chosenId, chosenLabel, correct, pressedMidi: extra.pressedMidi ?? null };

  store.recordAnswer({ type: q.type, correct, timeMs });
  if (!correct) {
    store.addWrongAnswer({
      type: q.type, typeName: q.title, question: q,
      userAnswerLabel: chosenLabel,
      correctAnswerLabel: q.answerId,
    });
  }
  renderExercise();
}

function nextQuestion() {
  const s = state.session;
  if (!s) return;
  if (s.index + 1 >= s.questions.length) {
    finishSession();
    return;
  }
  s.index += 1;
  s.answered = false;
  s.questionStartTs = Date.now();
  state.lastAnswer = null;
  renderExercise();
}

function finishSession() {
  const s = state.session;
  const total = s.answers.length;
  const correct = s.correct;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const durSec = Math.round((Date.now() - s.startTs) / 1000);
  store.addSession({ type: s.type, typeName: s.typeName, total, correct, accuracy: acc, durSec });
  state.session = null;
  state.view = 'results';
  state._result = { type: s.type, total, correct, acc, durSec, typeName: s.typeName };
  render();
}

// ---------------------------------------------------------------------------
// 结果
// ---------------------------------------------------------------------------
function renderResults() {
  setChrome();
  const r = state._result || { total: 0, correct: 0, acc: 0, durSec: 0, typeName: '' };
  const grade = r.acc >= 90 ? '优秀 🎉' : r.acc >= 70 ? '良好 👍' : r.acc >= 50 ? '继续加油 💪' : '多多练习 🌱';
  viewEl.innerHTML = `
    <div class="screen results">
      <div class="result-ring" style="--p:${r.acc}">
        <div class="ring-inner"><b>${r.acc}%</b><span>正确率</span></div>
      </div>
      <h2>${grade}</h2>
      <p class="result-sub">${r.typeName} · 答对 ${r.correct} / ${r.total} 题 · 用时 ${r.durSec} 秒</p>
      <div class="result-actions">
        <button class="btn-primary" data-action="restart">再来一组</button>
        <button class="btn-outline" data-action="go" data-view="home">返回首页</button>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// 统计
// ---------------------------------------------------------------------------
function renderStats() {
  setChrome();
  const s = store.getStats();
  const acc = s.total ? Math.round((s.correct / s.total) * 100) : 0;
  const mins = Math.round(s.timeMs / 60000);

  const typeRows = EXERCISE_TYPES.map((t) => {
    const by = s.byType[t.id] || { total: 0, correct: 0 };
    const a = by.total ? Math.round((by.correct / by.total) * 100) : null;
    return `<tr><td>${t.icon} ${t.name}</td><td>${by.total}</td><td>${a == null ? '—' : a + '%'}</td></tr>`;
  }).join('');

  // 最近 14 天
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dd = s.byDay[key] || { total: 0, correct: 0 };
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, total: dd.total, correct: dd.correct });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const bars = days.map((d) => {
    const h = d.total ? Math.max(6, Math.round((d.total / maxDay) * 80)) : 2;
    return `<div class="day-col" title="${d.label}: ${d.total} 题"><div class="day-bar" style="height:${h}px"></div><span>${d.label}</span></div>`;
  }).join('');

  const sessions = store.getSessions().slice(0, 8).map((se) => {
    const dt = new Date(se.ts);
    return `<div class="session-row"><span>${se.typeName}</span><span>${se.correct}/${se.total}</span><span class="s-acc">${se.accuracy}%</span><span class="s-time">${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}</span></div>`;
  }).join('');

  viewEl.innerHTML = `
    <div class="screen stats">
      <div class="stat-cards">
        <div class="scard"><b>${s.total}</b><span>累计答题</span></div>
        <div class="scard"><b>${acc}%</b><span>总正确率</span></div>
        <div class="scard"><b>${s.bestStreak}</b><span>最长连对</span></div>
        <div class="scard"><b>${mins}</b><span>练习分钟</span></div>
      </div>

      <section class="panel">
        <h3>各类型正确率</h3>
        <table class="type-table"><thead><tr><th>类型</th><th>题数</th><th>正确率</th></tr></thead>
        <tbody>${typeRows}</tbody></table>
      </section>

      <section class="panel">
        <h3>近 14 天练习量</h3>
        <div class="day-chart">${bars}</div>
      </section>

      <section class="panel">
        <h3>最近练习</h3>
        ${sessions ? `<div class="sessions">${sessions}</div>` : '<p class="hint">暂无记录</p>'}
      </section>
    </div>`;
}

// ---------------------------------------------------------------------------
// 错题
// ---------------------------------------------------------------------------
function renderWrong() {
  setChrome();
  const list = store.getWrongAnswers();
  const items = list.map((e) => {
    const key = e.type + '|' + e.question?.answerId;
    const label = e.question?.choices?.find((c) => c.id === e.question.answerId)?.label || '';
    return `<div class="wrong-item" data-key="${esc(key)}">
      <div class="w-info">
        <div class="w-type">${e.typeName}</div>
        <div class="w-detail">你答：<b>${esc(e.userAnswerLabel || '—')}</b> → 正确：<b>${esc(label || e.correctAnswerLabel)}</b></div>
      </div>
      <div class="w-actions">
        <button class="btn-mini" data-action="wrong:play" data-key="${esc(key)}">🔊</button>
        <button class="btn-mini del" data-action="wrong:remove" data-key="${esc(key)}">✕</button>
      </div>
    </div>`;
  }).join('');

  viewEl.innerHTML = `
    <div class="screen wrong">
      <div class="wrong-head">
        <h2>错题本</h2>
        ${list.length ? `<button class="btn-outline" data-action="wrong:clear">清空全部</button>` : ''}
      </div>
      ${list.length ? `<div class="wrong-list">${items}</div>` : `<div class="empty">🎉 太棒了，暂无错题</div>`}
    </div>`;
}

// ---------------------------------------------------------------------------
// 事件
// ---------------------------------------------------------------------------
viewEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const d = el.dataset;
  handleAction(action, d, el);
});

function handleAction(action, d, el) {
  switch (action) {
    case 'go': navigate(d.view); break;
    case 'start': startSession(d.type); break;
    case 'play': playCurrent(); break;
    case 'answer': submitAnswer(d.id, d.id); break;
    case 'next': nextQuestion(); break;
    case 'restart': startSession(state._result?.type || 'note'); break;
    case 'stats:reset':
      if (confirm('确定清空所有练习统计吗？')) { store.resetStats(); toast('统计已清空'); renderStats(); }
      break;
    case 'wrong:play': {
      const list = store.getWrongAnswers();
      const item = list.find((x) => (x.type + '|' + x.question?.answerId) === d.key);
      if (item && item.question) {
        ensureAudio().then((ok) => { if (ok) { audio.setInstrument(state.settings.instrument); audio.playQuestion(item.question, state.settings); } });
      }
      break;
    }
    case 'wrong:remove': {
      store.removeWrongAnswer(d.key); renderWrong();
      break;
    }
    case 'wrong:clear':
      if (confirm('确定清空错题本吗？')) { store.clearWrongAnswers(); renderWrong(); }
      break;
    default: break;
  }
}

// 键盘按键（钢琴键用 data-key，但需要区分是答案还是普通）
viewEl.addEventListener('click', (e) => {
  const key = e.target.closest('.piano .key[data-key]');
  if (!key) return;
  const s = state.session;
  const q = s && currentQuestion();
  if (!s || s.answered || !q || q.type !== 'note') return;
  const midi = parseInt(key.dataset.key, 10);
  const flats = state.settings.flats;
  const chosenName = pcName(midi % 12, flats);
  submitAnswer(chosenName, chosenName, { pressedMidi: midi });
});

// 设置变更（change 事件，用于 select/checkbox/range）
viewEl.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action="setting"]');
  if (!el) return;
  const key = el.dataset.key;
  let val;
  if (el.type === 'checkbox') val = el.checked;
  else val = el.value;
  applySetting(key, val);
});

// 设置段按钮（click）
viewEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="setting"]');
  if (!el) return;
  const key = el.dataset.key;
  if (key === 'instrument' || key === 'difficulty') {
    applySetting(key, el.dataset.val);
  }
});

function applySetting(key, val) {
  const numKeys = ['count', 'bpm'];
  if (numKeys.includes(key)) val = Number(val);
  state.settings = store.setSettings({ [key]: val });
  if (key === 'instrument') audio.setInstrument(val);
  // 实时更新 range 显示
  const rangeVal = $(`#${key}-val`);
  if (rangeVal) rangeVal.textContent = key === 'count' ? `${val} 题` : val;
  // 对 key 变化需要重渲染（音名选项）
  if (key === 'key' || key === 'flats') renderSettings();
}

// 顶部返回按钮
backBtn.addEventListener('click', () => {
  if (state.view === 'exercise' || state.view === 'results') {
    state.session = null;
    navigate('home');
  } else {
    navigate('home');
  }
});

// 底部 tab
tabbar.addEventListener('click', (e) => {
  const el = e.target.closest('.tab');
  if (!el) return;
  navigate(el.dataset.tab);
});

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
render();
