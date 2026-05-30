/**
 * api/generate.js — Gemini AI slide generation
 * ─────────────────────────────────────────────────────────────────────────
 * Vercel Serverless Function
 *
 * SETUP (do this once):
 *   1. Deploy your udara-app folder to Vercel
 *   2. Run:  vercel env add GEMINI_API_KEY
 *      Paste your key from aistudio.google.com when prompted
 *      Select: Production, Preview, Development
 *   3. Redeploy: vercel --prod
 *
 * Then in app.js, find the comment that says:
 *   "GEMINI API INTEGRATION POINT"
 * and replace the simulateProgress + generateMockSlides block with:
 *
 *   const response = await fetch('/api/generate', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       topic:       currentTopic,
 *       audience:    currentAudience,
 *       layoutTheme: currentLayoutTheme,
 *       count:       currentCount,
 *       docText:     uploadedDocText
 *     })
 *   });
 *   if (!response.ok) throw new Error('API error: ' + response.status);
 *   const slides = await response.json();
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

export default async function handler(req, res) {

  /* Only accept POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* Read the request body */
  const { topic, audience, layoutTheme, count, docText } = req.body;

  /* Validate — need at least a topic or document text */
  if (!topic && !docText) {
    return res.status(400).json({ error: 'Topic or document text is required' });
  }

  const slideCount = Math.max(3, Math.min(30, parseInt(count) || 10));

  /* Gemini API key — set via: vercel env add GEMINI_API_KEY */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Udara/generate] GEMINI_API_KEY not set');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  /* ── Build the prompt ─────────────────────────────────────────────── */
  const audienceDesc = audience === 'startup'
    ? 'professional business executives and startup founders — data-driven, concise, persuasive'
    : 'students and educators — educational, engaging, easy to follow, relatable examples';

  const docSection = docText
    ? `MANDATORY SOURCE DOCUMENT:
The slides MUST be based entirely on the content below.
Do NOT invent any facts, statistics, or claims outside this document.
Extract real sentences, data points, and insights directly from it.
"""
${docText.slice(0, 8000)}
"""`
    : '';

  const layoutGuide = `
Layout type rules:
- "title"      → slide.title = presentation headline, slide.subtitle = one-line description
- "bullets"    → slide.bullets = array of 4 fully written, specific, meaningful sentences (not fragments)
- "metrics"    → slide.metrics = array of 4 objects: { label: string, value: string with real numbers/% }
- "comparison" → slide.comparison = array of 2 objects: { left: string (80-120 words), right: string (80-120 words) }
- "timeline"   → slide.steps = array of 4 strings, each a complete sequential action or phase (50-80 words each)
- "quote"      → slide.bullets[0] = powerful insight as a full quote (use quotes), bullets[1] = context sentence, bullets[2] = implication sentence
- "closing"    → slide.title = "Thank You", slide.subtitle = memorable closing line, slide.bullets = 4 contact/next-step lines`;

  const prompt = `You are an expert presentation designer and content strategist.
${docSection}

Generate exactly ${slideCount} slides for a presentation.
Topic: "${topic || 'Based on uploaded document'}"
Audience: ${audienceDesc}
Visual style / tone: ${layoutTheme}

${layoutGuide}

STRICT RULES:
1. Slide 1 layout MUST be "title"
2. Slide ${slideCount} layout MUST be "closing"
3. For slides 2 through ${slideCount - 1}, vary the layouts in this order:
   bullets → metrics → comparison → timeline → quote → bullets → metrics → (repeat)
4. Every text field must be FULLY written with SPECIFIC, MEANINGFUL content
   — absolutely no placeholder text like "Key point here" or "Insert content"
5. metrics values must contain real numbers, percentages, or data points
6. comparison left/right must each be 2-3 complete sentences with specific contrasts
7. timeline steps must each describe a concrete, actionable phase
8. quote bullets[0] must be a genuine insight in quotation marks
9. Tone must match the audience: ${audience === 'startup' ? 'professional, data-driven, persuasive' : 'educational, friendly, example-rich'}
${docText ? '10. ALL content must come directly from the source document above' : ''}

Return ONLY a raw JSON array.
No markdown. No backticks. No explanation. No preamble. Just the JSON array.

Each element must follow this exact schema:
{
  "slideNumber": <integer>,
  "layout": <"title"|"bullets"|"metrics"|"comparison"|"timeline"|"quote"|"closing">,
  "title": <string>,
  "subtitle": <string>,
  "bullets": [<string>, <string>, <string>, <string>],
  "metrics": [{"label": <string>, "value": <string>}, {"label": <string>, "value": <string>}, {"label": <string>, "value": <string>}, {"label": <string>, "value": <string>}],
  "comparison": [{"left": <string>, "right": <string>}, {"left": <string>, "right": <string>}],
  "steps": [<string>, <string>, <string>, <string>]
}`;

  /* ── Call Gemini API ──────────────────────────────────────────────── */
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature:     0.7,   /* balanced creativity vs accuracy */
            maxOutputTokens: 8192,  /* enough for 30 detailed slides    */
            topP:            0.9,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Udara/generate] Gemini HTTP error:', geminiRes.status, errText);
      return res.status(502).json({ error: 'AI service error', status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();

    /* Extract the text content from Gemini's response */
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('[Udara/generate] Empty response from Gemini:', JSON.stringify(geminiData));
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    /* Strip any markdown code fences Gemini might wrap around the JSON */
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/,      '')
      .replace(/\s*```$/,      '')
      .trim();

    /* Parse and validate */
    let slides;
    try {
      slides = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[Udara/generate] JSON parse failed. Raw:', rawText.slice(0, 500));
      return res.status(502).json({ error: 'AI returned invalid JSON', detail: parseErr.message });
    }

    /* Basic validation — must be an array with at least 3 items */
    if (!Array.isArray(slides) || slides.length < 3) {
      console.error('[Udara/generate] Invalid slides array:', slides);
      return res.status(502).json({ error: 'AI returned unexpected structure' });
    }

    /* Ensure first slide is title and last is closing */
    if (slides[0])                  slides[0].layout = 'title';
    if (slides[slides.length - 1])  slides[slides.length - 1].layout = 'closing';

    /* Ensure every slide has the required fields (defensive defaults) */
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

    console.log(`[Udara/generate] ✅ Generated ${slides.length} slides for: "${topic}"`);
    return res.status(200).json(slides);

  } catch (err) {
    console.error('[Udara/generate] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Generation failed', detail: err.message });
  }
}
