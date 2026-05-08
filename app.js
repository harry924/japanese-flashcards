// vocabulary is loaded from vocab.js via <script src="vocab.js"> before this file

const els = {
  seenCount: document.querySelector('#seenCount'),
  knownCount: document.querySelector('#knownCount'),
  dueCount: document.querySelector('#dueCount'),
  totalCount: document.querySelector('#totalCount'),
  direction: document.querySelector('#directionSelect'),
  filter: document.querySelector('#filterSelect'),
  lesson: document.querySelector('#lessonSelect'),
  search: document.querySelector('#searchInput'),
  shuffle: document.querySelector('#shuffleBtn'),
  reset: document.querySelector('#resetBtn'),
  exportBtn: document.querySelector('#exportBtn'),
  importBtn: document.querySelector('#importBtn'),
  importFile: document.querySelector('#importFile'),
  card: document.querySelector('#card'),
  frontHint: document.querySelector('#frontHint'),
  frontText: document.querySelector('#frontText'),
  frontReading: document.querySelector('#frontReading'),
  frontSpeak: document.querySelector('#frontSpeakBtn'),
  backHint: document.querySelector('#backHint'),
  backText: document.querySelector('#backText'),
  backReading: document.querySelector('#backReading'),
  backSpeak: document.querySelector('#backSpeakBtn'),
  example: document.querySelector('#exampleText'),
  cardLesson: document.querySelector('#cardLesson'),
  srBadge: document.querySelector('#srBadge'),
  prev: document.querySelector('#prevBtn'),
  next: document.querySelector('#nextBtn'),
  again: document.querySelector('#againBtn'),
  flip: document.querySelector('#flipBtn'),
  known: document.querySelector('#knownBtn'),
  quizPrompt: document.querySelector('#quizPrompt'),
  quizInput: document.querySelector('#quizInput'),
  check: document.querySelector('#checkBtn'),
  feedback: document.querySelector('#feedback'),
  list: document.querySelector('#vocabList'),
  listPageSize: document.querySelector('#listPageSizeSelect'),
  listPageInfo: document.querySelector('#listPageInfo'),
  listPrev: document.querySelector('#listPrevBtn'),
  listNext: document.querySelector('#listNextBtn'),
  voice: document.querySelector('#voiceSelect'),
  rate: document.querySelector('#rateInput'),
  rateValue: document.querySelector('#rateValue'),
  pitch: document.querySelector('#pitchInput'),
  pitchValue: document.querySelector('#pitchValue'),
  testVoice: document.querySelector('#testVoiceBtn'),
  speechNote: document.querySelector('#speechNote')
};

const storageKey = 'harry-japanese-vocab-flashcards-v1';
const speechStorageKey = 'harry-japanese-vocab-speech-v1';
const listStorageKey = 'harry-japanese-vocab-list-v1';

const SR_INTERVALS = [1, 3, 7, 14, 30]; // days
const DAY_MS = 86400000;

let progress = loadProgress();
let order = vocabulary.map((_, i) => i);
let current = 0;
let flipped = false;
let currentDirection = 'jp-en';
let speechPrefs = loadSpeechPrefs();
let listPrefs = loadListPrefs();
let listPage = 0;

// ── Storage ──────────────────────────────────────────────────────────────────

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
  catch { return {}; }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

function loadSpeechPrefs() {
  try { return JSON.parse(localStorage.getItem(speechStorageKey)) || {}; }
  catch { return {}; }
}

function saveSpeechPrefs() {
  localStorage.setItem(speechStorageKey, JSON.stringify(speechPrefs));
}

function loadListPrefs() {
  try { return JSON.parse(localStorage.getItem(listStorageKey)) || {}; }
  catch { return {}; }
}

function saveListPrefs() {
  localStorage.setItem(listStorageKey, JSON.stringify(listPrefs));
}

// ── Spaced repetition ────────────────────────────────────────────────────────

function isDue(p) {
  if (!p) return false;
  if (p.status === 'again') return true;
  if (p.status === 'known' && p.dueDate && p.dueDate <= Date.now()) return true;
  return false;
}

function nextInterval(currentInterval) {
  const idx = SR_INTERVALS.indexOf(currentInterval);
  if (idx === -1 || idx === SR_INTERVALS.length - 1) return SR_INTERVALS[SR_INTERVALS.length - 1];
  return SR_INTERVALS[idx + 1];
}

function applySpacedRepetition(cardId, status) {
  const existing = progress[cardId] || {};
  if (status === 'known') {
    const interval = nextInterval(existing.interval || 0);
    return {
      ...existing,
      seen: true,
      status: 'known',
      interval,
      dueDate: Date.now() + interval * DAY_MS,
      updatedAt: Date.now()
    };
  }
  // 'again' — reset to 1-day
  return {
    ...existing,
    seen: true,
    status: 'again',
    interval: 1,
    dueDate: Date.now(),
    updatedAt: Date.now()
  };
}

function srLabel(p) {
  if (!p || !p.status) return '';
  if (p.status === 'again') return 'Review now';
  if (p.status !== 'known' || !p.dueDate) return '';
  const daysLeft = Math.ceil((p.dueDate - Date.now()) / DAY_MS);
  if (daysLeft <= 0) return 'Due now';
  if (daysLeft === 1) return 'Due tomorrow';
  return `Due in ${daysLeft}d`;
}

// ── Lesson select ─────────────────────────────────────────────────────────────

function buildLessonFilter() {
  const lessons = [...new Set(vocabulary.map(v => v.lesson))].sort((a, b) => a - b);
  els.lesson.innerHTML = '<option value="all">All lessons</option>'
    + lessons.map(l => `<option value="${l}">Lesson ${l}</option>`).join('');
  if (listPrefs.lesson) els.lesson.value = listPrefs.lesson;
}

// ── Filtering ────────────────────────────────────────────────────────────────

function filteredIndexes() {
  const q = els.search.value.trim().toLowerCase();
  const lessonVal = els.lesson.value;
  const filterVal = els.filter.value;

  return order.filter(index => {
    const card = vocabulary[index];
    const p = progress[card.id] || {};

    if (lessonVal !== 'all' && card.lesson !== Number(lessonVal)) return false;

    if (filterVal === 'known' && p.status !== 'known') return false;
    if (filterVal === 'again' && p.status !== 'again') return false;
    if (filterVal === 'learning' && p.status === 'known') return false;
    if (filterVal === 'due' && !isDue(p)) return false;

    if (!q) return true;
    return [card.jp, card.kana, card.en].some(v => v.toLowerCase().includes(q));
  });
}

// ── Answer normalisation ──────────────────────────────────────────────────────

function normalizeAnswer(text) {
  return text
    .toLowerCase()
    .replace(/[。.,!！?？()（）]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Direction ─────────────────────────────────────────────────────────────────

function getDirection() {
  const selected = els.direction.value;
  if (selected !== 'mixed') return selected;
  return Math.random() > 0.5 ? 'jp-en' : 'en-jp';
}

// ── Card access ───────────────────────────────────────────────────────────────

function currentCard() {
  const list = filteredIndexes();
  if (!list.length) return null;
  if (current >= list.length) current = 0;
  return vocabulary[list[current]];
}

// ── Pronunciation ─────────────────────────────────────────────────────────────

function pronunciationText(card) {
  const source = (card.kana || card.jp || '').trim();
  return source
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[〜~]/g, '')
    .replace(/[（）()]/g, '')
    .replace(/[／/]/g, '、')
    .replace(/\s+/g, '')
    .replace(/^、|、$/g, '') || card.jp;
}

// ── Speech ────────────────────────────────────────────────────────────────────

function hasJapaneseSpeech() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function japaneseVoices() {
  if (!hasJapaneseSpeech()) return [];
  return speechSynthesis.getVoices()
    .filter(voice => voice.lang?.toLowerCase().startsWith('ja'))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

function voiceScore(voice) {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (voice.lang === 'ja-JP') score += 10;
  if (!voice.localService) score += 5;
  if (/premium|enhanced|natural|neural|google|microsoft|siri|kyoko|otoya|hattori/.test(name)) score += 4;
  if (/compact/.test(name)) score -= 5;
  return score;
}

function getJapaneseVoice() {
  const voices = japaneseVoices();
  if (!voices.length) return null;
  return voices.find(voice => voice.name === speechPrefs.voiceName) || voices[0] || null;
}

function populateVoices() {
  if (!hasJapaneseSpeech()) {
    els.voice.innerHTML = '<option value="">Speech is not supported</option>';
    els.voice.disabled = true;
    els.testVoice.disabled = true;
    els.speechNote.textContent = 'This browser does not support speech playback.';
    return;
  }
  const voices = japaneseVoices();
  if (!voices.length) {
    els.voice.innerHTML = '<option value="">No Japanese voice found</option>';
    els.voice.disabled = true;
    els.testVoice.disabled = true;
    els.speechNote.textContent = 'No Japanese voice found. On macOS, install a Japanese voice in System Settings → Accessibility → Spoken Content → System Voice.';
    return;
  }
  const selected = getJapaneseVoice();
  els.voice.disabled = false;
  els.testVoice.disabled = false;
  els.voice.innerHTML = voices.map(voice => {
    const label = `${voice.name} (${voice.lang}${voice.localService ? ', local' : ', online'})`;
    return `<option value="${escapeHtml(voice.name)}" ${voice.name === selected?.name ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  els.speechNote.textContent = selected?.localService
    ? 'Using an installed Japanese voice. If it still sounds robotic, install an enhanced/premium Japanese voice in macOS settings.'
    : 'Using an online Japanese voice — this is usually smoother than the default local voice.';
}

function applySpeechPrefsToControls() {
  els.rate.value = speechPrefs.rate ?? 0.82;
  els.pitch.value = speechPrefs.pitch ?? 1;
  els.rateValue.textContent = `${Number(els.rate.value).toFixed(2)}×`;
  els.pitchValue.textContent = Number(els.pitch.value).toFixed(2);
}

function updateSpeechPrefs() {
  speechPrefs = {
    ...speechPrefs,
    voiceName: els.voice.value || speechPrefs.voiceName,
    rate: Number(els.rate.value),
    pitch: Number(els.pitch.value)
  };
  applySpeechPrefsToControls();
  saveSpeechPrefs();
}

function speakJapanese(card = currentCard()) {
  if (!card) return;
  if (!hasJapaneseSpeech()) { setFeedback('Pronunciation not supported.', 'no'); return; }
  const text = pronunciationText(card);
  if (!text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = Number(speechPrefs.rate ?? els.rate.value ?? 0.82);
  utterance.pitch = Number(speechPrefs.pitch ?? els.pitch.value ?? 1);
  const voice = getJapaneseVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
  setFeedback(`Playing: ${card.kana || card.jp}`, 'ok');
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const list = filteredIndexes();
  const card = currentCard();

  if (card) {
    if (!progress[card.id]) progress[card.id] = {};
    progress[card.id].seen = true;
    saveProgress();
  }

  const seen = Object.values(progress).filter(p => p.seen).length;
  const known = Object.values(progress).filter(p => p.status === 'known').length;
  const due = vocabulary.filter(v => isDue(progress[v.id])).length;

  els.seenCount.textContent = seen;
  els.knownCount.textContent = known;
  els.dueCount.textContent = due;
  els.totalCount.textContent = vocabulary.length;

  els.prev.disabled = list.length <= 1;
  els.next.disabled = list.length <= 1;
  els.again.disabled = !card;
  els.known.disabled = !card;
  els.flip.disabled = !card;
  els.check.disabled = !card;
  els.frontSpeak.disabled = !card || !hasJapaneseSpeech();
  els.backSpeak.disabled = !card || !hasJapaneseSpeech();

  els.card.classList.toggle('flipped', flipped);

  if (!card) {
    els.frontHint.textContent = 'No cards';
    els.frontText.textContent = 'No matching cards';
    els.frontReading.textContent = '';
    els.backHint.textContent = 'Try another filter';
    els.backText.textContent = '—';
    els.backReading.textContent = '';
    els.frontSpeak.hidden = true;
    els.backSpeak.hidden = true;
    els.example.textContent = '';
    els.cardLesson.textContent = '';
    els.srBadge.textContent = '';
    return;
  }

  currentDirection = getDirection();
  const asksJapanese = currentDirection === 'en-jp';
  const p = progress[card.id] || {};

  els.frontHint.textContent = asksJapanese ? 'English' : 'Japanese';
  els.backHint.textContent = asksJapanese ? 'Japanese' : 'English';
  els.frontText.textContent = asksJapanese ? card.en : card.jp;
  els.frontReading.textContent = asksJapanese ? '' : card.kana;
  els.frontSpeak.hidden = asksJapanese;
  els.backText.textContent = asksJapanese ? card.jp : card.en;
  els.backReading.textContent = asksJapanese ? card.kana : '';
  els.backSpeak.hidden = !asksJapanese;
  els.example.textContent = card.example || '';
  els.cardLesson.textContent = card.lesson ? `Lesson ${card.lesson}` : '';
  els.srBadge.textContent = srLabel(p);
  els.srBadge.className = 'srBadge' + (isDue(p) ? ' due' : '');

  els.quizPrompt.textContent = asksJapanese
    ? 'Type the Japanese word. Kana is accepted.'
    : 'Type the English meaning.';

  renderList();
}

// ── Vocab list ────────────────────────────────────────────────────────────────

function vocabListIndexes() {
  const q = els.search.value.trim().toLowerCase();
  const lessonVal = els.lesson.value;
  return vocabulary
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => {
      if (lessonVal !== 'all' && card.lesson !== Number(lessonVal)) return false;
      if (!q) return true;
      return [card.jp, card.kana, card.en].some(v => v.toLowerCase().includes(q));
    })
    .map(item => item.index);
}

function listPageSize() {
  const size = els.listPageSize.value;
  return size === 'all' ? Infinity : Number(size);
}

function renderList() {
  const indexes = vocabListIndexes();
  const pageSize = listPageSize();
  const pageCount = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(indexes.length / pageSize));
  if (listPage >= pageCount) listPage = pageCount - 1;
  if (listPage < 0) listPage = 0;

  const start = pageSize === Infinity ? 0 : listPage * pageSize;
  const visibleIndexes = pageSize === Infinity ? indexes : indexes.slice(start, start + pageSize);
  const end = pageSize === Infinity ? indexes.length : Math.min(start + pageSize, indexes.length);

  els.listPageInfo.textContent = indexes.length
    ? `Showing ${start + 1}–${end} of ${indexes.length}${pageSize === Infinity ? ' · Ctrl+F ready' : ` · Page ${listPage + 1} of ${pageCount}`}`
    : 'No matching words';
  els.listPrev.disabled = pageSize === Infinity || listPage <= 0;
  els.listNext.disabled = pageSize === Infinity || listPage >= pageCount - 1;

  els.list.innerHTML = visibleIndexes.map(index => {
    const card = vocabulary[index];
    const p = progress[card.id] || {};
    const status = p.status || 'learning';
    const reading = card.kana ? `${escapeHtml(card.kana)} — ` : '';
    const sr = srLabel(p);
    const dueCls = isDue(p) ? ' due' : '';
    return `
      <div class="vocabItem">
        <div class="vocabItemTop">
          <strong>${escapeHtml(card.jp)}</strong>
          <span class="lessonTag">L${card.lesson}</span>
          <button class="miniSpeakBtn" type="button" data-speak-index="${index}" aria-label="Play pronunciation for ${escapeHtml(card.jp)}">🔊</button>
        </div>
        <span>${reading}${escapeHtml(card.en)}</span><br>
        <small class="${dueCls}">${escapeHtml(status)}${sr ? ' · ' + sr : ''}</small>
      </div>`;
  }).join('');
}

// ── Card actions ──────────────────────────────────────────────────────────────

function flipCard() {
  flipped = !flipped;
  els.card.classList.toggle('flipped', flipped);
}

function move(delta) {
  const list = filteredIndexes();
  if (!list.length) return;
  current = (current + delta + list.length) % list.length;
  flipped = false;
  els.quizInput.value = '';
  setFeedback('');
  render();
}

function mark(status) {
  const card = currentCard();
  if (!card) return;
  progress[card.id] = applySpacedRepetition(card.id, status);
  saveProgress();
  render();
  move(1);
}

function setFeedback(text, kind = '') {
  els.feedback.textContent = text;
  els.feedback.className = `feedback ${kind}`;
}

function checkAnswer() {
  const card = currentCard();
  if (!card) return;
  const answer = normalizeAnswer(els.quizInput.value);
  if (!answer) return setFeedback('Type an answer first.', 'no');

  const correctAnswers = currentDirection === 'en-jp'
    ? [card.jp, card.kana]
    : card.en.split(',').map(x => x.trim());

  const ok = correctAnswers.some(a => {
    const n = normalizeAnswer(a);
    return answer === n || n.includes(answer) || answer.includes(n);
  });

  if (ok) {
    setFeedback('Correct — nice. ✅', 'ok');
    progress[card.id] = applySpacedRepetition(card.id, 'known');
    saveProgress();
    renderList();
  } else {
    setFeedback(`Answer: ${card.jp}${card.kana ? ' / ' + card.kana : ''} — ${card.en}`, 'no');
    progress[card.id] = applySpacedRepetition(card.id, 'again');
    saveProgress();
    renderList();
  }
}

function shuffleOrder() {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  current = 0;
  flipped = false;
  render();
}

// ── Export / Import ───────────────────────────────────────────────────────────

function exportProgress() {
  const data = JSON.stringify({ progress, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `japanese-flashcards-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setFeedback('Progress exported.', 'ok');
}

function importProgress(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const imported = data.progress || data;
      if (typeof imported !== 'object') throw new Error('Invalid format');
      if (!confirm(`Import progress? This will overwrite your current progress (${Object.keys(imported).length} cards).`)) return;
      progress = imported;
      saveProgress();
      render();
      setFeedback('Progress imported successfully.', 'ok');
    } catch {
      setFeedback('Import failed — invalid file.', 'no');
    }
  };
  reader.readAsText(file);
}

// ── Event listeners ───────────────────────────────────────────────────────────

els.card.addEventListener('click', flipCard);
els.frontSpeak.addEventListener('click', e => { e.stopPropagation(); speakJapanese(); });
els.backSpeak.addEventListener('click', e => { e.stopPropagation(); speakJapanese(); });
els.list.addEventListener('click', e => {
  const speakButton = e.target.closest('[data-speak-index]');
  if (!speakButton) return;
  speakJapanese(vocabulary[Number(speakButton.dataset.speakIndex)]);
});
if (hasJapaneseSpeech()) speechSynthesis.addEventListener('voiceschanged', () => { populateVoices(); render(); });
els.voice.addEventListener('change', () => { updateSpeechPrefs(); populateVoices(); speakJapanese(); });
els.rate.addEventListener('input', updateSpeechPrefs);
els.pitch.addEventListener('input', updateSpeechPrefs);
els.testVoice.addEventListener('click', () => speakJapanese(currentCard() || { jp: 'こんにちは', kana: 'こんにちは' }));
els.flip.addEventListener('click', flipCard);
els.prev.addEventListener('click', () => move(-1));
els.next.addEventListener('click', () => move(1));
els.again.addEventListener('click', () => mark('again'));
els.known.addEventListener('click', () => mark('known'));
els.shuffle.addEventListener('click', shuffleOrder);
els.check.addEventListener('click', checkAnswer);
els.quizInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
els.direction.addEventListener('change', () => { flipped = false; render(); });
els.filter.addEventListener('change', () => { current = 0; flipped = false; render(); });
els.lesson.addEventListener('change', () => {
  listPrefs.lesson = els.lesson.value;
  saveListPrefs();
  current = 0;
  listPage = 0;
  flipped = false;
  render();
});
els.search.addEventListener('input', () => { current = 0; listPage = 0; flipped = false; render(); });
els.listPageSize.addEventListener('change', () => {
  listPrefs.pageSize = els.listPageSize.value;
  saveListPrefs();
  listPage = 0;
  renderList();
});
els.listPrev.addEventListener('click', () => { listPage -= 1; renderList(); });
els.listNext.addEventListener('click', () => { listPage += 1; renderList(); });
els.exportBtn.addEventListener('click', exportProgress);
els.importBtn.addEventListener('click', () => els.importFile.click());
els.importFile.addEventListener('change', e => { importProgress(e.target.files[0]); e.target.value = ''; });
els.reset.addEventListener('click', () => {
  if (!confirm('Reset all saved flashcard progress?')) return;
  progress = {};
  saveProgress();
  current = 0;
  flipped = false;
  setFeedback('Progress reset.');
  render();
});

document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  if (e.key === 'ArrowRight') move(1);
  if (e.key === 'ArrowLeft') move(-1);
  if (e.key.toLowerCase() === 'k') mark('known');
  if (e.key.toLowerCase() === 'a') mark('again');
  if (e.key.toLowerCase() === 's') speakJapanese();
});

// ── Init ──────────────────────────────────────────────────────────────────────

buildLessonFilter();
if (listPrefs.pageSize) els.listPageSize.value = listPrefs.pageSize;
applySpeechPrefsToControls();
populateVoices();
shuffleOrder();
