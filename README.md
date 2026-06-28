# 📈 LUBRIX AI — Trading Assistant
**by ridwan** | Powered by Claude AI + Firebase + Vercel

---

## 🚀 CARA DEPLOY KE VERCEL

### LANGKAH 1 — Setup Firebase Firestore

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. **Create Project** → beri nama (misal: `lubrix-ai`)
3. Masuk ke menu **Firestore Database** → **Create database** → pilih **Production mode**
4. Pilih region (rekomendasi: `asia-southeast1`)
5. Masuk ke **Project Settings** → tab **Service Accounts**
6. Klik **Generate new private key** → download file JSON
7. Dari file JSON tersebut, ambil nilai:
   - `project_id` → untuk `FIREBASE_PROJECT_ID`
   - `client_email` → untuk `FIREBASE_CLIENT_EMAIL`
   - `private_key` → untuk `FIREBASE_PRIVATE_KEY`

**Buat admin user pertama di Firestore:**
- Buka Firestore → **Start collection** → ID: `users`
- Tambah document dengan ID: `admin`
- Fields:
  ```
  username: "admin"          (string)
  email: "admin@lubrix.ai"  (string)
  password: ""               (string) ← kosongkan dulu, lihat step 5
  role: "admin"              (string)
  plan: "free"               (string)
  dailyLimit: 9999           (number)
  usedToday: 0               (number)
  status: "active"           (string)
  lastResetDate: ""          (string)
  joinedAt: ""               (string)
  ```
- Buat collection `settings` → document ID: `global` → kosong dulu

**Buat collection `settings`:**
- Collection: `settings`
- Document ID: `global`
- Biarkan kosong (akan diisi otomatis dari admin panel)

---

### LANGKAH 2 — Deploy ke Vercel

1. Push folder ini ke GitHub (buat repo baru)
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → Import dari GitHub
3. Di **Environment Variables**, tambahkan semua variabel dari `.env.example`:

   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | sk-ant-... (dari console.anthropic.com) |
   | `FIREBASE_PROJECT_ID` | your-project-id |
   | `FIREBASE_CLIENT_EMAIL` | firebase-adminsdk-xxx@... |
   | `FIREBASE_PRIVATE_KEY` | -----BEGIN PRIVATE KEY-----\n...  |
   | `JWT_SECRET` | string random panjang |
   | `SALT` | string random lain |

   > ⚠️ Untuk `FIREBASE_PRIVATE_KEY`: paste as-is termasuk `\n` di dalamnya

4. Klik **Deploy**

---

### LANGKAH 3 — Setup Password Admin

Setelah deploy, password admin di Firestore masih kosong. Ada dua cara set password:

**Cara A — Via API (rekomendasi):**
Buka browser / Postman, kirim POST ke:
```
https://your-vercel-url.vercel.app/api/auth/register
Body: { "username": "admin2", "email": "x@x.com", "password": "passwordbaru" }
```
Lalu di Firestore, ubah `role` user tersebut ke `admin`.

**Cara B — Hash manual:**
Buat script Node.js kecil untuk generate hash, lalu paste ke Firestore field `password`.

---

## 📁 STRUKTUR PROJECT

```
lubrix-ai/
├── public/
│   └── index.html          ← Frontend (SPA)
├── api/
│   ├── _firebase.js        ← Firebase admin init
│   ├── _helpers.js         ← Auth helpers (hash, token)
│   ├── auth/
│   │   ├── login.js        ← POST /api/auth/login
│   │   └── register.js     ← POST /api/auth/register
│   ├── chat/
│   │   └── index.js        ← POST /api/chat
│   └── admin/
│       ├── users.js        ← GET/PUT/DELETE /api/admin/users
│       ├── settings.js     ← GET/POST /api/admin/settings
│       └── stats.js        ← GET /api/admin/stats
├── .env.example
├── package.json
├── vercel.json
└── README.md
```

---

## ✨ FITUR LENGKAP

### User
- ✅ Registrasi & Login dengan session token
- ✅ Chat AI fokus trading (saham, forex, crypto, dll)
- ✅ **Upload screenshot chart** → AI analisis gambar
- ✅ **LUBRIX LOW** — mode cepat (Haiku)
- ✅ **LUBRIX SUPER THINKING** — mode thinking mendalam (Sonnet + extended thinking)
- ✅ Limit pesan harian (min 5), **reset otomatis tiap hari**
- ✅ Quick prompt untuk pertanyaan umum
- ✅ Notifikasi ketika limit habis + tombol upgrade

### Admin Panel
- ✅ **Tabel user lengkap** — lihat semua user, plan, limit, usage
- ✅ **Edit user** — ubah role, plan, limit, status (aktif/blokir)
- ✅ **Hapus user**
- ✅ **Ubah background** — warna (8 preset + color picker) atau upload gambar
- ✅ **Ganti nama AI** — tampil di semua halaman
- ✅ **Ganti nama author**
- ✅ **Pengaturan harga** — harga Low & Super per bulan, deskripsi, info pembayaran
- ✅ **Default limit** user baru (min 5)
- ✅ **System prompt** AI (editable)
- ✅ **Ganti password** admin
- ✅ Password **tidak pernah tampil** di tabel (disimpan hashed SHA-256)

### Keamanan
- ✅ Password di-hash dengan SHA-256 + salt
- ✅ Token JWT custom per session
- ✅ Semua endpoint admin diproteksi
- ✅ Model super hanya bisa diakses plan super/admin

---

## 🔧 DEVELOPMENT LOKAL

```bash
npm install -g vercel
cp .env.example .env.local
# isi .env.local dengan nilai asli
vercel dev
```

Buka `http://localhost:3000`

---

## 💰 CATATAN PENGEMBANGAN LANJUT

Untuk fitur **payment gateway** (pembelian plan):
- Integrasikan Midtrans / Xendit / Doku
- Buat endpoint `/api/payment/create` dan `/api/payment/webhook`
- Setelah pembayaran sukses, update field `plan` user di Firestore

---

*LUBRIX AI by ridwan — All rights reserved*
