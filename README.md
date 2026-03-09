<div align="center">
  <img src="assets/icon.png" alt="UniLife Tracker Logo" width="120" height="auto" style="border-radius: 20px; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);" />
  
  <h1>🎓 UniLife Tracker</h1>
  <p><b>Your completely local, all-in-one companion for a productive and organized university life! 🚀</b></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Made%20with-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
    <img src="https://img.shields.io/badge/Database-Local%20Storage-4CAF50?style=for-the-badge" alt="Local Storage" />
  </p>
</div>

---

**UniLife Tracker** adalah sebuah Progressive Web Application (PWA) yang dirancang secara elegan untuk membantu mahasiswa mengelola kehidupan akademiknya secara efisien. Dari mengatur jadwal, menghitung IPK, presensi, hingga tetap produktif dengan sesi fokus—UniLife punya semuanya!

Dibuat dengan ❤️ oleh **Farhan Baihaqi**.

---

## ✨ Fitur Utama (Key Features)

- **📊 Dashboard Interaktif:** Pantau keseluruhan progress akademikmu, tugas yang mendesak, jadwal hari ini, hingga statistik waktu fokus.
- **📅 Manajemen Jadwal (Schedule):** Atur jadwal kuliah, ruangan, dan dosen. Terintegrasi langsung dengan tugas dan catatan kuliah!
- **✅ Tracker Tugas (Tasks):** Jangan sampai telat ngumpulin tugas! Lacak tugas berdasarkan urgensi (deadline hari ini, besok, dll).
- **📈 Kalkulator Nilai & IPK (Grades & Targets):** Simpan nilai per semester, pantau performa menggunakan grafik cantik, dan atur target nilai (Grade Goals) untuk tiap matkul.
- **🙋‍♂️ Rekap Kehadiran (Attendance):** Pantau persentase kehadiranmu biar gak kurang dari syarat 75% (atau 16 kali pertemuan).
- **⏲️ Sesi Fokus (Focus Timer):** Timer ala Pomodoro untuk menemani kamu belajar. Cek durasi fokusmu dan pertahankan *streak* harian!
- **📝 Catatan Kuliah (Notes):** Simpan catatan materi per mata kuliah langsung di dalam satu aplikasi.
- **🌙 Mode Gelap/Terang (Dark & Light Theme):** Sesuaikan tampilan dengan seleramu atau ikuti preferensi sistem.
- **🌍 Bahasa (Bilingual):** Mendukung Bahasa Indonesia dan Bahasa Inggris.
- **💾 100% Privasi Aman (Local Storage):** Tidak butuh koneksi internet atau server backend! Semua data milikmu disimpan langsung di memori browser (Local Storage). Kamu juga bisa Backup (Export) dan Restore (Import) data ke format `.json`.
- **📱 PWA Ready (Bisa Diinstal):** Instal layaknya aplikasi native di HP Android/iOS maupun Desktop (PC/Laptop). Bisa diakses secara offline!

---

## 🎨 v1.0.0 Premium Polish Features (NEW!)

### ✨ Glassmorphism UI
- **Frosted Glass Effects:** Header dan navigation bar menggunakan backdrop-filter blur untuk tampilan modern dan premium
- **Translucent Backgrounds:** Background semi-transparan dengan blur effect untuk kedalaman visual
- **Premium Look:** Desain yang lebih sophisticated dan contemporary

### 🎬 Smooth Animations
- **GPU-Accelerated:** Semua animasi menggunakan transform dan opacity untuk performa 60fps
- **Ripple Effects:** Button interactions dengan wave effect yang elegan
- **Card Hover Animations:** Micro-interactions saat hover dengan lift effect dan subtle shine
- **Staggered List Animations:** Items muncul dengan delay untuk visual yang lebih menarik
- **Navigation Transitions:** Icon bounce dan active indicator dot animation

### 📱 Mobile-First Optimizations
- **Touch-Friendly:** Improved touch feedback dengan active states dan scale animations
- **Momentum Scrolling:** Smooth webkit-overflow-scrolling untuk iOS devices
- **Safe Area Support:** Proper padding untuk device dengan notch
- **Better Tap Targets:** Ukuran touch target yang optimal untuk mobile

### 🚀 Performance Optimizations
- **Smart Caching:** Network-first strategy untuk code updates, cache-first untuk static assets
- **Auto-Update Mechanism:** Service worker cek update setiap 30 detik dengan user notification
- **GPU Acceleration:** will-change properties dan backface-visibility untuk rendering yang smooth
- **Optimized Animations:** Pure CSS animations dengan cubic-bezier easing untuk performa terbaik

### 🎭 Loading States
- **Skeleton Screens:** Shimmer dan pulse loading animations untuk better perceived performance
- **Utility Animations:** Bounce, shake, slide, fade, scale, dan float animations
- **Toast Notifications:** Smooth slide-in notifications untuk feedback actions
- **Loading Spinners:** Elegant rotating indicators

> **📚 Documentation:** Lihat [ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) untuk tutorial lengkap animasi dan [CHANGELOG.md](CHANGELOG.md) untuk detail semua updates!

---

## 🛠️ Tech Stack

Aplikasi ini dibangun menggunakan teknologi web murni untuk menjamin performa yang cepat, ukuran yang ringan, dan kemudahan dalam pengembangan *(No heavy frameworks!)*

* **HTML5** – Struktur aplikasi
* **CSS3** – Fully custom styling (UI Premium, animasi halus, responsive)
* **Vanilla JavaScript ES6+** – Logic, State Management, DOM manipulation
* **Local Storage API** – Database client-side
* **Chart.js** – Visualisasi grafik data nilai & IP.
* **Phosphor Icons** – Ikon modern dan premium.

---

## 🚀 Cara Menjalankan (Getting Started)

Karena aplikasi ini sepenuhnya menggunakan client-side technology, menjalankannya sangatlah gampang.

### Penggunaan Cepat:

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/username-kamu/unilife-tracker.git
   ```
2. **Buka aplikasinya:**
   Cukup klik ganda atau buka file `index.html` di browser modern pilihanmu (Chrome/Edge/Safari/Firefox).
   *(Sangat disarankan membukanya lewat local web server seperti VSCode Live Server, terutama jika ingin menguji fitur Service Worker/PWA).*

### Cara Menginstal PWA:
Buka aplikasi di browser (seperti Chrome di Android atau Safari di iOS), lalu pilih opsi **"Add to Home Screen"** atau **"Install App"**. UniLife Tracker akan muncul di daftar aplikasimu dan bisa digunakan saat *offline*!



## 👨‍💻 Pembuat (Author)

**Farhan Baihaqi** 

* **GitHub:** [@farhanbaihaqi20](https://github.com/farhanbaihaqi20)
* Jika aplikasi ini bermanfaat untuk menunjang kehidupan kampusmu, jangan lupa berikan ⭐ star pada repository ini!

---

## 📝 Lisensi (License)

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  <i>"Satu aplikasi, dengan desain elegan untuk bantu kamu fokus pada hal yang paling penting."</i>
</p>
