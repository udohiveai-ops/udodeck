/**
 * api/generate.js — Gemini AI slide generation
 * Vercel Serverless Function
 *
 * SETUP:
 *   1. vercel env add GEMINI_API_KEY   (paste key from aistudio.google.com)
 *   2. vercel --prod
 */

export default async function handler(req, res) {

  /* Only accept POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, audience, layoutTheme, count, docText } = req.body || {};

  if (!topic && !docText) {
    return res.status(400).json({ error: 'Topic or document text is required' });
  }

  const slideCount = Math.max(3, Math.min(30, parseInt(count) || 10));

  /* ── API Key check ─────────────────────────────────────────────────── */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[UdoDeck/generate] GEMINI_API_KEY environment variable is not set on Vercel');
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server.',
      fix:   'Go to Vercel Dashboard → Your Project → Settings → Environment Variables → add GEMINI_API_KEY'
    });
  }

  /* ── Build prompt ──────────────────────────────────────────────────── */
  const audienceDesc = audience === 'startup'
    ? 'professional business executives and startup founders — data-driven, concise, persuasive'
    : 'students and educators — educational, engaging, easy to follow with relatable examples';

  const docSection = docText
    ? `MANDATORY SOURCE DOCUMENT — use ONLY this content, do not invent facts:\n"""\n${docText.slice(0, 8000)}\n"""\n`
    : '';

  const prompt = `You are an expert presentation designer and content strategist.
${docSection}
Generate exactly ${slideCount} slides for a presentation.
Topic: "${topic || 'Based on uploaded document'}"
Audience: ${audienceDesc}
Style: ${layoutTheme || 'corporate'}

Layout rules:
- "title"      → title = headline, subtitle = one-line description
- "bullets"    → bullets = 4 fully written meaningful sentences
- "metrics"    → metrics = 4 objects {label, value} with real numbers or %
- "comparison" → comparison = 2 objects {left, right} each 2-3 sentences contrasting old vs new
- "timeline"   → steps = 4 strings each describing a concrete sequential phase
- "quote"      → bullets[0] = insight in quotes, bullets[1] = context, bullets[2] = implication
- "closing"    → title = "Thank You", subtitle = closing line, bullets = 4 next-step lines

STRICT RULES:
- Slide 1 layout MUST be "title"
- Slide ${slideCount} layout MUST be "closing"
- Middle slides cycle through: bullets, metrics, comparison, timeline, quote (repeat)
- All content must be specific and meaningful — no placeholder text whatsoever
- Return ONLY a raw JSON array. No markdown. No backticks. No explanation.

Schema for each element:
{"slideNumber":N,"layout":"...","title":"...","subtitle":"...","bullets":["...","...","...","..."],"metrics":[{"label":"...","value":"..."}],"comparison":[{"left":"...","right":"..."}],"steps":["...","...","...","..."]}`;

  /* ── Try multiple Gemini model names for compatibility ─────────────── */
  /* Gemini model names change — we try them in order until one works     */
  const MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`[UdoDeck/generate] Trying model: ${model}`);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature:     0.7,
              maxOutputTokens: 8192,
              topP:            0.9,
            }
          })
        }
      );

      /* Log full error response for debugging */
      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.warn(`[UdoDeck/generate] Model ${model} returned ${geminiRes.status}:`, errBody.slice(0, 300));
        lastError = `${model}: HTTP ${geminiRes.status} — ${errBody.slice(0, 200)}`;
        continue; /* try next model */
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        console.warn(`[UdoDeck/generate] Model ${model} returned empty content:`, JSON.stringify(geminiData).slice(0, 300));
        lastError = `${model}: empty response`;
        continue;
      }

      /* Strip markdown fences if present */
      const cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/m,      '')
        .replace(/\s*```\s*$/,    '')
        .trim();

      /* Parse JSON */
      let slides;
      try {
        slides = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn(`[UdoDeck/generate] Model ${model} JSON parse failed. Raw:`, rawText.slice(0, 400));
        lastError = `${model}: JSON parse error — ${parseErr.message}`;
        continue;
      }

      if (!Array.isArray(slides) || slides.length < 3) {
        console.warn(`[UdoDeck/generate] Model ${model} returned invalid structure`);
        lastError = `${model}: not a valid slides array`;
        continue;
      }

      /* Lock first and last layout */
      slides[0].layout = 'title';
      slides[slides.length - 1].layout = 'closing';

      /* Defensive defaults for every slide */
      slides = slides.map((slide, i) => ({
        slideNumber: i + 1,
        layout:      slide.layout      || 'bullets',
        title:       slide.title       || `Slide ${i + 1}`,
        subtitle:    slide.subtitle    || '',
        bullets:     Array.isArray(slide.bullets)    ? slide.bullets    : [],
        metrics:     Array.isArray(slide.metrics)    ? slide.metrics    : [],
        comparison:  Array.isArray(slide.comparison) ? slide.comparison : [],
        steps:       Array.isArray(slide.steps)      ? slide.steps      : [],
      }));

      console.log(`[UdoDeck/generate] ✅ Success with model ${model} — ${slides.length} slides for: "${topic}"`);
      return res.status(200).json(slides);

    } catch (err) {
      console.warn(`[UdoDeck/generate] Model ${model} threw:`, err.message);
      lastError = `${model}: ${err.message}`;
    }
  }

  /* All models failed */
  console.error('[UdoDeck/generate] All models failed. Last error:', lastError);
  return res.status(502).json({
    error:     'All Gemini models failed',
    lastError: lastError,
    fix:       'Check that GEMINI_API_KEY is set correctly on Vercel and the key is active at aistudio.google.com'
  });
}
