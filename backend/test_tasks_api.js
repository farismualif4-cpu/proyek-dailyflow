const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const prisma = require("./src/config/prisma");

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000/api";
const { URL } = require("url");
const parsedBase = new URL(BASE_URL);

const makeRequest = (method, endpoint, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: parsedBase.hostname,
            port: parsedBase.port,
            path: `${parsedBase.pathname}${endpoint}`,
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
                try { json = JSON.parse(data); } catch (e) { json = data; }
                resolve({ status: res.statusCode, body: json });
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
};

async function runTaskTests() {
    console.log("==================================================");
    console.log("   AUTOMATED TESTING - TASK CRUD API             ");
    console.log("==================================================");

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
    const emailA = `task_a_${timestamp}@dailyflow.com`;
    const emailB = `task_b_${timestamp}@dailyflow.com`;
    let userA, userB, tokenA, tokenB, taskIdA;

    try {
        const regA = await makeRequest("POST", "/auth/register", { name: "User A", email: emailA, password: "password123" });
        tokenA = regA.body.token;
        userA = regA.body.user;

        const regB = await makeRequest("POST", "/auth/register", { name: "User B", email: emailB, password: "password123" });
        tokenB = regB.body.token;
        userB = regB.body.user;

        // 1. Request tanpa token -> 401
        const t1 = await makeRequest("GET", "/tasks");
        assert(t1.status === 401, "1. Request tanpa token ditolak (401 Unauthorized)");

        // 2. User A membuat task -> 201
        const t2 = await makeRequest("POST", "/tasks", {
            title: "Task Prioritas Tinggi",
            description: "Detail tugas penting",
            priority: "HIGH",
            status: "PENDING",
            dueDate: new Date(Date.now() + 86400000).toISOString(),
        }, tokenA);
        taskIdA = t2.body.data?.id;
        assert(t2.status === 201 && taskIdA, "2. User A membuat task baru (201 Created)");

        // 3. User A mengambil semua task -> 200
        const t3 = await makeRequest("GET", "/tasks", null, tokenA);
        assert(t3.status === 200 && t3.body.data.length === 1, "3. User A mengambil semua task miliknya (200 OK, 1 item)");

        // 4. Filter query status & priority -> 200
        const t4 = await makeRequest("GET", "/tasks?status=PENDING&priority=HIGH", null, tokenA);
        assert(t4.status === 200 && t4.body.data.length === 1, "4. Filter task berdasarkan ?status=PENDING&priority=HIGH berfungsi");

        // 5. Isolasi data User B -> 200 (0 items)
        const t5 = await makeRequest("GET", "/tasks", null, tokenB);
        assert(t5.status === 200 && t5.body.data.length === 0, "5. User B tidak melihat task milik User A (Isolasi Data)");

        // 6. User A melihat detail task miliknya -> 200
        const t6 = await makeRequest("GET", `/tasks/${taskIdA}`, null, tokenA);
        assert(t6.status === 200 && t6.body.data.id === taskIdA, "6. User A melihat detail task (200 OK)");

        // 7. Keamanan: User B membaca task User A -> 404
        const t7 = await makeRequest("GET", `/tasks/${taskIdA}`, null, tokenB);
        assert(t7.status === 404, "7. User B membaca task User A mengembalikan 404 Not Found");

        // 8. User A update task status COMPLETED (via PUT & PATCH) -> 200
        const t8 = await makeRequest("PUT", `/tasks/${taskIdA}`, { status: "COMPLETED" }, tokenA);
        assert(t8.status === 200 && t8.body.data.status === "COMPLETED", "8. User A memperbarui task via PUT/PATCH (200 OK)");

        // 9. Keamanan: User B update task User A -> 404
        const t9 = await makeRequest("PATCH", `/tasks/${taskIdA}`, { title: "Hacked" }, tokenB);
        assert(t9.status === 404, "9. User B memperbarui task User A mengembalikan 404 Not Found");

        // 10. Keamanan: User B hapus task User A -> 404
        const t10 = await makeRequest("DELETE", `/tasks/${taskIdA}`, null, tokenB);
        assert(t10.status === 404, "10. User B menghapus task User A mengembalikan 404 Not Found");

        // 11. User A hapus task -> 200
        const t11 = await makeRequest("DELETE", `/tasks/${taskIdA}`, null, tokenA);
        assert(t11.status === 200, "11. User A menghapus task (200 OK)");

        // 12. Verifikasi terhapus -> 404
        const t12 = await makeRequest("GET", `/tasks/${taskIdA}`, null, tokenA);
        assert(t12.status === 404, "12. Verifikasi task telah terhapus (404 Not Found)");

        // Cleanup
        await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
        await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });

        console.log(`\nHASIL TEST TASK: ${totalPass} PASS, ${totalFail} FAIL`);
        return totalFail === 0;
    } catch (err) {
        console.error("Task test error:", err);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    runTaskTests().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = runTaskTests;

