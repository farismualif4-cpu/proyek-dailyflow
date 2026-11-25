const prisma = require("../config/prisma");
const { getUserContext } = require("./aiContext.service");
const openaiService = require("./openai.service");

/**
 * Service untuk AI Smart Task Planner
 * Menganalisis sasaran/tugas pengguna, memberikan rekomendasi jadwal,
 * dan menghasilkan usulan tindakan terstruktur (AiActionProposal) berstatus PENDING.
 */
class AiPlannerService {
    /**
     * Menghasilkan rencana tugas cerdas dan proposal tindakan.
     * 
     * @param {Object} params
     * @param {string} params.userId
     * @param {string} params.goal
     * @param {string} [params.taskId]
     * @param {string} [params.conversationId]
     * @returns {Promise<{ analysis: string, scheduleRecommendation: string, proposals: Array }>}
     */
    async planTasks({ userId, goal, taskId = null, conversationId = null }) {
        // 1. Ambil konteks produktivitas pengguna aktif (terisolasi per userId)
        const userContext = await getUserContext(userId);

        let targetTaskContext = "";
        if (taskId) {
            const task = await prisma.task.findFirst({
                where: { id: taskId, userId },
            });
            if (task) {
                targetTaskContext = `\nTugas spesifik yang ingin dianalisis/dipecah:
- ID: ${task.id}
- Judul: ${task.title}
- Deskripsi: ${task.description || "(kosong)"}
- Prioritas: ${task.priority}
- Status: ${task.status}
- Tenggat: ${task.dueDate ? task.dueDate.toISOString() : "Tidak ada"}
`;
            }
        }

        const systemPrompt = `Anda adalah AI Smart Task Planner untuk DailyFlow.
Tugas Anda adalah:
1. Menganalisis target/sasaran pengguna berdasarkan data tugas aktif, catatan, kebiasaan, dan pengingat yang ada.
2. Memberikan rekomendasi jadwal kerja dan prioritas yang realistis.
3. Mengusulkan 1 sampai 3 tindakan konkret (CREATE_TASK, UPDATE_TASK, BATCH_CREATE_TASKS, atau DELETE_TASK).

PENTING:
- Anda HANYA mengusulkan tindakan. Tindakan Anda TIDAK akan langsung mengubah database sampai disetujui pengguna.
- Berikan format respon HARUS berupa JSON valid dengan struktur:
{
  "analysis": "Penjelasan analisis prioritas...",
  "scheduleRecommendation": "Rekomendasi jadwal pengerjaan...",
  "proposals": [
    {
      "type": "CREATE_TASK" | "UPDATE_TASK" | "BATCH_CREATE_TASKS" | "DELETE_TASK",
      "title": "Judul singkat usulan",
      "description": "Deskripsi usulan",
      "reason": "Alasan tindakan ini disarankan",
      "actionData": { ...parameter sesuai tipe }
    }
  ]
}

Format actionData per tipe:
- CREATE_TASK: { "title": string, "description": string, "priority": "LOW"|"MEDIUM"|"HIGH", "dueDate": "YYYY-MM-DDTHH:mm:ssZ" | null }
- UPDATE_TASK: { "taskId": string, "title"?: string, "priority"?: "LOW"|"MEDIUM"|"HIGH", "status"?: "PENDING"|"IN_PROGRESS"|"COMPLETED", "dueDate"?: string }
- BATCH_CREATE_TASKS: { "tasks": [ { "title": string, "description": string, "priority": "LOW"|"MEDIUM"|"HIGH", "dueDate": string | null } ] }
- DELETE_TASK: { "taskId": string }

${userContext}
${targetTaskContext}`;

        const userMessage = `Sasaran Perencanaan: "${goal}"`;

        let rawResponseText = "";

        // Environment test mock vs Real OpenAI call
        if (
            process.env.NODE_ENV === "test" &&
            (!process.env.OPENAI_API_KEY || process.env.TEST_USE_AI_MOCK === "true")
        ) {
            rawResponseText = this.getMockPlannerResponse(goal, taskId);
        } else {
            const aiResult = await openaiService.generateResponse({
                systemPrompt,
                userMessage,
            });
            rawResponseText = aiResult.reply;
        }

        // 2. Parse hasil JSON dari AI
        let parsedResult;
        try {
            // Bersihkan jika model membungkus dengan markdown code fence ```json ... ```
            const cleaned = rawResponseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
            parsedResult = JSON.parse(cleaned);
        } catch (parseErr) {
            console.warn("Gagal parse output JSON AI Planner, menggunakan fallback terstruktur:", parseErr.message);
            parsedResult = {
                analysis: rawResponseText,
                scheduleRecommendation: "Fokus pada tugas berprioritas tinggi sesuai daftar di atas.",
                proposals: [
                    {
                        type: "CREATE_TASK",
                        title: `Tindak lanjut: ${goal.slice(0, 40)}`,
                        description: `Dibuat dari sasaran perencanaan: ${goal}`,
                        reason: "Usulan tugas baru berdasarkan sasaran yang Anda berikan",
                        actionData: {
                            title: `Tindak lanjut: ${goal.slice(0, 40)}`,
                            description: `Dibuat dari sasaran: ${goal}`,
                            priority: "HIGH",
                            dueDate: null,
                        },
                    },
                ],
            };
        }

        const { analysis, scheduleRecommendation, proposals = [] } = parsedResult;

        // 3. Simpan proposal ke database berstatus PENDING (TIDAK mengubah tabel Task)
        const createdProposals = [];
        for (const p of proposals) {
            const validTypes = ["CREATE_TASK", "UPDATE_TASK", "BATCH_CREATE_TASKS", "DELETE_TASK"];
            if (!validTypes.includes(p.type)) continue;

            const record = await prisma.aiActionProposal.create({
                data: {
                    type: p.type,
                    status: "PENDING",
                    title: p.title || "Usulan Tindakan Tugas",
                    description: p.description || null,
                    reason: p.reason || null,
                    actionData: p.actionData || {},
                    userId,
                    conversationId: conversationId || null,
                },
            });
            createdProposals.push(record);
        }

        return {
            analysis: analysis || "Rencana tugas berhasil dianalisis.",
            scheduleRecommendation: scheduleRecommendation || "Rekomendasi jadwal telah disiapkan.",
            proposals: createdProposals,
        };
    }

    /**
     * Mock response khusus untuk environment test (NODE_ENV === 'test').
     */
    getMockPlannerResponse(goal, taskId) {
        if (taskId) {
            return JSON.stringify({
                analysis: `Analisis untuk memecah tugas ${taskId}: Proyek ini memerlukan beberapa tahap eksekusi bertahap.`,
                scheduleRecommendation: "Selesaikan subtugas 1 terlebih dahulu sebelum lanjut ke tahap pengujian.",
                proposals: [
                    {
                        type: "BATCH_CREATE_TASKS",
                        title: "Pecah Tugas Menjadi 2 Subtugas",
                        description: "Dua subtugas terarah untuk menyelesaikan target utama",
                        reason: "Memecah tugas besar mengurangi beban kognitif dan memudahkan eksekusi",
                        actionData: {
                            tasks: [
                                {
                                    title: `[Subtask 1] Perencanaan & Riset: ${goal.slice(0, 25)}`,
                                    description: "Langkah awal pengumpulan bahan",
                                    priority: "HIGH",
                                    dueDate: null,
                                },
                                {
                                    title: `[Subtask 2] Eksekusi & Review: ${goal.slice(0, 25)}`,
                                    description: "Implementasi dan verifikasi akhir",
                                    priority: "MEDIUM",
                                    dueDate: null,
                                },
                            ],
                        },
                    },
                ],
            });
        }

        return JSON.stringify({
            analysis: `Berdasarkan sasaran "${goal}", Anda disarankan untuk menetapkan tugas prioritas tinggi dan menjadwalkannya hari ini.`,
            scheduleRecommendation: "Alokasikan 2 jam sesi fokus di pagi hari untuk pengerjaan tugas utama.",
            proposals: [
                {
                    type: "CREATE_TASK",
                    title: `Tugas Prioritas: ${goal.slice(0, 35)}`,
                    description: `Direncanakan oleh AI Smart Planner untuk mencapai: ${goal}`,
                    reason: "Tugas ini penting untuk memulai progres sasaran harian Anda",
                    actionData: {
                        title: `Tugas Prioritas: ${goal.slice(0, 35)}`,
                        description: `Direncanakan oleh AI Smart Planner untuk: ${goal}`,
                        priority: "HIGH",
                        dueDate: null,
                    },
                },
            ],
        });
    }
}

module.exports = new AiPlannerService();
