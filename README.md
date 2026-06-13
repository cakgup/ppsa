# PPSA - Majmu'ah ad-Du'a Sunan Ampel

<p align="center">
  <img src="assets/logo.png" alt="Logo PPSA" width="140">
</p>

<p align="center">
  <strong>Aplikasi doa, wirid, Al-Qur'an, jadwal shalat, dan tasbih digital untuk santri, jamaah, dan keluarga besar PPSA.</strong><br>
  Frontend statis, ringan dibuka dari HP, siap dipasang sebagai PWA, dan mudah diduplikasi untuk lembaga lain.
</p>

<p align="center">
  <a href="https://cakgup.github.io/ppsa/">
    <img src="https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?logo=github" alt="GitHub Pages">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg" alt="License GPL-3.0">
  </a>
  <img src="https://img.shields.io/badge/PWA-Offline--Ready-2E7D32" alt="PWA Offline Ready">
  <img src="https://img.shields.io/badge/Mobile-Responsive-1E88E5" alt="Mobile Responsive">
</p>

---

## Bismillahirrahmanirrahim

Repository ini adalah ikhtiar digital untuk memudahkan pembacaan doa, wirid, Al-Qur'an, dan jadwal shalat dalam satu aplikasi yang sederhana, cepat, dan mudah dirawat.

README ini disusun ulang agar:

- fitur yang tertulis sesuai kondisi repo saat ini;
- orang lain lebih mudah meng-clone dan menyesuaikan aplikasi;
- nilai sensitif tidak ikut tersebar di dokumentasi;
- branding, data, dan deploy lebih mudah diwariskan ke pengelola berikutnya.

---

## Tentang Aplikasi

**PPSA - Majmu'ah ad-Du'a Sunan Ampel** adalah aplikasi web statis berbasis PWA yang menggabungkan beberapa kebutuhan harian dalam satu antarmuka:

- kumpulan doa dan wirid;
- pembaca Al-Qur'an berbasis data Kemenag;
- audio murottal per ayat;
- jadwal shalat harian;
- tasbih digital;
- penyimpanan preferensi pengguna di browser.

Aplikasi ini cocok untuk:

- amalan pribadi harian;
- kebutuhan santri atau jamaah di lingkungan pesantren;
- distribusi ringan melalui GitHub Pages;
- basis duplikasi untuk aplikasi doa sejenis milik lembaga lain.

---

## Fitur Utama

| Fitur | Keterangan |
|---|---|
| Data doa multi-versi | Mendukung perpindahan antara `data/doa.json` dan `data/doa_v2.json` |
| Pembaca Al-Qur'an | Menampilkan daftar surah, detail ayat, arti, dan footnote |
| Audio murottal | Audio per ayat memakai sumber audio eksternal Alafasy |
| Jadwal shalat | Mengambil jadwal berdasarkan provinsi/kota dan dapat dibantu GPS |
| Pengaturan tampilan | Mode Arab saja atau Arab + arti, plus pengaturan ukuran font |
| Tasbih digital | Counter bebas atau berdasarkan target bacaan tertentu |
| Haptic feedback | Getaran singkat saat counter berjalan pada perangkat yang mendukung |
| Installable PWA | Bisa dipasang ke homescreen dan tetap nyaman digunakan di mobile |
| Cache browser | Menyimpan preferensi, daftar surah, detail surah, dan cache jadwal tertentu |

---

## Struktur Repository

```text
ppsa/
|-- index.html
|-- css/
|   `-- styles.css
|-- js/
|   `-- app.js
|-- data/
|   |-- doa.json
|   |-- doa_v2.json
|   |-- maulid_dibai.json
|   |-- quran_kemenag/
|   `-- quran_kemenag_surah.json
|-- assets/
|-- manifest.webmanifest
|-- sw.js
|-- LICENSE
`-- README.md
```

Keterangan singkat:

| File/Folder | Fungsi |
|---|---|
| `index.html` | Entry point aplikasi |
| `css/styles.css` | Styling utama aplikasi |
| `js/app.js` | Logika view, doa, Al-Qur'an, jadwal shalat, GPS, dan tasbih |
| `data/` | Semua sumber data lokal aplikasi |
| `assets/` | Logo, ikon, dan aset visual lain |
| `manifest.webmanifest` | Konfigurasi PWA |
| `sw.js` | Service worker untuk cache asset inti |

---

## Sumber Data

Project ini sekarang memakai beberapa sumber data:

- `data/doa.json` untuk koleksi lama;
- `data/doa_v2.json` untuk koleksi doa versi baru;
- `data/maulid_dibai.json` untuk konten tambahan;
- `data/quran_kemenag/` dan `data/quran_kemenag_surah.json` untuk data Al-Qur'an Kemenag;
- API eksternal untuk jadwal shalat dan audio murottal.

Karena ada dependensi API eksternal, aplikasi paling aman diuji melalui koneksi internet normal walaupun sebagian konten utama tetap tersedia dari file lokal.

---

## Menjalankan Secara Lokal

Jangan buka `index.html` langsung melalui `file://` karena sebagian browser akan membatasi pembacaan data dan service worker.

### Opsi 1 - Python

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

### Opsi 2 - Node.js

```bash
npx -y serve .
```

Lalu buka:

```text
http://localhost:3000
```

---

## Panduan Duplikasi dan Kustomisasi

README ini sengaja dibuat supaya aplikasi mudah dijadikan dasar project baru.

### 1. Clone repository

```bash
git clone <url-repository-anda>
cd ppsa
```

### 2. Ganti branding dasar

Periksa dan sesuaikan:

- judul, meta, dan nama aplikasi di `index.html`;
- logo dan ikon pada folder `assets/`;
- warna, tipografi, dan layout di `css/styles.css`.

### 3. Sesuaikan isi data

File yang paling sering diubah:

- `data/doa.json`
- `data/doa_v2.json`
- `data/maulid_dibai.json`
- `data/quran_kemenag/`
- `data/quran_kemenag_surah.json`

Jaga struktur field tetap konsisten agar renderer di `js/app.js` tidak rusak.

### 4. Audit dependensi eksternal

Saat menduplikasi project, cek ulang bagian yang masih mengarah ke layanan eksternal:

- API jadwal shalat;
- reverse geocoding untuk GPS;
- audio murottal eksternal.

Jika ingin project benar-benar mandiri, ganti URL sumber tersebut dengan layanan Anda sendiri atau siapkan fallback yang sesuai.

### 5. Sesuaikan nama cache/storage

Repo ini menyimpan banyak preferensi di `localStorage` dengan prefix `ppsa-...`. Jika hasil fork akan hidup berdampingan dengan instance lain pada domain yang sama, pertimbangkan mengganti prefix key agar tidak bentrok.

---

## Deploy

Frontend ini bisa dipublikasikan ke:

- GitHub Pages
- Cloudflare Pages
- Vercel
- hosting statis lain

Untuk GitHub Pages:

1. Push semua file ke branch utama.
2. Buka `Settings` repository.
3. Masuk ke menu `Pages`.
4. Pilih source `Deploy from a branch`.
5. Pilih branch dan folder root.
6. Simpan lalu tunggu URL aktif.

Contoh:

```text
https://username.github.io/nama-repository/
```

---

## Checklist Sebelum Dibagikan

- [ ] Data JSON valid dan tidak ada error parsing
- [ ] Navigasi doa, Al-Qur'an, tasbih, dan pengaturan berjalan normal
- [ ] Jadwal shalat tampil untuk lokasi manual
- [ ] Fitur GPS gagal dengan pesan yang jelas jika izin ditolak
- [ ] Audio ayat dapat diputar saat online
- [ ] Service worker aktif tanpa menahan cache lama
- [ ] Tampilan tetap rapi di layar kecil
- [ ] Tidak ada URL internal atau nilai sensitif yang tertulis di dokumentasi

---

## Troubleshooting

### Data doa tidak tampil

- cek bahwa file di folder `data/` masih utuh;
- jalankan aplikasi melalui `http://`, bukan `file://`;
- buka console browser untuk melihat error parsing atau path.

### Jadwal shalat tidak muncul

- cek koneksi internet;
- cek apakah browser memberi izin lokasi jika memakai GPS;
- cek apakah API eksternal yang dipakai sedang aktif.

### Audio Al-Qur'an tidak bisa diputar

- pastikan perangkat sedang online;
- cek apakah sumber audio eksternal dapat diakses;
- coba reload ulang halaman surah.

### Tombol install tidak muncul

- akses melalui `http://localhost` atau `https://`;
- pastikan `manifest.webmanifest` dan `sw.js` termuat;
- beberapa browser menampilkan prompt install hanya setelah interaksi pengguna.

---

## Catatan Keamanan

- Jangan menaruh token, secret, atau kredensial private di repository statis ini.
- Jika menambahkan API milik sendiri, simpan kredensial di backend, bukan di frontend.
- Audit ulang URL layanan eksternal sebelum membagikan hasil fork.
- Hindari menyertakan data pribadi jamaah atau santri ke repository publik.

---

## Teknologi

| Teknologi | Fungsi |
|---|---|
| HTML | Struktur halaman |
| CSS | Tampilan visual |
| JavaScript | Interaksi aplikasi |
| Service Worker | Dukungan offline/PWA |
| Web App Manifest | Instalasi PWA |
| localStorage | Penyimpanan preferensi pengguna |

---

## Lisensi

Repository ini menggunakan lisensi **GNU General Public License v3.0 (GPL-3.0)**.  
Lihat detail pada file [LICENSE](LICENSE).

---

<p align="center">
  <strong>Dibuat dengan niat ibadah, dirawat dengan amanah, dan dibagikan untuk kemaslahatan.</strong>
</p>

<p align="center">
  <sub>developed with ❤️ by <a href="https://cakgup.codeberg.page">cakgup</a></sub>
</p>
