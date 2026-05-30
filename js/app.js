const app = document.querySelector('#app');
const navButtons = [...document.querySelectorAll('.nav-btn')];
const installBtn = document.querySelector('#installBtn');
const state = {
  data: null,
  view: 'home',
  activeCategory: 'Semua',
  currentSectionId: null,
  currentSubsectionId: null,
  fontSize: Number(localStorage.getItem('ppsa-font-size') || 24),
  haptic: localStorage.getItem('ppsa-haptic') !== 'false',
  counter: Number(localStorage.getItem('ppsa-counter') || 0),
  target: Number(localStorage.getItem('ppsa-target') || 0),
  counterLabel: localStorage.getItem('ppsa-counter-label') || 'Tasbih bebas',
  deferredPrompt: null,
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const LATIN_DIGITS = '0123456789';
const toLatinDigits = (value) => String(value).replace(/[٠-٩]/g, d => LATIN_DIGITS[AR_DIGITS.indexOf(d)]);
const clean = (value = '') => String(value).replace(/^"|"$/g, '').trim();

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
    const response = await fetch('./data/doa.json', { cache: 'no-store' });
    state.data = await response.json();
    const firstReadable = state.data.sections.find(section => section.id !== '01_sampul_depan');
    state.currentSectionId = firstReadable?.id || state.data.sections[0]?.id;
    state.currentSubsectionId = firstReadable?.subsections?.[0]?.id || null;
    renderHome();
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><h2>Data doa belum berhasil dimuat</h2><p>Pastikan berkas <strong>data/doa.json</strong> tersedia di repository.</p></div>`;
  }
}

function bindNav() {
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      if (view === 'home') renderHome();
      if (view === 'read') renderReader();
      if (view === 'tasbih') renderTasbih();
      if (view === 'settings') renderSettings();
    });
  });
}

function setView(view) {
  state.view = view;
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  app.focus({ preventScroll: true });
}

function setArabicFontSize(size) {
  state.fontSize = Number(size);
  document.documentElement.style.setProperty('--font-arabic-size', `${state.fontSize}px`);
  localStorage.setItem('ppsa-font-size', state.fontSize);
}

function sections() { return state.data?.sections || []; }
function findSection(id) { return sections().find(section => section.id === id) || sections()[0]; }
function findSubsection(section, id) { return section?.subsections?.find(sub => sub.id === id) || section?.subsections?.[0]; }
function allCategories() { return ['Semua', ...new Set(sections().map(s => s.app_category || 'Lainnya'))]; }

function formatDate(now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now);
}
function formatTime(now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(now);
}

function getSuggestion(now = new Date()) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const pick = (sectionId, subIndex = 0, label = '') => {
    const section = findSection(sectionId);
    const subsection = section?.subsections?.[subIndex] || section?.subsections?.[0];
    return { section, subsection, label: label || subsection?.title || section?.title };
  };
  if (hour >= 3 && hour < 6) return pick('04_tahmid_sebelum_isya_subuh', 1, 'Tahmid Sebelum Subuh');
  if (hour >= 6 && hour < 10) return pick('09_doa_salat_duha', 0, 'Doa Salat Duha');
  if (hour >= 10.5 && hour < 13.2) return pick('02_tahmid_sebelum_zuhur_asar', 0, 'Tahmid Sebelum Zuhur');
  if (hour >= 13.2 && hour < 16.7) return pick('02_tahmid_sebelum_zuhur_asar', 1, 'Tahmid Sebelum Asar');
  if (hour >= 16.7 && hour < 18.7) return pick('03_tahmid_sebelum_magrib_syi_ir_al_i_tiraf', 0, "Tahmid Sebelum Magrib");
  if (hour >= 18.7 && hour < 21.5) return pick('04_tahmid_sebelum_isya_subuh', 0, 'Tahmid Sebelum Isya');
  if (hour >= 21.5 || hour < 3) return pick('08_doa_salat_tahajud', 0, 'Doa Salat Tahajud');
  return pick('05_wirid_setelah_salat_fardu_asmaul_husna', 0, 'Wirid Setelah Salat Fardu');
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
  const suggestion = getSuggestion(now);
  const categories = allCategories();
  const filteredSections = state.activeCategory === 'Semua'
    ? sections().filter(s => s.id !== '01_sampul_depan')
    : sections().filter(s => (s.app_category || 'Lainnya') === state.activeCategory && s.id !== '01_sampul_depan');

  app.innerHTML = `
    <section class="hero card">
      <span class="badge">Offline-first • Ringan • Khusyuk</span>
      <h2>Assalamu'alaikum</h2>
      <p>Gunakan menu cepat berikut untuk membaca amalan sesuai waktu. Semua teks doa tersedia tanpa koneksi internet.</p>
      <div class="clock-row">
        <div>
          <div class="clock" id="clockText">${formatTime(now)}</div>
          <p>${formatDate(now)}</p>
        </div>
        <button class="primary-btn" id="quickBtn">Buka</button>
      </div>
      <p style="margin-top:12px">Saran saat ini: <strong>${suggestion.label}</strong></p>
    </section>

    <h2 class="section-title">Kategori Amalan</h2>
    <div class="category-strip" id="categoryStrip">
      ${categories.map(cat => `<button class="chip ${cat === state.activeCategory ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('')}
    </div>

    <h2 class="section-title">Daftar Doa & Wirid</h2>
    <div class="grid">
      ${filteredSections.map((section, index) => sectionCard(section, index)).join('')}
    </div>
  `;

  document.querySelector('#quickBtn')?.addEventListener('click', () => openReader(suggestion.section.id, suggestion.subsection?.id));
  document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => openReader(btn.dataset.section)));
  document.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => {
    state.activeCategory = btn.dataset.category;
    renderHome();
  }));
  window.clearInterval(window.__ppsaClock);
  window.__ppsaClock = window.setInterval(() => {
    const el = document.querySelector('#clockText');
    if (el) el.textContent = formatTime(new Date());
  }, 1000 * 20);
}

function sectionCard(section, index) {
  const count = section.subsections?.reduce((sum, sub) => sum + (sub.items?.length || 0), 0) || 0;
  return `
    <button class="menu-card" data-section="${section.id}">
      <span class="mark">${index + 1}</span>
      <span>
        <h3>${escapeHtml(titleCase(section.title))}</h3>
        <p>${escapeHtml(section.app_category || 'Amalan')} • ${count} bait/baris</p>
      </span>
    </button>
  `;
}

function renderReader() {
  setView('read');
  const section = findSection(state.currentSectionId) || sections().find(s => s.id !== '01_sampul_depan');
  state.currentSectionId = section?.id;
  const subsection = findSubsection(section, state.currentSubsectionId);
  state.currentSubsectionId = subsection?.id;
  const sectionOptions = sections()
    .filter(s => s.id !== '01_sampul_depan')
    .map(s => `<option value="${s.id}" ${s.id === section?.id ? 'selected' : ''}>${escapeHtml(titleCase(s.title))}</option>`).join('');
  const subOptions = (section?.subsections || [])
    .map(sub => `<option value="${sub.id}" ${sub.id === subsection?.id ? 'selected' : ''}>${escapeHtml(sub.title)}</option>`).join('');

  app.innerHTML = `
    <section class="reader-head">
      <div class="field">
        <label for="sectionSelect">Kategori doa</label>
        <select id="sectionSelect">${sectionOptions}</select>
      </div>
      <div class="field">
        <label for="subsectionSelect">Subbagian</label>
        <select id="subsectionSelect">${subOptions}</select>
      </div>
      <div class="field">
        <label for="searchInput">Cari teks Arab / arti</label>
        <input id="searchInput" type="search" placeholder="Contoh: Subhanallah, Tahajud, rezeki..." />
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
  document.querySelector('#subsectionSelect')?.addEventListener('change', (event) => {
    state.currentSubsectionId = event.target.value;
    renderReader();
  });
  document.querySelector('#fontRange')?.addEventListener('input', (event) => {
    setArabicFontSize(event.target.value);
    const label = document.querySelector('#fontValue');
    if (label) label.textContent = `${state.fontSize}px`;
  });
  document.querySelector('#searchInput')?.addEventListener('input', (event) => renderPrayerItems(subsection, event.target.value));
  renderPrayerItems(subsection, '');
}

function renderPrayerItems(subsection, query = '') {
  const container = document.querySelector('#readerContent');
  if (!container) return;
  const q = query.trim().toLowerCase();
  const items = (subsection?.items || []).filter(item => {
    if (!q) return true;
    return `${item.arabic || ''} ${item.translation_id || ''}`.toLowerCase().includes(q);
  });
  if (!items.length) {
    container.innerHTML = `<div class="empty-state card"><h2>Tidak ditemukan</h2><p>Coba gunakan kata kunci lain.</p></div>`;
    return;
  }
  container.innerHTML = items.map(item => prayerCard(item)).join('');
  container.querySelectorAll('[data-start-counter]').forEach(button => {
    button.addEventListener('click', () => {
      const item = items.find(i => i.id === button.dataset.startCounter);
      const target = Number(button.dataset.target || item?.default_repeat_target || 0);
      startCounterFromItem(item, target);
    });
  });
}

function prayerCard(item) {
  const repeatOptions = item.repeat_options || [];
  const repeatTools = repeatOptions.length
    ? `<div class="repeat-tools">
        ${repeatOptions.map(target => `<button class="secondary-btn" data-start-counter="${item.id}" data-target="${target}">Tasbih ×${target}</button>`).join('')}
      </div>`
    : '';
  return `
    <article class="prayer-card card">
      <div class="prayer-meta">
        <span class="prayer-num">${item.order || ''}</span>
        ${repeatOptions.length ? `<span class="badge">Ada hitungan zikir</span>` : ''}
      </div>
      <p class="arabic">${escapeHtml(item.arabic || '')}</p>
      <p class="translation">${escapeHtml(clean(item.translation_id || ''))}</p>
      ${repeatTools}
    </article>
  `;
}

function startCounterFromItem(item, target = 0) {
  state.counter = 0;
  state.target = Number(target) || 0;
  state.counterLabel = clean(item?.translation_id || item?.arabic || 'Tasbih');
  localStorage.setItem('ppsa-counter', state.counter);
  localStorage.setItem('ppsa-target', state.target);
  localStorage.setItem('ppsa-counter-label', state.counterLabel);
  renderTasbih();
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
      <div class="info-card card" style="text-align:center">
        <img src="assets/logo.png" alt="Logo Pondok Pesantren Sunan Ampel" style="width:104px;height:104px;object-fit:contain;border-radius:50%;background:white;border:1px solid var(--border);padding:6px" />
        <h2 style="color:var(--deep-pine);margin:12px 0 4px">Majmu'ah ad-Du'a</h2>
        <p>Pondok Pesantren Sunan Ampel, Jombang</p>
      </div>
      <div class="info-card card">
        <h3>Pengaturan Baca</h3>
        <div class="field font-row">
          <label for="settingsFontRange">Ukuran font Arab: <span id="settingsFontValue">${state.fontSize}px</span></label>
          <input id="settingsFontRange" type="range" min="16" max="32" value="${state.fontSize}" />
        </div>
      </div>
      <div class="info-card card">
        <h3>Operasional Offline</h3>
        <p>Aplikasi ini menyimpan teks doa, wirid, dan tasbih digital di perangkat. Internet hanya diperlukan untuk membuka tautan eksternal atau pembaruan repository.</p>
      </div>
      <div class="info-card card">
        <h3>Informasi Pesantren</h3>
        <p>Tautan resmi: <a href="https://linktr.ee/ppsajombang" target="_blank" rel="noopener">linktr.ee/ppsajombang</a></p>
      </div>
      <div class="info-card card">
        <h3>Catatan</h3>
        <p>Waktu salat di beranda menggunakan pendekatan jam lokal perangkat untuk memberi saran amalan. Integrasi jadwal salat regional dan arah kiblat dapat ditambahkan pada versi berikutnya.</p>
      </div>
    </section>
  `;
  document.querySelector('#settingsFontRange')?.addEventListener('input', (event) => {
    setArabicFontSize(event.target.value);
    const label = document.querySelector('#settingsFontValue');
    if (label) label.textContent = `${state.fontSize}px`;
  });
}

function titleCase(value = '') {
  return value.toLowerCase().replace(/(^|\s|\(|&)([a-zà-ÿ])/g, (m, p1, p2) => p1 + p2.toUpperCase());
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
