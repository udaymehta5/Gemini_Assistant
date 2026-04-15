require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error('Set API_KEY in backend/.env (Google AI Studio key).');
    process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(apiKey);

const CONTENT_TYPES = {
    blog: 'a blog post with a title line, then sections with clear headings',
    social: 'short social media posts (platform-appropriate; include hashtags only if suitable)',
    email: 'a professional or marketing email with subject line and body',
    product: 'product or landing-page copy (headline, benefits, call to action)',
    creative: 'creative writing (story, poem, or scene as appropriate to the topic)',
    summary: 'a clear, structured summary with bullet points where helpful',
    code: 'code or technical explanation with brief comments; use markdown code fences for snippets',
};

function buildUserPrompt(body) {
    const {
        topic,
        type = 'blog',
        tone = 'professional',
        audience = 'general readers',
        length = 'medium',
        extra = '',
    } = body || {};

    const typeKey = String(type).toLowerCase();
    const format = CONTENT_TYPES[typeKey] || CONTENT_TYPES.blog;

    const lengthHint =
        length === 'short'
            ? 'Keep it concise (roughly 150–250 words unless the format needs less).'
            : length === 'long'
              ? 'Aim for depth and detail (roughly 600–900 words unless shorter fits better).'
              : 'Aim for moderate length (roughly 350–500 words).';

    const extraBlock = extra && String(extra).trim() ? `\nAdditional instructions: ${String(extra).trim()}` : '';

    return `You are a skilled content writer.

Write ${format}.
Tone: ${tone}.
Audience: ${audience}.
${lengthHint}
Topic or brief: ${topic || '(none provided — ask the user to specify a topic)'}${extraBlock}

Output only the requested content, no preamble like "Here is your post".`;
}

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: MODEL });
});

app.post('/api/generate', async (req, res) => {
    const topic = req.body?.topic;
    if (!topic || !String(topic).trim()) {
        return res.status(400).json({ error: 'Missing or empty "topic" field.' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: MODEL });
        const prompt = buildUserPrompt({ ...req.body, topic: String(topic).trim() });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return res.json({ text, model: MODEL });
    } catch (err) {
        if (err?.status === 429) {
            return res.status(429).json({
                error:
                    'Rate limit or quota exceeded. Try again later, switch GEMINI_MODEL in .env, or check billing at https://ai.google.dev/gemini-api/docs/rate-limits',
            });
        }
        const message = err?.message || 'Generation failed.';
        console.error(err);
        return res.status(500).json({ error: message });
    }
});

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
