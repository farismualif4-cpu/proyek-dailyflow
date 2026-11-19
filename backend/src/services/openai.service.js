const OpenAI = require("openai");

/**
 * Service untuk berkomunikasi dengan OpenAI SDK & Responses API.
 */
class OpenAiService {
    constructor() {
        this.client = null;
    }

    /**
     * Inisialisasi client OpenAI secara lazy loading.
     */
    getClient() {
        if (!this.client) {
            const apiKey = process.env.OPENAI_API_KEY;

            // Jika dalam environment test dan key tidak tersedia, biarkan mock handler bekerja
            if (process.env.NODE_ENV === "test" && (!apiKey || process.env.TEST_USE_AI_MOCK === "true")) {
                return null;
            }

            if (!apiKey) {
                const err = new Error(
                    "OPENAI_API_KEY belum dikonfigurasi pada server backend."
                );
                err.status = 500;
                throw err;
            }

            this.client = new OpenAI({
                apiKey,
            });
        }
        return this.client;
    }

    /**
     * Memanggil model AI untuk menghasilkan respons teks atau structured response.
     * 
     * @param {Object} options
     * @param {string} options.systemPrompt Instruksi sistem & konteks data user
     * @param {string} options.userMessage Pesan pengguna
     * @param {Array<{ role: string, content: string }>} [options.conversationHistory=[]] Riwayat pesan sebelumnya
     * @returns {Promise<{ reply: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } }>}
     */
    async generateResponse({ systemPrompt, userMessage, conversationHistory = [] }) {
        // ATURAN 7: Mock hanya aktif jika process.env.NODE_ENV === "test"
        if (
            process.env.NODE_ENV === "test" &&
            (!process.env.OPENAI_API_KEY || process.env.TEST_USE_AI_MOCK === "true")
        ) {
            return this.getMockResponse(userMessage);
        }

        const client = this.getClient();
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        // Susun daftar pesan
        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            { role: "user", content: userMessage },
        ];

        try {
            // Coba menggunakan Responses API jika didukung oleh OpenAI SDK
            if (client.responses && typeof client.responses.create === "function") {
                const response = await client.responses.create({
                    model,
                    input: messages,
                });

                const reply = response.output_text || response.output?.[0]?.content?.[0]?.text || "";
                const usage = response.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                };

                return {
                    reply: reply.trim(),
                    usage: {
                        promptTokens: usage.input_tokens || usage.prompt_tokens || 0,
                        completionTokens: usage.output_tokens || usage.completion_tokens || 0,
                        totalTokens: usage.total_tokens || 0,
                    },
                };
            }

            // Fallback ke Chat Completions standard
            const completion = await client.chat.completions.create({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 1500,
            });

            const reply = completion.choices[0]?.message?.content || "";
            const usage = completion.usage || {};

            return {
                reply: reply.trim(),
                usage: {
                    promptTokens: usage.prompt_tokens || 0,
                    completionTokens: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0,
                },
            };
        } catch (error) {
            console.error("OpenAI API Execution Error:", error.message);
            const err = new Error(error.message || "Gagal memproses permintaan AI ke OpenAI.");
            err.status = error.status || 500;
            throw err;
        }
    }

    /**
     * Mock generator khusus untuk environment test (NODE_ENV === 'test').
     */
    getMockResponse(userMessage) {
        let reply = "Halo! Saya adalah asisten AI DailyFlow Anda. Saya siap membantu mengelola tugas, kebiasaan, catatan, dan pengingat Anda.";

        if (/tugas|task/i.test(userMessage)) {
            reply = "Berdasarkan data Anda, Anda memiliki beberapa tugas yang belum selesai. Fokuslah pada tugas dengan prioritas tinggi terlebih dahulu.";
        } else if (/kebiasaan|habit/i.test(userMessage)) {
            reply = "Saya mencatat kebiasaan harian Anda. Jangan lupa melakukan check-in hari ini agar streak Anda tetap terjaga!";
        } else if (/catatan|note/i.test(userMessage)) {
            reply = "Catatan terbaru Anda telah tersimpan dengan aman. Apakah Anda ingin saya merangkumnya?";
        }

        return {
            reply,
            usage: {
                promptTokens: 50,
                completionTokens: 35,
                totalTokens: 85,
            },
        };
    }
}

module.exports = new OpenAiService();
