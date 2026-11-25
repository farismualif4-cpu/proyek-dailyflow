process.env.NODE_ENV = "test";
process.env.TEST_USE_AI_MOCK = "true";

const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const prisma = require("./src/config/prisma");
const app = require("./src/server");

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

async function runAiSmartPlannerTests() {
    console.log("==================================================================");
    console.log("   AUTOMATED TESTING - STAGE 3: SMART TASK PLANNER & ACTION ENGINE");
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
    const emailA = `planner_user_a_${timestamp}@dailyflow.com`;
    const emailB = `planner_user_b_${timestamp}@dailyflow.com`;
    let userA, userB, tokenA, tokenB;
    let existingTaskIdA;
    let createdProposalIdA;

    try {
        console.log("Menghubungkan ke database...");
        await prisma.$connect();
        console.log("Database terhubung!");

        // Start test server on ephemeral port
        await new Promise((resolve) => {
            server = app.listen(0, "127.0.0.1", () => {
                serverPort = server.address().port;
                console.log(`ℹ️ Test server listening on 127.0.0.1:${serverPort}`);
                resolve();
            });
        });

        // Register User A
        const regARes = await makeRequest("POST", "/auth/register", {
            name: "Planner User Alpha",
            email: emailA,
            password: "Password123!",
        });
        userA = regARes.body.user || regARes.body.data?.user;
        tokenA = regARes.body.token || regARes.body.data?.token;

        // Register User B
        const regBRes = await makeRequest("POST", "/auth/register", {
            name: "Planner User Beta",
            email: emailB,
            password: "Password123!",
        });
        userB = regBRes.body.user || regBRes.body.data?.user;
        tokenB = regBRes.body.token || regBRes.body.data?.token;

        assert(tokenA && tokenB, "0. Persiapan: Registrasi User A dan User B berhasil");

        // Seed 1 task awal untuk User A
        const initialTaskA = await prisma.task.create({
            data: {
                title: "Desain Arsitektur Sistem Halaman Utama",
                description: "Proyek besar yang memerlukan pemecahan tugas",
                priority: "HIGH",
                status: "PENDING",
                userId: userA.id,
            },
        });
        existingTaskIdA = initialTaskA.id;

        // ==========================================
        // TEST 1: Request Tanpa Token Ditolak (401)
        // ==========================================
        const unauthRes = await makeRequest("POST", "/ai/planner/suggest", {
            goal: "Rencanakan sprint mingguan",
        });
        assert(
            unauthRes.status === 401,
            "1. POST /api/ai/planner/suggest tanpa autentikasi ditolak (401 Unauthorized)"
        );

        // ==========================================
        // TEST 2: Validasi Zod: Sasaran Kosong / Terlalu Pendek (400)
        // ==========================================
        const invalidGoalRes = await makeRequest("POST", "/ai/planner/suggest", {
            goal: "a",
        }, tokenA);
        assert(
            invalidGoalRes.status === 400 && !invalidGoalRes.body.success,
            "2. POST /api/ai/planner/suggest sasaran < 3 karakter ditolak Zod (400 Bad Request)"
        );

        // ==========================================
        // TEST 3: Planner Mengusulkan Tindakan (Status PENDING)
        // ==========================================
        const tasksBeforePlan = await prisma.task.count({ where: { userId: userA.id } });

        const planRes = await makeRequest("POST", "/ai/planner/suggest", {
            goal: "Selesaikan persiapan rilis fitur analytics minggu ini",
        }, tokenA);

        assert(
            planRes.status === 200 &&
            planRes.body.success &&
            planRes.body.data?.analysis &&
            planRes.body.data?.scheduleRecommendation &&
            Array.isArray(planRes.body.data?.proposals) &&
            planRes.body.data.proposals.length > 0 &&
            planRes.body.data.proposals[0].status === "PENDING",
            "3. POST /api/ai/planner/suggest menghasilkan analisis, rekomendasi jadwal, dan proposal berstatus PENDING"
        );

        createdProposalIdA = planRes.body.data.proposals[0].id;

        // ==========================================
        // TEST 4: Verifikasi Invariance Database (Tabel Task BELUM Berubah)
        // ==========================================
        const tasksAfterPlan = await prisma.task.count({ where: { userId: userA.id } });
        assert(
            tasksBeforePlan === tasksAfterPlan,
            "4. Integritas Keamanan: Usulan AI TIDAK langsung mengubah database (jumlah task tetap sama sebelum disetujui)"
        );

        // ==========================================
        // TEST 5: GET /api/ai/proposals Milik Pengguna
        // ==========================================
        const listPropsRes = await makeRequest("GET", "/ai/proposals", null, tokenA);
        assert(
            listPropsRes.status === 200 &&
            Array.isArray(listPropsRes.body.data) &&
            listPropsRes.body.data.some((p) => p.id === createdProposalIdA),
            "5. GET /api/ai/proposals mengembalikan daftar usulan tindakan milik pengguna aktif"
        );

        // ==========================================
        // TEST 6: Isolasi Multi-tenant: User B DILARANG Membaca Usulan User A
        // ==========================================
        const crossGetRes = await makeRequest("GET", `/ai/proposals/${createdProposalIdA}`, null, tokenB);
        assert(
            crossGetRes.status === 404,
            "6. Keamanan Multi-Tenant: User B dilarang membaca usulan tindakan User A (404 Not Found)"
        );

        // ==========================================
        // TEST 7: Isolasi Multi-tenant: User B DILARANG Menyetujui Usulan User A
        // ==========================================
        const crossApproveRes = await makeRequest("POST", `/ai/proposals/${createdProposalIdA}/approve`, null, tokenB);
        assert(
            crossApproveRes.status === 404,
            "7. Keamanan Multi-Tenant: User B dilarang menyetujui usulan tindakan User A (404 Not Found)"
        );

        // ==========================================
        // TEST 8: Isolasi Multi-tenant: User B DILARANG Menolak Usulan User A
        // ==========================================
        const crossRejectRes = await makeRequest("POST", `/ai/proposals/${createdProposalIdA}/reject`, null, tokenB);
        assert(
            crossRejectRes.status === 404,
            "8. Keamanan Multi-Tenant: User B dilarang menolak usulan tindakan User A (404 Not Found)"
        );

        // ==========================================
        // TEST 9: Persetujuan Eksplisit Pengguna (Approve & Execute CREATE_TASK)
        // ==========================================
        const approveRes = await makeRequest("POST", `/ai/proposals/${createdProposalIdA}/approve`, null, tokenA);
        assert(
            approveRes.status === 200 &&
            approveRes.body.success &&
            approveRes.body.data?.proposal?.status === "APPROVED" &&
            approveRes.body.data?.result?.id,
            "9. POST /api/ai/proposals/:id/approve berhasil menyetujui dan membuat tugas baru di database"
        );

        const newTaskId = approveRes.body.data.result.id;
        const verifyTaskInDb = await prisma.task.findFirst({
            where: { id: newTaskId, userId: userA.id },
        });
        assert(
            verifyTaskInDb !== null && verifyTaskInDb.userId === userA.id,
            "10. Tugas baru tersimpan di database dengan kepemilikan userId User A yang sah"
        );

        // ==========================================
        // TEST 10: Proteksi Idempotensi: Usulan Tidak Bisa Disetujui Dua Kali
        // ==========================================
        const doubleApproveRes = await makeRequest("POST", `/ai/proposals/${createdProposalIdA}/approve`, null, tokenA);
        assert(
            doubleApproveRes.status === 400 && !doubleApproveRes.body.success,
            "11. Usulan yang sudah disetujui dilarang dieksekusi ulang (400 Bad Request)"
        );

        // ==========================================
        // TEST 11: Task Breakdown (BATCH_CREATE_TASKS dengan taskId)
        // ==========================================
        const breakdownRes = await makeRequest("POST", "/ai/planner/suggest", {
            goal: "Pecah tugas arsitektur menjadi langkah konkret",
            taskId: existingTaskIdA,
        }, tokenA);

        assert(
            breakdownRes.status === 200 &&
            breakdownRes.body.data?.proposals?.[0]?.type === "BATCH_CREATE_TASKS",
            "12. Pemecahan tugas spesifik menghasilkan usulan tipe BATCH_CREATE_TASKS"
        );

        const batchProposalId = breakdownRes.body.data.proposals[0].id;

        // ==========================================
        // TEST 12: Eksekusi BATCH_CREATE_TASKS Membuat Seluruh Subtugas
        // ==========================================
        const approveBatchRes = await makeRequest("POST", `/ai/proposals/${batchProposalId}/approve`, null, tokenA);
        assert(
            approveBatchRes.status === 200 &&
            Array.isArray(approveBatchRes.body.data?.result) &&
            approveBatchRes.body.data.result.length === 2,
            "13. Menyetujui BATCH_CREATE_TASKS membuat seluruh 2 subtugas secara atomik"
        );

        // ==========================================
        // TEST 13: Penolakan Usulan Tindakan (REJECT)
        // ==========================================
        // Buat proposal baru untuk diuji penolakannya
        const propToReject = await prisma.aiActionProposal.create({
            data: {
                type: "DELETE_TASK",
                title: "Usulan Hapus Tugas Usang",
                actionData: { taskId: existingTaskIdA },
                status: "PENDING",
                userId: userA.id,
            },
        });

        const rejectRes = await makeRequest("POST", `/ai/proposals/${propToReject.id}/reject`, null, tokenA);
        assert(
            rejectRes.status === 200 &&
            rejectRes.body.success &&
            rejectRes.body.data?.status === "REJECTED",
            "14. POST /api/ai/proposals/:id/reject berhasil mengubah status menjadi REJECTED"
        );

        // Verifikasi tugas yang diusulkan dihapus TIDAK terhapus karena usulannya ditolak
        const taskNotDeleted = await prisma.task.findUnique({ where: { id: existingTaskIdA } });
        assert(
            taskNotDeleted !== null,
            "15. Integritas Terjamin: Penolakan usulan tidak mengubah atau menghapus data tugas"
        );

        // ==========================================
        // TEST 14: Validasi Kepemilikan Task pada UPDATE_TASK / DELETE_TASK
        // ==========================================
        // Buat task milik User B
        const taskOfUserB = await prisma.task.create({
            data: {
                title: "Tugas Rahasia User B",
                userId: userB.id,
            },
        });

        // Usulan milik User A yang secara jahat/salah mencoba mengupdate task User B
        const maliciousProposal = await prisma.aiActionProposal.create({
            data: {
                type: "UPDATE_TASK",
                title: "Eksploitasi Tugas Orang Lain",
                actionData: { taskId: taskOfUserB.id, title: "Diubah Oleh A" },
                status: "PENDING",
                userId: userA.id,
            },
        });

        const maliciousApproveRes = await makeRequest("POST", `/ai/proposals/${maliciousProposal.id}/approve`, null, tokenA);
        assert(
            maliciousApproveRes.status === 404,
            "16. Keamanan Lintas Tenant: Eksekusi tindakan pada task milik orang lain DITOLAK (404 Not Found)"
        );

        const checkTaskBUnchanged = await prisma.task.findUnique({ where: { id: taskOfUserB.id } });
        assert(
            checkTaskBUnchanged?.title === "Tugas Rahasia User B",
            "17. Data task korban tetap aman dan tidak berubah"
        );

        // ==========================================
        // TEST 15: UPDATE_TASK Whitelist Keamanan Field
        // ==========================================
        const taskToUpdateA = await prisma.task.create({
            data: {
                title: "Tugas Lama Sebelum Update",
                priority: "LOW",
                status: "PENDING",
                userId: userA.id,
            },
        });

        const updateProposalA = await prisma.aiActionProposal.create({
            data: {
                type: "UPDATE_TASK",
                title: "Perbarui Prioritas & Status Tugas",
                actionData: {
                    taskId: taskToUpdateA.id,
                    title: "Tugas Diperbarui oleh AI",
                    priority: "HIGH",
                    status: "IN_PROGRESS",
                    // Upaya menyisipkan field terlarang
                    userId: userB.id,
                },
                status: "PENDING",
                userId: userA.id,
            },
        });

        const approveUpdateRes = await makeRequest("POST", `/ai/proposals/${updateProposalA.id}/approve`, null, tokenA);
        assert(
            approveUpdateRes.status === 200 &&
            approveUpdateRes.body.data?.result?.title === "Tugas Diperbarui oleh AI" &&
            approveUpdateRes.body.data?.result?.priority === "HIGH" &&
            approveUpdateRes.body.data?.result?.status === "IN_PROGRESS",
            "18. UPDATE_TASK berhasil memperbarui field yang diizinkan (title, priority, status)"
        );

        const verifyUpdatedTaskInDb = await prisma.task.findUnique({ where: { id: taskToUpdateA.id } });
        assert(
            verifyUpdatedTaskInDb.userId === userA.id,
            "19. Field terlarang (userId) diabaikan sehingga kepemilikan task tidak dapat dibajak"
        );

        // ==========================================
        // TEST 16: DELETE_TASK Eksekusi Sukses
        // ==========================================
        const deleteProposalA = await prisma.aiActionProposal.create({
            data: {
                type: "DELETE_TASK",
                title: "Hapus Tugas Yang Sudah Diperbarui",
                actionData: { taskId: taskToUpdateA.id },
                status: "PENDING",
                userId: userA.id,
            },
        });

        const approveDeleteRes = await makeRequest("POST", `/ai/proposals/${deleteProposalA.id}/approve`, null, tokenA);
        assert(
            approveDeleteRes.status === 200 && approveDeleteRes.body.success,
            "20. DELETE_TASK berhasil disetujui dan diterapkan"
        );

        const verifyTaskActuallyDeleted = await prisma.task.findUnique({ where: { id: taskToUpdateA.id } });
        assert(
            verifyTaskActuallyDeleted === null,
            "21. Tugas target benar-benar terhapus dari tabel Task setelah persetujuan eksplisit"
        );

        // ==========================================
        // TEST 17: Proposal Kedaluwarsa (EXPIRED)
        // ==========================================
        const oldDate = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 jam yang lalu
        const expiredProposal = await prisma.aiActionProposal.create({
            data: {
                type: "CREATE_TASK",
                title: "Usulan Kuno Yang Telah Kedaluwarsa",
                actionData: { title: "Tugas Kuno" },
                status: "PENDING",
                userId: userA.id,
                createdAt: oldDate,
            },
        });

        const approveExpiredRes = await makeRequest("POST", `/ai/proposals/${expiredProposal.id}/approve`, null, tokenA);
        assert(
            approveExpiredRes.status === 400 &&
            approveExpiredRes.body.message.includes("EXPIRED"),
            "22. Usulan tindakan yang telah melewati 48 jam otomatis ditolak sebagai EXPIRED (400 Bad Request)"
        );

        const checkExpiredStatusInDb = await prisma.aiActionProposal.findUnique({ where: { id: expiredProposal.id } });
        assert(
            checkExpiredStatusInDb.status === "EXPIRED",
            "23. Status proposal di database berubah menjadi EXPIRED"
        );

        // Percobaan menolak proposal yang sudah EXPIRED juga harus ditolak
        const rejectExpiredRes = await makeRequest("POST", `/ai/proposals/${expiredProposal.id}/reject`, null, tokenA);
        assert(
            rejectExpiredRes.status === 400,
            "24. Usulan berstatus EXPIRED tidak dapat diubah statusnya lagi (Idempoten)"
        );

        console.log(`\n==================================================================`);
        console.log(`HASIL TEST STAGE 3 (PLANNER & ENGINE): ${totalPass} PASS, ${totalFail} FAIL`);
        console.log(`==================================================================`);
        return totalFail === 0;
    } catch (err) {
        console.error("Stage 3 test error:", err);
        return false;
    } finally {
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
    runAiSmartPlannerTests().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = runAiSmartPlannerTests;
