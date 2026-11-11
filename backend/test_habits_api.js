const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const prisma = require("./src/config/prisma");

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000/api";
const { URL } = require("url");
const parsedBase = new URL(BASE_URL);

// Helper fungsi HTTP request
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

// Retry helper untuk menangani Neon serverless cold start
const withRetry = async (fn, maxRetries = 3, delayMs = 3000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.log(`[Neon Cold Start Warning] Upaya ${attempt} gagal, mencoba ulang dalam ${delayMs}ms...`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    throw lastError;
};

async function runTests() {
    console.log("==================================================");
    console.log("   AUTOMATED TESTING - HABIT TRACKER API        ");
    console.log("==================================================");

    let userA, userB, tokenA, tokenB;
    let habitAId;
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
        // SETUP: Inisialisasi Akun User A dan User B
        console.log("\n--- Menyiapkan Akun Pengujian di Database ---");
        const timestamp = Date.now();
        const emailA = `test_habit_a_${timestamp}@dailyflow.com`;
        const emailB = `test_habit_b_${timestamp}@dailyflow.com`;
        const password = "password123";

        // Register User A
        const regA = await withRetry(async () => {
            const res = await makeRequest("POST", "/auth/register", {
                name: "User A (Habit Tester)",
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
                name: "User B (Habit Tester)",
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

        console.log(`User A terdaftar: ${userA.email} (ID: ${userA.id})`);
        console.log(`User B terdaftar: ${userB.email} (ID: ${userB.id})`);

        // PENGUJIAN 1: Request tanpa token -> 401
        console.log("\n--- Menjalankan Skenario Pengujian ---");
        const test1 = await makeRequest("GET", "/habits");
        assert(
            test1.status === 401 && test1.body.success === false,
            "1. Request tanpa token mengembalikan 401 Unauthorized",
            `Diterima: ${test1.status}`
        );

        // PENGUJIAN 2: User A membuat habit -> 201
        const test2 = await makeRequest(
            "POST",
            "/habits",
            {
                name: "Membaca Buku 30 Menit",
                description: "Membaca buku non-fiksi setiap pagi",
            },
            tokenA
        );
        habitAId = test2.body.data?.id;
        assert(
            test2.status === 201 && test2.body.success === true && habitAId,
            "2. User A membuat habit baru mengembalikan 201 Created",
            `Diterima: ${test2.status}, ID: ${habitAId}`
        );

        // PENGUJIAN 2B: Validasi input Zod (Nama kosong -> 400)
        const test2b = await makeRequest(
            "POST",
            "/habits",
            {
                name: "",
            },
            tokenA
        );
        assert(
            test2b.status === 400 && test2b.body.success === false,
            "2B. Validasi Zod: Nama habit kosong ditolak dengan 400 Bad Request",
            `Diterima: ${test2b.status}`
        );

        // PENGUJIAN 3: User A mengambil semua habit -> 200
        const test3 = await makeRequest("GET", "/habits", null, tokenA);
        assert(
            test3.status === 200 &&
                test3.body.success === true &&
                Array.isArray(test3.body.data) &&
                test3.body.data.length === 1,
            "3. User A mengambil semua habit mengembalikan 200 OK dengan 1 item",
            `Diterima: ${test3.status}, Length: ${test3.body.data?.length}`
        );

        // PENGUJIAN 4: User B mengambil habit milik sendiri -> tidak melihat data A (0 item)
        const test4 = await makeRequest("GET", "/habits", null, tokenB);
        assert(
            test4.status === 200 &&
                test4.body.success === true &&
                Array.isArray(test4.body.data) &&
                test4.body.data.length === 0,
            "4. User B mengambil habit milik sendiri tidak melihat data A (Isolasi data)",
            `Diterima: ${test4.status}, Length: ${test4.body.data?.length}`
        );

        // PENGUJIAN 5: User A melihat detail habit -> 200
        const test5 = await makeRequest("GET", `/habits/${habitAId}`, null, tokenA);
        assert(
            test5.status === 200 &&
                test5.body.success === true &&
                test5.body.data.id === habitAId &&
                test5.body.data.name === "Membaca Buku 30 Menit",
            "5. User A melihat detail habit miliknya mengembalikan 200 OK",
            `Diterima: ${test5.status}`
        );

        // PENGUJIAN 6: User B membaca habit A -> 404
        const test6 = await makeRequest("GET", `/habits/${habitAId}`, null, tokenB);
        assert(
            test6.status === 404 && test6.body.success === false,
            "6. User B mencoba membaca habit User A mengembalikan 404 Not Found",
            `Diterima: ${test6.status}`
        );

        // PENGUJIAN 7: User A memperbarui habit -> 200
        const test7 = await makeRequest(
            "PATCH",
            `/habits/${habitAId}`,
            {
                name: "Membaca Buku 45 Menit",
                description: "Target durasi ditingkatkan menjadi 45 menit",
            },
            tokenA
        );
        assert(
            test7.status === 200 &&
                test7.body.success === true &&
                test7.body.data.name === "Membaca Buku 45 Menit",
            "7. User A memperbarui habit miliknya mengembalikan 200 OK",
            `Diterima: ${test7.status}, Nama Baru: ${test7.body.data?.name}`
        );

        // PENGUJIAN 8: User B memperbarui habit A -> 404
        const test8 = await makeRequest(
            "PATCH",
            `/habits/${habitAId}`,
            {
                name: "Dibajak oleh User B",
            },
            tokenB
        );
        assert(
            test8.status === 404 && test8.body.success === false,
            "8. User B mencoba memperbarui habit User A mengembalikan 404 Not Found",
            `Diterima: ${test8.status}`
        );

        // PENGUJIAN 9: User B menghapus habit A -> 404
        const test9 = await makeRequest("DELETE", `/habits/${habitAId}`, null, tokenB);
        assert(
            test9.status === 404 && test9.body.success === false,
            "9. User B mencoba menghapus habit User A mengembalikan 404 Not Found",
            `Diterima: ${test9.status}`
        );

        // PENGUJIAN 10: User A melakukan check-in -> berhasil (200)
        const todayStr = new Date().toISOString().split("T")[0];
        const test10 = await makeRequest(
            "POST",
            `/habits/${habitAId}/check-ins`,
            {
                date: todayStr,
                completed: true,
            },
            tokenA
        );
        assert(
            test10.status === 200 &&
                test10.body.success === true &&
                test10.body.data.completed === true,
            "10. User A melakukan check-in hari ini mengembalikan 200 OK",
            `Diterima: ${test10.status}`
        );

        // PENGUJIAN 11: Check-in duplikat pada tanggal yang sama -> ditangani idempoten
        const test11 = await makeRequest(
            "POST",
            `/habits/${habitAId}/check-ins`,
            {
                date: todayStr,
                completed: true,
            },
            tokenA
        );
        assert(
            test11.status === 200 &&
                test11.body.success === true &&
                test11.body.data.id === test10.body.data.id,
            "11. Check-in duplikat pada tanggal sama ditangani secara idempoten (Upsert)",
            `Diterima: ${test11.status}, ID Log: ${test11.body.data?.id}`
        );

        // PENGUJIAN 12: User A melihat riwayat check-in -> berhasil (200)
        const test12 = await makeRequest("GET", `/habits/${habitAId}/history`, null, tokenA);
        assert(
            test12.status === 200 &&
                test12.body.success === true &&
                Array.isArray(test12.body.data) &&
                test12.body.data.length === 1,
            "12. User A melihat riwayat check-in mengembalikan 200 OK dengan daftar log",
            `Diterima: ${test12.status}, Log Count: ${test12.body.data?.length}`
        );

        // PENGUJIAN 13: User B mengakses riwayat habit A -> 404
        const test13 = await makeRequest("GET", `/habits/${habitAId}/history`, null, tokenB);
        assert(
            test13.status === 404 && test13.body.success === false,
            "13. User B mengakses riwayat habit User A mengembalikan 404 Not Found",
            `Diterima: ${test13.status}`
        );

        // PENGUJIAN 14: User A melihat statistik kebiasaan -> berhasil (200)
        const test14 = await makeRequest("GET", "/habits/statistics", null, tokenA);
        assert(
            test14.status === 200 &&
                test14.body.success === true &&
                test14.body.data.totalHabits === 1 &&
                test14.body.data.totalCheckIns === 1 &&
                test14.body.data.todayCheckIns === 1 &&
                test14.body.data.currentStreak === 1 &&
                test14.body.data.bestStreak === 1,
            "14. User A melihat statistik kebiasaan terpadu mengembalikan 200 OK dengan metrik akurat",
            `Diterima: Total Habits=${test14.body.data?.totalHabits}, Streak=${test14.body.data?.currentStreak}`
        );

        // PENGUJIAN 15: User A menghapus habit -> berhasil (200)
        const test15 = await makeRequest("DELETE", `/habits/${habitAId}`, null, tokenA);
        assert(
            test15.status === 200 && test15.body.success === true,
            "15. User A menghapus habit mengembalikan 200 OK",
            `Diterima: ${test15.status}`
        );

        // PENGUJIAN 16: Verifikasi data benar-benar terhapus (Cascade)
        const test16 = await makeRequest("GET", `/habits/${habitAId}`, null, tokenA);
        const orphanLogs = await prisma.habitLog.findMany({
            where: { habitId: habitAId },
        });
        assert(
            test16.status === 404 && orphanLogs.length === 0,
            "16. Verifikasi integritas: Habit terhapus (404) & seluruh HabitLog ter-cascade (0 logs)",
            `Status: ${test16.status}, Orphan Logs: ${orphanLogs.length}`
        );

        // PEMBERSIHAN DATA PENGUJIAN
        console.log("\n--- Membersihkan Data Pengujian ---");
        if (userA?.id && userB?.id) {
            try {
                await prisma.habitLog.deleteMany({ where: { habit: { userId: { in: [userA.id, userB.id] } } } });
                await prisma.habit.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
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
        console.error("Critical Test Execution Error:", err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

runTests();

