# proyek-dailyflow

> **DailyFlow** — Aplikasi Manajemen Produktivitas Terintegrasi (Task, Notes, Habit, Reminder) bertenaga AI dengan integrasi OpenAI Responses API, Action Approval Engine, dan keamanan data multi-tenant.

---

## 🚀 Fitur Utama

- **Task Management**: Pengelolaan tugas lengkap dengan prioritas, filter status, tenggat waktu, dan pelacakan progres.
- **Notes Assistant**: Pencatatan cepat, kategorisasi tag, dan pengarsipan terstruktur.
- **Habit Tracker**: Pelacakan kebiasaan harian dengan streak counter dan statistik visual.
- **Reminder System**: Pengingat cerdas untuk tenggat waktu dan agenda penting.
- **AI DailyFlow Assistant**:
  - **AI Assistant Chat**: Percakapan kontekstual berbasis data produktivitas pengguna.
  - **AI Smart Task Planner**: Pemecahan sasaran kompleks ke dalam subtugas terperinci dan optimasi jadwal kerja.
  - **Action Approval Engine**: AI hanya dapat mengusulkan tindakan (*proposals*). Database hanya berubah setelah mendapatkan persetujuan eksplisit pengguna.
  - **Anti-Hijack & Multi-Tenant Security**: Isolasi ketat data antar-pengguna (`req.user.id`).
  - **Atomic Transactions & Rate Limiting**: Batas kuota harian dan eksekusi transaksi atomik via Prisma transaction.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS & Modern UI Components
- **Icons**: Lucide React
- **Markdown Rendering**: React Markdown + GitHub-Flavored Markdown
- **HTTP Client**: Axios dengan interceptor JWT

### **Backend**
- **Runtime**: Node.js & Express 5
- **Database & ORM**: PostgreSQL (Neon Cloud) + Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **Validation**: Zod schema validation
- **AI Integration**: OpenAI SDK (Responses API Structured Outputs)

---

## 📦 Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repositori
```bash
git clone https://github.com/farismualif4-cpu/proyek-dailyflow.git
cd proyek-dailyflow
```

### 2. Setup Backend
```bash
cd backend
npm install

# Buat file .env berdasarkan konfigurasi:
# DATABASE_URL="postgresql://..."
# JWT_SECRET="your-jwt-secret"
# OPENAI_API_KEY="sk-..."
# OPENAI_MODEL="gpt-4o-mini"
# AI_DAILY_LIMIT=30

npx prisma db push
npm run dev
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

### 4. Menjalankan Automated Test Backend
```bash
cd ../backend
node run_all_tests.js
```
*(Seluruh 8 modul pengujian integrasi lulus 100%)*

---

## 📄 Lisensi
Proyek ini dikembangkan untuk kebutuhan manajemen produktivitas harian DailyFlow.
