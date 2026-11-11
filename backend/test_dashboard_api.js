const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const prisma = require("./src/config/prisma");

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000/api";
const { URL } = require("url");
const parsedBase = new URL(BASE_URL);

// Helper HTTP request
const makeRequest = (method, endpoint, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;

        const options = {
            hostname: parsedBase.hostname,
            port: parsedBase.port,
            path: `${parsedBase.pathname}${endpoint}`,
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json",
            },
        };

        if (token) {
            options.headers["Authorization"] = `Bearer ${token}`;
        }
        if (payload) {
            options.headers["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                let json;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    json = data;
                }
                resolve({ status: res.statusCode, body: json });
            });
        });

        req.on("error", (err) => reject(err));
        if (payload) req.write(payload);
        req.end();
    });
};

const withRetry = async (fn, maxRetries = 3, delayMs = 3000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.log(`[Neon Warning] Percobaan ${attempt} gagal, mencoba kembali dalam ${delayMs}ms...`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    throw lastError;
};

async function runTests() {
    console.log("==================================================");
    console.log("   AUTOMATED TESTING - DASHBOARD API             ");
    console.log("==================================================");

    let userA, userB, tokenA, tokenB;
    let totalPass = 0;
    let totalFail = 0;

    const assert = (condition, testName, details = "") => {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            totalPass++;
        } else {
            console.error(`❌ [FAIL] ${testName} | ${details}`);
            totalFail++;
        }
    };

    try {
        console.log("\n--- Menyiapkan Akun Pengujian ---");
        const timestamp = Date.now();
        const emailA = `test_dash_a_${timestamp}@dailyflow.com`;
        const emailB = `test_dash_b_${timestamp}@dailyflow.com`;
        const password = "password123";

        // Register User A
        const regA = await withRetry(async () => {
            const res = await makeRequest("POST", "/auth/register", {
                name: "User A (Dashboard Tester)",
                email: emailA,
                password,
            });
            if (res.status >= 500) {
                throw new Error(`Register User A failed with status ${res.status}`);
            }
            return res;
        });
        tokenA = regA.body.token;
        userA = regA.body.user;

        // Register User B
        const regB = await withRetry(async () => {
            const res = await makeRequest("POST", "/auth/register", {
                name: "User B (Dashboard Tester)",
                email: emailB,
                password,
            });
            if (res.status >= 500) {
                throw new Error(`Register User B failed with status ${res.status}`);
            }
            return res;
        });
        tokenB = regB.body.token;
        userB = regB.body.user;

        console.log(`User A (ID: ${userA.id}), User B (ID: ${userB.id})`);

        console.log("\n--- Menjalankan Skenario Pengujian ---");

        // 1. Request tanpa token -> 401
        const test1 = await makeRequest("GET", "/dashboard");
        assert(
            test1.status === 401 && test1.body.success === false,
            "1. Request tanpa token mengembalikan 401 Unauthorized"
        );

        // 2. User baru (data kosong) -> 200 dengan nilai nol bersih
        const test2 = await makeRequest("GET", "/dashboard", null, tokenA);
        assert(
            test2.status === 200 &&
                test2.body.success === true &&
                test2.body.data.tasks.total === 0 &&
                test2.body.data.tasks.pending === 0 &&
                test2.body.data.tasks.inProgress === 0 &&
                test2.body.data.tasks.completed === 0 &&
                test2.body.data.tasks.completionRate === 0 &&
                test2.body.data.habits.total === 0 &&
                test2.body.data.habits.todayCheckIns === 0 &&
                test2.body.data.habits.completionRate === 0 &&
                test2.body.data.upcomingReminders.length === 0 &&
                test2.body.data.recentTasks.length === 0 &&
                test2.body.data.recentNotes.length === 0,
            "2. Pengguna baru (tanpa data) menerima struktur respon bersih dengan nilai 0 dan array kosong"
        );

        // Menyiapkan data untuk User A
        console.log("\n--- Menyiapkan Data Produktivitas User A ---");
        // 3 Tasks: 1 PENDING, 1 IN_PROGRESS, 1 COMPLETED
        await makeRequest("POST", "/tasks", { title: "Tugas 1", status: "PENDING", priority: "HIGH" }, tokenA);
        await makeRequest("POST", "/tasks", { title: "Tugas 2", status: "IN_PROGRESS", priority: "MEDIUM" }, tokenA);
        await makeRequest("POST", "/tasks", { title: "Tugas 3", status: "COMPLETED", priority: "LOW" }, tokenA);

        // 1 Habit dengan check-in hari ini
        const habitRes = await makeRequest("POST", "/habits", { name: "Olahraga Pagi" }, tokenA);
        const habitId = habitRes.body.data.id;
        await makeRequest("POST", `/habits/${habitId}/check-ins`, { completed: true }, tokenA);

        // 1 Upcoming Reminder
        const futureDate = new Date(Date.now() + 3600 * 1000 * 24).toISOString();
        await makeRequest("POST", "/reminders", { title: "Meeting Project", remindAt: futureDate }, tokenA);

        // 1 Note
        await makeRequest("POST", "/notes", { title: "Catatan Ide Fitur", content: "Implementasi Dashboard", category: "Dev" }, tokenA);

        // 3. Verifikasi Data Dashboard User A
        console.log("\n--- Memverifikasi Respon Dashboard User A ---");
        const test3 = await makeRequest("GET", "/dashboard", null, tokenA);
        const dataA = test3.body.data;

        assert(
            test3.status === 200 &&
                dataA.tasks.total === 3 &&
                dataA.tasks.pending === 1 &&
                dataA.tasks.inProgress === 1 &&
                dataA.tasks.completed === 1 &&
                dataA.tasks.completionRate === 33,
            "3. Metrik tugas User A akurat (Total: 3, Pending: 1, InProgress: 1, Completed: 1, Rate: 33%)",
            `Diterima: Total=${dataA?.tasks?.total}, Rate=${dataA?.tasks?.completionRate}%`
        );

        assert(
            dataA.habits.total === 1 &&
                dataA.habits.todayCheckIns === 1 &&
                dataA.habits.completionRate === 100 &&
                dataA.habits.currentStreak === 1,
            "4. Metrik kebiasaan User A akurat (Total: 1, Check-in Hari Ini: 1, Rate: 100%, Streak: 1)",
            `Diterima: Habits=${dataA?.habits?.total}, TodayCheckIns=${dataA?.habits?.todayCheckIns}`
        );

        assert(
            Array.isArray(dataA.upcomingReminders) &&
                dataA.upcomingReminders.length === 1 &&
                dataA.upcomingReminders[0].title === "Meeting Project",
            "5. Daftar upcomingReminders memuat pengingat mendatang dengan benar"
        );

        assert(
            Array.isArray(dataA.recentTasks) &&
                dataA.recentTasks.length === 3 &&
                Array.isArray(dataA.recentNotes) &&
                dataA.recentNotes.length === 1,
            "6. Data recentTasks (3 item) dan recentNotes (1 item) dimuat dengan benar"
        );

        // 4. Verifikasi Isolasi Data User B
        console.log("\n--- Memverifikasi Isolasi Data User B ---");
        const test4 = await makeRequest("GET", "/dashboard", null, tokenB);
        const dataB = test4.body.data;

        assert(
            test4.status === 200 &&
                dataB.tasks.total === 0 &&
                dataB.habits.total === 0 &&
                dataB.upcomingReminders.length === 0 &&
                dataB.recentTasks.length === 0 &&
                dataB.recentNotes.length === 0,
            "7. Keamanan Multi-Tenant: Dashboard User B sepenuhnya terisolasi (0 data dari User A)"
        );

        // PEMBERSIHAN DATA PENGUJIAN
        console.log("\n--- Membersihkan Data Pengujian ---");
        if (userA?.id && userB?.id) {
            try {
                await prisma.habitLog.deleteMany({ where: { habit: { userId: { in: [userA.id, userB.id] } } } });
                await prisma.habit.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
                await prisma.reminder.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
                await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
                await prisma.note.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
                await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
                console.log("Data pengujian User A dan User B berhasil dibersihkan dari database.");
            } catch (cleanupErr) {
                console.warn("[Info] Pembersihan data dilewati:", cleanupErr.message);
            }
        }

        console.log("\n==================================================");
        console.log(`HASIL AKHIR PENGUJIAN: ${totalPass} PASS, ${totalFail} FAIL`);
        console.log("==================================================");

        if (totalFail > 0) {
            process.exitCode = 1;
        }
    } catch (err) {
        console.error("Critical Test Error:", err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

runTests();

