process.env.NODE_ENV = "test";
process.env.TEST_USE_AI_MOCK = "true";

const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const prisma = require("./src/config/prisma");
const app = require("./src/server");
const { getUserContext } = require("./src/services/aiContext.service");
const openaiService = require("./src/services/openai.service");

let server;
let serverPort;

const makeRequest = (method, endpoint, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: "127.0.0.1",
            port: serverPort,
            path: `/api${endpoint}`,
            method: method.toUpperCase(),
            headers: { "Content-Type": "application/json" },
        };
        if (token) options.headers["Authorization"] = `Bearer ${token}`;
        if (payload) options.headers["Content-Length"] = Buffer.byteLength(payload);

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
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
};

async function runAiFoundationTests() {
    console.log("==================================================================");
    console.log("   AUTOMATED TESTING - STAGE 1: AI BACKEND FOUNDATION             ");
    console.log("==================================================================");

    let totalPass = 0;
    let totalFail = 0;
    const assert = (cond, name, details = "") => {
        if (cond) {
            console.log(`✅ [PASS] ${name}`);
            totalPass++;
        } else {
            console.error(`❌ [FAIL] ${name} | ${details}`);
            totalFail++;
        }
    };

    const timestamp = Date.now();
    const emailA = `ai_user_a_${timestamp}@dailyflow.com`;
    const emailB = `ai_user_b_${timestamp}@dailyflow.com`;
    let userA, userB, tokenA, tokenB;
    let conversationIdA;

    try {
        console.log("Menghubungkan ke database...");
        await prisma.$connect();
        console.log("Database terhubung!");

        // 0. Start test server on ephemeral port
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                serverPort = server.address().port;
                console.log(`ℹ️ Test server listening on 127.0.0.1:${serverPort}`);
                resolve();
            });
        });

        // Register User A
        const regARes = await makeRequest("POST", "/auth/register", {
            name: "User AI Alpha",
            email: emailA,
            password: "Password123!",
        });
        if (regARes.status !== 201) {
            console.error("Gagal registrasi User A:", regARes.body);
        }
        userA = regARes.body.user || regARes.body.data?.user;
        tokenA = regARes.body.token || regARes.body.data?.token;

        // Register User B
        const regBRes = await makeRequest("POST", "/auth/register", {
            name: "User AI Beta",
            email: emailB,
            password: "Password123!",
        });
        if (regBRes.status !== 201) {
            console.error("Gagal registrasi User B:", regBRes.body);
        }
        userB = regBRes.body.user || regBRes.body.data?.user;
        tokenB = regBRes.body.token || regBRes.body.data?.token;

        assert(tokenA && tokenB, "0. Persiapan: Registrasi User A dan User B berhasil dengan token JWT valid");

        // Seed data untuk User A
        await prisma.task.create({
            data: {
                title: "Tugas Khusus User A",
                description: "Deskripsi tugas rahasia User A",
                priority: "HIGH",
                status: "PENDING",
                userId: userA.id,
            },
        });
        await prisma.note.create({
            data: {
                title: "Catatan Rahasia User A",
                content: "Data catatan rahasia milik User A",
                category: "Pribadi",
                userId: userA.id,
            },
        });
        const habitA = await prisma.habit.create({
            data: {
                name: "Kebiasaan Meditasi User A",
                userId: userA.id,
            },
        });
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        await prisma.habitLog.create({
            data: {
                habitId: habitA.id,
                date: todayUtc,
                completed: true,
            },
        });

        // Seed data untuk User B
        await prisma.task.create({
            data: {
                title: "Tugas Khusus User B",
                description: "Deskripsi tugas User B",
                priority: "LOW",
                status: "PENDING",
                userId: userB.id,
            },
        });

        // ==========================================
        // TEST 1: Request Tanpa Autentikasi Ditolak (401)
        // ==========================================
        const unauthRes = await makeRequest("POST", "/ai/chat", { message: "Halo AI" });
        assert(
            unauthRes.status === 401,
            "1. POST /api/ai/chat tanpa token mengembalikan 401 Unauthorized"
        );

        // ==========================================
        // TEST 2: Validasi Zod Pesan Kosong / Invalid (400)
        // ==========================================
        const emptyMsgRes = await makeRequest("POST", "/ai/chat", { message: "   " }, tokenA);
        assert(
            emptyMsgRes.status === 400 && !emptyMsgRes.body.success,
            "2. POST /api/ai/chat dengan pesan kosong ditolak validasi Zod (400 Bad Request)"
        );

        // ==========================================
        // TEST 3: Validasi Zod Pesan Terlalu Panjang (>3000 karakter)
        // ==========================================
        const longMsg = "A".repeat(3005);
        const longMsgRes = await makeRequest("POST", "/ai/chat", { message: longMsg }, tokenA);
        assert(
            longMsgRes.status === 400,
            "3. POST /api/ai/chat dengan pesan > 3000 karakter ditolak validasi Zod (400 Bad Request)"
        );

        // ==========================================
        // TEST 4: Isolasi Context Aggregator (User A vs User B)
        // ==========================================
        const contextA = await getUserContext(userA.id);
        const contextB = await getUserContext(userB.id);

        const contextAHasUserData = contextA.includes("Tugas Khusus User A") &&
            contextA.includes("Catatan Rahasia User A") &&
            contextA.includes("Kebiasaan Meditasi User A");
        const contextAExcludesUserB = !contextA.includes("Tugas Khusus User B");

        const contextBExcludesUserA = !contextB.includes("Tugas Khusus User A") &&
            !contextB.includes("Catatan Rahasia User A");

        assert(
            contextAHasUserData && contextAExcludesUserB && contextBExcludesUserA,
            "4. Context Aggregator terisolasi 100% per userId (Data User A tidak bocor ke User B dan sebaliknya)"
        );

        // ==========================================
        // TEST 5: Chat Baru Otomatis Membuat Percakapan & Mengurangi Kuota
        // ==========================================
        const chat1Res = await makeRequest("POST", "/ai/chat", { message: "Bagaimana prioritas tugas saya hari ini?" }, tokenA);
        assert(
            chat1Res.status === 200 &&
            chat1Res.body.success &&
            chat1Res.body.data?.conversationId &&
            chat1Res.body.data?.message?.role === "assistant" &&
            chat1Res.body.data?.quota?.used === 1,
            "5. POST /api/ai/chat berhasil membuat percakapan baru, mengembalikan balasan AI, dan mencatat kuota (used=1)"
        );
        conversationIdA = chat1Res.body.data?.conversationId;

        // Verifikasi di database
        const savedMessages = await prisma.aiMessage.findMany({
            where: { conversationId: conversationIdA },
            orderBy: { createdAt: "asc" },
        });
        assert(
            savedMessages.length === 2 &&
            savedMessages[0].role === "user" &&
            savedMessages[1].role === "assistant",
            "6. Database mencatat pasangan pesan (user & assistant) secara akurat"
        );

        // ==========================================
        // TEST 6: Multi-turn Chat Menggunakan conversationId
        // ==========================================
        const chat2Res = await makeRequest("POST", "/ai/chat", {
            message: "Apakah kebiasaan saya sudah dicentang hari ini?",
            conversationId: conversationIdA,
        }, tokenA);
        assert(
            chat2Res.status === 200 &&
            chat2Res.body.data?.conversationId === conversationIdA &&
            chat2Res.body.data?.quota?.used === 2,
            "7. Multi-turn chat menggunakan conversationId yang sama berhasil melanjutkan riwayat percakapan"
        );

        const updatedMessages = await prisma.aiMessage.findMany({
            where: { conversationId: conversationIdA },
        });
        assert(
            updatedMessages.length === 4,
            "8. Riwayat percakapan bertambah menjadi 4 pesan dalam satu thread"
        );

        // ==========================================
        // TEST 7: Isolasi Multi-tenant GET Conversation (User B dilarang membaca milik User A)
        // ==========================================
        const crossGetRes = await makeRequest("GET", `/ai/conversations/${conversationIdA}`, null, tokenB);
        assert(
            crossGetRes.status === 404,
            "9. User B mencoba mengakses percakapan User A mengembalikan 404 Not Found"
        );

        // ==========================================
        // TEST 8: Isolasi Multi-tenant DELETE Conversation (User B dilarang menghapus milik User A)
        // ==========================================
        const crossDelRes = await makeRequest("DELETE", `/ai/conversations/${conversationIdA}`, null, tokenB);
        assert(
            crossDelRes.status === 404,
            "10. User B mencoba menghapus percakapan User A mengembalikan 404 Not Found"
        );

        // Verifikasi percakapan User A masih utuh
        const convStillExists = await prisma.aiConversation.findUnique({
            where: { id: conversationIdA },
        });
        assert(
            convStillExists !== null,
            "11. Integritas data terjamin: Percakapan User A tidak terhapus oleh request User B"
        );

        // ==========================================
        // TEST 9: Status Kuota Pengguna (GET /api/ai/quota)
        // ==========================================
        const quotaRes = await makeRequest("GET", "/ai/quota", null, tokenA);
        assert(
            quotaRes.status === 200 &&
            quotaRes.body.data?.used === 2 &&
            quotaRes.body.data?.limit === 30 &&
            quotaRes.body.data?.remaining === 28,
            "12. GET /api/ai/quota mengembalikan data kuota akurat (used: 2, limit: 30, remaining: 28)"
        );

        // ==========================================
        // TEST 10: Concurrency-Safe Kuota (Parallel Request)
        // ==========================================
        console.log("   Menjalankan pengujian 5 request konkuren simultan...");
        const concurrentPromises = [1, 2, 3, 4, 5].map((i) =>
            makeRequest("POST", "/ai/chat", {
                message: `Pesan tes konkuren ke-${i}`,
                conversationId: conversationIdA,
            }, tokenA)
        );
        const concurrentResults = await Promise.all(concurrentPromises);
        const allSuccessful = concurrentResults.every((r) => r.status === 200);

        const usageRecord = await prisma.aiUsageLog.findUnique({
            where: {
                userId_date: {
                    userId: userA.id,
                    date: todayUtc,
                },
            },
        });
        // Awalnya used=2, ditambah 5 request konkuren -> harus tepat used=7
        assert(
            allSuccessful && usageRecord?.requestCount === 7,
            "13. Kuota aman terhadap concurrency (5 request simultan menghasilkan tepat requestCount=7 tanpa race condition)",
            `Status: ${allSuccessful}, requestCount: ${usageRecord?.requestCount}`
        );

        // ==========================================
        // TEST 11: Proteksi Batas Kuota Tercapai (429 Too Many Requests)
        // ==========================================
        // Set requestCount mendekati/mencapai limit 30 untuk User A
        await prisma.aiUsageLog.update({
            where: {
                userId_date: {
                    userId: userA.id,
                    date: todayUtc,
                },
            },
            data: {
                requestCount: 30,
            },
        });

        const overQuotaRes = await makeRequest("POST", "/ai/chat", {
            message: "Pesan yang melebihi batas kuota",
            conversationId: conversationIdA,
        }, tokenA);
        assert(
            overQuotaRes.status === 429 &&
            overQuotaRes.body.code === "AI_QUOTA_EXCEEDED" &&
            overQuotaRes.body.quota?.remaining === 0,
            "14. Request ditolak dengan 429 Too Many Requests saat kuota harian (30) tercapai"
        );

        // ==========================================
        // TEST 12: GET Daftar Percakapan Pengguna
        // ==========================================
        const listConvRes = await makeRequest("GET", "/ai/conversations", null, tokenA);
        assert(
            listConvRes.status === 200 &&
            Array.isArray(listConvRes.body.data) &&
            listConvRes.body.data.length >= 1 &&
            listConvRes.body.data.some((c) => c.id === conversationIdA),
            "15. GET /api/ai/conversations mengembalikan daftar percakapan pengguna yang valid"
        );

        // ==========================================
        // TEST 13: DELETE Percakapan oleh Pemilik (Cascade Delete Messages)
        // ==========================================
        const delRes = await makeRequest("DELETE", `/ai/conversations/${conversationIdA}`, null, tokenA);
        assert(
            delRes.status === 200 && delRes.body.success,
            "16. DELETE /api/ai/conversations/:id berhasil menghapus percakapan milik pengguna"
        );

        const checkMessagesDeleted = await prisma.aiMessage.findMany({
            where: { conversationId: conversationIdA },
        });
        assert(
            checkMessagesDeleted.length === 0,
            "17. Cascade delete menghapus seluruh riwayat pesan terkait percakapan"
        );

        // ==========================================
        // TEST 14: Security Check: Mock Ditolak Jika Bukan Environment Test
        // ==========================================
        const originalEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = "production";
            let securityPassed = false;
            try {
                // Dalam production tanpa key yang valid, generateResponse tidak boleh mengembalikan mock
                await openaiService.generateResponse({
                    systemPrompt: "Test",
                    userMessage: "Test",
                });
            } catch (secError) {
                // Harus throw error dan menolak mock
                securityPassed = true;
            }
            assert(
                securityPassed,
                "18. Security Guard: Mock generator DITOLAK keras jika NODE_ENV !== 'test'"
            );
        } finally {
            process.env.NODE_ENV = originalEnv;
        }

        console.log(`\n==================================================================`);
        console.log(`HASIL TEST STAGE 1 (AI FOUNDATION): ${totalPass} PASS, ${totalFail} FAIL`);
        console.log(`==================================================================`);
        return totalFail === 0;
    } catch (err) {
        console.error("AI Foundation test error:", err);
        return false;
    } finally {
        // Cleanup test data
        try {
            if (emailA) await prisma.user.deleteMany({ where: { email: emailA } });
            if (emailB) await prisma.user.deleteMany({ where: { email: emailB } });
        } catch (cleanupErr) {
            console.error("Cleanup error:", cleanupErr.message);
        }

        if (server) {
            server.close();
        }
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    runAiFoundationTests().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = runAiFoundationTests;
