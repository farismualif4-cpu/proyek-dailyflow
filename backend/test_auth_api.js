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

async function runAuthTests() {
    console.log("==================================================");
    console.log("   AUTOMATED TESTING - AUTH API                  ");
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
    const testEmail = `auth_test_${timestamp}@dailyflow.com`;
    const password = "password123";
    let authToken;

    try {
        // 1. Register valid user -> 201
        const regRes = await makeRequest("POST", "/auth/register", {
            name: "Auth Tester",
            email: testEmail,
            password,
        });
        assert(regRes.status === 201 && regRes.body.token && regRes.body.user.email === testEmail, "1. Registrasi user baru berhasil (201 Created)");

        // 2. Register email duplikat -> 409
        const dupRes = await makeRequest("POST", "/auth/register", {
            name: "Auth Tester Dup",
            email: testEmail,
            password,
        });
        assert(dupRes.status === 409 && dupRes.body.success === false, "2. Registrasi dengan email duplikat ditolak (409 Conflict)");

        // 3. Register validasi gagal (password pendek) -> 400
        const valRes = await makeRequest("POST", "/auth/register", {
            name: "A",
            email: "invalid-email",
            password: "123",
        });
        assert(valRes.status === 400 && valRes.body.errors, "3. Registrasi dengan data tidak valid ditolak (400 Bad Request)");

        // 4. Login valid -> 200
        const loginRes = await makeRequest("POST", "/auth/login", {
            email: testEmail,
            password,
        });
        authToken = loginRes.body.token;
        assert(loginRes.status === 200 && authToken, "4. Login dengan kredensial valid berhasil (200 OK)");

        // 5. Login password salah -> 401
        const wrongPassRes = await makeRequest("POST", "/auth/login", {
            email: testEmail,
            password: "wrongpassword",
        });
        assert(wrongPassRes.status === 401, "5. Login dengan password salah ditolak (401 Unauthorized)");

        // 6. Login email tidak terdaftar -> 401
        const nonExistRes = await makeRequest("POST", "/auth/login", {
            email: `nonexist_${timestamp}@dailyflow.com`,
            password,
        });
        assert(nonExistRes.status === 401, "6. Login dengan email tidak terdaftar ditolak (401 Unauthorized)");

        // 7. GET /api/auth/me dengan token valid -> 200
        const meRes = await makeRequest("GET", "/auth/me", null, authToken);
        assert(meRes.status === 200 && meRes.body.user.email === testEmail, "7. GET /api/auth/me mengembalikan profil pengguna (200 OK)");

        // 8. GET /api/auth/me tanpa token -> 401
        const noTokenRes = await makeRequest("GET", "/auth/me");
        assert(noTokenRes.status === 401, "8. GET /api/auth/me tanpa token ditolak (401 Unauthorized)");

        // Cleanup
        await prisma.user.deleteMany({ where: { email: testEmail } });

        console.log(`\nHASIL TEST AUTH: ${totalPass} PASS, ${totalFail} FAIL`);
        return totalFail === 0;
    } catch (err) {
        console.error("Auth test error:", err);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    runAuthTests().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = runAuthTests;

