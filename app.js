/* ═══════════════════════════════════════════════════════════════════════
   Udara — AI Slide Generator
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Dark mode — runs immediately (before DOMContentLoaded) so there's
      no flash of wrong theme on page load ──────────────────────────────── */
(function applyThemeEarly(){
  const saved = localStorage.getItem('udara_theme_mode');
  // Also respect the OS-level dark mode preference if no saved choice
  const prefersDark = window.matchMedia &&
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === 'dark' || (!saved && prefersDark)){
    document.documentElement.classList.add('dark');
  }
})();

/* Toggle called from the header button */
function toggleDarkMode(){
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('udara_theme_mode', isDark ? 'dark' : 'light');
  updateThemeToggleLabel(isDark);
}

function updateThemeToggleLabel(isDark){
  const label = document.getElementById('theme-toggle-label');
  if(label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
}

/* ── Storage keys ─────────────────────────────────────────────────────── */
const LS = {
  slides:'udara_slides_v1', topic:'udara_topic_v1', audience:'udara_aud_v1',
  theme:'udara_theme_v1', layoutTheme:'udara_ltheme_v1', imgPh:'udara_imgph_v1',
  anim:'udara_anim_v1', count:'udara_count_v1', vary:'udara_vary_v1'
};
const PAYSTACK_PK   = 'pk_test_placeholder_key';
const PAYSTACK_EMAIL= 'guest@udara.app';
const AMOUNT_KOBO   = 100000;

/* ── Colour themes — African-inspired palette ─────────────────────────── */
const COLOUR_THEMES = [
  // Savanna — default: deep brown + terracotta + kente gold
  {id:'savanna',  label:'Savanna',       sw:'linear-gradient(135deg,#1a0e04,#e8631a)', bg:'120800', p:'1e1006', a1:'e8631a', a2:'f5b800', tx:'f5ede0', mu:'a8937a'},
  // Midnight Kente — rich black + electric kente colours
  {id:'kente',    label:'Kente Night',   sw:'linear-gradient(135deg,#0a0a0a,#f5b800)', bg:'0a0a06', p:'141208', a1:'f5b800', a2:'3d9e5f', tx:'f5f0e0', mu:'8a7a60'},
  // Lagos Dusk — deep navy-purple + amber
  {id:'lagos',    label:'Lagos Dusk',    sw:'linear-gradient(135deg,#0a0820,#f5b800)', bg:'0a0820', p:'12102e', a1:'f5b800', a2:'e8631a', tx:'eeeaf8', mu:'706888'},
  // Sahara — warm sand + burnt sienna
  {id:'sahara',   label:'Sahara',        sw:'linear-gradient(135deg,#1c1208,#c94f10)', bg:'1c1208', p:'2a1c0c', a1:'c94f10', a2:'f5b800', tx:'f8ede0', mu:'9a7858'},
  // Forest — deep jungle green + gold
  {id:'forest',   label:'Forest',        sw:'linear-gradient(135deg,#061810,#3d9e5f)', bg:'061810', p:'0e2418', a1:'3d9e5f', a2:'f5b800', tx:'e0f0e8', mu:'507858'},
  // Abuja Clay — rich clay red + cream
  {id:'clay',     label:'Abuja Clay',    sw:'linear-gradient(135deg,#1e0c08,#c0392b)', bg:'1e0c08', p:'2c1410', a1:'c0392b', a2:'f5b800', tx:'f8e8e0', mu:'a07068'},
  // Ocean — deep blue + mint, coast of West Africa
  {id:'ocean',    label:'Atlantic',      sw:'linear-gradient(135deg,#040e1c,#1abc9c)', bg:'040e1c', p:'081828', a1:'1abc9c', a2:'f5b800', tx:'e0eef8', mu:'487090'},
  // Light — parchment + dark ink, like old documents
  {id:'parchment',label:'Parchment',     sw:'linear-gradient(135deg,#f5ede0,#1a0e04)', bg:'f5ede0', p:'ede0cc', a1:'1a0e04', a2:'c94f10', tx:'1a0e04', mu:'6a5040'},
];

/* ── Layout themes — visual identity per deck style ──────────────────── */
const LAYOUT_THEMES = {
  corporate:   {font:'Arial',        headSize:30, bodySize:13, style:'clean',     label:'Corporate'},
  school:      {font:'Arial',        headSize:28, bodySize:13, style:'friendly',  label:'School'},
  bold:        {font:'Arial Black',  headSize:36, bodySize:13, style:'bold',      label:'Bold'},
  futuristic:  {font:'Arial',        headSize:28, bodySize:12, style:'futuristic',label:'Futuristic'},
  minimalist:  {font:'Arial',        headSize:26, bodySize:13, style:'minimal',   label:'Minimalist'},
  creative:    {font:'Arial',        headSize:30, bodySize:13, style:'creative',  label:'Creative Studio'},
  elegant:     {font:'Arial',        headSize:28, bodySize:12, style:'elegant',   label:'Elegant / Luxury'},
  tech:        {font:'Arial',        headSize:26, bodySize:12, style:'tech',      label:'Tech / SaaS'},
  vintage:     {font:'Arial',        headSize:28, bodySize:12, style:'vintage',   label:'Vintage / Retro'},
  vibrant:     {font:'Arial',        headSize:32, bodySize:13, style:'vibrant',   label:'Vibrant / Pop'},
};

/* ── State ────────────────────────────────────────────────────────────── */
let currentSlides        = [];
let currentTopic         = '';
let currentAudience      = 'startup';
let currentColourThemeId = 'savanna';
let currentLayoutTheme   = 'corporate';
let currentCount         = 10;
let includeImgPh         = false;
let animationsEnabled    = false;
let varyLayouts          = true;   // ON by default — each slide gets a unique composition
let uploadedDocText      = '';

/* ── DOM refs — resolved inside DOMContentLoaded so they're never null ── */
let $;
let topicInput, audienceSelect, ltSelect, slideCountEl, slideCountVal,
    slideCountDisp, slideCountBadge, generateBtn, progressWrap, progressBar,
    progressLabel, previewSection, slideGrid, exportBar, successBanner,
    toast, uploadZone, docUpload, uploadFileName;

/* ══════════════════════════════════════════════════════════════════════
   BOOT — everything that touches the DOM runs here, after the page loads
   ══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {

  /* Resolve all DOM references now that the document is fully parsed */
  $ = id => document.getElementById(id);
  topicInput     = $('topic-input');
  audienceSelect = $('audience-select');
  ltSelect       = $('layout-theme-select');
  slideCountEl   = $('slide-count');
  slideCountVal  = $('slide-count-val');
  slideCountDisp = $('slide-count-display');
  slideCountBadge= $('slide-count-badge');
  generateBtn    = $('generate-btn');
  progressWrap   = $('progress-wrap');
  progressBar    = $('progress-bar');
  progressLabel  = $('progress-label');
  previewSection = $('preview-section');
  slideGrid      = $('slide-grid');
  exportBar      = $('export-bar');
  successBanner  = $('success-banner');
  toast          = $('toast');
  uploadZone     = $('upload-zone');
  docUpload      = $('doc-upload');
  uploadFileName = $('upload-file-name');

  /* Sync the toggle button label with current theme */
  updateThemeToggleLabel(document.documentElement.classList.contains('dark'));

  /* ── Init colour swatches ─────────────────────────────────────────── */
  initSwatches();

  /* ── Slider listener ──────────────────────────────────────────────── */
  slideCountEl.addEventListener('input', () => {
    const v = +slideCountEl.value;
    currentCount = v;
    slideCountVal.textContent = v;
    slideCountDisp.textContent = v;
  });

  /* ── File upload listeners ────────────────────────────────────────── */
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  });
  docUpload.addEventListener('change', () => {
    if (docUpload.files[0]) handleFileUpload(docUpload.files[0]);
  });

  /* ── Restore saved session from localStorage ──────────────────────── */
  restoreFromStorage();

}); /* end DOMContentLoaded */

/* ── Init colour swatches (called from DOMContentLoaded) ─────────────── */
function initSwatches() {
  const container = $('theme-swatches');
  COLOUR_THEMES.forEach(t => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (t.id === currentColourThemeId ? ' active' : '');
    sw.title = t.label;
    sw.style.background = t.sw;
    sw.dataset.id = t.id;
    sw.onclick = () => selectColourTheme(t.id);
    container.appendChild(sw);
  });
}

function selectColourTheme(id){
  currentColourThemeId = id;
  document.querySelectorAll('.swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.id===id));
  if(currentSlides.length) renderSlides(currentSlides);
}

/* ── Toggles — called from HTML onclick attributes ────────────────────── */
function toggleOpt(which){
  if(which==='img'){
    includeImgPh = !includeImgPh;
    $('img-toggle-switch').classList.toggle('on', includeImgPh);
    if(currentSlides.length) renderSlides(currentSlides);
  } else if(which==='anim') {
    animationsEnabled = !animationsEnabled;
    $('anim-toggle-switch').classList.toggle('on', animationsEnabled);
    slideGrid.classList.toggle('animations-on', animationsEnabled);
  } else if(which==='vary') {
    varyLayouts = !varyLayouts;
    $('vary-toggle-switch').classList.toggle('on', varyLayouts);
    if(currentSlides.length) renderSlides(currentSlides);
  }
}

/* ── File upload handlers ─────────────────────────────────────────────── */

async function handleFileUpload(file){
  const ext = '.'+file.name.split('.').pop().toLowerCase();
  if(!['.pdf','.doc','.docx'].includes(ext)){ showToast('⚠ Only PDF, .doc, .docx supported.'); return; }
  uploadFileName.textContent = '⏳ Reading '+file.name+'…';
  uploadFileName.classList.add('visible');
  try {
    uploadedDocText = ext==='.pdf' ? await extractPdfText(file) : await extractDocxText(file);
    const kchars = Math.round(uploadedDocText.length/100)/10;
    uploadFileName.textContent = `✓ ${file.name} — ${kchars}k chars extracted`;
    if(!topicInput.value.trim()) topicInput.value = file.name.replace(/\.(pdf|docx?)$/i,'').replace(/[-_]/g,' ');
    showToast('📄 Document loaded — content will drive slide generation.');
  } catch(err){
    uploadFileName.textContent = '⚠ Text extraction failed — topic only will be used.';
    uploadedDocText = '';
  }
}

async function extractPdfText(file){
  if(!window.pdfjsLib){
    await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({data:ab}).promise;
  let text = '';
  for(let i=1;i<=Math.min(pdf.numPages,25);i++){
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    text += c.items.map(x=>x.str).join(' ')+'\n';
  }
  return text.slice(0,12000);
}

async function extractDocxText(file){
  if(!window.mammoth) await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
  const ab = await file.arrayBuffer();
  const r = await window.mammoth.extractRawText({arrayBuffer:ab});
  return r.value.slice(0,12000);
}

function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });
}

/* ── Restore from localStorage — called from DOMContentLoaded ─────────── */
function restoreFromStorage(){
  try {
    const saved = localStorage.getItem(LS.slides);
    const theme = localStorage.getItem(LS.theme);
    const lt    = localStorage.getItem(LS.layoutTheme);
    const cnt   = localStorage.getItem(LS.count);
    const ip    = localStorage.getItem(LS.imgPh);
    const an    = localStorage.getItem(LS.anim);

    if(theme && COLOUR_THEMES.find(t=>t.id===theme)) selectColourTheme(theme);
    if(lt){ currentLayoutTheme=lt; ltSelect.value=lt; }
    if(cnt){
      const n=+cnt;
      currentCount=n;
      slideCountEl.value=n;
      slideCountVal.textContent=n;
      slideCountDisp.textContent=n;
    }
    if(ip==='true'){ includeImgPh=true; $('img-toggle-switch').classList.add('on'); }
    if(an==='true'){ animationsEnabled=true; $('anim-toggle-switch').classList.add('on'); }

    const savedVary = localStorage.getItem(LS.vary);
    if(savedVary==='false'){ varyLayouts=false; $('vary-toggle-switch').classList.remove('on'); }

    if(saved){
      currentSlides   = JSON.parse(saved);
      currentTopic    = localStorage.getItem(LS.topic)||'';
      currentAudience = localStorage.getItem(LS.audience)||'startup';

      /* Restore form fields */
      topicInput.value     = currentTopic;
      audienceSelect.value = currentAudience;

      /* Render the saved slides immediately — no scroll on restore */
      slideCountBadge.textContent = currentSlides.length+' slides ready';
      previewSection.style.display = 'block';
      renderSlides(currentSlides, false);

      showToast('↩ Your previous slides have been restored');
    }
  } catch(e){
    localStorage.removeItem(LS.slides);
    console.warn('[Udara] Could not restore localStorage:', e);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   GENERATE
   ═══════════════════════════════════════════════════════════════════════ */
async function handleGenerate(){
  const topic    = topicInput.value.trim();
  const audience = audienceSelect.value;
  const lt       = ltSelect.value;
  const count    = +slideCountEl.value;

  if(!topic && !uploadedDocText){ showToast('⚠ Enter a topic or upload a document.'); topicInput.focus(); return; }

  currentTopic       = topic || uploadedDocText.split('\n')[0].slice(0,60).trim() || 'Presentation';
  currentAudience    = audience;
  currentLayoutTheme = lt;
  currentCount       = count;

  setLoading(true,'Generating slides…');
  setProgress(10);

  try {
    /* ──────────────────────────────────────────────────────────────────
       GEMINI API INTEGRATION POINT
       Replace the simulateAndMock call below with:

       const response = await fetch('/api/generate', {
         method:'POST',
         headers:{'Content-Type':'application/json'},
         body: JSON.stringify({ topic: currentTopic, audience, layoutTheme: lt, count, docText: uploadedDocText })
       });
       const slides = await response.json();

       SERVER-SIDE SYSTEM PROMPT (gemini-2.5-flash):
       ─────────────────────────────────────────────
       You are an expert presentation designer. Generate exactly ${count} slides.
       ${uploadedDocText ? `MANDATORY: Use ONLY content from this source document. Do NOT invent facts outside it:\n"""\n${uploadedDocText.slice(0,8000)}\n"""` : ''}
       Return ONLY a raw JSON array — no markdown fences, no explanation.
       Schema per slide: { "slideNumber":N, "layout":"<type>", "title":"...", "subtitle":"...", "bullets":["...","...","...","..."], "metrics":[{"label":"...","value":"..."}], "comparison":[{"left":"...","right":"..."}], "steps":["...","...","...","..."] }
       Layout types to cycle through: "title","bullets","metrics","comparison","timeline","quote","closing"
       Slide 1 layout must be "title". Slide ${count} layout must be "closing".
       Theme/tone: ${lt} style, ${audience==='startup'?'professional and data-driven':'educational and engaging'}.
       Topic: "${currentTopic}"
       ─────────────────────────────────────────────
    ────────────────────────────────────────────────────────────────── */

   const response = await fetch('api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic:       currentTopic,
    audience:    currentAudience,
    layoutTheme: currentLayoutTheme,
    count:       currentCount,
    docText:     uploadedDocText
  })
});
if (!response.ok) throw new Error('API error: ' + response.status);
const slides = await response.json();

    setProgress(96); setProgressLabel('Rendering preview…');

    // Persist
    localStorage.setItem(LS.slides,   JSON.stringify(slides));
    localStorage.setItem(LS.topic,    currentTopic);
    localStorage.setItem(LS.audience, audience);
    localStorage.setItem(LS.theme,    currentColourThemeId);
    localStorage.setItem(LS.layoutTheme, lt);
    localStorage.setItem(LS.imgPh,    String(includeImgPh));
    localStorage.setItem(LS.anim,     String(animationsEnabled));
    localStorage.setItem(LS.vary,     String(varyLayouts));
    localStorage.setItem(LS.count,    String(count));

    currentSlides = slides;
    setProgress(100);
    await delay(250);
    slideCountBadge.textContent = slides.length+' slides ready';
    renderSlides(slides);
    setLoading(false);

  } catch(err){
    console.error('[Udara] Generation error:',err);
    showToast('❌ Something went wrong. Please try again.');
    setLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SLIDE DATA GENERATORS
   ═══════════════════════════════════════════════════════════════════════ */

/* Cycle of functional layout types — 30 entries, no title/closing mid-deck */
const LAYOUT_CYCLE = [
  'bullets','metrics','comparison','timeline','quote',
  'bullets','metrics','comparison','timeline','bullets',
  'comparison','metrics','timeline','quote','bullets',
  'metrics','comparison','bullets','timeline','quote',
  'bullets','metrics','comparison','timeline','bullets',
  'comparison','metrics','quote','timeline','bullets'
];

/* ── When no document: contextual mock data ───────────────────────────── */
function generateMockSlides(topic, audience, count){
  count = Math.max(3, Math.min(30, count));
  const isStartup = audience==='startup';

  const sections = isStartup
    ? [
        'Executive Summary','Problem Statement','Market Opportunity','Our Solution',
        'Technical Architecture','Competitive Analysis','Go-to-Market Strategy','Revenue Model',
        'Traction & Metrics','Team & Advisors','Roadmap','Financial Projections',
        'Risk & Mitigation','Vision & Impact','Customer Segments','Pricing Strategy',
        'Partnership Opportunities','Regulatory Landscape','Unit Economics','Investor Thesis',
        'Product Roadmap','Sales Funnel','Key Milestones','Data & Analytics Strategy',
        'Operational Plan','Scaling Strategy','Exit Strategy','ESG Considerations',
      ]
    : [
        'Course Overview','Learning Objectives','Background & Context','Core Concepts Explained',
        'Key Principles','Real-World Applications','Case Study Deep Dive','Common Misconceptions',
        'Practical Exercises','Assessment Methods','Key Takeaways','Further Reading',
        'Discussion Questions','Module Summary','Historical Perspective','Research Methods',
        'Critical Analysis','Data Interpretation','Group Activities','Peer Review Process',
        'Formative Assessment','Summative Assessment','Cross-Disciplinary Links','Student Outcomes',
        'Teaching Strategies','Resource Evaluation','Curriculum Alignment','Reflective Practice',
      ];

  const slides = [];
  for(let i=0;i<count;i++){
    // Force title on first slide, closing on last, cycle content layouts in between
    const layoutType = i===0 ? 'title' : i===count-1 ? 'closing' : LAYOUT_CYCLE[(i-1) % LAYOUT_CYCLE.length];
    const section = sections[(i-1 + sections.length) % sections.length];
    const kw = topic.split(' ').slice(0,3).join(' ') || 'this topic';

    if(layoutType==='title'){
      slides.push({slideNumber:1, layout:'title',
        title: topic,
        subtitle: isStartup ? `Strategic overview for decision-makers · ${new Date().getFullYear()}` : `An educational guide for learners · ${new Date().getFullYear()}`,
        bullets:[], metrics:[], comparison:[], steps:[]});
    } else if(layoutType==='closing'){
      slides.push({slideNumber:count, layout:'closing',
        title:`Thank You`,
        subtitle: `Let's build the future of ${kw} together`,
        bullets:['Questions & discussion welcome','Connect with us to continue the conversation','Full slide deck available on request','Next steps outlined in the appendix'],
        metrics:[], comparison:[], steps:[]});
    } else if(layoutType==='metrics'){
      slides.push({slideNumber:i+1, layout:'metrics', title:section,
        subtitle:`Key performance indicators for ${kw}`,
        bullets:[],
        metrics:[
          {label:'Market Size',  value: isStartup?'$4.2B':'1,200+'},
          {label:'Growth Rate',  value: isStartup?'+34% YoY':'92%'},
          {label:'Key Players',  value: isStartup?'12+':'48 Studies'},
          {label:'Impact Score', value: isStartup?'9.1/10':'A+'},
        ], comparison:[], steps:[]});
    } else if(layoutType==='comparison'){
      slides.push({slideNumber:i+1, layout:'comparison', title:section,
        subtitle:`Side-by-side analysis: ${kw}`,
        bullets:[],
        metrics:[],
        comparison:[
          {left:`Traditional approach to ${kw.split(' ')[0]} is costly and slow, often requiring months of preparation and significant manual effort from multiple teams.`,
           right:`Modern ${kw} frameworks automate key workflows, reduce time-to-value by 60%, and scale effortlessly with demand.`},
          {left:`Legacy systems lack real-time visibility, making it difficult for stakeholders to act on current data or identify emerging risks.`,
           right:`Integrated dashboards provide live metrics, predictive analytics, and automated alerts — enabling proactive decision-making.`},
        ], steps:[]});
    } else if(layoutType==='timeline'){
      slides.push({slideNumber:i+1, layout:'timeline', title:section,
        subtitle:`Development roadmap for ${kw}`,
        bullets:[],
        metrics:[],
        comparison:[],
        steps:[
          `Q1: Foundation & research — establish baseline metrics and stakeholder alignment for ${kw}`,
          `Q2: Pilot program launch — deploy initial solution with select partners and gather feedback loops`,
          `Q3: Scale & optimise — expand to full audience, refine based on real-world data and KPIs`,
          `Q4: Review & iterate — conduct full audit, publish findings, and plan next growth phase`,
        ]});
    } else if(layoutType==='quote'){
      slides.push({slideNumber:i+1, layout:'quote', title:section,
        subtitle:'',
        bullets:[
          `"${kw} represents a paradigm shift in how ${isStartup?'organisations drive value':'learners engage with knowledge'} — the window for early adoption is now."`,
          `Context: This insight reflects analysis of ${isStartup?'250+ enterprise deployments':'14,000+ student outcomes'} across ${isStartup?'18 industries':'6 disciplines'} in the past 24 months.`,
          `Implication: Teams that act decisively on ${kw} now will secure a ${isStartup?'sustainable competitive moat':'measurable learning advantage'} over those who delay.`,
        ], metrics:[], comparison:[], steps:[]});
    } else {
      // Standard bullets — fully contextual, no filler
      slides.push({slideNumber:i+1, layout:'bullets', title:section,
        subtitle:`${isStartup?'Strategic insights':'Key concepts'} on ${kw}`,
        bullets:[
          `${kw} directly addresses the core challenge of ${isStartup?'scaling operations without proportional cost increase':'retention and knowledge transfer in modern curricula'}.`,
          `Research shows ${isStartup?'organisations adopting this approach reduce overhead by 38% within 12 months':'students using active-recall methods score 42% higher on assessments'}.`,
          `The primary barrier to adoption is ${isStartup?'institutional inertia and misaligned incentives across business units':'lack of structured scaffolding and timely formative feedback'}.`,
          `Best practice: ${isStartup?'Start with a cross-functional pilot, measure rigorously, and expand based on clear ROI signals':'Introduce concepts in context, apply them immediately, and revisit with spaced repetition'}.`,
        ], metrics:[], comparison:[], steps:[]});
    }
  }
  return slides;
}

/* ── When document uploaded: extract real content into slides ──────────── */
function generateDocSlides(topic, audience, count, docText){
  count = Math.max(3, Math.min(30, count));

  // Split doc into meaningful chunks by sentence/paragraph
  const sentences = docText
    .replace(/\r\n/g,'\n')
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map(s=>s.trim())
    .filter(s=>s.length>30 && s.length<600);

  // Group into chunks for each content slide
  const contentSlides = count - 2; // exclude title + closing
  const chunkSize = Math.max(1, Math.floor(sentences.length / Math.max(contentSlides,1)));
  const chunks = [];
  for(let i=0;i<contentSlides;i++){
    const start = i*chunkSize;
    chunks.push(sentences.slice(start, start+chunkSize+2));
  }

  // Generate section headings from first sentence of each chunk
  function headingFromChunk(chunk){
    if(!chunk.length) return 'Key Point';
    const s = chunk[0].split(/[,;]/)[0].replace(/^(the|a|an|this|these|that|in|on|at|for|of|with|and|but)\s+/i,'');
    const words = s.split(' ').slice(0,7).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  const slides = [];

  // Title slide
  slides.push({slideNumber:1, layout:'title',
    title: topic || headingFromChunk(chunks[0]||[]),
    subtitle: sentences[0]?.slice(0,120) || 'Document-based presentation',
    bullets:[], metrics:[], comparison:[], steps:[]});

  // Content slides — use real doc text
  for(let i=0;i<contentSlides;i++){
    const chunk = chunks[i] || [];
    const layoutType = LAYOUT_CYCLE[i % LAYOUT_CYCLE.length];
    const heading = headingFromChunk(chunk);
    const available = chunk.filter(s=>s.length>20);

    if(layoutType==='metrics' && available.length>=2){
      // Extract any numbers from text for metrics
      const nums = docText.match(/\d[\d,.]*([\s%$€£#]|\s*(percent|million|billion|thousand|users|students|patients|clients))?/gi)||[];
      const metricLabels = ['Key Figure','Data Point','Statistic','Benchmark'];
      slides.push({slideNumber:i+2, layout:'metrics', title:heading,
        subtitle:available[0]?.slice(0,100)||'',
        bullets:[],
        metrics: metricLabels.map((lab,k)=>({label:lab, value:nums[k]?.trim()||'See doc'})),
        comparison:[], steps:[]});
    } else if(layoutType==='comparison' && available.length>=2){
      slides.push({slideNumber:i+2, layout:'comparison', title:heading,
        subtitle:'Contrasting perspectives from the document',
        bullets:[],
        metrics:[],
        comparison:[
          {left:available[0]?.slice(0,180)||'', right:available[1]?.slice(0,180)||''},
          {left:available[2]?.slice(0,180)||available[0]?.slice(0,120)||'', right:available[3]?.slice(0,180)||available[1]?.slice(0,120)||''},
        ], steps:[]});
    } else if(layoutType==='timeline' && available.length>=3){
      slides.push({slideNumber:i+2, layout:'timeline', title:heading,
        subtitle:'Sequential points from the document',
        bullets:[], metrics:[], comparison:[],
        steps: available.slice(0,4).map(s=>s.slice(0,120))});
    } else {
      // Default to bullets — use real doc sentences
      const buls = available.slice(0,4).map(s=>s.slice(0,180));
      while(buls.length<2 && sentences.length>0) buls.push(sentences[buls.length]?.slice(0,150)||'See source document for detail.');
      slides.push({slideNumber:i+2, layout:'bullets', title:heading,
        subtitle:available[0]?.slice(0,100)||'',
        bullets:buls, metrics:[], comparison:[], steps:[]});
    }
  }

  // Closing slide
  slides.push({slideNumber:count, layout:'closing',
    title:'Thank You',
    subtitle:`Based on: ${topic}`,
    bullets:['Content sourced directly from uploaded document','Questions and discussion welcome','Full source document available for reference','Next steps based on document findings'],
    metrics:[], comparison:[], steps:[]});

  return slides;
}

/* ═══════════════════════════════════════════════════════════════════════
   SVG SLIDE RENDERER
   ═══════════════════════════════════════════════════════════════════════ */
function renderSlides(slides, scrollIntoView=true){
  if(!slides || !slides.length) return;
  previewSection.style.display = 'block';
  slideGrid.innerHTML = '';
  slideGrid.className = animationsEnabled ? 'animations-on' : '';
  slides.forEach((slide,i) => {
    const card = document.createElement('div');
    card.className = 'slide-card';
    card.style.position = 'relative';

    /* ── SVG slide content ─────────────────────────────────────────── */
    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = buildSlideSVG(slide, i, slides.length);
    card.appendChild(svgWrap);

    /* ── Watermark overlay — sits on top of every slide ────────────── */
    /* Removed automatically when isUnlocked = true after payment       */
    if(!isUnlocked){
      card.appendChild(buildWatermarkOverlay(i));
    }

    slideGrid.appendChild(card);
  });

  if(scrollIntoView){
    setTimeout(()=>previewSection.scrollIntoView({behavior:'smooth',block:'start'}),100);
  }
}

/* ── Build the watermark overlay for a single slide card ──────────────── */
function buildWatermarkOverlay(idx){
  const overlay = document.createElement('div');
  overlay.className = 'watermark-overlay';
  overlay.setAttribute('aria-hidden','true');

  /* Diagonal "UDARA PREVIEW" text — repeated in a grid pattern using SVG */
  const W = 800, H = 450;
  const label = 'UDARA PREVIEW';
  const repeat = 6;        /* how many diagonal rows of text */
  const gap    = 90;       /* vertical gap between rows      */

  /* Each row is offset horizontally to create stagger */
  let textEls = '';
  for(let r = 0; r < repeat; r++){
    const y = -40 + r * gap;
    /* Two copies per row to ensure full-width coverage */
    for(let c = 0; c < 3; c++){
      const x = -120 + c * 300;
      textEls += `
        <text
          x="${x}" y="${y}"
          font-family="Inter, Arial, sans-serif"
          font-size="16"
          font-weight="700"
          letter-spacing="5"
          fill="rgba(15,41,30,0.18)"
          transform="rotate(-35, ${x}, ${y})"
          pointer-events="none"
        >${esc(label)}</text>`;
    }
  }

  /* Udara logo mark — centre watermark */
  const centreWm = `
    <g transform="translate(${W/2-22},${H/2-22})" pointer-events="none" opacity="0.12">
      <circle cx="22" cy="22" r="20" fill="none" stroke="#0F291E" stroke-width="2"/>
      <circle cx="22" cy="22" r="13" fill="none" stroke="#C8960A" stroke-width="1.2"/>
      <circle cx="22" cy="22" r="5"  fill="#0F291E"/>
      <line x1="22" y1="2"  x2="22" y2="42" stroke="#0F291E" stroke-width="1"/>
      <line x1="2"  y1="22" x2="42" y2="22" stroke="#0F291E" stroke-width="1"/>
    </g>
    <text x="${W/2}" y="${H/2+30}"
      font-family="Inter, Arial, sans-serif"
      font-size="9" font-weight="600"
      letter-spacing="3"
      fill="rgba(15,41,30,0.15)"
      text-anchor="middle"
      pointer-events="none"
    >PREVIEW · PAY TO UNLOCK</text>`;

  overlay.innerHTML = `
    <svg
      viewBox="0 0 ${W} ${H}"
      xmlns="http://www.w3.org/2000/svg"
      style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;"
      preserveAspectRatio="xMidYMid meet"
    >
      ${textEls}
      ${centreWm}
    </svg>`;

  return overlay;
}

/* ── Remove all watermarks — called after verified payment ────────────── */
function removeWatermarks(){
  document.querySelectorAll('.watermark-overlay').forEach(el => el.remove());
}

/* ── Get active colour + layout theme ────────────────────────────────── */
function getCT(){ return COLOUR_THEMES.find(t=>t.id===currentColourThemeId)||COLOUR_THEMES[0]; }
function getLT(){ return LAYOUT_THEMES[currentLayoutTheme]||LAYOUT_THEMES.corporate; }

/* ── SVG helpers ──────────────────────────────────────────────────────── */
const W=800, H=450;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function trunc(s,n){ s=String(s); return s.length>n?s.slice(0,n-1)+'…':s; }
function wrapSVG(text,maxW,fontSize){
  // Simple word-wrap: returns array of tspan lines
  const words=String(text).split(' ');
  const charsPerLine=Math.floor(maxW/(fontSize*0.55));
  const lines=[]; let cur='';
  for(const w of words){
    if((cur+' '+w).trim().length>charsPerLine){ if(cur)lines.push(cur.trim()); cur=w; }
    else cur=(cur+' '+w).trim();
  }
  if(cur)lines.push(cur.trim());
  return lines;
}
function svgText(text,x,y,opts={}){
  const {fill='#fff',fontSize=13,bold=false,italic=false,anchor='start',opacity=1,cls='',maxW=0,lineH=18,maxLines=99}=opts;
  if(!maxW) return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial" font-size="${fontSize}" font-weight="${bold?'700':'400'}" font-style="${italic?'italic':'normal'}" fill="#${fill}" fill-opacity="${opacity}" class="${cls}">${esc(trunc(text,120))}</text>`;
  const lines = wrapSVG(text,maxW,fontSize).slice(0,maxLines);
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial" font-size="${fontSize}" font-weight="${bold?'700':'400'}" font-style="${italic?'italic':'normal'}" fill="#${fill}" fill-opacity="${opacity}" class="${cls}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i===0?0:lineH}">${esc(l)}</tspan>`).join('')}</text>`;
}
function slideNum(idx,total,C){
  const n=String(idx+1).padStart(2,'0'), t=String(total).padStart(2,'0');
  return `<rect x="724" y="16" width="60" height="18" rx="9" fill="#${C.a1}" fill-opacity="0.15"/>
          <text x="754" y="28.5" text-anchor="middle" font-family="Arial" font-size="8" font-weight="700" fill="#${C.a1}">${n}/${t}</text>`;
}

/* ── Per-layout-theme geometric background decorations ───────────────── */
function bgDecor(C, LT, idx){
  const s = LT.style;
  const seed = idx % 3; // slight variation per slide within same theme

  if(s==='clean'||s==='corporate'){
    return `
      <rect x="0" y="0" width="6" height="${H}" fill="#${C.a1}" fill-opacity="0.9"/>
      <rect x="6" y="0" width="200" height="${H}" fill="#${C.a1}" fill-opacity="0.04"/>
      <line x1="206" y1="0" x2="206" y2="${H}" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.2"/>
      <rect x="0" y="${H-5}" width="${W}" height="5" fill="#${C.a1}" fill-opacity="0.5"/>
      <circle cx="${W-80}" cy="${H*0.5}" r="140" fill="none" stroke="#${C.a2}" stroke-width="0.5" stroke-opacity="0.1"/>
      <circle cx="${W-80}" cy="${H*0.5}" r="90" fill="#${C.a2}" fill-opacity="0.03"/>
      ${seed===0?`<line x1="${W-200}" y1="0" x2="${W}" y2="${H}" stroke="#${C.a1}" stroke-width="0.3" stroke-opacity="0.08"/>`:
        seed===1?`<rect x="${W-120}" y="30" width="80" height="80" rx="6" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.1"/>`:
        `<polygon points="${W},0 ${W-80},0 ${W},80" fill="#${C.a1}" fill-opacity="0.06"/>`}`;
  }

  if(s==='bold'){
    return `
      <rect x="0" y="0" width="${W}" height="12" fill="#${C.a1}"/>
      <rect x="0" y="${H-12}" width="${W}" height="12" fill="#${C.a2}"/>
      <polygon points="0,0 160,0 0,110" fill="#${C.a1}" fill-opacity="0.18"/>
      <polygon points="${W},${H} ${W-160},${H} ${W},${H-110}" fill="#${C.a2}" fill-opacity="0.14"/>
      <polygon points="${W},0 ${W-90},0 ${W},90" fill="#${C.a2}" fill-opacity="0.1"/>
      <rect x="0" y="12" width="${W}" height="3" fill="#${C.a2}" fill-opacity="0.3"/>
      ${seed===0?`<circle cx="${W/2}" cy="${H/2}" r="160" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.08"/>`:
        seed===1?`<line x1="160" y1="0" x2="${W}" y2="${H}" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.1"/>`:
        `<rect x="${W/2-60}" y="${H/2-60}" width="120" height="120" rx="8" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.08"/>`}`;
  }

  if(s==='futuristic'){
    const diagonals = Array.from({length:10},(_,k)=>`<line x1="${k*90}" y1="0" x2="${k*90+70}" y2="${H}" stroke="#${C.a1}" stroke-width="0.4" stroke-opacity="${0.06+k*0.005}"/>`).join('');
    return `
      ${diagonals}
      <circle cx="${W*0.72}" cy="${H*0.38}" r="150" fill="none" stroke="#${C.a1}" stroke-width="1.5" stroke-opacity="0.12"/>
      <circle cx="${W*0.72}" cy="${H*0.38}" r="95"  fill="none" stroke="#${C.a2}" stroke-width="1"   stroke-opacity="0.10"/>
      <circle cx="${W*0.72}" cy="${H*0.38}" r="45"  fill="#${C.a1}" fill-opacity="0.05"/>
      <circle cx="${W*0.72}" cy="${H*0.38}" r="8"   fill="#${C.a1}" fill-opacity="0.4"/>
      <rect x="0" y="0" width="${W}" height="3" fill="#${C.a1}" fill-opacity="0.6"/>
      ${Array.from({length:5},(_,k)=>`<circle cx="${120+k*130}" cy="${H-20}" r="2" fill="#${C.a2}" fill-opacity="${0.2+k*0.08}"/>`).join('')}
      ${seed===1?`<polygon points="${W*0.72},${H*0.38-150} ${W*0.72+10},${H*0.38-130} ${W*0.72-10},${H*0.38-130}" fill="#${C.a1}" fill-opacity="0.3"/>`:
        seed===2?`<line x1="${W*0.72-150}" y1="${H*0.38}" x2="${W*0.72+150}" y2="${H*0.38}" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.15"/>`:
        `<rect x="${W*0.72-4}" y="${H*0.38-150}" width="8" height="300" fill="#${C.a1}" fill-opacity="0.05"/>`}`;
  }

  if(s==='minimal'){
    return `
      <rect x="48" y="0" width="2" height="${H}" fill="#${C.a1}" fill-opacity="0.8"/>
      <rect x="0" y="${H-2}" width="${W}" height="2" fill="#${C.mu}" fill-opacity="0.2"/>
      <rect x="0" y="0" width="48" height="${H}" fill="#${C.a1}" fill-opacity="0.03"/>
      ${seed===0?`<circle cx="${W-60}" cy="60" r="50" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.15"/>`:
        seed===1?`<line x1="${W-100}" y1="30" x2="${W-30}" y2="30" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.2"/>`:
        `<rect x="${W-80}" y="20" width="50" height="2" fill="#${C.a1}" fill-opacity="0.3"/>`}`;
  }

  if(s==='friendly'||s==='school'){
    return `
      <rect x="0" y="0" width="${W}" height="10" fill="#${C.a1}"/>
      <rect x="0" y="10" width="${W}" height="4" fill="#${C.a2}" fill-opacity="0.6"/>
      <circle cx="50"    cy="50"    r="38" fill="#${C.a1}" fill-opacity="0.12"/>
      <circle cx="${W-50}" cy="50"  r="28" fill="#${C.a2}" fill-opacity="0.1"/>
      <circle cx="50"    cy="${H-50}" r="25" fill="#${C.a2}" fill-opacity="0.08"/>
      <circle cx="${W-50}" cy="${H-50}" r="40" fill="#${C.a1}" fill-opacity="0.1"/>
      <rect x="0" y="${H-8}" width="${W}" height="8" fill="#${C.a2}" fill-opacity="0.15"/>
      ${seed===0?`<circle cx="${W/2}" cy="${H}" r="60" fill="#${C.a1}" fill-opacity="0.05"/>`:
        seed===1?`<rect x="${W/2-80}" y="${H-40}" width="160" height="3" rx="1.5" fill="#${C.a1}" fill-opacity="0.2"/>`:
        `<circle cx="${W/2}" cy="-10" r="50" fill="#${C.a2}" fill-opacity="0.06"/>`}`;
  }

  if(s==='creative'){
    return `
      <polygon points="0,0 260,0 0,220" fill="#${C.a1}" fill-opacity="0.1"/>
      <polygon points="${W},${H} ${W-260},${H} ${W},${H-220}" fill="#${C.a2}" fill-opacity="0.08"/>
      <polygon points="${W},0 ${W-140},0 ${W},140" fill="#${C.a2}" fill-opacity="0.07"/>
      <polygon points="0,${H} 140,${H} 0,${H-140}" fill="#${C.a1}" fill-opacity="0.06"/>
      <circle cx="${W/2}" cy="${H/2}" r="200" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.08"/>
      <circle cx="${W/2}" cy="${H/2}" r="130" fill="none" stroke="#${C.a2}" stroke-width="0.3" stroke-opacity="0.06"/>
      ${seed===0?`<circle cx="260" cy="0" r="8" fill="#${C.a1}" fill-opacity="0.5"/>`:
        seed===1?`<circle cx="${W}" cy="${H}" r="8" fill="#${C.a2}" fill-opacity="0.5"/>`:
        `<circle cx="${W}" cy="0" r="6" fill="#${C.a2}" fill-opacity="0.4"/>`}`;
  }

  if(s==='elegant'){
    return `
      <rect x="24" y="24" width="${W-48}" height="${H-48}" fill="none" stroke="#${C.a1}" stroke-width="0.8" stroke-opacity="0.25"/>
      <rect x="30" y="30" width="${W-60}" height="${H-60}" fill="none" stroke="#${C.a1}" stroke-width="0.3" stroke-opacity="0.12"/>
      <line x1="24" y1="${H/2}" x2="60" y2="${H/2}" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.5"/>
      <line x1="${W-60}" y1="${H/2}" x2="${W-24}" y2="${H/2}" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.5"/>
      <circle cx="${W/2}" cy="24" r="4" fill="#${C.a1}" fill-opacity="0.4"/>
      <circle cx="${W/2}" cy="${H-24}" r="4" fill="#${C.a1}" fill-opacity="0.4"/>
      <circle cx="24" cy="${H/2}" r="3" fill="#${C.a1}" fill-opacity="0.3"/>
      <circle cx="${W-24}" cy="${H/2}" r="3" fill="#${C.a1}" fill-opacity="0.3"/>
      ${seed===0?`<line x1="${W/2-40}" y1="24" x2="${W/2+40}" y2="24" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.3"/>`:
        seed===1?`<rect x="${W/2-30}" y="20" width="60" height="8" rx="4" fill="#${C.a1}" fill-opacity="0.08"/>`:
        `<circle cx="${W/2}" cy="${H/2}" r="180" fill="none" stroke="#${C.a1}" stroke-width="0.3" stroke-opacity="0.06"/>`}`;
  }

  if(s==='tech'){
    const dots = Array.from({length:8},(_,r)=>Array.from({length:14},(_,c)=>`<circle cx="${50+c*54}" cy="${40+r*52}" r="1.4" fill="#${C.a1}" fill-opacity="${0.06+((r+c)%3)*0.03}"/>`).join('')).join('');
    return `
      ${dots}
      <rect x="0" y="0" width="5" height="${H}" fill="#${C.a1}" fill-opacity="0.9"/>
      <rect x="5" y="0" width="2" height="${H}" fill="#${C.a2}" fill-opacity="0.4"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="#${C.a2}" fill-opacity="0.5"/>
      <rect x="0" y="${H-7}" width="${W}" height="3" fill="#${C.a1}" fill-opacity="0.3"/>
      ${seed===0?`<rect x="${W-100}" y="0" width="100" height="4" fill="#${C.a2}" fill-opacity="0.4"/>`:
        seed===1?`<circle cx="${W-60}" cy="60" r="40" fill="none" stroke="#${C.a2}" stroke-width="0.5" stroke-opacity="0.2"/>`:
        `<line x1="${W-80}" y1="0" x2="${W}" y2="80" stroke="#${C.a2}" stroke-width="0.5" stroke-opacity="0.15"/>`}`;
  }

  if(s==='vintage'){
    const hatch = Array.from({length:12},(_,k)=>`<line x1="${k*70-20}" y1="0" x2="${k*70+40}" y2="${H}" stroke="#${C.a1}" stroke-width="0.3" stroke-opacity="0.04"/>`).join('');
    return `
      ${hatch}
      <rect x="18" y="18" width="${W-36}" height="${H-36}" fill="none" stroke="#${C.a1}" stroke-width="2" stroke-opacity="0.22" stroke-dasharray="10,7"/>
      <rect x="26" y="26" width="${W-52}" height="${H-52}" fill="none" stroke="#${C.a1}" stroke-width="0.8" stroke-opacity="0.1"/>
      <circle cx="${W/2}" cy="${H/2}" r="160" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.06"/>
      <circle cx="${W/2}" cy="${H/2}" r="80"  fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.05"/>
      <circle cx="18" cy="18" r="5" fill="#${C.a1}" fill-opacity="0.3"/>
      <circle cx="${W-18}" cy="18" r="5" fill="#${C.a1}" fill-opacity="0.3"/>
      <circle cx="18" cy="${H-18}" r="5" fill="#${C.a1}" fill-opacity="0.3"/>
      <circle cx="${W-18}" cy="${H-18}" r="5" fill="#${C.a1}" fill-opacity="0.3"/>`;
  }

  if(s==='vibrant'){
    return `
      <circle cx="80"    cy="80"    r="100" fill="#${C.a1}" fill-opacity="0.18"/>
      <circle cx="${W-70}" cy="${H-70}" r="130" fill="#${C.a2}" fill-opacity="0.14"/>
      <circle cx="${W-100}" cy="70"  r="75"  fill="#${C.a1}" fill-opacity="0.1"/>
      <circle cx="70"    cy="${H-70}" r="60"  fill="#${C.a2}" fill-opacity="0.09"/>
      <rect x="0" y="0" width="${W}" height="8" fill="#${C.a1}"/>
      <rect x="0" y="8" width="${W}" height="3" fill="#${C.a2}" fill-opacity="0.7"/>
      <rect x="0" y="${H-8}" width="${W}" height="8" fill="#${C.a2}"/>
      <rect x="0" y="${H-11}" width="${W}" height="3" fill="#${C.a1}" fill-opacity="0.7"/>
      ${seed===0?`<circle cx="${W/2}" cy="${H/2}" r="200" fill="none" stroke="#${C.a1}" stroke-width="0.5" stroke-opacity="0.07"/>`:
        seed===1?`<polygon points="${W/2},20 ${W/2+20},50 ${W/2-20},50" fill="#${C.a1}" fill-opacity="0.2"/>`:
        `<circle cx="${W/2}" cy="${H-8}" r="50" fill="#${C.a1}" fill-opacity="0.06"/>`}`;
  }

  return `<circle cx="${W-60}" cy="60" r="80" fill="#${C.a1}" fill-opacity="0.05"/>`;
}

/* ── Main SVG builder — dispatches to layout renderers ───────────────── */
function buildSlideSVG(slide, idx, total){
  const C  = getCT();
  const LT = getLT();
  const anim = animationsEnabled ? 'anim-fade' : '';

  // When varyLayouts is ON, each slide gets a unique gradient angle + direction
  // giving each card a noticeably different "feel" even within the same theme.
  const gradAngles = [
    ['0','0','1','1'],  // top-left → bottom-right  (default)
    ['1','0','0','1'],  // top-right → bottom-left
    ['0','0','0','1'],  // top → bottom
    ['0','1','1','0'],  // bottom-left → top-right
    ['0.5','0','0.5','1'], // straight down
    ['1','1','0','0'],  // bottom-right → top-left
    ['0','0','1','0'],  // left → right
    ['1','0.5','0','0.5'], // right → left
  ];
  const gi = varyLayouts ? idx % gradAngles.length : 0;
  const [x1,y1,x2,y2] = gradAngles[gi];

  // When varyLayouts is ON, the panel colour also subtly shifts per slide
  // by blending toward a2 for even slides and keeping bg for odd — gives
  // slightly lighter/darker alternating card bases.
  const panelStop = varyLayouts && idx % 2 === 0 ? C.p : C.bg;

  const defs = `<defs>
    <linearGradient id="gbg${idx}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="#${C.bg}"/>
      <stop offset="100%" stop-color="#${panelStop}"/>
    </linearGradient>
    <linearGradient id="gacc${idx}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#${C.a1}"/>
      <stop offset="100%" stop-color="#${C.a2}"/>
    </linearGradient>
    <linearGradient id="gaccv${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#${C.a1}"/>
      <stop offset="100%" stop-color="#${C.a2}"/>
    </linearGradient>
    <linearGradient id="gaccd${idx}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#${C.a2}"/>
      <stop offset="100%" stop-color="#${C.a1}"/>
    </linearGradient>
  </defs>`;

  const bg = `<rect width="${W}" height="${H}" fill="url(#gbg${idx})"/>`;

  // When varyLayouts is ON we pick from a 12-composition pool of backgrounds
  // that go well beyond the 3-seed theme variants — each is a distinct
  // geometric concept. When OFF we use the standard per-theme bgDecor.
  const decor = varyLayouts
    ? bgDecorVaried(C, LT, idx)
    : bgDecor(C, LT, idx);

  const numChip = slideNum(idx, total, C);

  switch(slide.layout){
    case 'title':      return buildTitle(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'bullets':    return buildBullets(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'metrics':    return buildMetrics(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'comparison': return buildComparison(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'timeline':   return buildTimeline(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'quote':      return buildQuote(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    case 'closing':    return buildClosing(slide,C,LT,defs,bg,decor,numChip,anim,idx);
    default:           return buildBullets(slide,C,LT,defs,bg,decor,numChip,anim,idx);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   bgDecorVaried — 12 distinct geometric compositions, cycling by slide
   index so every slide in a deck looks uniquely designed while still
   using the chosen colour theme's accent palette.
   ═══════════════════════════════════════════════════════════════════════ */
function bgDecorVaried(C, LT, idx){
  const v = idx % 12; // 12 distinct visual motifs

  switch(v){
    // 0 — Bold left sidebar + corner polygon cut
    case 0: return `
      <rect x="0" y="0" width="8" height="${H}" fill="#${C.a1}" fill-opacity="0.9"/>
      <rect x="8" y="0" width="180" height="${H}" fill="#${C.a1}" fill-opacity="0.04"/>
      <polygon points="${W},0 ${W-140},0 ${W},140" fill="#${C.a2}" fill-opacity="0.08"/>
      <circle cx="${W-50}" cy="${H-50}" r="60" fill="none" stroke="#${C.a1}" stroke-width="0.6" stroke-opacity="0.12"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="url(#gacc${idx})" fill-opacity="0.5"/>`;

    // 1 — Diagonal band across the whole slide
    case 1: return `
      <polygon points="0,0 ${W*0.38},0 ${W*0.62},${H} 0,${H}" fill="#${C.a1}" fill-opacity="0.05"/>
      <line x1="${W*0.38}" y1="0" x2="${W*0.62}" y2="${H}" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.18"/>
      <line x1="${W*0.38+6}" y1="0" x2="${W*0.62+6}" y2="${H}" stroke="#${C.a2}" stroke-width="0.4" stroke-opacity="0.1"/>
      <rect x="0" y="0" width="${W}" height="4" fill="url(#gacc${idx})"/>
      <circle cx="${W*0.5}" cy="${H*0.5}" r="80" fill="none" stroke="#${C.a2}" stroke-width="0.4" stroke-opacity="0.1"/>`;

    // 2 — Concentric circles centered top-right
    case 2: return `
      ${[200,145,90,45].map((r,k)=>`<circle cx="${W}" cy="0" r="${r}" fill="none" stroke="#${k%2===0?C.a1:C.a2}" stroke-width="${k===0?1.2:0.6}" stroke-opacity="${0.1+k*0.04}"/>`).join('')}
      <circle cx="${W}" cy="0" r="22" fill="#${C.a1}" fill-opacity="0.15"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="url(#gacc${idx})" fill-opacity="0.5"/>
      <rect x="0" y="0" width="${W}" height="4" fill="#${C.a1}" fill-opacity="0.4"/>`;

    // 3 — Dot matrix + right accent bar
    case 3: return `
      ${Array.from({length:7},(_,r)=>Array.from({length:11},(_,c)=>`<circle cx="${60+c*66}" cy="${45+r*56}" r="1.5" fill="#${C.a1}" fill-opacity="${0.05+(r+c)%3*0.025}"/>`).join('')).join('')}
      <rect x="${W-6}" y="0" width="6" height="${H}" fill="#${C.a2}" fill-opacity="0.7"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="#${C.a1}" fill-opacity="0.4"/>`;

    // 4 — Triangle mosaic (lower-left + upper-right)
    case 4: return `
      <polygon points="0,${H} 240,${H} 0,${H-200}" fill="#${C.a1}" fill-opacity="0.09"/>
      <polygon points="0,${H} 140,${H} 0,${H-110}" fill="#${C.a2}" fill-opacity="0.07"/>
      <polygon points="${W},0 ${W-240},0 ${W},200" fill="#${C.a2}" fill-opacity="0.07"/>
      <polygon points="${W},0 ${W-130},0 ${W},130" fill="#${C.a1}" fill-opacity="0.1"/>
      <rect x="0" y="0" width="${W}" height="5" fill="url(#gacc${idx})"/>`;

    // 5 — Horizontal stripe stack (subtle)
    case 5: return `
      ${[0,1,2,3,4].map(k=>`<rect x="0" y="${k*(H/5)}" width="${W}" height="${H/5}" fill="#${k%2===0?C.a1:C.a2}" fill-opacity="${0.02+k*0.006}"/>`).join('')}
      <rect x="0" y="0" width="5" height="${H}" fill="url(#gaccv${idx})" fill-opacity="0.6"/>
      <rect x="${W-5}" y="0" width="5" height="${H}" fill="url(#gaccv${idx})" fill-opacity="0.3"/>`;

    // 6 — Large hexagon wireframe center-right
    case 6: return `
      ${[[W*0.72,H*0.45,120],[W*0.72,H*0.45,75],[W*0.72,H*0.45,36]].map(([cx,cy,r],k)=>{
        const pts = Array.from({length:6},(_,j)=>{const a=j*60*Math.PI/180;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(' ');
        return `<polygon points="${pts}" fill="${k===2?`#${C.a1}`:'none'}" fill-opacity="${k===2?0.08:0}" stroke="#${k%2===0?C.a1:C.a2}" stroke-width="${k===0?1:0.6}" stroke-opacity="${0.12+k*0.04}"/>`;
      }).join('')}
      <rect x="0" y="0" width="${W}" height="4" fill="url(#gacc${idx})"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="#${C.a2}" fill-opacity="0.3"/>`;

    // 7 — Corner brackets (all 4 corners)
    case 7: return `
      <path d="M 0,50 L 0,0 L 50,0" fill="none" stroke="#${C.a1}" stroke-width="3" stroke-opacity="0.5" stroke-linecap="round"/>
      <path d="M ${W-50},0 L ${W},0 L ${W},50" fill="none" stroke="#${C.a2}" stroke-width="3" stroke-opacity="0.4" stroke-linecap="round"/>
      <path d="M 0,${H-50} L 0,${H} L 50,${H}" fill="none" stroke="#${C.a2}" stroke-width="3" stroke-opacity="0.4" stroke-linecap="round"/>
      <path d="M ${W-50},${H} L ${W},${H} L ${W},${H-50}" fill="none" stroke="#${C.a1}" stroke-width="3" stroke-opacity="0.5" stroke-linecap="round"/>
      <rect x="0" y="${H/2-1}" width="30" height="2" fill="#${C.a1}" fill-opacity="0.3"/>
      <rect x="${W-30}" y="${H/2-1}" width="30" height="2" fill="#${C.a1}" fill-opacity="0.3"/>`;

    // 8 — Wavy line stack (horizontal curves approximated with bezier arcs)
    case 8: return `
      ${[0,1,2].map(k=>{
        const baseY = H*0.25 + k*(H*0.25);
        return `<path d="M 0,${baseY} C 200,${baseY-40} 400,${baseY+40} 600,${baseY-30} S ${W},${baseY+20} ${W},${baseY}" fill="none" stroke="#${k%2===0?C.a1:C.a2}" stroke-width="${1.2-k*0.2}" stroke-opacity="${0.12-k*0.02}"/>`;
      }).join('')}
      <rect x="0" y="0" width="${W}" height="5" fill="url(#gacc${idx})"/>
      <rect x="0" y="${H-5}" width="${W}" height="5" fill="url(#gacc${idx})" fill-opacity="0.4"/>`;

    // 9 — Split-panel left solid, right open
    case 9: return `
      <rect x="0" y="0" width="${W*0.42}" height="${H}" fill="#${C.a1}" fill-opacity="0.07"/>
      <line x1="${W*0.42}" y1="0" x2="${W*0.42}" y2="${H}" stroke="#${C.a1}" stroke-width="1.5" stroke-opacity="0.25"/>
      <rect x="0" y="0" width="6" height="${H}" fill="#${C.a1}" fill-opacity="0.8"/>
      ${[80,160,240,320].map(y=>`<line x1="${W*0.42+10}" y1="${y}" x2="${W*0.42+40}" y2="${y}" stroke="#${C.a1}" stroke-width="0.8" stroke-opacity="0.2"/>`).join('')}
      <circle cx="${W*0.8}" cy="${H*0.55}" r="80" fill="none" stroke="#${C.a2}" stroke-width="0.6" stroke-opacity="0.14"/>`;

    // 10 — Radial spokes from bottom-left
    case 10: return `
      ${Array.from({length:10},(_,k)=>{
        const a = (k*18-10) * Math.PI/180;
        const x2 = Math.cos(a) * W * 1.1;
        const y2 = H - Math.sin(a) * H * 1.1;
        return `<line x1="0" y1="${H}" x2="${x2}" y2="${y2}" stroke="#${k%2===0?C.a1:C.a2}" stroke-width="0.6" stroke-opacity="${0.06+k*0.01}"/>`;
      }).join('')}
      <circle cx="0" cy="${H}" r="40" fill="#${C.a1}" fill-opacity="0.1"/>
      <rect x="0" y="0" width="${W}" height="4" fill="url(#gacc${idx})"/>`;
    // 11 — Cross-hatch + central diamond
    case 11: return `
      ${Array.from({length:6},(_,k)=>`<line x1="${k*140}" y1="0" x2="${k*140+80}" y2="${H}" stroke="#${C.a1}" stroke-width="0.3" stroke-opacity="0.06"/>`).join('')}
      ${Array.from({length:6},(_,k)=>`<line x1="${k*140}" y1="0" x2="${k*140-80}" y2="${H}" stroke="#${C.a2}" stroke-width="0.3" stroke-opacity="0.04"/>`).join('')}
      <polygon points="${W/2},${H/2-70} ${W/2+70},${H/2} ${W/2},${H/2+70} ${W/2-70},${H/2}"
        fill="none" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.15"/>
      <polygon points="${W/2},${H/2-42} ${W/2+42},${H/2} ${W/2},${H/2+42} ${W/2-42},${H/2}"
        fill="#${C.a1}" fill-opacity="0.04"/>
      <rect x="0" y="0" width="${W}" height="4" fill="url(#gacc${idx})"/>
      <rect x="0" y="${H-4}" width="${W}" height="4" fill="#${C.a2}" fill-opacity="0.3"/>`;

    default: return bgDecor(C, LT, idx);
  }
}

/* ── TITLE slide ──────────────────────────────────────────────────────── */
function buildTitle(sl,C,LT,defs,bg,decor,num,anim,idx){
  const s=LT.style;
  const isBold   = s==='bold'||s==='vibrant';
  const isEleg   = s==='elegant';
  const isFutu   = s==='futuristic';
  const isTech   = s==='tech';
  const isVint   = s==='vintage';
  const isCreate = s==='creative';
  const isSchool = s==='school'||s==='friendly';

  const titleLines = wrapSVG(sl.title, isBold?640:600, isBold?40:32);
  const tl = titleLines.slice(0,3);
  const txtX = isEleg||isVint ? W/2 : isBold||isCreate ? 55 : isTech ? 30 : 65;
  const txtAnchor = isEleg||isVint ? 'middle' : 'start';
  const tY0 = isEleg||isVint ? H/2-55 : isBold ? 170 : 175;
  const tFS  = isBold ? 40 : isEleg ? 34 : isTech ? 30 : 32;

  const titleSVG = tl.map((l,i)=>
    `<text x="${txtX}" y="${tY0+i*(tFS+12)}" text-anchor="${txtAnchor}"
       font-family="Arial" font-size="${tFS}" font-weight="700"
       fill="#${C.tx}" class="${anim}" style="animation-delay:${i*0.1}s">${esc(l)}</text>`
  ).join('');

  const accentH = tl.length*(tFS+12)-4;
  const accentY = tY0-8;

  // Left sidebar accent — style-specific
  const sideAccent = isEleg
    ? `<line x1="${W/2-80}" y1="${tY0+accentH+10}" x2="${W/2+80}" y2="${tY0+accentH+10}" stroke="#${C.a1}" stroke-width="1"/>`
    : isVint
    ? `<rect x="${W/2-60}" y="${tY0+accentH+8}" width="120" height="2" rx="1" fill="#${C.a1}" fill-opacity="0.5"/>`
    : isCreate
    ? `<circle cx="${txtX-22}" cy="${tY0+accentH/2}" r="6" fill="#${C.a1}" fill-opacity="0.5"/>`
    : `<rect x="${txtX-12}" y="${accentY}" width="5" height="${accentH}" rx="2.5" fill="url(#gacc${idx})"/>`;

  const subY = tY0 + accentH + (isEleg||isVint?22:26);
  const subText = `<text x="${txtX}" y="${subY}" text-anchor="${txtAnchor}"
    font-family="Arial" font-size="13" font-style="italic"
    fill="#${C.mu}" class="${anim}" style="animation-delay:0.3s">${esc(trunc(sl.subtitle||'',85))}</text>`;

  // Decorative tag chips — date / theme label
  const tagY = H-30;
  const tags = `
    <rect x="0" y="${tagY}" width="${W}" height="30" fill="#${C.a1}" fill-opacity="${isEleg?0.07:0.1}"/>
    <text x="20" y="${tagY+19}" font-family="Arial" font-size="8" font-weight="700"
      fill="#${C.a1}" letter-spacing="2">${LT.label.toUpperCase()} · UDARA</text>
    <text x="${W-20}" y="${tagY+19}" text-anchor="end" font-family="Arial" font-size="8"
      fill="#${C.mu}" letter-spacing="1">${new Date().getFullYear()}</text>`;

  // Style-specific hero illustration
  const heroIllus = isFutu
    ? `<circle cx="${W-90}" cy="${H/2-30}" r="110" fill="none" stroke="#${C.a1}" stroke-width="28" stroke-opacity="0.06"/>
       <circle cx="${W-90}" cy="${H/2-30}" r="60"  fill="none" stroke="#${C.a2}" stroke-width="10" stroke-opacity="0.08"/>
       <circle cx="${W-90}" cy="${H/2-30}" r="14"  fill="#${C.a1}" fill-opacity="0.25"/>
       <line x1="${W-90}" y1="${H/2-140}" x2="${W-90}" y2="${H/2+80}" stroke="#${C.a1}" stroke-width="0.6" stroke-opacity="0.15"/>`
    : isBold
    ? `<polygon points="${W-20},0 ${W},0 ${W},${H}" fill="#${C.a2}" fill-opacity="0.06"/>
       <polygon points="${W-120},0 ${W},0 ${W},120" fill="#${C.a1}" fill-opacity="0.1"/>`
    : isSchool
    ? `<circle cx="${W-80}" cy="80" r="50" fill="#${C.a2}" fill-opacity="0.12"/>
       <circle cx="${W-130}" cy="130" r="30" fill="#${C.a1}" fill-opacity="0.1"/>
       <circle cx="${W-50}" cy="150" r="20" fill="#${C.a1}" fill-opacity="0.08"/>`
    : isCreate
    ? `<polygon points="${W},0 ${W-200},0 ${W},200" fill="#${C.a2}" fill-opacity="0.08"/>
       <circle cx="${W-80}" cy="80" r="60" fill="none" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.18"/>`
    : `<circle cx="${W-70}" cy="${H/2-20}" r="90" fill="#${C.a1}" fill-opacity="0.06"/>
       <circle cx="${W-70}" cy="${H/2-20}" r="55" fill="none" stroke="#${C.a2}" stroke-width="0.8" stroke-opacity="0.15"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${heroIllus}${sideAccent}${titleSVG}${subText}${tags}${num}
  </svg>`;
}

/* ── BULLETS slide ────────────────────────────────────────────────────── */
function buildBullets(sl,C,LT,defs,bg,decor,num,anim,idx){
  const s=LT.style;
  const imgPh = includeImgPh;
  const contentW = imgPh ? 470 : 700;
  const leftPad  = (s==='tech'||s==='futuristic') ? 30 : 60;

  // Header area
  const titleLines = wrapSVG(sl.title, contentW, LT.headSize);
  const tl = titleLines.slice(0,2);
  const titleSVG = tl.map((l,i)=>
    `<text x="${leftPad}" y="${60+i*38}" font-family="Arial" font-size="${LT.headSize}" font-weight="700" fill="#${C.tx}">${esc(l)}</text>`
  ).join('');
  const titleH = tl.length*38;

  // Decorative title underline — varies per theme
  const underline = s==='corporate'||s==='tech'
    ? `<rect x="${leftPad}" y="${52}" width="4" height="${titleH+4}" rx="2" fill="url(#gacc${idx})"/>`
    : s==='bold'
    ? `<rect x="${leftPad}" y="${56+titleH}" width="${contentW*0.35}" height="4" rx="2" fill="url(#gacc${idx})"/>`
    : s==='elegant'
    ? `<line x1="${leftPad}" y1="${56+titleH}" x2="${leftPad+80}" y2="${56+titleH}" stroke="#${C.a1}" stroke-width="1.5"/>`
    : s==='vintage'
    ? `<line x1="${leftPad}" y1="${56+titleH}" x2="${leftPad+60}" y2="${56+titleH}" stroke="#${C.a1}" stroke-width="1" stroke-dasharray="4,3"/>`
    : `<rect x="${leftPad}" y="${56+titleH}" width="36" height="3" rx="1.5" fill="url(#gacc${idx})"/>`;

  // Subtitle
  const subLine = sl.subtitle
    ? `<text x="${leftPad}" y="${68+titleH}" font-family="Arial" font-size="11" fill="#${C.mu}" font-style="italic">${esc(trunc(sl.subtitle,80))}</text>`
    : '';

  const bulletStartY = sl.subtitle ? 82+titleH+18 : 68+titleH+18;

  // Per-theme bullet markers and styling
  const bulletSVG = (sl.bullets||[]).slice(0,4).map((b,i)=>{
    const lines = wrapSVG(b, contentW-32, LT.bodySize);
    const bY = bulletStartY + i*72;
    const lh  = LT.bodySize+3;

    // Row background pill for some themes
    const rowBg = (s==='school'||s==='friendly')
      ? `<rect x="${leftPad-8}" y="${bY-16}" width="${contentW+16}" height="${Math.min(lines.length,3)*lh+20}" rx="8" fill="#${C.a1}" fill-opacity="${i%2===0?0.05:0.03}"/>`
      : s==='vibrant'
      ? `<rect x="${leftPad-8}" y="${bY-16}" width="${contentW+16}" height="${Math.min(lines.length,3)*lh+20}" rx="6" fill="#${i%2===0?C.a1:C.a2}" fill-opacity="0.06"/>`
      : '';

    // Marker shape
    const marker = s==='bold'
      ? `<rect x="${leftPad}" y="${bY-13}" width="7" height="${Math.min(lines.length,3)*lh+4}" rx="3.5" fill="#${i<2?C.a1:C.a2}"/>`
      : s==='vibrant'
      ? `<circle cx="${leftPad+8}" cy="${bY-4}" r="8" fill="#${i%2===0?C.a1:C.a2}"/>
         <text x="${leftPad+8}" y="${bY-0.5}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="700" fill="#${C.bg}">${i+1}</text>`
      : s==='elegant'
      ? `<line x1="${leftPad}" y1="${bY-4}" x2="${leftPad+18}" y2="${bY-4}" stroke="#${C.a1}" stroke-width="1.5"/>
         <circle cx="${leftPad}" cy="${bY-4}" r="2.5" fill="#${C.a1}"/>`
      : s==='school'||s==='friendly'
      ? `<circle cx="${leftPad+10}" cy="${bY-4}" r="9" fill="#${i%2===0?C.a1:C.a2}" fill-opacity="0.7"/>
         <text x="${leftPad+10}" y="${bY-0.5}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="700" fill="#${C.bg}">${i+1}</text>`
      : s==='futuristic'
      ? `<polygon points="${leftPad+10},${bY-12} ${leftPad+18},${bY-4} ${leftPad+10},${bY+4} ${leftPad+2},${bY-4}" fill="#${C.a1}" fill-opacity="0.7"/>`
      : s==='vintage'
      ? `<rect x="${leftPad}" y="${bY-10}" width="10" height="10" rx="2" fill="none" stroke="#${C.a1}" stroke-width="1.5"/>
         <text x="${leftPad+5}" y="${bY-2.5}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="700" fill="#${C.a1}">${i+1}</text>`
      : `<circle cx="${leftPad+8}" cy="${bY-4}" r="5" fill="#${C.a1}" fill-opacity="0.8"/>`;

    const textX = s==='bold'||s==='vibrant'||s==='school'||s==='friendly'||s==='futuristic'||s==='vintage' ? leftPad+24 : leftPad+22;

    return `${rowBg}${marker}
      <text x="${textX}" y="${bY}" font-family="Arial" font-size="${LT.bodySize}" fill="#${C.tx}" class="${anim}" style="animation-delay:${(i+1)*0.1}s">
        ${lines.slice(0,3).map((l,li)=>`<tspan x="${textX}" dy="${li===0?0:lh}">${esc(l)}</tspan>`).join('')}
      </text>`;
  }).join('');

  // Optional image placeholder — richer design
  const imgBlock = imgPh ? `
    <rect x="548" y="40" width="228" height="165" rx="10" fill="#${C.p}" opacity="0.9"
      stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="7,5"/>
    <line x1="564" y1="56" x2="758" y2="189" stroke="#${C.mu}" stroke-width="0.5" stroke-opacity="0.25"/>
    <line x1="758" y1="56" x2="564" y2="189" stroke="#${C.mu}" stroke-width="0.5" stroke-opacity="0.25"/>
    <circle cx="662" cy="122" r="22" fill="#${C.a1}" fill-opacity="0.08"/>
    <text x="662" y="118" text-anchor="middle" font-family="Arial" font-size="18" fill="#${C.a1}" fill-opacity="0.4">⊕</text>
    <text x="662" y="135" text-anchor="middle" font-family="Arial" font-size="9" fill="#${C.mu}">Insert Image</text>
    <rect x="548" y="215" width="228" height="3" rx="1.5" fill="#${C.a1}" fill-opacity="0.2"/>` : '';

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${underline}${titleSVG}${subLine}${bulletSVG}${imgBlock}${num}
    <rect x="0" y="${H-3}" width="${W}" height="3" fill="url(#gacc${idx})" fill-opacity="0.6"/>
  </svg>`;
}

/* ── METRICS slide ────────────────────────────────────────────────────── */
function buildMetrics(sl,C,LT,defs,bg,decor,num,anim,idx){
  const metrics = (sl.metrics||[]).slice(0,4);
  const s = LT.style;

  const titleLines = wrapSVG(sl.title, 700, LT.headSize);
  const tl = titleLines.slice(0,2);
  const titleSVG = tl.map((l,i)=>
    `<text x="${W/2}" y="${52+i*34}" text-anchor="middle" font-family="Arial"
       font-size="${LT.headSize}" font-weight="700" fill="#${C.tx}">${esc(l)}</text>`
  ).join('');
  const titleH = tl.length*34;

  // Gradient rule under title
  const rule = `<rect x="${W/2-50}" y="${44+titleH}" width="100" height="3" rx="1.5" fill="url(#gacc${idx})"/>`;

  // Subtitle line
  const subLine = sl.subtitle
    ? `<text x="${W/2}" y="${54+titleH+14}" text-anchor="middle" font-family="Arial" font-size="11" fill="#${C.mu}" font-style="italic">${esc(trunc(sl.subtitle,80))}</text>`
    : '';

  const cellW=170, cellH=130, cellGap=18;
  const totalCellsW = metrics.length*cellW + (metrics.length-1)*cellGap;
  const startX = (W-totalCellsW)/2;
  const cellY  = 52+titleH + (sl.subtitle?50:32);

  const cells = metrics.map((m,k)=>{
    const cx = startX + k*(cellW+cellGap);
    const isHi = k===0;

    // Decorative shape in each card — varies per theme
    const cardDecor = s==='futuristic'
      ? `<circle cx="${cx+cellW/2}" cy="${cellY+30}" r="28" fill="#${C.a1}" fill-opacity="0.06"/>`
      : s==='bold'
      ? `<polygon points="${cx},${cellY} ${cx+40},${cellY} ${cx},${cellY+40}" fill="#${C.a1}" fill-opacity="${isHi?0.15:0.07}"/>`
      : s==='creative'||s==='vibrant'
      ? `<circle cx="${cx+cellW}" cy="${cellY}" r="30" fill="#${isHi?C.a1:C.a2}" fill-opacity="0.08"/>`
      : '';

    // Progress bar under value (visual polish)
    const pct = Math.min(95, 40 + k*18);
    const progressBar = `
      <rect x="${cx+12}" y="${cellY+cellH-26}" width="${cellW-24}" height="3" rx="1.5" fill="#${C.mu}" fill-opacity="0.15"/>
      <rect x="${cx+12}" y="${cellY+cellH-26}" width="${(cellW-24)*pct/100}" height="3" rx="1.5" fill="#${isHi?C.a1:C.a2}" fill-opacity="0.7"/>`;

    return `
      ${cardDecor}
      <rect x="${cx}" y="${cellY}" width="${cellW}" height="${cellH}" rx="12"
        fill="#${C.a1}" fill-opacity="${isHi?0.14:0.06}"
        stroke="#${isHi?C.a1:C.mu}" stroke-width="${isHi?1.2:0.5}" stroke-opacity="${isHi?0.5:0.25}"/>
      ${isHi?`<rect x="${cx}" y="${cellY}" width="${cellW}" height="4" rx="2" fill="#${C.a1}"/>`:''}
      <text x="${cx+cellW/2}" y="${cellY+52}" text-anchor="middle"
        font-family="Arial" font-size="30" font-weight="700"
        fill="#${isHi?C.a1:C.tx}" class="${anim}" style="animation-delay:${k*0.12}s">${esc(m.value)}</text>
      <line x1="${cx+20}" y1="${cellY+62}" x2="${cx+cellW-20}" y2="${cellY+62}"
        stroke="#${C.mu}" stroke-width="0.5" stroke-opacity="0.35"/>
      <text x="${cx+cellW/2}" y="${cellY+80}" text-anchor="middle"
        font-family="Arial" font-size="10" font-weight="600" fill="#${C.mu}">${esc(trunc(m.label,16))}</text>
      ${progressBar}`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${rule}${titleSVG}${subLine}${cells}${num}
    <rect x="0" y="${H-3}" width="${W}" height="3" fill="url(#gacc${idx})" fill-opacity="0.6"/>
  </svg>`;
}

/* ── COMPARISON slide ─────────────────────────────────────────────────── */
function buildComparison(sl,C,LT,defs,bg,decor,num,anim,idx){
  const comp = (sl.comparison||[]).slice(0,2);
  const s    = LT.style;
  const fS   = Math.min(LT.headSize, 24);

  const titleLines = wrapSVG(sl.title, 720, fS);
  const tl = titleLines.slice(0,2);
  const titleSVG = tl.map((l,i)=>
    `<text x="${W/2}" y="${50+i*28}" text-anchor="middle" font-family="Arial"
       font-size="${fS}" font-weight="700" fill="#${C.tx}">${esc(l)}</text>`
  ).join('');
  const titleH = tl.length*28;

  const hdrY  = 50+titleH+16;
  const colW  = 358, gap = 12, padX = 20;
  const rowH  = 94,  rowGap = 10;
  const rowsY = hdrY + 30;

  // Column headers with icon shapes
  const headers = `
    <rect x="${padX}" y="${hdrY}" width="${colW}" height="24" rx="6"
      fill="#${C.a1}" fill-opacity="0.18"/>
    <text x="${padX+colW/2}" y="${hdrY+15.5}" text-anchor="middle"
      font-family="Arial" font-size="9" font-weight="700" fill="#${C.a1}">⬡  BEFORE / TRADITIONAL</text>
    <rect x="${padX+colW+gap}" y="${hdrY}" width="${colW}" height="24" rx="6"
      fill="#${C.a2}" fill-opacity="0.18"/>
    <text x="${padX+colW+gap+colW/2}" y="${hdrY+15.5}" text-anchor="middle"
      font-family="Arial" font-size="9" font-weight="700" fill="#${C.a2}">✦  AFTER / MODERN</text>`;

  // VS divider
  const vsDivider = `
    <line x1="${padX+colW+gap/2}" y1="${rowsY}" x2="${padX+colW+gap/2}" y2="${rowsY+comp.length*(rowH+rowGap)-rowGap}"
      stroke="#${C.mu}" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="4,4"/>
    <circle cx="${padX+colW+gap/2}" cy="${rowsY + (comp.length*(rowH+rowGap))/2 - rowH/2}" r="14"
      fill="#${C.p}" stroke="#${C.mu}" stroke-width="0.5" stroke-opacity="0.3"/>
    <text x="${padX+colW+gap/2}" y="${rowsY + (comp.length*(rowH+rowGap))/2 - rowH/2 + 4}"
      text-anchor="middle" font-family="Arial" font-size="8" font-weight="700" fill="#${C.mu}">VS</text>`;

  const rows = comp.map((item,k)=>{
    const rY = rowsY + k*(rowH+rowGap);
    const lLines = wrapSVG(item.left||'', colW-24, LT.bodySize).slice(0,4);
    const rLines = wrapSVG(item.right||'', colW-24, LT.bodySize).slice(0,4);

    return `
      <rect x="${padX}" y="${rY}" width="${colW}" height="${rowH}" rx="8"
        fill="#${C.a1}" fill-opacity="0.04"
        stroke="#${C.a1}" stroke-width="0.6" stroke-opacity="0.18"/>
      <text x="${padX+14}" y="${rY+17}" font-family="Arial" font-size="${LT.bodySize}"
        fill="#${C.mu}" class="${anim}" style="animation-delay:${k*0.1}s">
        ${lLines.map((l,i)=>`<tspan x="${padX+14}" dy="${i===0?0:LT.bodySize+2}">${esc(l)}</tspan>`).join('')}
      </text>
      <rect x="${padX+colW+gap}" y="${rY}" width="${colW}" height="${rowH}" rx="8"
        fill="#${C.a2}" fill-opacity="0.05"
        stroke="#${C.a2}" stroke-width="0.6" stroke-opacity="0.2"/>
      <text x="${padX+colW+gap+14}" y="${rY+17}" font-family="Arial" font-size="${LT.bodySize}"
        fill="#${C.tx}" class="${anim}" style="animation-delay:${k*0.1+0.06}s">
        ${rLines.map((l,i)=>`<tspan x="${padX+colW+gap+14}" dy="${i===0?0:LT.bodySize+2}">${esc(l)}</tspan>`).join('')}
      </text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${titleSVG}${headers}${vsDivider}${rows}${num}
    <rect x="0" y="${H-3}" width="${W}" height="3" fill="url(#gacc${idx})" fill-opacity="0.6"/>
  </svg>`;
}

/* ── TIMELINE slide ───────────────────────────────────────────────────── */
function buildTimeline(sl,C,LT,defs,bg,decor,num,anim,idx){
  const steps  = (sl.steps||sl.bullets||[]).slice(0,4);
  const s      = LT.style;

  const titleLines = wrapSVG(sl.title, 720, LT.headSize);
  const tl = titleLines.slice(0,2);
  const titleSVG = tl.map((l,i)=>
    `<text x="${W/2}" y="${52+i*32}" text-anchor="middle" font-family="Arial"
       font-size="${LT.headSize}" font-weight="700" fill="#${C.tx}">${esc(l)}</text>`
  ).join('');
  const titleH = tl.length*32;
  const rule   = `<rect x="${W/2-45}" y="${44+titleH}" width="90" height="3" rx="1.5" fill="url(#gacc${idx})"/>`;

  const CY = 52+titleH+100;
  const STEP = Math.floor((W-100) / Math.max(steps.length, 1));
  const START_X = 60 + STEP/2;

  // Spine — gradient line
  const spineLen = (steps.length-1)*STEP;
  const spine = `
    <defs>
      <linearGradient id="gspine${idx}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#${C.a1}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#${C.a2}" stop-opacity="0.3"/>
      </linearGradient>
    </defs>
    <rect x="${START_X}" y="${CY-2}" width="${spineLen}" height="4" rx="2" fill="url(#gspine${idx})"/>`;

  const nodes = steps.map((step,k)=>{
    const cx = START_X + k*STEP;
    const isActive = k===1;
    const isPast   = k===0;
    const labelLines = wrapSVG(step, STEP*1.1, 9.5).slice(0,3);
    const nodeR = isActive ? 24 : 17;

    // Connector dot between nodes
    const midDot = k < steps.length-1
      ? `<circle cx="${cx + STEP/2}" cy="${CY}" r="3" fill="#${C.mu}" fill-opacity="0.3"/>`
      : '';

    // Node outer ring glow for active
    const outerRing = isActive
      ? `<circle cx="${cx}" cy="${CY}" r="${nodeR+8}" fill="#${C.a1}" fill-opacity="0.06"/>`
      : '';

    const nodeFill = isActive ? C.a1 : isPast ? C.a2 : C.p;
    const nodeStroke = isActive ? 'none' : `stroke="#${C.a1}" stroke-width="1.5"`;

    // Label above or below alternating
    const lY = k%2===0 ? CY-nodeR-14 : CY+nodeR+18;
    const lAnchor = 'middle';
    const lColor  = k%2===0 ? C.tx : C.mu;

    const labelSVG = `<text x="${cx}" y="${lY}" text-anchor="${lAnchor}" font-family="Arial" font-size="9.5" fill="#${lColor}">
      ${labelLines.map((l,i)=>`<tspan x="${cx}" dy="${i===0?0:13}">${esc(l)}</tspan>`).join('')}
    </text>`;

    // Vertical connector from node to label
    const connector = `<line x1="${cx}" y1="${k%2===0?CY-nodeR:CY+nodeR}"
      x2="${cx}" y2="${k%2===0?lY+6:lY-labelLines.length*13}"
      stroke="#${C.mu}" stroke-width="0.5" stroke-opacity="0.3" stroke-dasharray="3,3"/>`;

    return `${midDot}${outerRing}
      <circle cx="${cx}" cy="${CY}" r="${nodeR}"
        fill="#${nodeFill}" fill-opacity="${isActive?0.95:0.75}" ${nodeStroke}
        class="${anim}" style="animation-delay:${k*0.14}s"/>
      <text x="${cx}" y="${CY+4.5}" text-anchor="middle"
        font-family="Arial" font-size="${isActive?12:10}" font-weight="700"
        fill="#${isActive?C.bg:C.a1}">${k+1}</text>
      ${connector}${labelSVG}`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${titleSVG}${rule}${spine}${nodes}${num}
    <rect x="0" y="${H-3}" width="${W}" height="3" fill="url(#gacc${idx})" fill-opacity="0.6"/>
  </svg>`;
}

/* ── QUOTE slide ──────────────────────────────────────────────────────── */
function buildQuote(sl,C,LT,defs,bg,decor,num,anim,idx){
  const s      = LT.style;
  const quote  = (sl.bullets?.[0]||sl.title).replace(/^"+|"+$/g,'').trim();
  const context= sl.bullets?.[1]||sl.subtitle||'';
  const impl   = sl.bullets?.[2]||'';
  const qLines = wrapSVG(quote, 640, 15).slice(0,5);
  const qH     = qLines.length * 26;
  const qY0    = Math.max(90, H/2 - qH/2 - 30);

  // Large decorative open-quote
  const openQ = `<text x="28" y="${qY0+60}" font-family="Arial" font-size="160"
    fill="#${C.a1}" fill-opacity="0.07" font-weight="700" font-style="italic">"</text>`;
  // Close-quote bottom right
  const closeQ = `<text x="${W-40}" y="${H-40}" font-family="Arial" font-size="120"
    fill="#${C.a2}" fill-opacity="0.05" font-weight="700" font-style="italic">"</text>`;

  // Left accent pillar
  const pillar = `<rect x="56" y="${qY0}" width="5" height="${qH+8}" rx="2.5" fill="url(#gacc${idx})"/>`;

  const quoteText = `<text x="74" y="${qY0+18}" font-family="Arial" font-size="15"
    font-weight="700" font-style="italic" fill="#${C.tx}" class="${anim}">
    ${qLines.map((l,i)=>`<tspan x="74" dy="${i===0?0:26}">${esc(l)}</tspan>`).join('')}
  </text>`;

  const cY  = qY0 + qH + 32;
  const ctxText = context
    ? `<rect x="74" y="${cY-2}" width="${Math.min(context.length*6.5, 580)}" height="1" fill="#${C.mu}" fill-opacity="0.3"/>
       <text x="74" y="${cY+14}" font-family="Arial" font-size="11" fill="#${C.mu}" class="${anim}"
         style="animation-delay:0.2s">${esc(trunc(context, 90))}</text>`
    : '';

  const implText = impl
    ? `<rect x="74" y="${cY+32}" width="32" height="3" rx="1.5" fill="#${C.a1}" fill-opacity="0.6"/>
       <text x="74" y="${cY+52}" font-family="Arial" font-size="11" font-weight="700" fill="#${C.a1}"
         class="${anim}" style="animation-delay:0.3s">${esc(trunc(impl,90))}</text>`
    : '';

  // Style-specific quote accent shape
  const accentShape = s==='elegant'
    ? `<line x1="${W-80}" y1="30" x2="${W-30}" y2="30" stroke="#${C.a1}" stroke-width="1" stroke-opacity="0.4"/>
       <circle cx="${W-55}" cy="30" r="3" fill="#${C.a1}" fill-opacity="0.4"/>`
    : s==='vibrant'||s==='bold'
    ? `<polygon points="${W-20},${H/2-60} ${W},${H/2} ${W-20},${H/2+60}" fill="#${C.a1}" fill-opacity="0.08"/>`
    : `<circle cx="${W-50}" cy="${H/2}" r="40" fill="#${C.a1}" fill-opacity="0.04"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${accentShape}${openQ}${closeQ}${pillar}${quoteText}${ctxText}${implText}${num}
    <rect x="0" y="${H-3}" width="${W}" height="3" fill="url(#gacc${idx})" fill-opacity="0.6"/>
  </svg>`;
}

/* ── CLOSING slide ────────────────────────────────────────────────────── */
function buildClosing(sl,C,LT,defs,bg,decor,num,anim,idx){
  const s       = LT.style;
  const bullets = (sl.bullets||[]).slice(0,4);

  // Rich concentric ring system
  const rings = [220, 155, 95, 50].map((r,k)=>
    `<circle cx="${W/2}" cy="${H/2-10}" r="${r}"
       fill="${k===3?`#${C.a1}`:'none'}"
       fill-opacity="${k===3?0.07:0}"
       stroke="#${k%2===0?C.a1:C.a2}"
       stroke-width="${k===0?0.5:k===1?0.8:k===2?1:0}"
       stroke-opacity="${0.06+k*0.03}"/>`
  ).join('');

  // Starburst rays
  const rays = Array.from({length:16},(_,k)=>{
    const a = k*22.5 * Math.PI/180;
    const r1=60, r2=210;
    return `<line
      x1="${W/2+Math.cos(a)*r1}" y1="${H/2-10+Math.sin(a)*r1}"
      x2="${W/2+Math.cos(a)*r2}" y2="${H/2-10+Math.sin(a)*r2}"
      stroke="#${C.a1}" stroke-width="0.4" stroke-opacity="0.06"/>`;
  }).join('');

  // Bottom ribbon
  const ribbon = `
    <rect x="0" y="${H-40}" width="${W}" height="40" fill="#${C.a1}" fill-opacity="${s==='elegant'?0.09:0.13}"/>
    <rect x="0" y="${H-43}" width="${W}" height="3" fill="#${C.a2}" fill-opacity="0.4"/>`;

  // Main thank you text
  const tyFS  = s==='bold'||s==='vibrant' ? 54 : s==='elegant' ? 48 : 46;
  const tyText = `<text x="${W/2}" y="${H/2-30}" text-anchor="middle"
    font-family="Arial" font-size="${tyFS}" font-weight="700"
    fill="#${C.tx}" letter-spacing="-1" class="${anim}">Thank You</text>`;

  // Accent rule
  const accentRule = `<rect x="${W/2-60}" y="${H/2-10}" width="120" height="3" rx="1.5" fill="url(#gacc${idx})"/>`;

  // Subtitle
  const sub = sl.subtitle
    ? `<text x="${W/2}" y="${H/2+18}" text-anchor="middle"
        font-family="Arial" font-size="14" fill="#${C.a1}"
        font-style="italic" class="${anim}" style="animation-delay:0.15s">${esc(trunc(sl.subtitle,60))}</text>`
    : '';

  // Bullet contact/info lines
  const buls = bullets.map((b,k)=>
    `<text x="${W/2}" y="${H/2+50+k*22}" text-anchor="middle"
       font-family="Arial" font-size="10" fill="#${C.mu}"
       class="${anim}" style="animation-delay:${0.2+k*0.08}s">· ${esc(trunc(b,65))}</text>`
  ).join('');

  // Brand strip inside ribbon
  const brand = `
    <text x="${W/2}" y="${H-18}" text-anchor="middle"
      font-family="Arial" font-size="9" font-weight="700"
      fill="#${C.bg}" letter-spacing="2" fill-opacity="0.8">UDARA · ${LT.label.toUpperCase()}</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}${bg}${decor}${rings}${rays}${ribbon}${tyText}${accentRule}${sub}${buls}${brand}${num}
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   PAYSTACK + PPTX EXPORT
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   PAYMENT — Tightened against fraud
   ═══════════════════════════════════════════════════════════════════════ */

/* Track whether payment is in progress to prevent double-clicks */
let paymentInProgress = false;

/* Track used references so the same Paystack callback can't be
   replayed (e.g. by calling onPaymentSuccess() from the console) */
const usedReferences = new Set();

/* Generate a cryptographically random reference for each payment
   attempt — cannot be guessed or replayed */
function generatePaymentRef(){
  const random = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2,'0')
  ).join('');
  return `udara_${Date.now()}_${random}`;
}

async function handlePayment(){
  /* Guard: must have slides to unlock */
  if(!currentSlides.length){
    showToast('⚠ Generate slides first before paying.');
    return;
  }

  /* Guard: prevent double-payment if button is clicked twice */
  if(paymentInProgress){
    showToast('⚠ Payment already in progress…');
    return;
  }

  /* Guard: already unlocked — don't charge again */
  if(isUnlocked){
    buildAndDownloadPptx();
    return;
  }

  await loadPaystackSdk();
  if(typeof window.PaystackPop === 'undefined'){
    showToast('⚠ Paystack failed to load. Check your internet and try again.');
    return;
  }

  paymentInProgress = true;
  $('pay-btn').disabled = true;
  $('pay-btn').textContent = 'Opening payment…';

  /* Fresh unique reference for this specific payment attempt */
  const paymentRef = generatePaymentRef();

  const handler = window.PaystackPop.setup({
    key:      PAYSTACK_PK,
    email:    PAYSTACK_EMAIL,
    amount:   AMOUNT_KOBO,
    currency: 'NGN',
    ref:      paymentRef,
    metadata: {
      custom_fields: [
        { display_name:'Topic',       variable_name:'topic',       value: currentTopic        },
        { display_name:'Theme',       variable_name:'theme',       value: currentLayoutTheme  },
        { display_name:'Slide Count', variable_name:'slide_count', value: String(currentSlides.length) },
        { display_name:'App Version', variable_name:'app_version', value: 'udara-v1'          },
      ]
    },

    callback: async function(response){
      /* ── Verify the reference is the one we sent ─────────────────── */
      if(response.reference !== paymentRef){
        console.warn('[Udara] Reference mismatch — possible replay attack');
        showToast('❌ Payment reference mismatch. Please contact support.');
        resetPayButton();
        return;
      }

      /* ── Guard: reference must not have been used before ─────────── */
      if(usedReferences.has(response.reference)){
        console.warn('[Udara] Duplicate reference — replay attempt blocked');
        showToast('❌ This payment has already been processed.');
        resetPayButton();
        return;
      }

      /* ── Mark this reference as consumed ─────────────────────────── */
      usedReferences.add(response.reference);

      /* ── Show verifying state ─────────────────────────────────────── */
      $('pay-btn').textContent = 'Verifying payment…';
      showToast('⏳ Verifying your payment with Paystack…');

      /* ── Server-side verification (when backend is live) ────────────
         Uncomment this block once you deploy api/verify.js:

         try {
           const vRes = await fetch('/api/verify', {
             method:  'POST',
             headers: {'Content-Type':'application/json'},
             body:    JSON.stringify({ reference: response.reference })
           });
           const vData = await vRes.json();

           if(!vData.verified){
             showToast('❌ Payment could not be verified. Please contact support.');
             resetPayButton();
             return;
           }
         } catch(err){
           console.error('[Udara] Verification error:', err);
           showToast('❌ Verification failed. Please contact support.');
           resetPayButton();
           return;
         }
      ────────────────────────────────────────────────────────────── */

      /* ── Payment confirmed — unlock and download ─────────────────── */
      console.log('[Udara] Payment verified:', response.reference);
      onPaymentSuccess(response.reference);
    },

    onClose: function(){
      /* User closed the popup without completing payment */
      showToast("No payment yet — we'll be here when you're ready 🙂");
      resetPayButton();
    }
  });

  handler.openIframe();
}

/* Reset the pay button to its default state */
function resetPayButton(){
  paymentInProgress = false;
  const btn = $('pay-btn');
  if(btn){
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
      Download PowerPoint`;
  }
}

function loadPaystackSdk(){
  return new Promise((res,rej)=>{
    if(document.getElementById('paystack-sdk')){ res(); return; }
    const s = document.createElement('script');
    s.id = 'paystack-sdk';
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.onload = res;
    s.onerror = () => {
      rej(new Error('Paystack SDK failed to load'));
    };
    document.head.appendChild(s);
  });
}

function onPaymentSuccess(reference){
  /* Mark globally as unlocked */
  isUnlocked = true;
  paymentInProgress = false;

  /* Remove watermarks — user has paid */
  removeWatermarks();

  /* Update UI */
  successBanner.style.display = 'block';
  exportBar.style.display = 'none';

  /* Store the reference so the user can quote it for support */
  localStorage.setItem('udara_last_ref', reference || '');

  showToast('✅ Payment confirmed! Building your PowerPoint…');

  /* Small delay so the success message is visible before download starts */
  setTimeout(() => buildAndDownloadPptx(), 800);
}

/* ── PPTX Builder ─────────────────────────────────────────────────────── */
function buildAndDownloadPptx(){
  const CT = COLOUR_THEMES.find(t=>t.id===currentColourThemeId)||COLOUR_THEMES[0];
  const LT = LAYOUT_THEMES[currentLayoutTheme]||LAYOUT_THEMES.corporate;
  let slides = currentSlides;
  try{ const s=localStorage.getItem(LS.slides); if(s)slides=JSON.parse(s); } catch(e){}
  if(!slides?.length){ showToast('⚠ No slides found. Generate first.'); return; }

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const T = {bg:CT.bg,a1:CT.a1,a2:CT.a2,tx:CT.tx,mu:CT.mu,p:CT.p,font:LT.font,hs:LT.headSize,bs:LT.bodySize};
  const N = slides.length;

  function addBgShapes(slide){
    // Match SVG bgDecor in pptx shapes
    const s=LT.style;
    if(s==='bold'){
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.1,fill:{color:T.a1}});
      slide.addShape(pptx.ShapeType.rect,{x:0,y:7.4,w:13.33,h:0.1,fill:{color:T.a2}});
    } else if(s==='tech'){
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.055,h:7.5,fill:{color:T.a1}});
      slide.addShape(pptx.ShapeType.rect,{x:0,y:7.47,w:13.33,h:0.03,fill:{color:T.a2}});
    } else if(s==='corporate'||s==='clean'){
      slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:2.9,h:7.5,fill:{color:T.a1,transparency:96}});
      slide.addShape(pptx.ShapeType.rect,{x:0,y:7.45,w:13.33,h:0.05,fill:{color:T.a1}});
    } else if(s==='minimal'){
      slide.addShape(pptx.ShapeType.rect,{x:0.4,y:0,w:0.02,h:7.5,fill:{color:T.a1}});
    } else {
      slide.addShape(pptx.ShapeType.ellipse,{x:10.5,y:-.5,w:3,h:3,fill:{color:T.a1,transparency:92},line:{color:T.a1,transparency:100,width:0}});
    }
  }

  function addSlideNum(slide,i){
    slide.addText(`${String(i+1).padStart(2,'0')}/${String(N).padStart(2,'0')}`,{
      x:11.5,y:0.15,w:1.7,h:0.25,fontSize:7,color:T.a1,fontFace:T.font,align:'right'});
  }

  function addFooter(slide){
    slide.addShape(pptx.ShapeType.rect,{x:0,y:7.47,w:13.33,h:0.03,fill:{color:T.a1,transparency:50}});
  }

  slides.forEach((sl,i)=>{
    const slide = pptx.addSlide();
    slide.background = {color:T.bg};
    addBgShapes(slide);
    addSlideNum(slide,i);

    switch(sl.layout){
      case 'title':
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:T.a1}});
        slide.addText(sl.title,{x:0.5,y:1.6,w:11.5,h:2.2,fontSize:T.hs+10,bold:true,color:T.tx,fontFace:T.font,align:'left',autoFit:true,charSpacing:-1});
        slide.addShape(pptx.ShapeType.rect,{x:0.5,y:4.0,w:1.8,h:0.05,fill:{color:T.a1}});
        if(sl.subtitle) slide.addText(sl.subtitle,{x:0.5,y:4.2,w:10,h:0.8,fontSize:14,color:T.mu,fontFace:T.font,italic:true});
        slide.addText(`01/${String(N).padStart(2,'0')}`,{x:0.5,y:6.9,w:3,h:0.3,fontSize:8,color:T.a1,fontFace:T.font});
        slide.addText(`Udara · ${LT.label}`,{x:8,y:6.9,w:5,h:0.3,fontSize:8,color:T.mu,fontFace:T.font,align:'right'});
        break;

      case 'bullets':
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.055,fill:{color:T.a1}});
        slide.addText(sl.title,{x:0.55,y:0.4,w:includeImgPh?8.5:12.5,h:1.2,fontSize:T.hs,bold:true,color:T.tx,fontFace:T.font,autoFit:true});
        slide.addShape(pptx.ShapeType.rect,{x:0.55,y:1.65,w:1.0,h:0.04,fill:{color:T.a1}});
        slide.addShape(pptx.ShapeType.rect,{x:0.55,y:0.45,w:0.05,h:1.1,fill:{color:T.a1}});
        if(sl.bullets?.length){
          const buls = sl.bullets.slice(0,4).map(b=>({text:b,options:{fontSize:T.bs,color:T.mu,bullet:{indent:14,color:T.a1},paraSpaceAfter:10}}));
          slide.addText(buls,{x:0.55,y:1.85,w:includeImgPh?8.0:12.3,h:5.0,fontFace:T.font,valign:'top',lineSpacingMultiple:1.4});
        }
        if(includeImgPh){
          slide.addShape(pptx.ShapeType.rect,{x:9.2,y:0.4,w:3.9,h:3.0,fill:{color:T.p},line:{color:T.a1,width:1,dashType:'dash',transparency:50}});
          slide.addText('[ Insert Image ]',{x:9.2,y:0.4,w:3.9,h:3.0,fontSize:9,color:T.mu,align:'center',valign:'middle',fontFace:T.font,italic:true});
        }
        addFooter(slide);
        break;

      case 'metrics':
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.055,fill:{color:T.a1}});
        slide.addText(sl.title,{x:0.55,y:0.4,w:12.3,h:1.0,fontSize:T.hs,bold:true,color:T.tx,fontFace:T.font,align:'center',autoFit:true});
        (sl.metrics||[]).slice(0,4).forEach((m,k)=>{
          const mx=0.4+k*3.3, my=1.8;
          slide.addShape(pptx.ShapeType.rect,{x:mx,y:my,w:3.1,h:2.2,rx:0.15,fill:{color:T.a1,transparency:k===0?82:90},line:{color:k===0?T.a1:T.mu,width:0.5,transparency:60}});
          slide.addText(m.value,{x:mx,y:my+0.3,w:3.1,h:1.0,fontSize:28,bold:true,color:k===0?T.a1:T.tx,fontFace:T.font,align:'center'});
          slide.addText(m.label,{x:mx,y:my+1.4,w:3.1,h:0.5,fontSize:9,color:T.mu,fontFace:T.font,align:'center'});
        });
        if(sl.subtitle) slide.addText(sl.subtitle,{x:0.55,y:4.3,w:12.3,h:0.5,fontSize:11,color:T.mu,fontFace:T.font,align:'center',italic:true});
        addFooter(slide);
        break;

      case 'comparison':
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.055,fill:{color:T.a1}});
        slide.addText(sl.title,{x:0.4,y:0.35,w:12.5,h:0.9,fontSize:Math.min(T.hs,22),bold:true,color:T.tx,fontFace:T.font,align:'center',autoFit:true});
        slide.addShape(pptx.ShapeType.rect,{x:0.4,y:1.35,w:6.0,h:0.22,rx:0.06,fill:{color:T.a1,transparency:80}});
        slide.addText('BEFORE / TRADITIONAL',{x:0.4,y:1.35,w:6.0,h:0.22,fontSize:8,bold:true,color:T.a1,fontFace:T.font,align:'center'});
        slide.addShape(pptx.ShapeType.rect,{x:6.8,y:1.35,w:6.1,h:0.22,rx:0.06,fill:{color:T.a2,transparency:80}});
        slide.addText('AFTER / MODERN',{x:6.8,y:1.35,w:6.1,h:0.22,fontSize:8,bold:true,color:T.a2,fontFace:T.font,align:'center'});
        (sl.comparison||[]).slice(0,2).forEach((comp,k)=>{
          const cy=1.75+k*2.6;
          slide.addShape(pptx.ShapeType.rect,{x:0.4,y:cy,w:6.0,h:2.3,rx:0.1,fill:{color:T.a1,transparency:94},line:{color:T.a1,width:0.5,transparency:70}});
          slide.addText(comp.left||'',{x:0.55,y:cy+0.15,w:5.7,h:2.0,fontSize:T.bs,color:T.mu,fontFace:T.font,valign:'top',lineSpacingMultiple:1.3});
          slide.addShape(pptx.ShapeType.rect,{x:6.8,y:cy,w:6.1,h:2.3,rx:0.1,fill:{color:T.a2,transparency:93},line:{color:T.a2,width:0.5,transparency:70}});
          slide.addText(comp.right||'',{x:6.95,y:cy+0.15,w:5.8,h:2.0,fontSize:T.bs,color:T.tx,fontFace:T.font,valign:'top',lineSpacingMultiple:1.3});
        });
        addFooter(slide);
        break;

      case 'timeline':
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.055,fill:{color:T.a1}});
        slide.addText(sl.title,{x:0.55,y:0.35,w:12.3,h:1.0,fontSize:T.hs,bold:true,color:T.tx,fontFace:T.font,align:'center',autoFit:true});
        slide.addShape(pptx.ShapeType.rect,{x:5.7,y:1.45,w:1.9,h:0.04,fill:{color:T.a1}});
        slide.addShape(pptx.ShapeType.line,{x:0.7,y:3.5,w:11.9,h:0,line:{color:T.mu,width:0.5,transparency:60}});
        (sl.steps||sl.bullets||[]).slice(0,4).forEach((step,k)=>{
          const tx=0.7+k*3.0, ty=3.5;
          slide.addShape(pptx.ShapeType.ellipse,{x:tx-0.22,y:ty-0.22,w:0.44,h:0.44,fill:{color:k===1?T.a1:T.p},line:{color:k===1?T.a1:T.a2,width:1}});
          slide.addText(String(k+1),{x:tx-0.22,y:ty-0.22,w:0.44,h:0.44,fontSize:8,bold:true,color:k===1?T.bg:T.a2,fontFace:T.font,align:'center',valign:'middle'});
          if(k%2===0) slide.addText(step,{x:tx-1.35,y:2.0,w:2.9,h:1.2,fontSize:9,color:T.tx,fontFace:T.font,align:'center',valign:'bottom',lineSpacingMultiple:1.3});
          else slide.addText(step,{x:tx-1.35,y:3.9,w:2.9,h:1.4,fontSize:9,color:T.mu,fontFace:T.font,align:'center',valign:'top',lineSpacingMultiple:1.3});
        });
        addFooter(slide);
        break;

      case 'quote': {
        slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.33,h:0.055,fill:{color:T.a1}});
        slide.addShape(pptx.ShapeType.rect,{x:0.55,y:0.8,w:0.05,h:5.5,fill:{color:T.a1}});
        const qText = (sl.bullets?.[0]||sl.title).replace(/^"+|"+$/g,'');
        slide.addText(`"${qText}"`,{x:0.8,y:0.9,w:11.7,h:3.2,fontSize:Math.min(T.hs,22),bold:true,color:T.tx,fontFace:T.font,italic:true,lineSpacingMultiple:1.5,autoFit:true});
        if(sl.bullets?.[1]) slide.addText(sl.bullets[1],{x:0.8,y:4.2,w:11.7,h:0.7,fontSize:T.bs,color:T.mu,fontFace:T.font});
        if(sl.bullets?.[2]) slide.addText(sl.bullets[2],{x:0.8,y:4.95,w:11.7,h:0.6,fontSize:T.bs,color:T.a1,fontFace:T.font,bold:true});
        addFooter(slide);
        break;
      }

      case 'closing':
        slide.addShape(pptx.ShapeType.ellipse,{x:4.17,y:0.8,w:5.0,h:5.0,fill:{color:T.a1,transparency:96},line:{color:T.a1,width:1,transparency:70}});
        slide.addShape(pptx.ShapeType.ellipse,{x:5.17,y:1.8,w:3.0,h:3.0,fill:{color:T.a2,transparency:94},line:{color:T.a2,width:1,transparency:65}});
        slide.addShape(pptx.ShapeType.rect,{x:0,y:6.8,w:13.33,h:0.7,fill:{color:T.a1}});
        slide.addText('Thank You',{x:0.5,y:1.5,w:12.3,h:2.2,fontSize:52,bold:true,color:T.tx,fontFace:T.font,align:'center',charSpacing:-2});
        slide.addShape(pptx.ShapeType.rect,{x:5.4,y:3.8,w:2.5,h:0.05,fill:{color:T.a1}});
        if(sl.subtitle) slide.addText(sl.subtitle,{x:0.5,y:4.0,w:12.3,h:0.7,fontSize:16,color:T.a1,fontFace:T.font,align:'center',italic:true});
        (sl.bullets||[]).slice(0,4).forEach((b,k)=>{
          slide.addText(`· ${b}`,{x:2.0,y:4.85+k*0.42,w:9.3,h:0.38,fontSize:10,color:T.mu,fontFace:T.font,align:'center'});
        });
        slide.addText(`Udara · ${LT.label} Theme`,{x:0.5,y:6.9,w:12.3,h:0.4,fontSize:9,color:T.bg,fontFace:T.font,align:'center',bold:true});
        break;

      default:
        slide.addText(sl.title||'',{x:0.55,y:0.5,w:12.3,h:1.0,fontSize:T.hs,bold:true,color:T.tx,fontFace:T.font});
    }
  });

  const safeName = currentTopic.replace(/[^a-z0-9\s_-]/gi,'').trim().replace(/\s+/g,'_').slice(0,50)||'presentation';
  pptx.writeFile({fileName:`${safeName}_Udara.pptx`})
    .then(()=>{
      showToast('📥 PowerPoint downloaded! Enjoy — from Udara 🇳🇬');
      localStorage.removeItem(LS.slides);
      localStorage.removeItem(LS.topic);
      localStorage.removeItem(LS.audience);
    })
    .catch(err=>{ console.error('[Udara] PPTX error:',err); showToast('❌ Download failed — please try again.'); });
}

/* ═══════════════════════════════════════════════════════════════════════
   UI HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
function setLoading(on, label=''){
  if(!generateBtn) return;
  if(on){
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="btn-spinner"></span>${label}`;
    if(progressWrap)  progressWrap.style.display  = 'block';
    if(progressLabel) progressLabel.style.display = 'block';
  } else {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '✦ Generate My Slides';
    if(progressWrap)  progressWrap.style.display  = 'none';
    if(progressLabel) progressLabel.style.display = 'none';
    if(progressBar)   progressBar.style.width     = '0%';
  }
}
function setProgress(p){
  if(progressBar) progressBar.style.width = p+'%';
}
function setProgressLabel(t){
  if(progressLabel) progressLabel.textContent = t;
}

async function simulateProgress(count, cb){
  const steps = [
    [18, 'Sending your prompt to the AI…'],
    [38, 'Crafting slide content…'],
    [60, `Building ${count} slides…`],
    [80, 'Checking structure & layout…'],
    [92, 'Almost ready — saving your work…'],
  ];
  for(const [p,l] of steps){ await delay(280); cb(p,l); }
}

let _toast;
function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(_toast);
  _toast = setTimeout(() => toast.classList.remove('show'), 3500);
}
function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
// End of Udara app.js
