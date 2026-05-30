const app = document.querySelector('#app');
const navButtons = [...document.querySelectorAll('.nav-btn')];
const installBtn = document.querySelector('#installBtn');

const EQURAN_BASE = 'https://equran.id/api/v2/shalat';
const DEFAULT_PROVINCE = 'Jawa Timur';
const DEFAULT_CITY = 'Kab. Jombang';
const ARABIC_TITLE = 'مَجْمُوعَةُ الدُّعَاءِ';
const ARABIC_SUBTITLE = 'لِلْمَعْهَدِ الْإِسْلَامِيِّ سُونَانْ أَمْفِيلْ';

const state = {
  data: null,
  view: 'home',
  currentSectionId: null,
  currentSubsectionId: null,
  fontSize: Number(localStorage.getItem('ppsa-font-size') || 24),
  textMode: localStorage.getItem('ppsa-text-mode') || 'arabic_translation',
  haptic: localStorage.getItem('ppsa-haptic') !== 'false',
  counter: Number(localStorage.getItem('ppsa-counter') || 0),
  target: Number(localStorage.getItem('ppsa-target') || 0),
  counterLabel: localStorage.getItem('ppsa-counter-label') || 'Tasbih bebas',
  prayerProvince: localStorage.getItem('ppsa-prayer-province') || DEFAULT_PROVINCE,
  prayerCity: localStorage.getItem('ppsa-prayer-city') || DEFAULT_CITY,
  currentSuggestion: null,
  deferredPrompt: null,
};

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
    app.innerHTML = `<div class="empty-state"><h2>Data doa belum berhasil dimuat</h2><p>Pastikan berkas <strong>data/doa.json</strong> tersedia di repository dan akses aplikasi melalui HTTP/HTTPS, bukan langsung dari file://.</p></div>`;
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

function setTextMode(mode) {
  state.textMode = mode === 'arabic_only' ? 'arabic_only' : 'arabic_translation';
  localStorage.setItem('ppsa-text-mode', state.textMode);
}

function sections() { return state.data?.sections || []; }
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
  if (hour >= 6 && hour < 10) return pickSuggestion('09_doa_salat_duha', 0, 'Doa Salat Duha');
  if (hour >= 10.5 && hour < 13.2) return getSuggestionByPrayer('Dzuhur');
  if (hour >= 13.2 && hour < 16.7) return getSuggestionByPrayer('Ashar');
  if (hour >= 16.7 && hour < 18.7) return getSuggestionByPrayer('Maghrib');
  if (hour >= 18.7 && hour < 21.5) return getSuggestionByPrayer('Isya');
  if (hour >= 21.5 || hour < 3) return pickSuggestion('08_doa_salat_tahajud', 0, 'Doa Salat Tahajud');
  return pickSuggestion('05_wirid_setelah_salat_fardu_asmaul_husna', 0, 'Wirid Setelah Salat Fardu');
}

function pickSuggestion(sectionId, subIndex = 0, label = '') {
  const section = findSection(sectionId);
  const subsection = section?.subsections?.[subIndex] || section?.subsections?.[0];
  return { section, subsection, label: label || subsection?.title || section?.title };
}

function getSuggestionByPrayer(name) {
  const map = {
    Subuh: ['04_tahmid_sebelum_isya_subuh', 1, 'Tahmid Sebelum Subuh'],
    Dzuhur: ['02_tahmid_sebelum_zuhur_asar', 0, 'Tahmid Sebelum Zuhur'],
    Ashar: ['02_tahmid_sebelum_zuhur_asar', 1, 'Tahmid Sebelum Asar'],
    Maghrib: ['03_tahmid_sebelum_magrib_syi_ir_al_i_tiraf', 0, 'Tahmid Sebelum Magrib'],
    Isya: ['04_tahmid_sebelum_isya_subuh', 0, 'Tahmid Sebelum Isya'],
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
  const filteredSections = sections().filter(s => s.id !== '01_sampul_depan');

  app.innerHTML = `
    <section class="hero card">
      <h2>Assalamu'alaikum</h2>
      <p>Waktu shalat berikutnya ditampilkan berdasarkan wilayah pilihan. Jadwal diambil dari EQuran.id dengan sumber data Bimas Islam Kementerian Agama RI.</p>
      <div class="clock-row">
        <div>
          <div class="prayer-next" id="prayerNext">Memuat jadwal...</div>
          <p class="prayer-countdown" id="prayerCountdown">${formatDate(now)}</p>
          <p class="prayer-location" id="prayerLocation">Wilayah: ${escapeHtml(state.prayerCity)}, ${escapeHtml(state.prayerProvince)}</p>
        </div>
        <div class="hero-actions">
          <button class="primary-btn" id="quickBtn">Buka</button>
          <button class="secondary-btn" id="prayerSettingsBtn">Atur Wilayah</button>
        </div>
      </div>
      <p style="margin-top:12px" id="suggestionText">Saran bacaan: <strong>${escapeHtml(state.currentSuggestion.label)}</strong></p>
    </section>

    <h2 class="section-title">Daftar Doa & Wirid</h2>
    <div class="grid">
      ${filteredSections.map((section, index) => sectionCard(section, index)).join('')}
    </div>
  `;

  document.querySelector('#quickBtn')?.addEventListener('click', () => {
    const suggestion = state.currentSuggestion || getSuggestion(new Date());
    openReader(suggestion.section.id, suggestion.subsection?.id);
  });
  document.querySelector('#prayerSettingsBtn')?.addEventListener('click', renderSettings);
  document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => openReader(btn.dataset.section)));
  refreshPrayerWidget();
}

function sectionCard(section, index) {
  const count = section.subsections?.reduce((sum, sub) => sum + (sub.items?.length || 0), 0) || 0;
  const title = section.display_title || titleCase(section.title);
  const subtitle = section.display_subtitle || `${section.app_category || 'Amalan'} • ${count} bait/baris`;
  return `
    <button class="menu-card" data-section="${section.id}">
      <span class="mark">${index + 1}</span>
      <span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </span>
    </button>
  `;
}

function renderReader() {
  setView('read');
  const section = findSection(state.currentSectionId) || sections().find(s => s.id !== '01_sampul_depan');
  state.currentSectionId = section?.id;
  const sectionOptions = sections()
    .filter(s => s.id !== '01_sampul_depan')
    .map(s => `<option value="${s.id}" ${s.id === section?.id ? 'selected' : ''}>${escapeHtml(s.display_title || titleCase(s.title))}</option>`).join('');

  app.innerHTML = `
    <section class="reader-head">
      <div class="field">
        <label for="sectionSelect">Kategori doa</label>
        <select id="sectionSelect">${sectionOptions}</select>
      </div>
      <div>
        <div class="reader-title">Mode tampilan bacaan</div>
        <div class="reader-subtitle">Pilih sesuai kebutuhan saat membaca.</div>
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
  const showSubsectionTitle = subsections.length > 1 || !/^umum$/i.test(subsections[0]?.title || '');
  container.innerHTML = subsections.map(sub => {
    const title = showSubsectionTitle ? `<div class="subsection-label">${escapeHtml(sub.title || 'Umum')}</div>` : '';
    const cards = (sub.items || []).map(item => prayerCard(item)).join('');
    return `${title}${cards}`;
  }).join('');

  const allItems = subsections.flatMap(sub => sub.items || []);
  container.querySelectorAll('[data-start-counter]').forEach(button => {
    button.addEventListener('click', () => {
      const item = allItems.find(i => i.id === button.dataset.startCounter);
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
  const arabic = normalizeArabicPunctuation(item.arabic || '');
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
  return String(value).replace(/\s*،\s*/g, ' * ').replace(/\s+\*\s+/g, ' * ').trim();
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
        <h2 class="arabic-brand-title" lang="ar" dir="rtl" style="color:var(--deep-pine);margin:12px 0 4px">${ARABIC_TITLE}</h2>
        <p class="arabic-brand-subtitle" lang="ar" dir="rtl" style="text-align:center">${ARABIC_SUBTITLE}</p>
      </div>

      <div class="info-card card">
        <h3>Wilayah Jadwal Shalat</h3>
        <p>Jadwal shalat diambil dari EQuran.id dengan sumber data Bimas Islam Kementerian Agama RI. Hasil jadwal bulan berjalan disimpan di perangkat agar bisa dipakai ulang saat offline.</p>
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
            <button class="ghost-btn" id="defaultLocationBtn">Default Jombang</button>
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

      <div class="info-card card">
        <h3>Operasional Offline</h3>
        <p>Teks doa, wirid, mode baca, ukuran font, dan tasbih digital berjalan di perangkat. Internet hanya diperlukan untuk mengambil jadwal shalat EQuran.id, deteksi GPS, membuka tautan eksternal, atau pembaruan repository.</p>
      </div>
      <div class="info-card card">
        <h3>Informasi Pesantren</h3>
        <p>Tautan resmi: <a href="https://linktr.ee/ppsajombang" target="_blank" rel="noopener">linktr.ee/ppsajombang</a></p>
      </div>
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
  hydrateLocationControls();
}

async function refreshPrayerWidget() {
  window.clearInterval(window.__ppsaPrayerTimer);
  const nextEl = document.querySelector('#prayerNext');
  const countdownEl = document.querySelector('#prayerCountdown');
  const locationEl = document.querySelector('#prayerLocation');
  const suggestionEl = document.querySelector('#suggestionText');
  if (!nextEl || !countdownEl || !locationEl) return;

  const renderLoading = (message) => {
    nextEl.textContent = message;
    countdownEl.textContent = formatDate(new Date());
    locationEl.textContent = `Wilayah: ${state.prayerCity}, ${state.prayerProvince}`;
  };

  renderLoading('Memuat jadwal...');
  try {
    const schedule = await loadPrayerSchedule(false);
    const update = () => {
      const next = getNextPrayerFromSchedule(schedule);
      if (!next) {
        nextEl.textContent = 'Jadwal tidak tersedia';
        countdownEl.textContent = 'Silakan atur wilayah atau coba saat online.';
        return;
      }
      nextEl.textContent = `${next.label} — ${next.time}`;
      countdownEl.textContent = `Menuju ${next.label}: ${formatCountdown(next.date - new Date())}`;
      locationEl.textContent = `Wilayah: ${schedule.data.kabkota}, ${schedule.data.provinsi} • ${formatDate(new Date())}`;
      state.currentSuggestion = getSuggestionByPrayer(next.label);
      if (suggestionEl) suggestionEl.innerHTML = `Saran bacaan: <strong>${escapeHtml(state.currentSuggestion.label)}</strong>`;
    };
    update();
    window.__ppsaPrayerTimer = window.setInterval(update, 60 * 1000);
  } catch (error) {
    renderLoading('Jadwal belum tersedia');
    countdownEl.textContent = 'Cek koneksi internet atau gunakan wilayah default Jombang.';
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
    ['dzuhur', 'Dzuhur'],
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
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} menit`;
  return `${hours} jam ${minutes} menit`;
}

async function hydrateLocationControls() {
  const provinceSelect = document.querySelector('#provinceSelect');
  const citySelect = document.querySelector('#citySelect');
  const status = document.querySelector('#locationStatus');
  const saveBtn = document.querySelector('#saveLocationBtn');
  const defaultBtn = document.querySelector('#defaultLocationBtn');
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

  defaultBtn?.addEventListener('click', async () => {
    state.prayerProvince = DEFAULT_PROVINCE;
    state.prayerCity = DEFAULT_CITY;
    persistPrayerLocation();
    renderSettings();
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
