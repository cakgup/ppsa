# Majmu'ah ad-Du'a Sunan Ampel

Aplikasi web/PWA ringan untuk digitalisasi **Kumpulan Doa Pondok Pesantren Sunan Ampel, Jombang**. Proyek ini disiapkan agar dapat langsung diletakkan pada repository GitHub Pages `cakgup/ppsa`.

## Fitur utama

- Splash screen dengan logo pesantren dan transisi fade-out ±2 detik.
- Beranda dengan widget waktu lokal dan rekomendasi amalan berbasis waktu.
- Mode baca tersegmentasi: satu baris Arab, satu baris arti Indonesia.
- Font Arab dapat diperbesar/diperkecil pada rentang 16–32 px.
- Tasbih digital dengan counter, target hitungan, reset, dan haptic feedback bila perangkat mendukung.
- Offline-first menggunakan Service Worker.
- Tema warna Deep Pine `#1A4314`, Putih Gading `#FDFBF7`, dan Emas Muted `#D4AF37`.
- Siap untuk layar mobile HD 720×1280 px dan tetap responsif di layar kecil.

## Struktur folder

```text
.
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── logo.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    └── doa.json
```

## Cara memasukkan ke repository

1. Ekstrak isi ZIP ini.
2. Salin seluruh isi folder ke root repository `cakgup/ppsa`.
3. Commit dan push ke GitHub.
4. Aktifkan GitHub Pages dari branch utama dan folder root.
5. Buka halaman GitHub Pages repository.

## Catatan pengembangan lanjutan

Versi ini menggunakan pendekatan jam lokal perangkat untuk memberi rekomendasi amalan. Integrasi jadwal salat regional, arah kiblat, notifikasi push, dan pembaruan konten dari backend dapat ditambahkan pada iterasi berikutnya.
