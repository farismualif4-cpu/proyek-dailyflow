const runAuthTests = require("./test_auth_api");
const runTaskTests = require("./test_tasks_api");
const runNotesTests = require("./test_notes_api");

// We can execute all scripts
const { execSync } = require("child_process");

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
];

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
    console.log("🎉 SELURUH TEST SUITE BACKEND (6 MODUL) BERHASIL 100%!");
} else {
    console.error("❌ BEBERAPA TEST GAGAL, SILAKAN PERIKSA LOG DI ATAS.");
}
console.log("================================================================");

process.exit(allPassed ? 0 : 1);

