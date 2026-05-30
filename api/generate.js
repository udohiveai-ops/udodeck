/**
 * api/generate.js — Gemini AI slide generation for Udara
 * Vercel Serverless Function
 *
 * SETUP:
 *   1. vercel env add GEMINI_API_KEY   (from aistudio.google.com)
 *   2. vercel --prod
 */

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, audience, layoutTheme, count, docText } = req.body || {};

  if (!topic && !docText) {
    return res.status(400).json({ error: 'Topic or document text is required' });
  }

  const slideCount = Math.max(3, Math.min(30, parseInt(count) || 10));
  const contentSlides = slideCount - 2; // excludes title + closing

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not set on Vercel.',
      fix:   'Vercel Dashboard → Project → Settings → Environment Variables'
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     LAYOUT THEME PERSONALITIES
     Each layout theme tells Gemini exactly how to write — the tone,
     the vocabulary, the structure, and the visual logic.
  ══════════════════════════════════════════════════════════════════ */
  const themePersonalities = {
    corporate: {
      tone: 'Executive boardroom. Formal, authoritative, and evidence-based. Use industry terminology. Every claim needs a number or a source. Think McKinsey slide deck.',
      slideStyle: 'Use metrics slides for KPIs and financial data. Use comparison slides for competitive analysis. Use timeline for strategic roadmaps. Use bullets for insights with supporting evidence.',
      titleStyle: 'Sharp, declarative headline. Subtitle explains the strategic implication.',
      avoid: 'Avoid casual language, vague statements, or motivational fluff. No "we believe" — use "data shows".',
    },
    school: {
      tone: 'University lecture or high school class. Clear, educational, and engaging. Break down complex ideas into digestible parts. Use real-world examples students can relate to.',
      slideStyle: 'Use bullets for key concepts with examples. Use timeline for historical progression or processes. Use comparison for "before vs after" or "theory vs practice". Use metrics for statistics that prove a point.',
      titleStyle: 'Clear topic statement. Subtitle is a learning objective like "By the end of this slide, you will understand..."',
      avoid: 'Avoid jargon without explanation. Avoid dense walls of text. Every point needs a concrete example.',
    },
    bold: {
      tone: 'High-energy, punchy, and provocative. Short sentences. Big claims. This is a conference keynote or a startup pitch competition. Make every word count.',
      slideStyle: 'Use metrics to show dramatic numbers up front. Use comparison for "old world vs new world" contrasts. Use bullets for hard-hitting facts — one idea per bullet, maximum impact. Use quote for a single powerful insight that anchors the whole section.',
      titleStyle: 'Bold, short, provocative title (5 words max). Subtitle is a single powerful statement.',
      avoid: 'No long sentences. No passive voice. No hedging. Everything is a bold declaration.',
    },
    futuristic: {
      tone: 'Forward-thinking technology leader or futurist. Focus on emerging trends, disruption, and what comes next. Reference real tech developments, AI, blockchain, biotech, space, climate tech as relevant to the topic.',
      slideStyle: 'Use timeline for technology evolution roadmaps. Use metrics for growth projections and adoption curves. Use comparison for "current state vs future state". Use bullets for paradigm shifts and emerging opportunities.',
      titleStyle: 'Forward-looking title that implies change or transformation. Subtitle is a bold prediction.',
      avoid: 'Avoid talking about the past. Everything should be about transformation, disruption, and the next frontier.',
    },
    minimalist: {
      tone: 'Thoughtful, precise, and refined. Strip everything to its essence. One key idea per slide, explained with perfect clarity. Think Apple keynote or Zen philosophy applied to business.',
      slideStyle: 'Prefer bullets with exactly 3 points (not 4). Use metrics only for your single most important number. Use quote for a central insight that defines the section. Avoid comparison — instead make a single strong statement per slide.',
      titleStyle: 'Minimal title — often just 2-4 words. Subtitle is a single elegant sentence that adds the essential context.',
      avoid: 'Never crowd a slide. If a point is not essential, cut it. Silence and white space are features.',
    },
    creative: {
      tone: 'Creative director or design thinking facilitator. Think laterally. Use metaphors, analogies, and unexpected angles to make the topic feel fresh. Audience is creative professionals or innovators.',
      slideStyle: 'Use quote slides for provocative reframes of conventional thinking. Use comparison for "conventional wisdom vs creative alternative". Use timeline for creative process or journey. Use bullets to present unconventional perspectives backed by insight.',
      titleStyle: 'Creative, metaphorical, or unexpected title. Subtitle provides the creative reframe or challenge.',
      avoid: 'Avoid corporate clichés. Never use "synergy", "pivot", or "leverage". Think like a creative, write like a poet, argue like a strategist.',
    },
    elegant: {
      tone: 'Luxury brand, premium consultancy, or high-end investment firm. Sophisticated, polished, and understated. The quality of the argument speaks for itself — no hype.',
      slideStyle: 'Use bullets for refined, measured insights with precise language. Use metrics for carefully chosen, authoritative statistics. Use comparison for nuanced analysis of options. Use quote for a distinguished perspective from a notable authority.',
      titleStyle: 'Elegant, considered title. Subtitle is a refined, nuanced statement — never obvious.',
      avoid: 'Avoid hyperbole, exclamation marks, and casual language. Never use slang or trendy buzzwords. Every word is chosen deliberately.',
    },
    tech: {
      tone: 'Product manager, CTO, or senior engineer presenting to a technical and business audience. Precise, systematic, and solution-focused. Balance technical depth with business impact.',
      slideStyle: 'Use metrics for system performance, user metrics, and business KPIs. Use timeline for product roadmap or sprint cycles. Use comparison for technical architecture trade-offs or platform comparisons. Use bullets for feature benefits tied to user problems.',
      titleStyle: 'Clear, technical title that states the problem or solution directly. Subtitle adds the business context or user impact.',
      avoid: 'Avoid vague tech buzzwords without substance. Every technical claim needs a metric or outcome. Avoid "cutting-edge" and "state-of-the-art" — show, don\'t tell.',
    },
    vintage: {
      tone: 'Thoughtful, classical, and rich with historical depth. Reference traditions, origins, and the proven wisdom of time. Audience appreciates craftsmanship, heritage, and depth over novelty.',
      slideStyle: 'Use timeline to show historical progression and evolution. Use quote for wisdom from established authorities or historical figures. Use comparison for "how it was done then vs now". Use bullets for principles that have stood the test of time.',
      titleStyle: 'Timeless, classical title. Subtitle references heritage, tradition, or the depth of the subject.',
      avoid: 'Avoid anything that feels rushed or disposable. Avoid trendy slang or modern buzzwords. Write as if for posterity.',
    },
    vibrant: {
      tone: 'High-energy, colourful, and enthusiastic. This is for a young audience, a consumer brand launch, a social media campaign, or a community event. Fun, accessible, and motivating.',
      slideStyle: 'Use metrics to celebrate wins and exciting numbers. Use bullets for actionable, energetic takeaways. Use comparison for relatable "before and after" transformations. Use quote for inspiring community voices or success stories.',
      titleStyle: 'Exciting, energetic title with an emoji or exclamation if appropriate. Subtitle creates excitement or poses a fun challenge.',
      avoid: 'Avoid corporate stiffness. Never be boring. Every slide should make the audience feel something — excited, inspired, or entertained.',
    },
  };

  const theme = themePersonalities[layoutTheme] || themePersonalities.corporate;

  /* ══════════════════════════════════════════════════════════════════
     AUDIENCE PROFILES
  ══════════════════════════════════════════════════════════════════ */
  const audienceProfile = audience === 'startup'
    ? `TARGET AUDIENCE: Business executives, investors, startup founders, and professionals.
       They care about: ROI, market size, competitive advantage, scalability, risk, and traction.
       They respond to: Data, evidence, clear business logic, and strong narratives.
       They are impatient: Every slide must earn its place. No filler.`
    : `TARGET AUDIENCE: Students, educators, and learners.
       They care about: Understanding, application, and relevance to their lives.
       They respond to: Clear explanations, concrete examples, relatable analogies, and practical takeaways.
       They need scaffolding: Build from simple to complex. Connect new ideas to what they already know.`;

  /* ══════════════════════════════════════════════════════════════════
     LAYOUT SELECTION LOGIC
     Tell Gemini exactly which layout to use for which type of content,
     based on the theme chosen by the user.
  ══════════════════════════════════════════════════════════════════ */
  const layoutSelectionGuide = `
LAYOUT SELECTION — choose the layout that best fits the content of each slide:

"title"    → ONLY for slide 1. Must have a compelling headline and a clear subtitle.

"bullets"  → For conceptual slides, insights, principles, recommendations, or analysis.
             Write 4 bullets. Each bullet is a COMPLETE SENTENCE (not a fragment).
             Each bullet makes ONE clear, specific, substantive point.
             Bullets must build on each other — they tell a mini-story together.

"metrics"  → For any slide with numbers, statistics, performance data, or quantitative proof.
             Must have 4 metrics. Each metric needs a REAL, SPECIFIC value (not "N/A" or "TBD").
             Label is short (1-4 words). Value is the number with units (e.g. "₦2.4B", "47%", "3.2x").
             If exact numbers are unknown, use credible estimates with a source note in the subtitle.

"comparison" → For contrasting two approaches, old vs new, pros vs cons, or two options.
               Must have 2 comparison pairs. Each pair has LEFT (the first option/current state)
               and RIGHT (the second option/future state). Each side is 2-3 complete sentences.
               The contrast must be SPECIFIC and MEANINGFUL — not generic.

"timeline"  → For processes, roadmaps, historical evolution, or step-by-step progressions.
              Must have 4 steps. Each step is a complete sentence describing a concrete phase,
              action, or milestone. Steps must be sequential and causally connected.

"quote"     → For a powerful insight, principle, or perspective that anchors a section.
              bullets[0] = The insight itself, written as a full quote in quotation marks.
                           It must be ORIGINAL and INSIGHTFUL — not a cliché.
              bullets[1] = Context: why this insight matters, backed by evidence or reasoning.
              bullets[2] = Implication: what this means for the audience specifically.

"closing"   → ONLY for the last slide. Title is always "Thank You".
              Subtitle is a memorable, theme-appropriate closing statement.
              Bullets are 4 clear next steps, contact points, or calls to action.`;

  /* ══════════════════════════════════════════════════════════════════
     DOCUMENT INSTRUCTION
  ══════════════════════════════════════════════════════════════════ */
  const docInstruction = docText ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE DOCUMENT — MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The slides MUST be built from the content below.
Extract real facts, data, arguments, and insights from the document.
Do NOT invent anything. Do NOT add external information.
Every slide title, bullet, metric, and step must trace back to this document.
"""
${docText.slice(0, 9000)}
"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : '';

  /* ══════════════════════════════════════════════════════════════════
     CONTENT QUALITY STANDARDS
  ══════════════════════════════════════════════════════════════════ */
  const qualityStandards = `
CONTENT QUALITY STANDARDS — every slide must meet all of these:

1. SPECIFICITY: No vague generalities. "Revenue grew significantly" is REJECTED.
   "Revenue grew 340% YoY from ₦180M to ₦792M" is ACCEPTED.

2. RELEVANCE: Every single point must directly serve the topic "${topic || 'the subject'}".
   If a point could appear in ANY presentation, it is too generic. Rewrite it.

3. NARRATIVE FLOW: Slides must tell a coherent story from beginning to end.
   Each slide should feel like the natural next chapter after the previous one.

4. PURPOSEFUL LAYOUT CHOICE: The layout type must be the RIGHT choice for the content.
   If the content is data-heavy, use metrics. If it contrasts two things, use comparison.
   Do not use bullets when a timeline or comparison would communicate better.

5. COMPLETE SENTENCES: Every bullet and step must be a grammatically complete sentence.
   "Increase revenue" is REJECTED. "Implementing a tiered pricing model increased revenue
   by 34% within the first two quarters." is ACCEPTED.

6. PROFESSIONAL POLISH: Read each slide aloud. If it sounds like a student guessing what
   a professional sounds like, rewrite it. It must sound like the actual expert.`;

  /* ══════════════════════════════════════════════════════════════════
     FULL PROMPT
  ══════════════════════════════════════════════════════════════════ */
  const prompt = `You are a world-class presentation strategist and content designer.
You write slides that are used in boardrooms, investor meetings, university lectures,
and major conferences. Your content is always specific, purposeful, and professional.

${docInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESENTATION BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Topic:        "${topic || 'Based on uploaded document'}"
Slide count:  ${slideCount} total (1 title + ${contentSlides} content + 1 closing)
Visual theme: ${layoutTheme?.toUpperCase() || 'CORPORATE'}
Theme tone:   ${theme.tone}
Theme style:  ${theme.slideStyle}
Title style:  ${theme.titleStyle}
Avoid:        ${theme.avoid}

${audienceProfile}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${layoutSelectionGuide}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${qualityStandards}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Return ONLY a valid JSON array. Nothing else.
- No markdown. No backticks. No explanations. No comments. Just the JSON array.
- Slide 1 layout MUST be "title"
- Slide ${slideCount} layout MUST be "closing"
- Every field in the schema must be populated — no empty strings, no empty arrays
- All text fields must be written in full — no placeholders, no "..." or "TBD"

JSON SCHEMA (one object per slide):
{
  "slideNumber": <integer 1 to ${slideCount}>,
  "layout": <"title" | "bullets" | "metrics" | "comparison" | "timeline" | "quote" | "closing">,
  "title": <string — the slide headline>,
  "subtitle": <string — supporting context line>,
  "bullets": [<string>, <string>, <string>, <string>],
  "metrics": [
    {"label": <string>, "value": <string>},
    {"label": <string>, "value": <string>},
    {"label": <string>, "value": <string>},
    {"label": <string>, "value": <string>}
  ],
  "comparison": [
    {"left": <string — 2-3 sentences>, "right": <string — 2-3 sentences>},
    {"left": <string — 2-3 sentences>, "right": <string — 2-3 sentences>}
  ],
  "steps": [<string>, <string>, <string>, <string>]
}

Now generate the ${slideCount} slides. Begin the JSON array immediately:`;

  /* ══════════════════════════════════════════════════════════════════
     CALL GEMINI — try models in order
  ══════════════════════════════════════════════════════════════════ */
  const MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
  ];

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`[Udara] Trying model: ${model} | Topic: "${topic}" | Theme: ${layoutTheme} | Slides: ${slideCount}`);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature:     0.65,  /* precise enough for quality, creative enough to avoid formulaic output */
              maxOutputTokens: 8192,
              topP:            0.85,
            }
          })
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.warn(`[Udara] ${model} → HTTP ${geminiRes.status}:`, errBody.slice(0, 300));
        lastError = `${model}: HTTP ${geminiRes.status}`;
        continue;
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        console.warn(`[Udara] ${model} → empty response`);
        lastError = `${model}: empty response`;
        continue;
      }

      /* Strip any markdown fences Gemini adds despite instructions */
      const cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/m,      '')
        .replace(/\s*```\s*$/,    '')
        .trim();

      let slides;
      try {
        slides = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn(`[Udara] ${model} → JSON parse failed:`, rawText.slice(0, 300));
        lastError = `${model}: JSON parse error`;
        continue;
      }

      if (!Array.isArray(slides) || slides.length < 3) {
        console.warn(`[Udara] ${model} → invalid structure`);
        lastError = `${model}: not a slides array`;
        continue;
      }

      /* Force correct layout on first and last slides */
      slides[0].layout                  = 'title';
      slides[slides.length - 1].layout  = 'closing';

      /* Defensive normalisation — ensure every field exists */
      slides = slides.map((slide, i) => ({
        slideNumber: i + 1,
        layout:      slide.layout      || 'bullets',
        title:       slide.title       || `Slide ${i + 1}`,
        subtitle:    slide.subtitle    || '',
        bullets:     Array.isArray(slide.bullets)    && slide.bullets.length    ? slide.bullets    : ['Content pending', 'Content pending', 'Content pending', 'Content pending'],
        metrics:     Array.isArray(slide.metrics)    && slide.metrics.length    ? slide.metrics    : [{label:'Metric 1',value:'—'},{label:'Metric 2',value:'—'},{label:'Metric 3',value:'—'},{label:'Metric 4',value:'—'}],
        comparison:  Array.isArray(slide.comparison) && slide.comparison.length ? slide.comparison : [{left:'',right:''},{left:'',right:''}],
        steps:       Array.isArray(slide.steps)      && slide.steps.length      ? slide.steps      : ['Step 1','Step 2','Step 3','Step 4'],
      }));

      console.log(`[Udara] ✅ ${model} → ${slides.length} slides generated for "${topic}"`);
      return res.status(200).json(slides);

    } catch (err) {
      console.warn(`[Udara] ${model} threw:`, err.message);
      lastError = `${model}: ${err.message}`;
    }
  }

  console.error('[Udara] All models failed. Last error:', lastError);
  return res.status(502).json({
    error:     'Generation failed — all models unavailable',
    lastError: lastError,
    fix:       'Verify GEMINI_API_KEY is active at aistudio.google.com'
  });
}
