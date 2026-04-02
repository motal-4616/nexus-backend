const openai = require("../config/openai");

/**
 * Generate embedding for text using text-embedding-3-small
 */
const getEmbedding = async (text) => {
    if (!openai || !text || !text.trim()) return null;
    try {
        const res = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.trim().substring(0, 8000),
        });
        return res.data[0].embedding;
    } catch (err) {
        console.error("getEmbedding error:", err.message);
        return null;
    }
};

/**
 * Check content with OpenAI Moderation API (free)
 */
const moderateContent = async (text) => {
    if (!openai || !text || !text.trim()) return { flagged: false, categories: {} };
    try {
        const res = await openai.moderations.create({
            model: "omni-moderation-latest",
            input: text.trim(),
        });
        const result = res.results[0];
        return {
            flagged: result.flagged,
            categories: result.categories,
        };
    } catch (err) {
        console.error("moderateContent error:", err.message);
        return { flagged: false, categories: {} };
    }
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
};

module.exports = { getEmbedding, moderateContent, cosineSimilarity };
