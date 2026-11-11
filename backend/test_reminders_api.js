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
    console.log("   AUTOMATED TESTING - REMINDER API              ");
    console.log("==================================================");

    let userA, userB, tokenA, tokenB;
    let reminder1Id, reminder2Id, taskAId, taskBId;
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
        const emailA = `test_rem_a_${timestamp}@dailyflow.com`;
        const emailB = `test_rem_b_${timestamp}@dailyflow.com`;
        const password = "password123";

        // Register User A
        const regA = await withRetry(async () => {
            return await makeRequest("POST", "/auth/register", {
                name: "User A (Reminder Tester)",
                email: emailA,
                password,
            });
        });
        tokenA = regA.body.token;
        userA = regA.body.user;

        // Register User B
        const regB = await withRetry(async () => {
            return await makeRequest("POST", "/auth/register", {
                name: "User B (Reminder Tester)",
                email: emailB,
                password,
            });
        });
        tokenB = regB.body.token;
        userB = regB.body.user;

        // User A membuat task untuk pengetesan relasi taskId
        const taskARes = await makeRequest(
            "POST",
            "/tasks",
            {
                title: "Tugas Presentasi Arsitektur",
                priority: "HIGH",
            },
            tokenA
        );
        taskAId = taskARes.body.data?.id;

        // User B membuat task untuk pengetesan cross-user task linkage
        const taskBRes = await makeRequest(
            "POST",
            "/tasks",
            {
                title: "Tugas Privat User B",
                priority: "LOW",
            },
            tokenB
        );
        taskBId = taskBRes.body.data?.id;

        console.log(`User A (ID: ${userA.id}), Task A (ID: ${taskAId})`);
        console.log(`User B (ID: ${userB.id}), Task B (ID: ${taskBId})`);

        console.log("\n--- Menjalankan Skenario Pengujian ---");

        // 1. Request tanpa token -> 401
        const test1 = await makeRequest("GET", "/reminders");
        assert(
            test1.status === 401 && test1.body.success === false,
            "1. Request tanpa token mengembalikan 401 Unauthorized"
        );

        // 2. User A membuat reminder mandiri -> 201
        const futureDate1 = new Date(Date.now() + 3600 * 1000 * 24).toISOString();
        const test2 = await makeRequest(
            "POST",
            "/reminders",
            {
                title: "Minum Obat Vitamin",
                message: "Jangan lupa minum vitamin C setelah makan",
                remindAt: futureDate1,
            },
            tokenA
        );
        reminder1Id = test2.body.data?.id;
        assert(
            test2.status === 201 && test2.body.success === true && reminder1Id,
            "2. User A membuat pengingat mandiri mengembalikan 201 Created",
            `Diterima: ${test2.status}, ID: ${reminder1Id}`
        );

        // 3. User A membuat reminder yang ditautkan ke task milik sendiri -> 201
        const futureDate2 = new Date(Date.now() + 3600 * 1000 * 48).toISOString();
        const test3 = await makeRequest(
            "POST",
            "/reminders",
            {
                title: "Deadline Persiapan Presentasi",
                remindAt: futureDate2,
                taskId: taskAId,
            },
            tokenA
        );
        reminder2Id = test3.body.data?.id;
        assert(
            test3.status === 201 &&
                test3.body.success === true &&
                test3.body.data.taskId === taskAId &&
                test3.body.data.task?.id === taskAId,
            "3. User A membuat pengingat dengan relasi taskId valid mengembalikan 201 Created",
            `Diterima: ${test3.status}, TaskTitle: ${test3.body.data?.task?.title}`
        );

        // 4. Keamanan: User A mencoba menautkan reminder ke taskId milik User B -> 400
        const test4 = await makeRequest(
            "POST",
            "/reminders",
            {
                title: "Eksploitasi Task Pengguna Lain",
                remindAt: futureDate1,
                taskId: taskBId,
            },
            tokenA
        );
        assert(
            test4.status === 400 && test4.body.success === false,
            "4. Keamanan: Penautan ke taskId milik pengguna lain ditolak dengan 400 Bad Request",
            `Diterima: ${test4.status}`
        );

        // 5. Validasi Zod: Format tanggal tidak valid -> 400
        const test5 = await makeRequest(
            "POST",
            "/reminders",
            {
                title: "Pengingat Invalid Date",
                remindAt: "bukan-tanggal-iso",
            },
            tokenA
        );
        assert(
            test5.status === 400 && test5.body.success === false,
            "5. Validasi Zod: Format datetime tidak valid ditolak dengan 400 Bad Request"
        );

        // 6. User A mengambil semua reminder -> 200 (Total 2)
        const test6 = await makeRequest("GET", "/reminders", null, tokenA);
        assert(
            test6.status === 200 &&
                test6.body.success === true &&
                Array.isArray(test6.body.data) &&
                test6.body.data.length === 2,
            "6. User A mengambil semua reminder mengembalikan 200 OK dengan 2 item",
            `Count: ${test6.body.data?.length}`
        );

        // 7. User B mengambil semua reminder miliknya -> 200 (Total 0, Isolasi Data)
        const test7 = await makeRequest("GET", "/reminders", null, tokenB);
        assert(
            test7.status === 200 &&
                test7.body.success === true &&
                Array.isArray(test7.body.data) &&
                test7.body.data.length === 0,
            "7. User B mengambil semua reminder tidak melihat data User A (Isolasi Data)",
            `Count: ${test7.body.data?.length}`
        );

        // 8. Filter reminder berdasarkan query isSent=false -> 200
        const test8 = await makeRequest("GET", "/reminders?isSent=false", null, tokenA);
        assert(
            test8.status === 200 &&
                test8.body.success === true &&
                test8.body.data.length === 2,
            "8. Filter query ?isSent=false berfungsi menyaring reminder belum terkirim"
        );

        // 9. User A melihat detail reminder -> 200
        const test9 = await makeRequest("GET", `/reminders/${reminder2Id}`, null, tokenA);
        assert(
            test9.status === 200 &&
                test9.body.success === true &&
                test9.body.data.id === reminder2Id &&
                test9.body.data.task.id === taskAId,
            "9. User A melihat detail reminder lengkap dengan data relasi Task"
        );

        // 10. Keamanan: User B mencoba melihat detail reminder User A -> 404
        const test10 = await makeRequest("GET", `/reminders/${reminder1Id}`, null, tokenB);
        assert(
            test10.status === 404 && test10.body.success === false,
            "10. Keamanan: User B membaca reminder User A mengembalikan 404 Not Found"
        );

        // 11. User A memperbarui reminder (isSent: true) -> 200
        const test11 = await makeRequest(
            "PATCH",
            `/reminders/${reminder1Id}`,
            {
                isSent: true,
                message: "Sudah diminum",
            },
            tokenA
        );
        assert(
            test11.status === 200 &&
                test11.body.success === true &&
                test11.body.data.isSent === true &&
                test11.body.data.message === "Sudah diminum",
            "11. User A memperbarui status reminder (isSent: true) mengembalikan 200 OK"
        );

        // 12. Keamanan: User B mencoba memperbarui reminder User A -> 404
        const test12 = await makeRequest(
            "PATCH",
            `/reminders/${reminder1Id}`,
            {
                title: "Dibajak User B",
            },
            tokenB
        );
        assert(
            test12.status === 404 && test12.body.success === false,
            "12. Keamanan: User B memperbarui reminder User A mengembalikan 404 Not Found"
        );

        // 13. Keamanan: User B mencoba menghapus reminder User A -> 404
        const test13 = await makeRequest("DELETE", `/reminders/${reminder1Id}`, null, tokenB);
        assert(
            test13.status === 404 && test13.body.success === false,
            "13. Keamanan: User B menghapus reminder User A mengembalikan 404 Not Found"
        );

        // 14. User A menghapus reminder 1 -> 200
        const test14 = await makeRequest("DELETE", `/reminders/${reminder1Id}`, null, tokenA);
        assert(
            test14.status === 200 && test14.body.success === true,
            "14. User A menghapus reminder mengembalikan 200 OK"
        );

        // 15. Verifikasi reminder 1 terhapus -> 404
        const test15 = await makeRequest("GET", `/reminders/${reminder1Id}`, null, tokenA);
        assert(
            test15.status === 404,
            "15. Verifikasi: Mengakses reminder yang telah dihapus mengembalikan 404 Not Found"
        );

        // 16. Verifikasi onDelete: SetNull pada Task -> Hapus task, reminder tetap aman dengan taskId null
        await makeRequest("DELETE", `/tasks/${taskAId}`, null, tokenA);
        const test16 = await makeRequest("GET", `/reminders/${reminder2Id}`, null, tokenA);
        assert(
            test16.status === 200 && test16.body.data.taskId === null && test16.body.data.task === null,
            "16. Verifikasi onDelete: SetNull: Menghapus task membuat taskId reminder menjadi null secara aman"
        );

        // PEMBERSIHAN DATA PENGUJIAN
        console.log("\n--- Membersihkan Data Pengujian ---");
        if (userA?.id && userB?.id) {
            try {
                await prisma.reminder.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
                await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
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

