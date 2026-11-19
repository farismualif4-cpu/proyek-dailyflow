const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { execSync } = require("child_process");
const app = require("./src/server");

console.log("================================================================");
console.log("   DAILYFLOW BACKEND - MASTER INTEGRATION TEST RUNNER          ");
console.log("================================================================\n");

const tests = [
    { name: "1. Authentication API", script: "test_auth_api.js" },
    { name: "2. Task CRUD API", script: "test_tasks_api.js" },
    { name: "3. Notes API", script: "test_notes_api.js" },
    { name: "4. Habit Tracker API", script: "test_habits_api.js" },
    { name: "5. Reminder API", script: "test_reminders_api.js" },
    { name: "6. Dashboard API", script: "test_dashboard_api.js" },
    { name: "7. AI Foundation API (Stage 1)", script: "test_ai_foundation.js" },
];

async function main() {
    let server;
    // Start server on port 3000 for integration tests that target localhost:3000
    try {
        await new Promise((resolve, reject) => {
            server = app.listen(3000, () => {
                console.log("ℹ️ Server integrasi berjalan di port 3000");
                resolve();
            });
            server.on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    console.log("ℹ️ Port 3000 sudah berjalan, menggunakan instance yang ada.");
                    server = null;
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    } catch (e) {
        console.error("Gagal memulai server test:", e);
    }

    let allPassed = true;

    for (const t of tests) {
        console.log(`\n>>> MENJALANKAN TEST: ${t.name} (${t.script})`);
        try {
            const output = execSync(`node ${t.script}`, {
                cwd: __dirname,
                encoding: "utf-8",
                env: process.env,
            });
            console.log(output);
            console.log(`>>> HASIL: SUKSES (${t.name})`);
        } catch (err) {
            console.error(`>>> HASIL: GAGAL (${t.name})`);
            console.error(err.stdout || err.message);
            allPassed = false;
        }
    }

    console.log("\n================================================================");
    if (allPassed) {
        console.log(`🎉 SELURUH TEST SUITE BACKEND (${tests.length} MODUL) BERHASIL 100%!`);
    } else {
        console.error("❌ BEBERAPA TEST GAGAL, SILAKAN PERIKSA LOG DI ATAS.");
    }
    console.log("================================================================");

    if (server) {
        server.close();
    }

    process.exit(allPassed ? 0 : 1);
}

main();
