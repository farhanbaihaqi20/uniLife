# Panduan Update Versi Website

## 🚀 Cara Deploy Update Baru

Setiap kali ada update code (fix bug, fitur baru, dll), ikuti langkah ini:

### 1. Update Nomor Versi

Ubah nomor versi di **3 tempat** (gunakan format semantic: `MAJOR.MINOR.PATCH`):

#### A. File `sw.js` (Baris 2):
```javascript
const CACHE_VERSION = '1.0.2'; // ← Update nomor ini
```

#### B. File `index.html` (Baris ~15):
```html
<link rel="stylesheet" href="css/styles.css?v=1.0.2">
```

#### C. File `index.html` (Baris ~1060-1075):
```html
<script src="js/storage.js?v=1.0.2"></script>
<script src="js/i18n.js?v=1.0.2"></script>
<!-- ...dan seterusnya untuk semua script -->
```

### 2. Upload ke Server

Upload semua file yang berubah ke hosting Anda.

### 3. Test

1. Buka website di browser
2. Lihat console (F12) - harus ada log `[SW] Installing new service worker...`
3. Setelah ~30 detik, akan muncul popup "Update tersedia! Reload untuk lihat versi terbaru?"
4. Klik OK untuk lihat perubahan

---

## 📋 Sistem Caching Saat Ini

### Cache Strategy:
- **Static Assets** (icon, fonts, libraries) → Cache First (agresif)
  - Gambar, fonts Google, Phosphor Icons, Chart.js
  - Jarang berubah, jadi cache maksimal untuk performa
  
- **Dynamic Assets** (HTML, JS, CSS) → Network First  
  - Selalu cek server dulu untuk versi terbaru
  - Fallback ke cache kalau offline
  - Auto-update cache saat online

### Auto-Update Mechanism:
- Service worker cek update setiap **30 detik**
- User dapat notifikasi otomatis saat ada update
- Reload sekali langsung dapat versi terbaru

---

## ✅ Best Practices

1. **Selalu update versi** sebelum deploy (jangan lupa!)
2. Gunakan **semantic versioning**:
   - `1.0.0` → `1.0.1` = bug fix kecil
   - `1.0.0` → `1.1.0` = fitur baru
   - `1.0.0` → `2.0.0` = perubahan besar
3. Test di **incognito mode** setelah deploy
4. Untuk emergency: Bisa naikkan versi MAJOR (misal `2.0.0`) untuk force clear semua cache

---

## 🔧 Troubleshooting

**Problem:** User masih lihat versi lama
- **Solusi:** Pastikan nomor versi di `sw.js` sudah diubah dan file sudah terupload

**Problem:** Error di console setelah update
- **Solusi:** Cek semua script `?v=X.X.X` menggunakan nomor versi yang sama

**Problem:** Update terlalu lambat
- **Solusi:** Normal! Service worker akan update dalam 30 detik. Bisa paksa dengan hard refresh (Ctrl+Shift+R)
