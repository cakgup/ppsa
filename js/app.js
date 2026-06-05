const app = document.querySelector('#app');
const navButtons = [...document.querySelectorAll('.nav-btn')];
const installBtn = document.querySelector('#installBtn');

const EQURAN_BASE = 'https://equran.id/api/v2/shalat';
const QURAN_BASE = 'https://api.alquran.cloud/v1';
const QURAN_DATA_VERSION = 'v2';
const DEFAULT_PROVINCE = 'Jawa Timur';
const DEFAULT_CITY = 'Kab. Jombang';
const ARABIC_TITLE = 'مَجْمُوعَةُ الدُّعَاءِ';
const ARABIC_SUBTITLE = 'لِلْمَعْهَدِ الْإِسْلَامِيِّ سُونَانْ أَمْفِيلْ';

const state = {
  data: null,
  doaVersion: localStorage.getItem('ppsa-doa-version') || 'v1',
  view: 'home',
  currentSectionId: null,
  currentSubsectionId: null,
  fontSize: Number(localStorage.getItem('ppsa-font-size-v3') || 28),
  textMode: localStorage.getItem('ppsa-text-mode') || 'arabic_translation',
  haptic: localStorage.getItem('ppsa-haptic') !== 'false',
  counter: Number(localStorage.getItem('ppsa-counter') || 0),
  target: Number(localStorage.getItem('ppsa-target') || 0),
  counterLabel: localStorage.getItem('ppsa-counter-label') || 'Tasbih bebas',
  prayerProvince: localStorage.getItem('ppsa-prayer-province') || DEFAULT_PROVINCE,
  prayerCity: localStorage.getItem('ppsa-prayer-city') || DEFAULT_CITY,
  quranSurahs: null,
  quranCurrentSurah: Number(localStorage.getItem('ppsa-quran-current-surah') || 1),
  quranKeyword: '',
  currentSuggestion: null,
  deferredPrompt: null,
};

function getDoaDataPath() {
  return state.doaVersion === 'v2' ? './data/doa_v2.json' : './data/doa.json';
}

function setDoaVersion(version) {
  state.doaVersion = version === 'v2' ? 'v2' : 'v1';
  localStorage.setItem('ppsa-doa-version', state.doaVersion);
}

async function loadDoaData() {
  const response = await fetch(getDoaDataPath(), { cache: 'no-store' });
  state.data = await response.json();
}

function syncCurrentSelection() {
  const firstReadable = state.data.sections.find(section => !/^01_sampul_depan/.test(section?.id || ''));
  const sectionExists = state.data.sections.some(section => section.id === state.currentSectionId);
  if (!sectionExists) {
    state.currentSectionId = firstReadable?.id || state.data.sections[0]?.id;
    state.currentSubsectionId = firstReadable?.subsections?.[0]?.id || null;
    return;
  }
  const currentSection = state.data.sections.find(section => section.id === state.currentSectionId);
  const subsectionExists = currentSection?.subsections?.some(sub => sub.id === state.currentSubsectionId);
  if (!subsectionExists) {
    state.currentSubsectionId = currentSection?.subsections?.[0]?.id || null;
  }
}

window.addEventListener('load', () => {
  setTimeout(() => document.querySelector('#splash')?.classList.add('hide'), 2000);
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredPrompt = event;
  installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

async function init() {
  setArabicFontSize(state.fontSize);
  bindNav();
  try {
    await loadDoaData();
    syncCurrentSelection();
    renderHome();
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><h2>Data doa belum berhasil dimuat</h2><p>Pastikan berkas <strong>data/doa.json</strong> dan <strong>data/doa_v2.json</strong> tersedia di repository dan akses aplikasi melalui HTTP/HTTPS, bukan langsung dari file://.</p></div>`;
  }
}

function bindNav() {
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view === 'home') renderHome();
      if (view === 'read') renderReader();
      if (view === 'quran') renderQuran();
      if (view === 'tasbih') renderTasbih();
      if (view === 'settings') renderSettings();
    });
  });
}

function setView(view) {
  state.view = view;
  document.body.classList.toggle('settings-view', ['settings', 'profile'].includes(view));
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  app.focus({ preventScroll: true });
}

function setArabicFontSize(size) {
  state.fontSize = Number(size);
  document.documentElement.style.setProperty('--font-arabic-size', `${state.fontSize}px`);
  localStorage.setItem('ppsa-font-size-v3', state.fontSize);
}

function setTextMode(mode) {
  state.textMode = mode === 'arabic_only' ? 'arabic_only' : 'arabic_translation';
  localStorage.setItem('ppsa-text-mode', state.textMode);
}

function sections() { return state.data?.sections || []; }
function isCoverSection(section) {
  return /^01_sampul_depan/.test(section?.id || '');
}
function findSection(id) { return sections().find(section => section.id === id) || sections()[0]; }
function findSubsection(section, id) { return section?.subsections?.find(sub => sub.id === id) || section?.subsections?.[0]; }

function formatDate(now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now);
}
function formatTime(now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(now);
}
function pad2(value) { return String(value).padStart(2, '0'); }
function localYmd(date = new Date()) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`; }

function getSuggestion(now = new Date()) {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 3 && hour < 6) return getSuggestionByPrayer('Subuh');
  if (hour >= 6 && hour < 10) return pickSuggestion('09_doa_shalat_duha', 0, 'Doa Shalat Duha');
  if (hour >= 10.5 && hour < 13.2) return getSuggestionByPrayer('Dzuhur');
  if (hour >= 13.2 && hour < 16.7) return getSuggestionByPrayer('Ashar');
  if (hour >= 16.7 && hour < 18.7) return getSuggestionByPrayer('Maghrib');
  if (hour >= 18.7 && hour < 21.5) return getSuggestionByPrayer('Isya');
  if (hour >= 21.5 || hour < 3) return pickSuggestion('08_doa_shalat_tahajud', 0, 'Doa Shalat Tahajud');
  return pickSuggestion('05_wirid_setelah_shalat_fardu_asmaul_husna', 0, 'Wirid Setelah Shalat Fardhu');
}

function pickSuggestion(sectionId, subIndex = 0, label = '') {
  const section = findSection(sectionId);
  const subsection = section?.subsections?.[subIndex] || section?.subsections?.[0];
  return { section, subsection, label: label || subsection?.title || section?.title };
}

function getSuggestionByPrayer(name) {
  const map = {
    Subuh: ['04_pujian_sebelum_isya_subuh', 1, 'Pujian Sebelum Subuh'],
    Dzuhur: ['02_pujian_sebelum_dhuhur_asar', 0, 'Pujian Sebelum Dhuhur'],
    Ashar: ['02_pujian_sebelum_dhuhur_asar', 1, 'Pujian Sebelum Asar'],
    Maghrib: ['03_pujian_sebelum_magrib_syi_ir_al_i_tiraf', 0, 'Pujian Sebelum Magrib'],
    Isya: ['04_pujian_sebelum_isya_subuh', 0, 'Pujian Sebelum Isya'],
  };
  const [sectionId, subIndex, label] = map[name] || map.Dzuhur;
  return pickSuggestion(sectionId, subIndex, label);
}

function openReader(sectionId, subsectionId = null) {
  const section = findSection(sectionId);
  state.currentSectionId = section?.id;
  state.currentSubsectionId = subsectionId || section?.subsections?.[0]?.id;
  renderReader();
}

function renderHome() {
  setView('home');
  const now = new Date();
  state.currentSuggestion = getSuggestion(now);
  const filteredSections = sections().filter(s => !isCoverSection(s));

  app.innerHTML = `
    <section class="hero card">
      <button class="location-btn" id="prayerSettingsBtn" aria-label="Atur wilayah jadwal shalat" title="Atur Wilayah">⌖</button>
      <h2>Assalamu'alaikum</h2>
      <p>Waktu shalat berikutnya ditampilkan berdasarkan wilayah pilihan. Jadwal shalat diambil dari data Bimas Islam Kementerian Agama RI.</p>
      <div class="clock-row">
        <div>
          <div class="prayer-next" id="prayerNext"><span class="prayer-next-label">Memuat jadwal</span></div>
          <p class="prayer-countdown" id="prayerCountdown">${formatDate(now)}</p>
          <p class="prayer-location" id="prayerLocation">Wilayah: ${escapeHtml(state.prayerCity)}, ${escapeHtml(state.prayerProvince)}</p>
        </div>
      </div>
      <div class="suggestion-row" id="suggestionText">
        <span>Saran bacaan: <strong>${escapeHtml(state.currentSuggestion.label)}</strong></span>
        <button class="primary-btn mini-open-btn" id="quickBtn">Buka</button>
      </div>
    </section>

    <div class="section-header">
      <h2 class="section-title">Daftar Doa & Wirid</h2>
      <div class="version-switch" role="group" aria-label="Pilih versi data doa">
        <button type="button" class="version-btn ${state.doaVersion === 'v1' ? 'active' : ''}" data-doa-version="v1">Versi lama</button>
        <button type="button" class="version-btn ${state.doaVersion === 'v2' ? 'active' : ''}" data-doa-version="v2">Versi baru</button>
      </div>
    </div>
    <div class="grid">
      ${filteredSections.map((section, index) => sectionCard(section, index)).join('')}
    </div>
  `;

  document.querySelector('#quickBtn')?.addEventListener('click', () => {
    const suggestion = state.currentSuggestion || getSuggestion(new Date());
    openReader(suggestion.section.id, suggestion.subsection?.id);
  });
  document.querySelector('#prayerSettingsBtn')?.addEventListener('click', renderSettings);
  document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', (event) => {
    const childCard = event.target.closest('.menu-child-card[data-subsection-id]');
    if (childCard) {
      openReader(btn.dataset.section, childCard.dataset.subsectionId);
      return;
    }
    openReader(btn.dataset.section);
  }));
  document.querySelectorAll('[data-doa-version]').forEach(button => {
    button.addEventListener('click', async () => {
      const nextVersion = button.dataset.doaVersion;
      if (!nextVersion || nextVersion === state.doaVersion) return;
      setDoaVersion(nextVersion);
      try {
        await loadDoaData();
        syncCurrentSelection();
        renderHome();
      } catch (error) {
        app.innerHTML = `<div class="empty-state"><h2>Gagal memuat versi data</h2><p>Periksa kembali berkas <strong>${escapeHtml(getDoaDataPath().replace('./', ''))}</strong>.</p></div>`;
      }
    });
  });
  refreshPrayerWidget();
}

function sectionCard(section, index) {
  const arabicTitle = section.display_title_arabic || getSectionArabicTitle(section);
  const title = section.display_title || titleCase(section.title);
  const childCards = (section.subsections || [])
    .filter(sub => (sub?.title || '').trim() && !/^umum$/i.test((sub?.title || '').trim()))
    .map(sub => `<span class="menu-child-card" data-subsection-id="${escapeHtml(sub.id)}">${escapeHtml(formatSubsectionTitlePlain(sub.title))}</span>`)
    .join('');
  const childCardsHtml = childCards ? `<div class="menu-child-list">${childCards}</div>` : '';
  return `
    <button class="menu-card" data-section="${section.id}">
      <span class="mark">${index + 1}</span>
      <span class="menu-copy">
        ${arabicTitle ? `<div class="menu-arabic" lang="ar" dir="rtl">${escapeHtml(arabicTitle)}</div>` : ''}
        <h3>${escapeHtml(title)}</h3>
        ${childCardsHtml}
      </span>
    </button>
  `;
}

function getSectionArabicTitle(section) {
  const titleFromSub = (section?.subsections || [])
    .map(sub => String(sub?.title || '').trim())
    .find(Boolean) || '';
  const match = titleFromSub.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (match) return match[1].trim();
  return '';
}

function formatSubsectionTitlePlain(title = '') {
  const cleanTitle = String(title || 'Umum').trim();
  const match = cleanTitle.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (!match) return cleanTitle;
  return match[2].trim();
}

function renderReader() {
  setView('read');
  const section = findSection(state.currentSectionId) || sections().find(s => !isCoverSection(s));
  state.currentSectionId = section?.id;
  const sectionOptions = sections()
    .filter(s => !isCoverSection(s))
    .map(s => `<option value="${s.id}" ${s.id === section?.id ? 'selected' : ''}>${escapeHtml(s.display_title || titleCase(s.title))}</option>`).join('');

  app.innerHTML = `
    <section class="reader-head">
      <div class="field">
        <label for="sectionSelect">Kategori doa</label>
        <select id="sectionSelect">${sectionOptions}</select>
      </div>
      <div>
        <div class="reader-title">Mode tampilan bacaan</div>
        <div class="segmented" role="group" aria-label="Mode tampilan bacaan">
          <button type="button" data-mode="arabic_only" class="${state.textMode === 'arabic_only' ? 'active' : ''}">Arab saja</button>
          <button type="button" data-mode="arabic_translation" class="${state.textMode === 'arabic_translation' ? 'active' : ''}">Arab + Arti</button>
        </div>
      </div>
      <div class="field font-row">
        <label for="fontRange">Ukuran font Arab: <span id="fontValue">${state.fontSize}px</span></label>
        <input id="fontRange" type="range" min="16" max="32" value="${state.fontSize}" />
      </div>
    </section>
    <section id="readerContent"></section>
  `;

  document.querySelector('#sectionSelect')?.addEventListener('change', (event) => {
    const selected = findSection(event.target.value);
    state.currentSectionId = selected?.id;
    state.currentSubsectionId = selected?.subsections?.[0]?.id;
    renderReader();
  });
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      setTextMode(button.dataset.mode);
      renderReader();
    });
  });
  document.querySelector('#fontRange')?.addEventListener('input', (event) => {
    setArabicFontSize(event.target.value);
    const label = document.querySelector('#fontValue');
    if (label) label.textContent = `${state.fontSize}px`;
  });
  renderPrayerItems(section);
}

function renderPrayerItems(section) {
  const container = document.querySelector('#readerContent');
  if (!container) return;
  const subsections = section?.subsections || [];
  if (!subsections.length) {
    container.innerHTML = `<div class="empty-state card"><h2>Belum ada konten</h2><p>Data bacaan belum tersedia.</p></div>`;
    return;
  }
  const isYasinSection = section?.id === '02_surah_yasin_tahlil_lengkap';
  const isYasinArabOnly =
    isYasinSection &&
    state.textMode === 'arabic_only' &&
    subsections.some(sub => sub?.id === '02_surah_yasin_tahlil_lengkap__01_surah_yasin');

  if (isYasinArabOnly) {
    const yasinSub = subsections.find(sub => sub?.id === '02_surah_yasin_tahlil_lengkap__01_surah_yasin');
    const title = formatSubsectionTitle(yasinSub?.title || 'Surah Yasin');
    const mergedArabic = (yasinSub?.items || [])
      .map(item => normalizeArabicPunctuation(item.arabic_display || item.arabic || ''))
      .filter(Boolean)
      .join(' ');
    container.innerHTML = `
      <div class="subsection-anchor" id="subsection-${escapeHtml(yasinSub?.id || '')}"></div>
      ${title}
      <article class="prayer-card card arabic-only yasin-merged-card">
        <p class="arabic yasin-merged-text">${escapeHtml(mergedArabic)}</p>
      </article>
    `;
    return;
  }

  const showSubsectionTitle = subsections.length > 1 || !/^umum$/i.test(subsections[0]?.title || '');
  container.innerHTML = subsections.map(sub => {
    const title = showSubsectionTitle ? formatSubsectionTitle(getReaderSubsectionTitle(sub)) : '';
    const cards = (sub.items || []).map(item => prayerCard(item)).join('');
    const anchor = `<div class="subsection-anchor" id="subsection-${escapeHtml(sub.id)}"></div>`;
    return `${anchor}${title}${cards}`;
  }).join('');

  const allItems = subsections.flatMap(sub => sub.items || []);
  container.querySelectorAll('[data-start-counter]').forEach(button => {
    button.addEventListener('click', () => {
      const item = allItems.find(i => i.id === button.dataset.startCounter);
      const target = Number(button.dataset.target || item?.default_repeat_target || 0);
      startCounterFromItem(item, target);
    });
  });

  if (state.currentSubsectionId && typeof CSS !== 'undefined' && CSS.escape) {
    const target = container.querySelector(`#subsection-${CSS.escape(state.currentSubsectionId)}`);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

function getReaderSubsectionTitle(subsection = {}) {
  const title = String(subsection.title || '').trim();
  const titleOriginal = String(subsection.title_original || '').trim();
  const hasArabic = /[\u0600-\u06FF]/.test(title);
  const originalHasArabic = /[\u0600-\u06FF]/.test(titleOriginal);
  if (hasArabic || !originalHasArabic) return title || 'Umum';
  return titleOriginal;
}


function formatSubsectionTitle(title = '') {
  const cleanTitle = String(title || 'Umum').trim();
  const match = cleanTitle.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (!match) {
    return `<div class="subsection-label">${escapeHtml(cleanTitle)}</div>`;
  }

  const arabicTitle = match[1].trim();
  const indonesianTitle = match[2].trim();
  return `
    <div class="subsection-label subsection-label-split">
      <span class="subsection-label-id">(${escapeHtml(indonesianTitle)})</span>
      <span class="subsection-label-ar" lang="ar" dir="rtl">${escapeHtml(arabicTitle)}</span>
    </div>
  `;
}

function prayerCard(item) {
  const repeatOptions = item.repeat_options || [];
  const repeatTools = repeatOptions.length
    ? `<div class="repeat-tools">
        ${repeatOptions.map(target => `<button class="secondary-btn" data-start-counter="${item.id}" data-target="${target}">Tasbih ×${target}</button>`).join('')}
      </div>`
    : '';
  const arabic = normalizeArabicPunctuation(item.arabic_display || item.arabic || '');
  const translation = clean(item.translation_id || '');
  return `
    <article class="prayer-card card ${state.textMode === 'arabic_only' ? 'arabic-only' : ''}">
      <div class="prayer-meta">
        <span class="prayer-num">${item.order || ''}</span>
        ${repeatOptions.length ? `<span class="badge">Ada hitungan zikir</span>` : ''}
      </div>
      <p class="arabic">${escapeHtml(arabic)}</p>
      ${state.textMode === 'arabic_translation' ? `<p class="translation">${escapeHtml(translation)}</p>` : ''}
      ${repeatTools}
    </article>
  `;
}

function normalizeArabicPunctuation(value = '') {
  return String(value)
    .replace(/ـ/g, '')
    .replace(/\s*\*\s*/g, '، ')
    .replace(/\s*،\s*/g, '، ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function startCounterFromItem(item, target = 0) {
  state.counter = 0;
  state.target = Number(target) || 0;
  state.counterLabel = clean(item?.translation_id || item?.arabic_display || item?.arabic || 'Tasbih');
  localStorage.setItem('ppsa-counter', state.counter);
  localStorage.setItem('ppsa-target', state.target);
  localStorage.setItem('ppsa-counter-label', state.counterLabel);
  renderTasbih();
}

async function renderQuran() {
  setView('quran');
  app.innerHTML = `
    <section class="quran-page">
      <div class="reader-head quran-head">
        <div>
          <h2 class="section-title">Al-Quran</h2>
          <p class="reader-subtitle">Daftar surah, teks Arab, terjemah Indonesia, dan audio murottal. Rujukan: Al-Quran Kemenag RI.</p>
        </div>
        <div class="field">
          <label for="quranSearch">Cari surah</label>
          <input id="quranSearch" type="search" value="${escapeHtml(state.quranKeyword)}" placeholder="Nama surah atau arti..." autocomplete="off" />
        </div>
      </div>
      <section id="quranContent">
        <div class="empty-state card"><h2>Memuat daftar surah</h2><p>Mohon tunggu sebentar.</p></div>
      </section>
    </section>
  `;

  document.querySelector('#quranSearch')?.addEventListener('input', (event) => {
    state.quranKeyword = event.target.value.trim().toLowerCase();
    renderQuranList();
  });

  try {
    await loadQuranSurahs();
    renderQuranList();
  } catch (error) {
    const content = document.querySelector('#quranContent');
    if (content) {
      content.innerHTML = `<div class="empty-state card"><h2>Daftar surah belum bisa dimuat</h2><p>Cek koneksi internet, lalu coba buka kembali tab Quran.</p></div>`;
    }
  }
}

function getQuranRepeatOptions() {
  return [1, 5, 10, 15, 20, 25];
}

async function loadQuranSurahs() {
  if (Array.isArray(state.quranSurahs) && state.quranSurahs.length) return state.quranSurahs;
  const cached = readJson(`ppsa-quran-surahs-${QURAN_DATA_VERSION}`);
  if (cached?.length) state.quranSurahs = cached;

  try {
    const response = await fetch('./data/quran_kemenag_surah.json');
    if (!response.ok) throw new Error('Daftar surah gagal dimuat.');
    const json = await response.json();
    if (!Array.isArray(json)) throw new Error('Format daftar surah tidak sesuai.');
    state.quranSurahs = json;
    localStorage.setItem(`ppsa-quran-surahs-${QURAN_DATA_VERSION}`, JSON.stringify(json));
  } catch (error) {
    if (!state.quranSurahs?.length) throw error;
  }
  return state.quranSurahs;
}

function renderQuranList() {
  const content = document.querySelector('#quranContent');
  if (!content) return;
  const keyword = state.quranKeyword;
  const surahs = (state.quranSurahs || []).filter(surah => {
    const haystack = [
      surah.number,
      surah.name,
      surah.englishName,
      surah.englishNameTranslation,
      surah.id,
      surah.arabic,
      surah.arabic_harakat,
      surah.latin,
      surah.transliteration,
      surah.translation,
      surah.location,
      surah.revelationType,
    ].join(' ').toLowerCase();
    const normalizedHaystack = normalizeQuranSearch(haystack);
    const normalizedKeyword = normalizeQuranSearch(keyword);
    return !keyword || haystack.includes(keyword) || normalizedHaystack.includes(normalizedKeyword);
  });

  if (!surahs.length) {
    content.innerHTML = `<div class="empty-state card"><h2>Surah tidak ditemukan</h2><p>Coba kata kunci lain.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="quran-list">
      ${surahs.map(surah => quranSurahCard(surah)).join('')}
    </div>
  `;

  content.querySelectorAll('[data-quran-surah]').forEach(button => {
    button.addEventListener('click', () => openQuranSurah(Number(button.dataset.quranSurah)));
  });
}

function quranSurahCard(surah) {
  const meta = normalizeKemenagSurah(surah);
  return `
    <button class="quran-surah-card card" data-quran-surah="${meta.number}">
      <span class="quran-surah-number">${meta.number}</span>
      <span class="quran-surah-copy">
        <strong>${escapeHtml(meta.latin)}</strong>
        <small>${escapeHtml(meta.translation)} • ${escapeHtml(meta.location)} • ${meta.numberOfAyahs} ayat</small>
      </span>
      <span class="quran-surah-arabic arabic" lang="ar" dir="rtl">${escapeHtml(meta.arabic)}</span>
    </button>
  `;
}

async function openQuranSurah(number) {
  state.quranCurrentSurah = Number(number) || 1;
  localStorage.setItem('ppsa-quran-current-surah', state.quranCurrentSurah);
  setView('quran');
  app.innerHTML = `
    <section class="quran-page">
      <div class="reader-head quran-detail-head">
        <button class="ghost-btn back-btn" id="backToQuranListBtn">← Daftar Surah</button>
        <div class="field">
          <label for="quranAyahSelect">Pilih ayat</label>
          <select id="quranAyahSelect"><option>Memuat ayat...</option></select>
        </div>
        <div>
          <div class="reader-title">Mode tampilan bacaan</div>
          <div class="segmented" role="group" aria-label="Mode tampilan bacaan Quran">
            <button type="button" data-quran-mode="arabic_only" class="${state.textMode === 'arabic_only' ? 'active' : ''}">Arab saja</button>
            <button type="button" data-quran-mode="arabic_translation" class="${state.textMode === 'arabic_translation' ? 'active' : ''}">Arab + Arti</button>
          </div>
        </div>
        <div class="field font-row">
          <label for="quranFontRange">Ukuran font Arab: <span id="quranFontValue">${state.fontSize}px</span></label>
          <input id="quranFontRange" type="range" min="16" max="36" value="${state.fontSize}" />
        </div>
      </div>
      <section id="quranDetailContent">
        <div class="empty-state card"><h2>Memuat surah</h2><p>Mohon tunggu sebentar.</p></div>
      </section>
      <button class="quran-top-btn" id="quranTopBtn" type="button" aria-label="Kembali ke atas">↑</button>
    </section>
  `;

  document.querySelector('#backToQuranListBtn')?.addEventListener('click', renderQuran);
  document.querySelector('#quranTopBtn')?.addEventListener('click', () => {
    document.querySelector('.quran-detail-head')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  bindQuranTopButton();
  document.querySelector('#quranFontRange')?.addEventListener('input', (event) => {
    setArabicFontSize(event.target.value);
    const label = document.querySelector('#quranFontValue');
    if (label) label.textContent = `${state.fontSize}px`;
  });
  document.querySelectorAll('[data-quran-mode]').forEach(button => {
    button.addEventListener('click', () => {
      setTextMode(button.dataset.quranMode);
      openQuranSurah(state.quranCurrentSurah);
    });
  });
  try {
    const detail = await loadQuranSurahDetail(state.quranCurrentSurah);
    renderQuranSurahDetail(detail);
    hydrateQuranAyahSelect(detail);
  } catch (error) {
    const content = document.querySelector('#quranDetailContent');
    if (content) {
      content.innerHTML = `<div class="empty-state card"><h2>Surah belum bisa dimuat</h2><p>Cek koneksi internet, lalu coba lagi.</p></div>`;
    }
  }
}

function hydrateQuranAyahSelect(surah) {
  const select = document.querySelector('#quranAyahSelect');
  if (!select) return;
  select.innerHTML = (surah.ayahs || [])
    .map(ayah => `<option value="${ayah.numberInSurah}">Ayat ${ayah.numberInSurah}</option>`)
    .join('');
  select.addEventListener('change', () => {
    const target = typeof CSS !== 'undefined' && CSS.escape
      ? document.querySelector(`#ayah-${CSS.escape(select.value)}`)
      : document.getElementById(`ayah-${select.value}`);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

function bindQuranTopButton() {
  const button = document.querySelector('#quranTopBtn');
  if (!button) return;
  const toggle = () => button.classList.toggle('show', window.scrollY > 650);
  window.removeEventListener('scroll', window.__ppsaQuranTopToggle);
  window.__ppsaQuranTopToggle = toggle;
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}

async function loadQuranSurahDetail(number) {
  const cacheKey = `ppsa-quran-surah-${QURAN_DATA_VERSION}-${number}`;
  const cached = readJson(cacheKey);
  try {
    const [kemenagRes, audioRes] = await Promise.all([
      fetch(`./data/quran_kemenag/surah_${number}.json`),
      fetch(`${QURAN_BASE}/surah/${number}/ar.alafasy`),
    ]);
    if (!kemenagRes.ok) throw new Error('Detail surah gagal dimuat.');
    const [kemenagJson, audioJson] = await Promise.all([
      kemenagRes.json(),
      audioRes.ok ? audioRes.json() : Promise.resolve(null),
    ]);
    const payload = mapQuranDetail(kemenagJson, audioJson?.data);
    localStorage.setItem(cacheKey, JSON.stringify(payload));
    return payload;
  } catch (error) {
    if (cached?.ayahs?.length) return cached;
    throw error;
  }
}

function mapQuranDetail(kemenag, audioSurah = null) {
  const surah = normalizeKemenagSurah(kemenag.surah || {});
  const audioByAyah = new Map((audioSurah?.ayahs || []).map(ayah => [Number(ayah.numberInSurah), ayah.audio]));
  return {
    number: surah.number,
    name: surah.arabic,
    latin: surah.latin,
    translation: surah.translation,
    location: surah.location,
    numberOfAyahs: surah.numberOfAyahs,
    source: kemenag.source || 'Quran Kemenag RI',
    ayahs: (kemenag.ayahs || []).map(ayah => ({
      number: ayah.number,
      numberInSurah: ayah.ayah,
      juz: ayah.juz,
      text: ayah.kitabah || ayah.arabic,
      audio: audioByAyah.get(Number(ayah.ayah)) || '',
      translation: ayah.translation || '',
      footnotes: ayah.footnotes || '',
    })),
  };
}

function normalizeKemenagSurah(surah = {}) {
  return {
    number: Number(surah.id || surah.number || 0),
    arabic: String(surah.arabic_harakat || surah.arabic || surah.name || '').trim(),
    latin: String(surah.latin || surah.transliteration || surah.englishName || '').trim(),
    translation: String(surah.translation || surah.englishNameTranslation || '').trim(),
    numberOfAyahs: Number(surah.num_ayah || surah.numberOfAyahs || 0),
    location: String(surah.location || surah.revelationType || '').replace('Meccan', 'Makkiyah').replace('Medinan', 'Madaniyah').trim(),
  };
}

function renderQuranSurahDetail(surah) {
  const content = document.querySelector('#quranDetailContent');
  if (!content) return;
  content.innerHTML = `
    <article class="quran-surah-hero card">
      <div>
        <p class="quran-kicker">Surah ${surah.number} • ${escapeHtml(surah.location)} • ${surah.numberOfAyahs} ayat</p>
        <h2>${escapeHtml(surah.latin)}</h2>
        <p>${escapeHtml(surah.translation)}</p>
      </div>
      <div class="quran-title-arabic arabic" lang="ar" dir="rtl">${escapeHtml(surah.name)}</div>
    </article>
    <div class="quran-ayah-list">
      ${surah.ayahs.map(ayah => quranAyahCard(ayah)).join('')}
    </div>
  `;

  bindQuranAudioPlayback(content);
}

function quranAyahCard(ayah) {
  const showTranslation = state.textMode === 'arabic_translation';
  return `
    <article class="quran-ayah-card prayer-card card" id="ayah-${ayah.numberInSurah}">
      <div class="prayer-meta">
        <span class="prayer-num">${ayah.numberInSurah}</span>
        <span class="badge">Juz ${ayah.juz}</span>
      </div>
      <p class="arabic quran-ayah-text" lang="ar" dir="rtl">${escapeHtml(ayah.text)}</p>
      ${showTranslation ? `<p class="translation">${formatQuranTranslation(ayah.translation)}</p>` : ''}
      ${showTranslation && ayah.footnotes ? `<p class="quran-footnotes">${escapeHtml(ayah.footnotes)}</p>` : ''}
      ${ayah.audio ? `
        <div class="quran-audio-row">
          <audio class="quran-audio" controls preload="none" controlslist="nodownload" src="${escapeHtml(ayah.audio)}"></audio>
          <label class="quran-repeat-field">
            <select class="quran-repeat-select" aria-label="Ulang audio ayat ${ayah.numberInSurah}">
              ${getQuranRepeatOptions().map(count => `<option value="${count}">${count}x</option>`).join('')}
            </select>
          </label>
        </div>
      ` : ''}
    </article>
  `;
}

function formatQuranTranslation(value = '') {
  return escapeHtml(value).replace(/(\d+\))/g, '<sup class="quran-footnote-ref">$1</sup>');
}

function bindQuranAudioPlayback(root) {
  const audios = [...root.querySelectorAll('.quran-audio')];
  const repeatProgress = new WeakMap();
  audios.forEach((audio, index) => {
    audio.addEventListener('play', () => {
      if (!repeatProgress.has(audio)) repeatProgress.set(audio, 1);
      audios.forEach(other => {
        if (other !== audio) other.pause();
      });
      audio.closest('.quran-ayah-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    audio.addEventListener('ended', () => {
      const repeatSelect = audio.closest('.quran-audio-row')?.querySelector('.quran-repeat-select');
      const repeatTarget = Number(repeatSelect?.value || 1) || 1;
      const playedCount = repeatProgress.get(audio) || 1;
      if (playedCount < repeatTarget) {
        repeatProgress.set(audio, playedCount + 1);
        audio.currentTime = 0;
        audio.play();
        return;
      }
      repeatProgress.set(audio, 1);
      const nextAudio = audios[index + 1];
      if (nextAudio) nextAudio.play();
    });
  });
}

function normalizeQuranSearch(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/[^a-z0-9]+/g, '');
}

function renderTasbih() {
  setView('tasbih');
  app.innerHTML = `
    <section class="tasbih-wrap">
      <div class="counter-card card">
        <div class="counter-label">${escapeHtml(state.counterLabel)}</div>
        <div class="counter-value" id="counterValue">${state.counter}</div>
        <div class="counter-target" id="counterTarget">${state.target ? `Target: ${state.target}` : 'Tanpa target'}</div>
      </div>

      <button class="tap-button" id="tapCounter" aria-label="Tambah hitungan tasbih">
        <strong>Ketuk</strong>
        <span>Tambah hitungan</span>
      </button>

      <div class="tasbih-controls">
        <button class="secondary-btn" data-target-set="33">Target 33</button>
        <button class="secondary-btn" data-target-set="100">Target 100</button>
        <button class="secondary-btn" data-target-set="0">Bebas</button>
        <button class="ghost-btn" id="resetCounter">Reset</button>
      </div>

      <label class="switch-row card">
        <span>
          <strong>Getar saat dihitung</strong><br>
          <small>Memakai haptic feedback bila didukung perangkat.</small>
        </span>
        <input id="hapticToggle" type="checkbox" ${state.haptic ? 'checked' : ''} />
      </label>
    </section>
  `;

  document.querySelector('#tapCounter')?.addEventListener('click', incrementCounter);
  document.querySelector('#resetCounter')?.addEventListener('click', () => {
    state.counter = 0;
    persistCounter();
    updateCounterDisplay();
  });
  document.querySelectorAll('[data-target-set]').forEach(btn => btn.addEventListener('click', () => {
    state.target = Number(btn.dataset.targetSet || 0);
    localStorage.setItem('ppsa-target', state.target);
    updateCounterDisplay();
  }));
  document.querySelector('#hapticToggle')?.addEventListener('change', event => {
    state.haptic = event.target.checked;
    localStorage.setItem('ppsa-haptic', state.haptic);
  });
}

function incrementCounter() {
  state.counter += 1;
  if (state.haptic && navigator.vibrate) navigator.vibrate(state.target && state.counter >= state.target ? [80, 60, 120] : 18);
  persistCounter();
  updateCounterDisplay();
}
function persistCounter() { localStorage.setItem('ppsa-counter', state.counter); }
function updateCounterDisplay() {
  const value = document.querySelector('#counterValue');
  const target = document.querySelector('#counterTarget');
  if (value) value.textContent = state.counter;
  if (target) target.textContent = state.target ? `Target: ${state.target}${state.counter >= state.target ? ' • Selesai' : ''}` : 'Tanpa target';
}

function renderSettings() {
  setView('settings');
  app.innerHTML = `
    <section class="info-list">
      <div class="info-card card brand-showcase profile-hero">
        <button class="info-bubble-btn" id="openProfileBtn" aria-label="Buka profil pesantren" title="Profil Pesantren">i</button>
        <img src="assets/logo.png" alt="Logo Pondok Pesantren Sunan Ampel" style="width:104px;height:104px;object-fit:contain;border-radius:50%;background:white;border:1px solid var(--border);padding:6px" />
        <h2 class="arabic-brand-title showcase-title" lang="ar" dir="rtl">${ARABIC_TITLE}</h2>
        <p class="arabic-brand-subtitle showcase-subtitle" lang="ar" dir="rtl">${ARABIC_SUBTITLE}</p>
      </div>

      <div class="info-card card">
        <h3>Wilayah Jadwal Shalat</h3>
        <p>Jadwal shalat diambil dari data Bimas Islam Kementerian Agama RI.</p>
        <div class="location-grid" style="margin-top:12px">
          <div class="field">
            <label for="provinceSelect">Provinsi</label>
            <select id="provinceSelect"><option>Memuat provinsi...</option></select>
          </div>
          <div class="field">
            <label for="citySelect">Kabupaten/Kota</label>
            <select id="citySelect"><option>Memuat kabupaten/kota...</option></select>
          </div>
          <div class="tasbih-controls" style="justify-content:flex-start">
            <button class="primary-btn" id="saveLocationBtn">Simpan Wilayah</button>
            <button class="secondary-btn" id="gpsLocationBtn">Gunakan GPS</button>
          </div>
          <p class="status-line" id="locationStatus">Wilayah aktif: ${escapeHtml(state.prayerCity)}, ${escapeHtml(state.prayerProvince)}</p>
        </div>
      </div>

      <div class="info-card card">
        <h3>Pengaturan Baca</h3>
        <div class="field font-row">
          <label for="settingsFontRange">Ukuran font Arab: <span id="settingsFontValue">${state.fontSize}px</span></label>
          <input id="settingsFontRange" type="range" min="16" max="32" value="${state.fontSize}" />
        </div>
        <div style="margin-top:12px">
          <div class="reader-title">Mode tampilan default</div>
          <div class="segmented" role="group" aria-label="Mode tampilan default">
            <button type="button" data-settings-mode="arabic_only" class="${state.textMode === 'arabic_only' ? 'active' : ''}">Arab saja</button>
            <button type="button" data-settings-mode="arabic_translation" class="${state.textMode === 'arabic_translation' ? 'active' : ''}">Arab + Arti</button>
          </div>
        </div>
      </div>

      <div class="info-card card donation-card">
        <h3>Donasi</h3>
        <p>No Rek. BRI a.n. Pondok Pesantren Sunan Ampel</p>
        <div class="donation-row">
          <strong class="donation-account" id="donationAccount">002301003179307</strong>
          <button class="secondary-btn" id="copyDonationBtn">Salin</button>
        </div>
        <p class="status-line" id="copyDonationStatus"></p>
      </div>

      <div class="info-card card">
        <h3>Informasi Pesantren</h3>
        <p>Tautan resmi: <a href="https://linktr.ee/ppsajombang" target="_blank" rel="noopener">linktr.ee/ppsajombang</a></p>
      </div>
      <p class="app-credit">developed with ❤️ by cakgup</p>
    </section>
  `;

  document.querySelector('#settingsFontRange')?.addEventListener('input', (event) => {
    setArabicFontSize(event.target.value);
    const label = document.querySelector('#settingsFontValue');
    if (label) label.textContent = `${state.fontSize}px`;
  });
  document.querySelectorAll('[data-settings-mode]').forEach(button => button.addEventListener('click', () => {
    setTextMode(button.dataset.settingsMode);
    renderSettings();
  }));
  document.querySelector('#openProfileBtn')?.addEventListener('click', renderProfile);
  document.querySelector('#copyDonationBtn')?.addEventListener('click', copyDonationAccount);
  hydrateLocationControls();
}

function renderProfile() {
  setView('profile');
  app.innerHTML = `
    <section class="profile-page">
      <div class="card profile-card">
        <div class="profile-header">
          <button class="ghost-btn back-btn" id="backToSettingsBtn">← Kembali</button>
          <div>
            <h2>Profil Pesantren</h2>
            <p>Sejarah dan profil Pondok Pesantren Sunan Ampel Jombang.</p>
          </div>
        </div>
      </div>

      <div class="card profile-card">
        <h3>Asal-Usul dan Latar Belakang Keluarga Pendiri</h3>
        <p>KH. Mahfudz Anwar lahir di Paculgowang, sekitar 2 kilometer dari Pondok Pesantren Tebuireng, Jombang, pada 12 April 1912. Beliau merupakan anak ke-6 dari 12 bersaudara, putra pasangan Kiai Anwar Alwi dan Ibu Khadijah.</p>
        <p>Ayah beliau, Kiai Anwar Alwi, adalah ulama besar pendiri Pondok Pesantren Tarbiyatun Nasi’in Paculgowang dan hidup seperiode dengan Hadratusyaikh KH. M. Hasyim Asy’ari. Keduanya sama-sama pernah berguru kepada KH. Kholil Bangkalan. Lingkungan keluarga alim inilah yang membentuk Mahfudz muda tumbuh dengan kecintaan yang kuat terhadap ilmu agama.</p>
      </div>

      <div class="card profile-card">
        <h3>Masa Pendidikan dan Kecerdasan di Tebuireng</h3>
        <p>Pendidikan dasar KH. Mahfudz ditempuh di pesantren ayahnya sendiri. Setelah itu, beliau melanjutkan menimba ilmu di Pondok Pesantren Tebuireng langsung kepada Hadratusyaikh KH. M. Hasyim Asy’ari selama 8 tahun, mulai dari jenjang Shifir Awal, Tsani, Tsalis, hingga kelas I sampai VI.</p>
        <p>Kecerdasannya sangat menonjol. Saat masih kelas IV, beliau sudah dipercaya mengajar adik kelas yang justru lebih tua secara usia. Setelah lulus kelas VI, beliau resmi diangkat menjadi guru tetap di Tebuireng dan kelak mendidik banyak tokoh besar seperti KH. Ahmad Shiddiq, KH. Tholhah Hasan, dan Kiai As’ad Syamsul Arifin.</p>
      </div>

      <div class="card profile-card">
        <h3>Mendalami Ilmu Falak dan Kisah Pernikahan di Pesantren Seblak</h3>
        <p>Di sela kegiatan mengajar di Tebuireng, KH. Mahfudz juga memperdalam ilmu falak di Pesantren Seblak kepada KH. Ma’shum Ali, ulama ahli falak sekaligus pencetus kitab Amtsilah Al-Tashrifiyah. Setelah KH. Ma’shum Ali wafat pada 1933, beliau melanjutkan belajar kepada Mas Dain, santri senior sekaligus kepala Pondok Seblak saat itu.</p>
        <p>Melalui forum musyawarah dan diskusi intensif, beliau tumbuh menjadi pakar falak yang sangat mumpuni. Kepakarannya diuji dalam penentuan awal Ramadan dan Syawal dengan rukyat hilal. Karena ketekunan dan kecerdasannya, keluarga dalem kemudian menikahkan beliau dengan putri KH. Ma’shum Ali, yaitu Hj. Abidah.</p>
      </div>

      <div class="card profile-card">
        <h3>Estafet Kepemimpinan Sementara</h3>
        <p>Setelah wafatnya KH. Ma’shum Ali, kepemimpinan Pesantren Seblak sempat diteruskan oleh Nyai Hj. Khoiriyah Hasyim, putri sulung KH. M. Hasyim Asy’ari, dari 1933 hingga 1938. Saat beliau kemudian pindah ke Makkah bersama Kiai Muhaimin selama 18 tahun, tongkat kepemimpinan pesantren diserahkan kepada KH. Mahfudz Anwar.</p>
      </div>

      <div class="card profile-card">
        <h3>Hijrah ke Kota dan Berdirinya PPSA Tahun 1956</h3>
        <p>Ketika Nyai Hj. Khoiriyah kembali dari Makkah untuk memimpin Pesantren Seblak, KH. Mahfudz Anwar bersama Hj. Abidah memilih mandiri dan pindah ke kawasan perkotaan Jombang, tepatnya di Jalan Jaksa Agung Suprapto No. 14.</p>
        <p>Lahan tersebut merupakan bekas kompleks perumahan Belanda yang rusak akibat agresi militer Jepang. KH. Mahfudz membelinya dengan harga sekitar 16 rupiah. Pada 1956, beliau sekeluarga resmi menempati lokasi itu sambil memboyong 18 santri putri dari Seblak. Dari tempat sederhana itulah Pondok Pesantren Sunan Ampel tumbuh dan berkembang.</p>
      </div>

      <div class="card profile-card">
        <h3>Kiprah Birokrasi, Akademis, dan Perjuangan di Nahdlatul Ulama</h3>
        <p>KH. Mahfudz Anwar dikenal sebagai ulama multidimensi: ahli falak, fikih, tafsir, hadis, tasawuf, dan bahasa. Beliau pernah menjabat sebagai Hakim Agama Jombang, Wakil Direktur Peradilan Agama Depag Jakarta, Ketua Pengadilan Agama Mojokerto, hingga Hakim Pengadilan Agama Surabaya.</p>
        <p>Di dunia akademik, beliau menjadi dosen fikih dan tafsir di IAIN Sunan Ampel Surabaya dan dipercaya menjadi Dekan Pertama Fakultas Ushuluddin. Di lingkungan NU, beliau aktif dari tingkat ranting hingga menjadi Ketua Lajnah Falakiyah PBNU, terkenal tegas dan kokoh dalam sikap keilmuannya.</p>
      </div>

      <div class="card profile-card">
        <h3>Wasiat, Karya Tulis, dan Wafatnya Sang Kiai</h3>
        <p>Di masa tua, KH. Mahfudz prihatin karena makin sedikit santri yang berminat mempelajari ilmu falak. Beliau kemudian membuka pengajian falak khusus di kediamannya dan terus aktif menghitung kalender falak bahkan hingga tahun 2003.</p>
        <p>Beliau wafat pada malam Jumat, 20 Mei 1999. Warisan intelektual beliau antara lain Fadlail al-Syuhur, Risalah Asyura min Ahlis Sunnah Wal Jamaah, serta kontribusi awal pada nadhoman kitab Amtsilah Al-Tashrifiyah.</p>
      </div>

      <div class="card profile-card">
        <h3>Kepengasuhan PPSA Masa Kini</h3>
        <p>Estafet perjuangan PPSA kini dilanjutkan oleh KH. Taufiqurrahman, S.H. bersama Ibu Nyai Hj. Maryam Muhsinah, putri pasangan pendiri KH. Mahfudz Anwar dan Nyai Hj. Abidah. Di bawah kepemimpinan beliau, PPSA berkembang melalui pengelolaan lembaga formal seperti MA Terpadu Sunan Ampel dan SMK Sunan Ampel Jombang.</p>
        <p>Pada 7 Februari 2024, keluarga besar pesantren berduka atas wafatnya Ibu Nyai Hj. Maryam Muhsinah. Meski demikian, semangat dakwah, keteladanan, dan pengembangan pendidikan santri di PPSA tetap berjalan istiqamah hingga hari ini.</p>
      </div>
    </section>
  `;

  document.querySelector('#backToSettingsBtn')?.addEventListener('click', renderSettings);
}

async function copyDonationAccount() {
  const accountNumber = '002301003179307';
  const statusEl = document.querySelector('#copyDonationStatus');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(accountNumber);
    } else {
      const input = document.createElement('input');
      input.value = accountNumber;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    if (statusEl) statusEl.textContent = 'Nomor rekening berhasil disalin.';
  } catch (error) {
    if (statusEl) statusEl.textContent = 'Nomor rekening belum berhasil disalin. Silakan coba lagi.';
  }
}

async function refreshPrayerWidget() {
  window.clearInterval(window.__ppsaPrayerTimer);
  const nextEl = document.querySelector('#prayerNext');
  const countdownEl = document.querySelector('#prayerCountdown');
  const locationEl = document.querySelector('#prayerLocation');
  const suggestionEl = document.querySelector('#suggestionText');
  if (!nextEl || !countdownEl || !locationEl) return;

  const renderLoading = (message) => {
    nextEl.innerHTML = `<span class="prayer-next-label">${escapeHtml(message)}</span>`;
    countdownEl.textContent = formatDate(new Date());
    locationEl.textContent = `Wilayah: ${state.prayerCity}, ${state.prayerProvince}`;
  };

  renderLoading('Memuat jadwal...');
  try {
    const schedule = await loadPrayerSchedule(false);
    const update = () => {
      const next = getNextPrayerFromSchedule(schedule);
      if (!next) {
        nextEl.innerHTML = '<span class="prayer-next-label">Jadwal tidak tersedia</span>';
        countdownEl.textContent = 'Silakan atur wilayah atau coba saat online.';
        return;
      }
      nextEl.innerHTML = `<span class="prayer-next-label">${escapeHtml(next.label)}</span><span class="prayer-next-time">- ${escapeHtml(next.time)}</span>`;
      countdownEl.textContent = `Menuju ${next.label}: ${formatCountdown(next.date - new Date())}`;
      locationEl.textContent = `Wilayah: ${schedule.data.kabkota}, ${schedule.data.provinsi} • ${formatDate(new Date())}`;
      state.currentSuggestion = getSuggestionByPrayer(next.label);
      if (suggestionEl) {
        suggestionEl.innerHTML = `<span>Saran bacaan: <strong>${escapeHtml(state.currentSuggestion.label)}</strong></span><button class="primary-btn mini-open-btn" id="quickBtn">Buka</button>`;
        suggestionEl.querySelector('#quickBtn')?.addEventListener('click', () => openReader(state.currentSuggestion.section.id, state.currentSuggestion.subsection?.id));
      }
    };
    update();
    window.__ppsaPrayerTimer = window.setInterval(update, 1000);
  } catch (error) {
    renderLoading('Jadwal belum tersedia');
    countdownEl.textContent = 'Cek koneksi internet atau atur wilayah secara manual.';
  }
}

async function loadPrayerSchedule(force = false) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const cacheKey = `ppsa-prayer-${state.prayerProvince}-${state.prayerCity}-${year}-${month}`;
  const cached = readJson(cacheKey);
  if (!force && cached?.data?.jadwal?.length) return cached;

  try {
    const response = await fetch(EQURAN_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provinsi: state.prayerProvince,
        kabkota: state.prayerCity,
        bulan: month,
        tahun: year,
      }),
    });
    if (!response.ok) throw new Error('Jadwal shalat gagal dimuat.');
    const json = await response.json();
    if (json.code !== 200 || !json.data?.jadwal?.length) throw new Error(json.message || 'Format jadwal tidak sesuai.');
    const payload = { data: json.data, cached_at: new Date().toISOString(), source: 'EQuran.id / Bimas Islam Kementerian Agama RI' };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
    return payload;
  } catch (error) {
    if (cached?.data?.jadwal?.length) return cached;
    throw error;
  }
}

function getNextPrayerFromSchedule(schedulePayload) {
  const jadwal = schedulePayload?.data?.jadwal || [];
  if (!jadwal.length) return null;
  const now = new Date();
  const today = localYmd(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowYmd = localYmd(tomorrow);
  const fields = [
    ['subuh', 'Subuh'],
    ['dzuhur', 'Dhuhur'],
    ['ashar', 'Ashar'],
    ['maghrib', 'Maghrib'],
    ['isya', 'Isya'],
  ];
  const candidates = [];
  for (const row of jadwal) {
    if (![today, tomorrowYmd].includes(row.tanggal_lengkap)) continue;
    const [year, month, day] = row.tanggal_lengkap.split('-').map(Number);
    for (const [key, label] of fields) {
      const time = row[key];
      if (!time) continue;
      const [hour, minute] = String(time).split(':').map(Number);
      const date = new Date(year, month - 1, day, hour, minute, 0);
      if (date > now) candidates.push({ label, time, date });
    }
  }
  return candidates.sort((a, b) => a.date - b.date)[0] || null;
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'segera';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} jam ${minutes} menit ${seconds} detik`;
  if (minutes > 0) return `${minutes} menit ${seconds} detik`;
  return `${seconds} detik`;
}

async function hydrateLocationControls() {
  const provinceSelect = document.querySelector('#provinceSelect');
  const citySelect = document.querySelector('#citySelect');
  const status = document.querySelector('#locationStatus');
  const saveBtn = document.querySelector('#saveLocationBtn');
  const gpsBtn = document.querySelector('#gpsLocationBtn');
  if (!provinceSelect || !citySelect) return;

  const setStatus = (text) => { if (status) status.textContent = text; };

  try {
    const provinces = await fetchProvinces();
    provinceSelect.innerHTML = provinces.map(p => `<option value="${escapeHtml(p)}" ${p === state.prayerProvince ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    await fillCities(state.prayerProvince);
  } catch (error) {
    provinceSelect.innerHTML = `<option value="${escapeHtml(state.prayerProvince)}">${escapeHtml(state.prayerProvince)}</option>`;
    citySelect.innerHTML = `<option value="${escapeHtml(state.prayerCity)}">${escapeHtml(state.prayerCity)}</option>`;
    setStatus('Daftar wilayah belum bisa dimuat. Wilayah tersimpan tetap digunakan.');
  }

  async function fillCities(province) {
    citySelect.innerHTML = '<option>Memuat kabupaten/kota...</option>';
    const cities = await fetchCities(province);
    const selectedCity = cities.includes(state.prayerCity) ? state.prayerCity : cities[0];
    citySelect.innerHTML = cities.map(c => `<option value="${escapeHtml(c)}" ${c === selectedCity ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
  }

  provinceSelect.addEventListener('change', async () => {
    setStatus('Memuat kabupaten/kota...');
    try {
      await fillCities(provinceSelect.value);
      setStatus('Pilih kabupaten/kota, lalu tekan Simpan Wilayah.');
    } catch (error) {
      setStatus('Kabupaten/kota gagal dimuat. Coba lagi saat koneksi internet tersedia.');
    }
  });

  saveBtn?.addEventListener('click', async () => {
    state.prayerProvince = provinceSelect.value;
    state.prayerCity = citySelect.value;
    persistPrayerLocation();
    setStatus(`Wilayah disimpan: ${state.prayerCity}, ${state.prayerProvince}. Mengambil jadwal...`);
    try {
      await loadPrayerSchedule(true);
      setStatus(`Wilayah aktif: ${state.prayerCity}, ${state.prayerProvince}. Jadwal berhasil diperbarui.`);
    } catch (error) {
      setStatus('Wilayah disimpan, tetapi jadwal belum bisa diperbarui. Coba lagi saat online.');
    }
  });

  gpsBtn?.addEventListener('click', async () => {
    setStatus('Meminta izin GPS dan mendeteksi wilayah...');
    try {
      const detected = await detectRegionFromGps();
      state.prayerProvince = detected.province;
      state.prayerCity = detected.city;
      persistPrayerLocation();
      setStatus(`GPS cocok dengan wilayah: ${state.prayerCity}, ${state.prayerProvince}. Mengambil jadwal...`);
      await loadPrayerSchedule(true);
      renderSettings();
    } catch (error) {
      setStatus(error.message || 'GPS belum berhasil mencocokkan wilayah. Silakan pilih manual.');
    }
  });
}

function persistPrayerLocation() {
  localStorage.setItem('ppsa-prayer-province', state.prayerProvince);
  localStorage.setItem('ppsa-prayer-city', state.prayerCity);
}

async function fetchProvinces() {
  const cached = readJson('ppsa-prayer-provinces');
  if (cached?.length) return cached;
  const response = await fetch(`${EQURAN_BASE}/provinsi`);
  if (!response.ok) throw new Error('Provinsi gagal dimuat.');
  const json = await response.json();
  if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('Format provinsi tidak sesuai.');
  localStorage.setItem('ppsa-prayer-provinces', JSON.stringify(json.data));
  return json.data;
}

async function fetchCities(province) {
  const key = `ppsa-prayer-cities-${province}`;
  const cached = readJson(key);
  if (cached?.length) return cached;
  const response = await fetch(`${EQURAN_BASE}/kabkota`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provinsi: province }),
  });
  if (!response.ok) throw new Error('Kabupaten/kota gagal dimuat.');
  const json = await response.json();
  if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('Format kabupaten/kota tidak sesuai.');
  localStorage.setItem(key, JSON.stringify(json.data));
  return json.data;
}

async function detectRegionFromGps() {
  if (!navigator.geolocation) throw new Error('Perangkat/browser belum mendukung GPS.');
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  });
  const { latitude, longitude } = position.coords;
  const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1&accept-language=id`;
  const response = await fetch(reverseUrl);
  if (!response.ok) throw new Error('Reverse geocoding GPS gagal. Silakan pilih manual.');
  const json = await response.json();
  const address = json.address || {};
  const provinceRaw = address.state || address.region || address.province || '';
  const cityRaw = address.city || address.county || address.municipality || address.city_district || address.town || address.village || '';
  const provinces = await fetchProvinces();
  const province = matchProvince(provinceRaw, provinces);
  if (!province) throw new Error('Provinsi dari GPS belum cocok dengan daftar EQuran.id. Silakan pilih manual.');
  const cities = await fetchCities(province);
  const city = matchCity(cityRaw, cities);
  if (!city) throw new Error('Kabupaten/kota dari GPS belum cocok dengan daftar EQuran.id. Silakan pilih manual.');
  return { province, city };
}

function matchProvince(raw, provinces) {
  const mapped = englishProvinceMap()[normalizeKey(raw)] || raw;
  const wanted = normalizeKey(mapped);
  return provinces.find(p => normalizeKey(p) === wanted) || provinces.find(p => wanted.includes(normalizeKey(p)) || normalizeKey(p).includes(wanted));
}

function matchCity(raw, cities) {
  const wanted = normalizeKey(raw).replace(/^(kabupaten|kab|kota)\s+/, '');
  return cities.find(c => normalizeKey(c).replace(/^(kabupaten|kab|kota)\s+/, '') === wanted)
    || cities.find(c => normalizeKey(c).includes(wanted) || wanted.includes(normalizeKey(c).replace(/^(kabupaten|kab|kota)\s+/, '')));
}

function normalizeKey(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/dki\s+jakarta.*/, 'dki jakarta')
    .replace(/di\s+yogyakarta|daerah\s+istimewa\s+yogyakarta/, 'di yogyakarta')
    .replace(/provinsi|province|regency|city|kota|kabupaten/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function englishProvinceMap() {
  return {
    'aceh': 'Aceh',
    'north sumatra': 'Sumatera Utara',
    'west sumatra': 'Sumatera Barat',
    'riau': 'Riau',
    'riau islands': 'Kepulauan Riau',
    'jambi': 'Jambi',
    'south sumatra': 'Sumatera Selatan',
    'bengkulu': 'Bengkulu',
    'lampung': 'Lampung',
    'bangka belitung islands': 'Kepulauan Bangka Belitung',
    'jakarta': 'DKI Jakarta',
    'special capital region of jakarta': 'DKI Jakarta',
    'west java': 'Jawa Barat',
    'central java': 'Jawa Tengah',
    'east java': 'Jawa Timur',
    'banten': 'Banten',
    'special region of yogyakarta': 'DI Yogyakarta',
    'bali': 'Bali',
    'west nusa tenggara': 'Nusa Tenggara Barat',
    'east nusa tenggara': 'Nusa Tenggara Timur',
    'west kalimantan': 'Kalimantan Barat',
    'central kalimantan': 'Kalimantan Tengah',
    'south kalimantan': 'Kalimantan Selatan',
    'east kalimantan': 'Kalimantan Timur',
    'north kalimantan': 'Kalimantan Utara',
    'north sulawesi': 'Sulawesi Utara',
    'central sulawesi': 'Sulawesi Tengah',
    'south sulawesi': 'Sulawesi Selatan',
    'southeast sulawesi': 'Sulawesi Tenggara',
    'gorontalo': 'Gorontalo',
    'west sulawesi': 'Sulawesi Barat',
    'maluku': 'Maluku',
    'north maluku': 'Maluku Utara',
    'west papua': 'Papua Barat',
    'papua': 'Papua',
  };
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}

function titleCase(value = '') {
  return value.toLowerCase().replace(/(^|\s|\(|&)([a-zà-ÿ])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}
function clean(value = '') {
  return String(value).replace(/^"|"$/g, '').trim();
}
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
