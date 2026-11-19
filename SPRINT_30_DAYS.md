# DailyFlow — 30-Day Project Sprint Plan (Agile / Scrum)

Dokumen ini berisi rincian perencanaan sprint selama **30 hari** untuk pengembangan aplikasi full-stack **DailyFlow** (Productivity Application). Terbagi menjadi 4 Sprint mingguan dengan pembagian tugas, estimasi story point, label tim, subtask terperinci, serta status pengerjaan aktual per tanggal audit saat ini.

---

## 📊 Ringkasan Metrik Sprint

* **Durasi Total:** 30 Hari Kerja
* **Jumlah Sprint:** 4 Sprint (Rata-rata 7–8 hari per sprint)
* **Total Story Points:** 105 SP
* **Story Points Selesai (Burned):** 95 SP (~90.5%)
* **Story Points Sisa (Deployment Cloud & Live UAT):** 10 SP (~9.5%)
* **Status Akhir Kode:** 76/76 Automated Tests Passing, 0 ESLint Error/Warning, Production Build Lolos.

---

## 🗓️ Roadmap Sprint (Timeline Overview)

| Sprint | Periode | Fokus Utama | Target Deliverables | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | Hari 1 – 7 | Project Foundation, Database & Auth | Inisialisasi, Prisma Schema, Auth Service, Frontend Base | **100% Selesai** |
| **Sprint 2** | Hari 8 – 15 | Core Modules (Tasks, Notes, Habits) | CRUD APIs, Validasi Zod, Isolasi User, Streak Engine | **100% Selesai** |
| **Sprint 3** | Hari 16 – 22 | Reminders, Dashboard & Frontend Integration | Reminder API, Dashboard Metrics, Axios Client, 4 Halaman Utama | **100% Selesai** |
| **Sprint 4** | Hari 23 – 30 | Calendar, Settings, Quality Audit & Cloud Deploy | Calendar View, User Settings, 0 ESLint, Cloud Deploy (Vercel/Render) | **90% Selesai** (Siap Deploy) |

---

# 🚀 DETAIL TUGAS PER SPRINT

---

## SPRINT 1: Foundation, Database Architecture & Authentication (Hari 1 – 7)
**Goal:** Membangun fondasi arsitektur full-stack, skema database PostgreSQL (Neon), otentikasi JWT aman, serta baseline frontend React + Vite.

### [TASK-01] Analisis Kebutuhan & Dokumen PRD
* **Sprint:** Sprint 1
* **Story Points:** 3 SP
* **Label:** `[Architecture]` `[Documentation]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Melakukan audit menyeluruh terhadap arsitektur aplikasi dan menyusun Product Requirement Document (PRD) mencakup 8 fitur utama DailyFlow.
* **Subtask:**
  * [x] Melakukan audit file dan struktur direktori backend & frontend (`DAILYFLOW_PROJECT_AUDIT.md`).
  * [x] Menyusun spesifikasi fungsional, non-fungsional, dan use case (`prd.md`).
  * [x] Mendefinisikan entity-relationship diagram (ERD) dan aturan otorisasi multi-tenant.

---

### [TASK-02] Perancangan Database Schema & Prisma ORM
* **Sprint:** Sprint 1
* **Story Points:** 5 SP
* **Label:** `[Database]` `[Backend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Merancang model database PostgreSQL di Neon menggunakan Prisma ORM dengan relasi referensial dan onDelete cascade/setNull yang tepat.
* **Subtask:**
  * [x] Mengonfigurasi `prisma/schema.prisma` dengan provider PostgreSQL.
  * [x] Membuat model `User`, `Task`, `Note`, `Habit`, `HabitLog`, dan `Reminder`.
  * [x] Menambahkan index performa pada field `userId`, `status`, dan `remindAt`.
  * [x] Menjalankan initial migration (`20261105064541_init`).
  * [x] Membuat singleton connection client di `src/config/prisma.js`.

---

### [TASK-03] Authentication & Authorization API
* **Sprint:** Sprint 1
* **Story Points:** 5 SP
* **Label:** `[Backend]` `[Security]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun REST API untuk registrasi pengguna, login berbasis JWT token, proteksi password dengan bcryptjs, dan middleware otentikasi.
* **Subtask:**
  * [x] Validasi input Zod untuk email unik dan password min. 8 karakter (`auth.validator.js`).
  * [x] Implementasi `POST /api/auth/register` dengan hashing bcrypt (salt 12).
  * [x] Implementasi `POST /api/auth/login` dengan generasi JWT payload `userId`.
  * [x] Membuat middleware proteksi `auth.middleware.js` untuk mengekstrak Bearer token.
  * [x] Endpoint `GET /api/auth/me` untuk validasi sesi aktif.
  * [x] Pembuatan automated test `test_auth_api.js` (8 skenario dasar passing).

---

### [TASK-04] Setup Baseline Frontend & Design System
* **Sprint:** Sprint 1
* **Story Points:** 3 SP
* **Label:** `[Frontend]` `[UI/UX]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Menginisialisasi frontend React 19 + Vite, routing React Router DOM v7, CSS Design Tokens dengan Dark Slate theme.
* **Subtask:**
  * [x] Setup Vite config dengan alias path `@` dan dev proxy.
  * [x] Menyusun variabel warna dan tipografi di `src/index.css`.
  * [x] Membuat style kartu, tombol, badge, input, dan layout di `src/App.css`.
  * [x] Membuat struktur shell layout `AppLayout.jsx` dengan sidebar navigasi responsif.
  * [x] Halaman otentikasi dasar: `Login.jsx` dan `Register.jsx`.

---

## SPRINT 2: Core Productivity APIs (Hari 8 – 15)
**Goal:** Membangun modul utama produktivitas backend: Task Management, Notes Management, dan Habit Tracker Engine beserta streak analytics.

### [TASK-05] Task Management CRUD API & Filter Engine
* **Sprint:** Sprint 2
* **Story Points:** 5 SP
* **Label:** `[Backend]` `[Database]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun modul manajemen tugas lengkap dengan validasi enum status/prioritas, pencarian, dan filtering dinamis.
* **Subtask:**
  * [x] Skema validasi Zod: enum `TaskStatus` (`PENDING`, `IN_PROGRESS`, `COMPLETED`) dan `TaskPriority` (`LOW`, `MEDIUM`, `HIGH`).
  * [x] Controller `task.controller.js` (Create, GetAll, GetById, Update, Delete).
  * [x] Fitur filter query params: `?status=...`, `?priority=...`, dan `?search=...`.
  * [x] Isolasi data ketat: user tidak dapat membaca/mengedit/menghapus task milik user lain.
  * [x] Automated test `test_tasks_api.js` (12 skenario passing 100%).

---

### [TASK-06] Notes Management API
* **Sprint:** Sprint 2
* **Story Points:** 5 SP
* **Label:** `[Backend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun API untuk pencatatan dan dokumentasi ide dengan fitur kategorisasi dinamis dan pencarian full-text ringan.
* **Subtask:**
  * [x] Validasi Zod `note.validator.js`: judul wajib, konten opsional, kategori opsional.
  * [x] Endpoint CRUD lengkap di `note.controller.js` dan `note.routes.js`.
  * [x] Filter kategori dinamis dan pencarian kata kunci pada judul/konten.
  * [x] Keamanan multi-tenant (data isolation per `req.user.id`).
  * [x] Automated test `test_notes_api.js` (12 skenario passing 100%).

---

### [TASK-07] Habit Tracker Engine & Streak Algorithm
* **Sprint:** Sprint 2
* **Story Points:** 8 SP
* **Label:** `[Backend]` `[Algorithm]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun sistem kebiasaan harian dengan pencatatan log tanggal idempoten (upsert), kalkulasi streak harian berkelanjutan, dan rekor terbaik.
* **Subtask:**
  * [x] Validasi Zod `habit.validator.js`.
  * [x] Endpoint CRUD Habit di `habit.controller.js`.
  * [x] Endpoint Check-in `POST /api/habits/:id/check-ins` dengan constraint `@unique([habitId, date])`.
  * [x] Algoritma kalkulasi *current streak*, *best streak*, dan *completion rate* berbasis data log riil.
  * [x] Endpoint `GET /api/habits/statistics` untuk metrik produktivitas kebiasaan.
  * [x] Cascade delete: menghapus habit otomatis membersihkan relasi `HabitLog`.
  * [x] Automated test `test_habits_api.js` (17 skenario passing 100%).

---

## SPRINT 3: Reminders, Dashboard & Frontend Integration (Hari 16 – 22)
**Goal:** Membangun API pengingat dan dashboard agregasi, lalu mengintegrasikan seluruh API backend ke UI frontend React secara terpusat.

### [TASK-08] Reminder Scheduling API & Task Relation
* **Sprint:** Sprint 3
* **Story Points:** 5 SP
* **Label:** `[Backend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun API pengingat jadwal dengan dukungan waktu ISO-8601, status pengiriman (`isSent`), serta penautan opsional ke Task ID.
* **Subtask:**
  * [x] Validasi datetime Zod di `reminder.validator.js`.
  * [x] Validasi integritas: penautan `taskId` hanya diizinkan jika task milik user yang sama.
  * [x] Penanganan `onDelete: SetNull` saat Task terkait dihapus tanpa menghilangkan Reminder.
  * [x] Filter status `?isSent=false` untuk pengingat mendatang.
  * [x] Automated test `test_reminders_api.js` (16 skenario passing 100%).

---

### [TASK-09] Dashboard Aggregation API
* **Sprint:** Sprint 3
* **Story Points:** 5 SP
* **Label:** `[Backend]` `[Database]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Endpoint terpadu `GET /api/dashboard` yang melakukan query agregasi efisien untuk menampilkan ringkasan data produktivitas pengguna.
* **Subtask:**
  * [x] Query paralel `Promise.all` untuk menghitung task per status, habit streak, reminder terdekat, dan recent notes.
  * [x] Penanganan aman pengguna baru (mengembalikan nilai 0 dan array kosong tanpa error 500).
  * [x] Automated test `test_dashboard_api.js` (7 skenario passing 100%).

---

### [TASK-10] Centralized API Client & State Management
* **Sprint:** Sprint 3
* **Story Points:** 5 SP
* **Label:** `[Frontend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun HTTP client terpusat dengan Axios, pengelolaan token JWT, auto-logout 401 interceptor, dan Auth Context.
* **Subtask:**
  * [x] Pembuatan `src/services/api.js` dengan timeout 15 detik (antisipasi Neon cold start).
  * [x] Request Interceptor untuk menyisipkan header `Authorization: Bearer <token>`.
  * [x] Response Interceptor untuk auto-clear session saat status 401.
  * [x] Pemisahan `authContextDef.js`, `AuthContext.jsx`, dan hook `useAuth.js` sesuai aturan React Fast Refresh.
  * [x] Komponen rute `ProtectedRoute` dan `PublicRoute` di `App.jsx`.

---

### [TASK-11] Frontend UI Integration: Dashboard, Tasks, Notes, Habits & Reminders
* **Sprint:** Sprint 3
* **Story Points:** 8 SP
* **Label:** `[Frontend]` `[Full-Stack]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Mengintegrasikan halaman utama dengan backend, menyediakan status loading, empty state, dan modal interaktif.
* **Subtask:**
  * [x] `DashboardPage.jsx`: Chart status tugas via Recharts, list reminder terdekat, quick toggle task.
  * [x] `TasksPage.jsx`: Pencarian debounce 300ms, filter status & prioritas, modal CRUD, toggle checklist.
  * [x] `NotesPage.jsx`: Filter kategori dinamis, pencarian konten, grid kartu, modal editor catatan.
  * [x] `HabitsPage.jsx`: Tombol check-in hari ini, streak counter, strip statistik, drawer riwayat check-in.
  * [x] `RemindersPage.jsx`: Filter status terkirim, datetime picker lokal, dropdown penautan task.

---

## SPRINT 4: Calendar, Settings, Quality Audit & Cloud Deploy (Hari 23 – 30)
**Goal:** Membangun Calendar View, User Settings, audit kode menyeluruh (0 warning ESLint, clean build), persiapan konfigurasi Git, dan deployment ke cloud.

### [TASK-12] Interactive Calendar View Module
* **Sprint:** Sprint 4
* **Story Points:** 5 SP
* **Label:** `[Frontend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun halaman kalender bulanan interaktif menggunakan `date-fns` untuk memetakan tugas dan pengingat ke tanggal kalender.
* **Subtask:**
  * [x] Perhitungan grid bulanan (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `isSameMonth`).
  * [x] Navigasi bulan (Bulan Lalu, Bulan Depan, Tombol Hari Ini).
  * [x] Penanda micro-badge tugas dan pengingat pada tiap sel tanggal.
  * [x] Panel samping (Agenda Drawer) tanggal terpilih dengan quick-complete toggle.
  * [x] Pendaftaran menu Kalender di `AppLayout.jsx` dan rute `/calendar` di `App.jsx`.

---

### [TASK-13] User Settings & Account Management
* **Sprint:** Sprint 4
* **Story Points:** 5 SP
* **Label:** `[Full-Stack]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Membangun fitur pengelolaan akun, formulir ubah nama profil, formulir ganti password, dan ringkasan aktivitas akun.
* **Subtask:**
  * [x] Backend endpoint `PUT /api/auth/profile` dengan validasi Zod.
  * [x] Backend endpoint `PUT /api/auth/password` dengan validasi verifikasi password lama.
  * [x] Backend endpoint `GET /api/auth/stats` untuk agregasi data pengguna.
  * [x] Penambahan skenario test backend `test_auth_api.js` (total 12 skenario passing).
  * [x] Frontend `SettingsPage.jsx`: Form profil, form password, kartu statistik aktivitas, avatar inisial.
  * [x] Pendaftaran menu Pengaturan di `AppLayout.jsx` dan rute `/settings` di `App.jsx`.

---

### [TASK-14] Code Quality Audit, Refactor & Build Verification
* **Sprint:** Sprint 4
* **Story Points:** 5 SP
* **Label:** `[QA]` `[Frontend]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Melakukan perbaikan seluruh aturan linter React 19 Compiler rules dan memastikan build produksi terkompilasi bersih.
* **Subtask:**
  * [x] Membersihkan import default `React` tidak terpakai di seluruh file JSX.
  * [x] Menghilangkan error `react-hooks/set-state-in-effect` di Dashboard, Habits, dan Reminders.
  * [x] Memperbaiki dependency `useEffect` debounce di Tasks dan Notes.
  * [x] Menambahkan standar CSS property `line-clamp: 4` di `App.css`.
  * [x] Verifikasi eksekusi: `npm run lint` menghasilkan **0 error dan 0 warning**.
  * [x] Verifikasi eksekusi: `npm run build` menghasilkan bundle produksi sukses (**1.11s**).
  * [x] Verifikasi eksekusi master backend test suite: **76/76 tests PASS (100%)**.

---

### [TASK-15] Git Repository Configuration & Credential Protection
* **Sprint:** Sprint 4
* **Story Points:** 3 SP
* **Label:** `[DevOps]` `[Security]`
* **Status:** `[x] SELESAI`
* **Deskripsi:** Mengamankan repository Git agar file `.env` dan kredensial rahasia tidak bocor ke publik sebelum push ke remote.
* **Subtask:**
  * [x] Konfigurasi file `.gitignore` di level root, backend, dan frontend.
  * [x] Verifikasi `git check-ignore` membuktikan semua file `.env` terabaikan.
  * [x] Menyediakan file template aman `backend/.env.example` dan `frontend/.env.example`.
  * [x] Konfigurasi `frontend/vercel.json` untuk SPA rewrites mencegah error 404 pada deep link.
  * [x] Pemindahan dependensi `prisma` ke `dependencies` di `backend/package.json` untuk build cloud.

---

### [TASK-16] Cloud Deployment Execution (Neon, Render, Vercel)
* **Sprint:** Sprint 4
* **Story Points:** 5 SP
* **Label:** `[DevOps]`
* **Status:** `[ ] MENUNGGU EKSEKUSI USER`
* **Deskripsi:** Melakukan push kode ke GitHub dan menghubungkan layanan cloud produksi (Neon PostgreSQL, Render Backend, Vercel Frontend).
* **Subtask:**
  * [ ] Menghubungkan remote GitHub `https://github.com/farismualif4-cpu/dailyflow.git` dan menjalankan `git push -u origin main`.
  * [ ] Menjalankan migrasi database di Neon production (`npx prisma migrate deploy`).
  * [ ] Membuat Web Service di Render: Root `backend`, Build `npm install && npm run build`, Start `npm start`.
  * [ ] Memasukkan Environment Variables di Render (`DATABASE_URL` Pooled, `JWT_SECRET`, `NODE_ENV=production`).
  * [ ] Membuat Project di Vercel: Root `frontend`, Framework `Vite`, memasukkan `VITE_API_URL` mengarah ke URL Render.

---

### [TASK-17] Production Smoke Testing & Live UAT
* **Sprint:** Sprint 4
* **Story Points:** 3 SP
* **Label:** `[QA]`
* **Status:** `[ ] MENUNGGU EKSEKUSI USER`
* **Deskripsi:** Menguji seluruh alur fungsional pada URL live produksi Vercel setelah deployment selesai.
* **Subtask:**
  * [ ] Verifikasi endpoint live `GET /api/health` mengembalikan status 200.
  * [ ] Registrasi akun baru di URL Vercel dan verifikasi persistensi token login.
  * [ ] Uji coba pembuatan Task, Catatan, Habit, Reminder, dan pengecekan Kalender di cloud.
  * [ ] Uji coba pembaruan profil dan password di halaman Pengaturan produksi.
  * [ ] Validasi respon mobile di browser smartphone.

---

## 📈 Rekapitulasi Story Point & Progress

```text
+-----------------------+-------------+------------+--------------+
| Modul / Sprint        | Total SP    | SP Selesai | Persentase   |
+-----------------------+-------------+------------+--------------+
| Sprint 1 (Foundation) | 16 SP       | 16 SP      | 100% [DONE]  |
| Sprint 2 (Core APIs)  | 18 SP       | 18 SP      | 100% [DONE]  |
| Sprint 3 (Integration)| 23 SP       | 23 SP      | 100% [DONE]  |
| Sprint 4 (Deploy & QA)| 48 SP       | 38 SP      | 79.2% [PROG] |
+-----------------------+-------------+------------+--------------+
| TOTAL PROJEK          | 105 SP      | 95 SP      | 90.5%        |
+-----------------------+-------------+------------+--------------+
```

---

## 📌 Kesimpulan & Langkah Segera (Next Action)

Seluruh pekerjaan teknis pengembangan kode (fitur, bug fix, refactor, ESLint, automated tests, dan file konfigurasi) telah **selesai 100%**. 

Langkah yang tersisa hanyalah **[TASK-16]** dan **[TASK-17]**, yaitu:
1. Memperbarui URL remote repo Anda:
   ```bash
   git remote set-url origin https://github.com/farismualif4-cpu/dailyflow.git
   git push -u origin main
   ```
2. Mengaktifkan layanan di dashboard **Render** dan **Vercel** sesuai panduan konfigurasi yang telah disiapkan.

