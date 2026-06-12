# 📖 PPSA — Majmu'ah ad-Du'a Sunan Ampel

<p align="center">
  <img src="assets/logo.png" alt="Logo PPSA" width="140">
</p>

<p align="center">
  <strong>Aplikasi doa & wirid digital untuk keluarga besar Pondok Pesantren Sunan Ampel</strong><br>
  Jombang, bisa dibuka dari HP, mendukung mode offline, dan dilengkapi jadwal shalat harian.
</p>

<p align="center">
  <a href="https://cakgup.github.io/ppsa/">
    <img src="https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?logo=github" alt="GitHub Pages">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg" alt="License GPL-3.0">
  </a>
  <img src="https://img.shields.io/badge/PWA-Offline--First-2E7D32" alt="PWA Offline First">
  <img src="https://img.shields.io/badge/Mobile-Responsive-1E88E5" alt="Mobile Responsive">
</p>

---

## ✦ Bismillahirrahmanirrahim

Repository ini adalah ikhtiar digital untuk memudahkan keluarga, santri, dan jamaah dalam menjaga rutinitas doa, wirid, serta kedisiplinan ibadah harian.  
Semoga aplikasi ini menjadi wasilah kebaikan: mudah dibuka, mudah diamalkan, dan mudah diwariskan.

> _“Khairunnas anfa'uhum linnas.”_  
> Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.

---

## 📌 Tentang Aplikasi

**PPSA — Majmu'ah ad-Du'a Sunan Ampel** adalah aplikasi web statis berbasis PWA yang berisi kumpulan doa dan wirid dengan pengalaman baca yang ramah mobile.

Aplikasi ini cocok untuk:

- penggunaan pribadi harian setelah shalat;
- pendamping amalan di rumah, pesantren, atau majelis;
- akses cepat doa dalam kondisi sinyal minim;
- dokumentasi digital naskah doa agar lebih mudah dirawat.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🕌 Jadwal Shalat Harian | Menampilkan waktu shalat berdasarkan wilayah pilihan pengguna |
| 📍 Pilih Lokasi Manual + GPS | Pilih provinsi/kota atau bantu deteksi lokasi via GPS |
| 📚 Mode Baca Fleksibel | Tersedia mode Arab saja atau Arab + Arti |
| 🔠 Pengaturan Font Arab | Ukuran font Arab bisa diatur agar nyaman dibaca |
| 📿 Tasbih Digital | Counter tasbih dengan target dan feedback getar (device support) |
| 📶 Offline-First | Konten doa utama tetap dapat dibaca saat offline |
| 📦 Cache Cerdas | Jadwal shalat bulan berjalan disimpan di localStorage |
| 📱 Siap Dipasang | Mendukung install ke homescreen (PWA) |

---

## 🗂️ Struktur Repository

```text
ppsa/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   └── doa.json
├── assets/
│   ├── logo.png
│   └── icon-192.png
├── manifest.webmanifest
├── sw.js
├── LICENSE
└── README.md
```

Keterangan singkat:

| File/Folder | Fungsi |
|---|---|
| `index.html` | Entry point aplikasi |
| `css/styles.css` | Styling utama aplikasi |
| `js/app.js` | Logika view, jadwal shalat, tasbih, dan pengaturan |
| `data/doa.json` | Sumber data doa/wirid |
| `assets/` | Logo dan ikon aplikasi |
| `manifest.webmanifest` | Konfigurasi PWA |
| `sw.js` | Service worker untuk mode offline |

---

## 🚀 Menjalankan Secara Lokal

Jangan buka `index.html` langsung via `file://` karena `fetch` ke file data bisa dibatasi browser.

### Opsi 1 — Python

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

### Opsi 2 — Node.js

```bash
npx -y serve .
```

Lalu buka:

```text
http://localhost:3000
```

---

## 🌐 Deploy

Aplikasi dapat dipublikasikan ke:

- GitHub Pages
- Vercel
- Cloudflare Pages

Untuk GitHub Pages:

1. Push semua file ke branch `main`.
2. Buka `Settings` repository.
3. Masuk ke menu `Pages`.
4. Pilih source `Deploy from a branch`.
5. Pilih branch `main` dan folder `/root`.
6. Simpan, lalu tunggu URL aktif.

Contoh URL:

```text
https://cakgup.github.io/ppsa/
```

---

## 🛠️ Kustomisasi Konten

### 1. Memperbarui data doa

Edit file berikut:

```text
data/doa.json
```

Disarankan tetap menjaga format field agar kompatibel dengan renderer di `js/app.js`.

### 2. Menyesuaikan branding

- Ubah logo di `assets/logo.png`
- Ubah ikon aplikasi di `assets/icon-192.png`
- Sesuaikan judul/meta di `index.html`

### 3. Menyesuaikan tema warna

Ubah variabel/aturan warna di:

```text
css/styles.css
```

---

## 🧪 Checklist Sebelum Publish

- [ ] Data `data/doa.json` valid (tidak ada JSON error)
- [ ] Navigasi Beranda, Baca, Tasbih, Info berjalan normal
- [ ] Jadwal shalat muncul untuk lokasi default dan lokasi manual
- [ ] Service worker aktif dan konten inti bisa dibuka offline
- [ ] Tampilan mobile tetap rapi di layar kecil
- [ ] Tidak ada error penting di browser console

---

## 🧩 Troubleshooting

### Jadwal shalat tidak muncul

- cek koneksi internet;
- pastikan endpoint API bisa diakses;
- hapus cache browser/localStorage lalu reload.

### Data doa tidak tampil

- validasi format JSON di `data/doa.json`;
- cek path file tidak berubah;
- refresh keras browser (`Ctrl + F5`).

### Tombol install tidak muncul

- pastikan dibuka via `http://` atau `https://` (bukan `file://`);
- pastikan browser mendukung install PWA;
- interaksi user kadang dibutuhkan sebelum prompt install muncul.

---

## 🔐 Catatan Penggunaan

- Gunakan aplikasi ini untuk memudahkan ibadah, bukan menggantikan adab belajar dari guru.
- Jika memodifikasi konten doa, lakukan tabayyun sumber terlebih dahulu.
- Hindari memasukkan data pribadi sensitif ke dalam repository publik.

---

## 🛠️ Teknologi

| Teknologi | Fungsi |
|---|---|
| HTML | Struktur halaman |
| CSS | Tampilan visual |
| JavaScript | Interaksi aplikasi |
| Service Worker | Dukungan offline |
| Web App Manifest | Instalasi PWA |

---

## 📜 Lisensi

Repository ini menggunakan lisensi **GNU General Public License v3.0 (GPL-3.0)**.  
Lihat detail pada file [LICENSE](LICENSE).

---

<p align="center">
  <strong>Dibuat dengan niat ibadah, dirawat dengan amanah, dan dibagikan untuk kemaslahatan.</strong>
</p>
