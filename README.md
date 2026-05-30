# PPSA - Majmu'ah ad-Du'a Sunan Ampel

Aplikasi static PWA untuk digitalisasi **Majmu'ah ad-Du'a Pondok Pesantren Sunan Ampel**.

## Fitur

- Splash screen dengan judul Arab.
- Beranda dengan jadwal shalat berikutnya.
- Jadwal shalat memakai **EQuran.id API** dengan sumber data **Bimas Islam Kementerian Agama RI**.
- Default wilayah: **Kab. Jombang, Jawa Timur**.
- Pengaturan wilayah manual berdasarkan provinsi dan kabupaten/kota.
- Tombol GPS untuk membantu mencocokkan wilayah pengguna ke daftar kabupaten/kota.
- Mode baca: **Arab saja** atau **Arab + Arti**.
- Pengaturan ukuran font Arab 16–32 px.
- Tasbih digital dengan target dan haptic feedback.
- Offline-first untuk teks doa, wirid, dan tasbih.
- Cache jadwal shalat bulan berjalan di `localStorage`.

## Struktur File

```text
.
├── index.html
├── css/styles.css
├── js/app.js
├── data/doa.json
├── assets/logo.png
├── manifest.webmanifest
└── sw.js
```

## Cara Menjalankan Lokal

Jangan buka langsung `index.html` melalui `file://`, karena browser dapat memblokir `fetch('./data/doa.json')` dan API.

Jalankan server lokal:

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

## Deploy

Bisa langsung diunggah ke:

- GitHub Pages
- Vercel
- Cloudflare Pages / pages.dev

Pastikan seluruh isi folder ini berada di root repository `cakgup/ppsa`.

## Catatan Jadwal Shalat

- Teks doa tetap dapat dibaca offline.
- Jadwal shalat membutuhkan internet saat pertama kali mengambil data wilayah/bulan berjalan.
- Setelah jadwal berhasil diambil, data bulan berjalan tersimpan di browser pengguna.
- Fitur GPS hanya membantu mendeteksi wilayah dan tetap membutuhkan izin lokasi dari pengguna.


## Catatan Normalisasi Teks Arab v5

- `data/doa.json` sekarang memiliki field tambahan `arabic_display`.
- Field `arabic` tetap dipertahankan sebagai teks canonical PPSA.
- Aplikasi menampilkan `arabic_display` agar tampilan Arab lebih halus, dengan separator koma Arab `،` seperti gaya file runtime TTS.
- Jika `arabic_display` tidak tersedia, aplikasi otomatis fallback ke `arabic`.


## Revisi v7
- Header Arab disesuaikan agar subjudul tidak terpotong.
- Alignment judul Arab daftar doa dibuat konsisten.
- Judul Wirid Setelah Shalat Fardu diringkas.
- Kartu Operasional Offline dihapus.
- Footer kredit kecil ditambahkan pada halaman Info.
- Cache service worker: ppsa-cache-v7.
