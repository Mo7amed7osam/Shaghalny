const Skill = require("../../models/Skill");
const { searchJobsForStudent, getJobForStudent } = require("./companion.jobs");
const { profileSummary } = require("./companion.tools");

// Demo responses: used only when COMPANION_FALLBACK_MODE=demo and the AI
// provider is missing or failing. Job results are real database queries; CV
// and proposal content is rule-based and labelled as an example.

const fallbackEnabled = () => String(process.env.COMPANION_FALLBACK_MODE || "").toLowerCase() === "demo";

const T = {
  en: {
    jobsFound: (q, skills) => `Here are open listings on Shaghalny${q ? ` related to ${q}` : skills ? " that use your verified skills" : ", newest first"}. The notes on each card are rule-based checks from your profile, not AI analysis.`,
    jobsNone: (q) => `I couldn't find open listings${q ? ` for ${q}` : " for your verified skills"} right now. Try other keywords (for example a skill name) or browse the Job Board.`,
    askPrefs: "To narrow this down, tell me: freelance or internship, online or onsite, and which skills or roles interest you.",
    noSkills: "You have no verified skills yet, so I searched recent listings instead. Verifying skills unlocks internal jobs.",
    cvAsk: "Paste your CV text in the box below and I'll run a checklist on it.",
    cvIntro: "Rule-based CV checklist (demo responses). This is not AI analysis: it checks structure and wording patterns only. The rewrite below is a generic example, not a rewrite of your CV.",
    proposalAsk: "Which job is the proposal for? Open a job from the cards or the Job Board and ask again.",
    proposalIntro: "Example proposal template (demo responses). It uses the job and your verified skills, but it is not personalized AI writing. Replace every [bracketed] placeholder with real facts before using it.",
    jobGone: "That job is no longer open, so I can't draft a proposal for it.",
    help: "I can find jobs that fit your verified skills, check your CV text, and draft a proposal for a job you pick. Choose one of the starter actions or ask about verification, applying, or the career roadmap.",
    verify: "Skills are verified through an AI video interview on the Skill Verification page. The interview is scored and a reviewer makes the final decision; passed skills appear on your profile as verified. Internal jobs accept proposals only when every required skill is verified.",
    apply: "For internal jobs, open the job on the Job Board and submit a proposal there. You can apply once per job, and only after all required skills are verified. External listings are applied to on the original site.",
    roadmap: "The Career Roadmap page builds a learning plan from a goal you type, such as 'frontend developer'.",
    payments: "I can't quote fees, payout dates or refund rules: they aren't defined in what I can see. Check the Wallet page for what is available on your account.",
    profile: "Your profile holds your bio, university, portfolio links, CV upload and verified skills. Clients see it when you apply.",
    skillGap: (card) => {
      if (!card.requiredSkills.length) return `"${card.title}" doesn't list required skills.`;
      if (card.sourceType === "external") {
        return card.missingVerifiedSkills.length
          ? `"${card.title}" lists ${card.missingVerifiedSkills.join(", ")}, which you haven't verified on Shaghalny. It's an external listing, so the employer decides eligibility on their site.`
          : `You've verified every skill "${card.title}" lists. It's an external listing, so apply on the original site.`;
      }
      return card.missingVerifiedSkills.length
        ? `To apply to "${card.title}" you still need to verify: ${card.missingVerifiedSkills.join(", ")}. Internal jobs accept proposals only when every required skill is verified.`
        : `All required skills for "${card.title}" are verified, so you can apply from the Job Board.`;
    },
  },
  ar: {
    jobsFound: (q, skills) => `هذه وظائف متاحة على شغّلني${q ? ` مرتبطة بـ ${q}` : skills ? " تناسب مهاراتك الموثّقة" : "، الأحدث أولًا"}. الملاحظات على كل بطاقة فحوص آلية من ملفك، وليست تحليلًا بالذكاء الاصطناعي.`,
    jobsNone: (q) => `لم أجد وظائف متاحة${q ? ` لـ ${q}` : " لمهاراتك الموثّقة"} حاليًا. جرّب كلمات أخرى (مثل اسم مهارة) أو تصفّح لوحة الوظائف.`,
    askPrefs: "لتضييق النتائج أخبرني: عمل حر أم تدريب، أونلاين أم في المقر، وما المهارات أو الأدوار التي تهمك.",
    noSkills: "ليس لديك مهارات موثّقة بعد، لذلك بحثت في أحدث الوظائف. توثيق المهارات يتيح لك التقديم على الوظائف الداخلية.",
    cvAsk: "الصق نص سيرتك الذاتية في المربع بالأسفل وسأراجعها وفق قائمة فحص.",
    cvIntro: "قائمة فحص آلية للسيرة الذاتية (ردود تجريبية). هذا ليس تحليلًا بالذكاء الاصطناعي: يفحص البنية وأنماط الصياغة فقط. إعادة الصياغة بالأسفل مثال عام وليست من سيرتك.",
    proposalAsk: "لأي وظيفة تريد العرض؟ افتح وظيفة من البطاقات أو من لوحة الوظائف ثم اطلب مجددًا.",
    proposalIntro: "قالب عرض تجريبي (ردود تجريبية). يستخدم بيانات الوظيفة ومهاراتك الموثّقة لكنه ليس كتابة مخصّصة بالذكاء الاصطناعي. استبدل كل نص بين [أقواس] بمعلومات حقيقية قبل استخدامه.",
    jobGone: "هذه الوظيفة لم تعد متاحة، لذلك لا يمكنني كتابة عرض لها.",
    help: "أستطيع إيجاد وظائف تناسب مهاراتك الموثّقة، ومراجعة نص سيرتك الذاتية، وكتابة مسودة عرض لوظيفة تختارها. اختر أحد الإجراءات السريعة أو اسأل عن التوثيق أو التقديم أو خارطة المسار المهني.",
    verify: "يتم توثيق المهارات عبر مقابلة فيديو بالذكاء الاصطناعي في صفحة توثيق المهارات. تُقيَّم المقابلة ثم يتخذ مراجع القرار النهائي، وتظهر المهارات الناجحة في ملفك كمهارات موثّقة. الوظائف الداخلية تقبل العروض فقط عند توثيق كل المهارات المطلوبة.",
    apply: "للوظائف الداخلية افتح الوظيفة في لوحة الوظائف وقدّم عرضك هناك. يمكنك التقديم مرة واحدة لكل وظيفة وبعد توثيق كل المهارات المطلوبة فقط. الوظائف الخارجية يتم التقديم عليها في الموقع الأصلي.",
    roadmap: "صفحة خارطة المسار المهني تبني خطة تعلم من هدف تكتبه، مثل «مطور واجهات أمامية».",
    payments: "لا أستطيع ذكر رسوم أو مواعيد صرف أو سياسات استرداد لأنها غير محددة فيما أراه. راجع صفحة المحفظة لمعرفة المتاح في حسابك.",
    profile: "ملفك يحتوي على نبذتك وجامعتك وروابط أعمالك وسيرتك الذاتية ومهاراتك الموثّقة، ويراه العملاء عند تقديمك.",
    skillGap: (card) => {
      if (!card.requiredSkills.length) return `وظيفة «${card.title}» لا تذكر مهارات مطلوبة.`;
      if (card.sourceType === "external") {
        return card.missingVerifiedSkills.length
          ? `وظيفة «${card.title}» تذكر ${card.missingVerifiedSkills.join("، ")} وهي غير موثّقة لديك على شغّلني. هذه وظيفة خارجية، وصاحب العمل يحدد الأهلية على موقعه.`
          : `وثّقت كل المهارات التي تذكرها «${card.title}». هذه وظيفة خارجية، فقدّم في الموقع الأصلي.`;
      }
      return card.missingVerifiedSkills.length
        ? `للتقديم على «${card.title}» ما زلت تحتاج توثيق: ${card.missingVerifiedSkills.join("، ")}. الوظائف الداخلية تقبل العروض فقط عند توثيق كل المهارات المطلوبة.`
        : `كل المهارات المطلوبة لـ «${card.title}» موثّقة، يمكنك التقديم من لوحة الوظائف.`;
    },
  },
};

const t = (lang) => T[lang] || T.en;

const has = (text, re) => re.test(text);
const JOB_WORDS = /\b(jobs?|work|gigs?|projects?|internships?|freelanc\w*|hire|openings?|roles?)\b|وظ[يا]ف|شغل|مشروع|مشاريع|تدريب|فرص/i;
const CV_WORDS = /\b(cv|resume|résumé)\b|سيرة/i;
const PROPOSAL_WORDS = /\b(proposals?|cover letter|apply letter)\b|عرض|خطاب/i;

const detectIntent = (text) => {
  if (has(text, PROPOSAL_WORDS)) return "write_proposal";
  if (has(text, CV_WORDS)) return "review_cv";
  if (has(text, JOB_WORDS)) return "find_jobs";
  return "chat";
};

// Only skill names that exist in the catalogue count as search terms, so the
// demo never searches for filler words like "find" or "me".
const skillTermsIn = async (text) => {
  const skills = await Skill.find().select("name").limit(500).lean();
  const lower = ` ${String(text).toLowerCase()} `;
  return skills
    .map((s) => s.name)
    .filter((name) => {
      const n = String(name || "").toLowerCase().trim();
      if (n.length < 2) return false;
      const re = new RegExp(`(^|[^a-z0-9+#.])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9+#])`, "i");
      return re.test(lower);
    })
    .slice(0, 4);
};

const demoJobs = async ({ student, text, lang, preferences = {} }) => {
  const s = t(lang);
  const terms = await skillTermsIn(text);
  const type = preferences.type || (/\bintern(ship)?s?\b|تدريب/i.test(text) ? "internship" : /\bfreelanc\w*\b|عمل حر/i.test(text) ? "freelance" : undefined);
  const result = await searchJobsForStudent(student, {
    query: terms.join(" "),
    type,
    workMode: preferences.workMode || undefined,
    source: preferences.source || "any",
    limit: 5,
  });
  const label = terms.join(", ");
  const hasSkills = (student.verifiedSkills || []).length > 0;
  const parts = [result.jobs.length ? s.jobsFound(label, hasSkills) : s.jobsNone(label)];
  if (!terms.length && !hasSkills) parts.push(s.noSkills);
  if (!type && !terms.length) parts.push(s.askPrefs);
  return { reply: parts.join("\n\n"), cards: result.jobs, actions: result.jobs.length ? [] : ["jobs"] };
};

const SECTION_PATTERNS = {
  education: /\b(education|university|faculty|bachelor|degree)\b|تعليم|جامعة|كلية/i,
  experience: /\b(experience|internship|employment|work history)\b|خبرة|خبرات/i,
  projects: /\b(projects?|portfolio)\b|مشاريع|مشروع/i,
  skills: /\b(skills|technologies|tools)\b|مهارات/i,
};

/** Structural checks only; nothing here claims to understand the CV's content. */
const cvChecklist = (cvText, lang) => {
  const ar = lang === "ar";
  const text = String(cvText || "");
  const words = text.split(/\s+/).filter(Boolean).length;
  const strengths = [];
  const issues = [];
  const found = Object.entries(SECTION_PATTERNS).filter(([, re]) => re.test(text)).map(([k]) => k);
  const missing = Object.keys(SECTION_PATTERNS).filter((k) => !found.includes(k));
  const names = ar
    ? { education: "التعليم", experience: "الخبرة", projects: "المشاريع", skills: "المهارات" }
    : { education: "Education", experience: "Experience", projects: "Projects", skills: "Skills" };

  if (found.length) strengths.push(ar ? `تحتوي على أقسام: ${found.map((k) => names[k]).join("، ")}.` : `Has clear sections: ${found.map((k) => names[k]).join(", ")}.`);
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) strengths.push(ar ? "تتضمن بريدًا إلكترونيًا للتواصل." : "Includes a contact email.");
  if (/github\.com|linkedin\.com|behance\.net|dribbble\.com/i.test(text)) strengths.push(ar ? "تتضمن روابط لأعمال أو حسابات مهنية." : "Links to a portfolio or professional profile.");
  if (/\d+\s?(%|percent|users|clients|projects|k\b)/i.test(text)) strengths.push(ar ? "تستخدم أرقامًا لقياس النتائج." : "Uses numbers to show results.");

  for (const k of missing) issues.push({ section: names[k], problem: ar ? `لم أجد قسم ${names[k]} واضحًا.` : `No clear ${names[k]} section found.` });
  if (words < 120) issues.push({ section: ar ? "الطول" : "Length", problem: ar ? `النص قصير (${words} كلمة). أضف تفاصيل عن مشاريعك ومسؤولياتك.` : `Quite short (${words} words). Add detail about your projects and responsibilities.` });
  if (words > 900) issues.push({ section: ar ? "الطول" : "Length", problem: ar ? `النص طويل (${words} كلمة). حاول الاختصار لصفحة أو صفحتين.` : `Long (${words} words). Aim for one to two pages.` });
  if (!/\d/.test(text)) issues.push({ section: ar ? "النتائج" : "Impact", problem: ar ? "لا توجد أرقام. أضف نتائج قابلة للقياس إن وُجدت." : "No numbers. Add measurable results where you have them." });
  if (/(^|\n)\s*(i|I)\s/.test(text) || /\bI (am|was|have|did)\b/.test(text)) issues.push({ section: ar ? "الصياغة" : "Wording", problem: ar ? "استخدم أفعالًا مباشرة بدل ضمير المتكلم." : "Start bullets with action verbs instead of \"I\"." });
  if (!/github\.com|linkedin\.com|behance\.net|dribbble\.com|https?:\/\//i.test(text)) issues.push({ section: ar ? "الروابط" : "Links", problem: ar ? "أضف رابطًا لأعمالك (GitHub أو Behance أو موقع شخصي) إن وُجد." : "Add a link to your work (GitHub, Behance or a personal site) if you have one." });

  return {
    example: true,
    summary: null,
    strengths,
    issues: issues.slice(0, 8),
    rewrites: [
      ar
        ? { section: "مثال عام", before: "عملت على موقع لشركة.", after: "بنيت [الميزة] لـ [الجهة] باستخدام [التقنية]، مما أدى إلى [نتيجة قابلة للقياس].", note: "مثال توضيحي فقط، ليس من سيرتك." }
        : { section: "Generic example", before: "Worked on a website for a company.", after: "Built [feature] for [client or team] using [technology], resulting in [measurable result].", note: "Illustrative example only, not taken from your CV." },
    ],
    missingFacts: [],
  };
};

const proposalTemplate = ({ student, job, lang }) => {
  const profile = profileSummary(student);
  const matched = job.card.requiredSkills.filter((s) => s.verified).map((s) => s.name);
  const company = job.card.company || (lang === "ar" ? "فريقكم" : "your team");
  if (lang === "ar") {
    return [
      `مرحبًا ${company}،`,
      "",
      `أنا ${profile.firstName || "[اسمك]"}${profile.university ? `، أدرس في ${profile.university}` : "، [جامعتك وتخصصك]"}، وأرغب في التقدّم لفرصة «${job.card.title}».`,
      matched.length ? `لدي مهارات موثّقة على شغّلني في: ${matched.join("، ")}.` : "[اذكر مهاراتك المرتبطة بهذه الوظيفة]",
      "مؤخرًا عملت على [مشروع مرتبط]، حيث [ما قمت به] وكانت النتيجة [النتيجة].",
      "لهذا المشروع أقترح: [خطوتك الأولى]، ثم [الخطوة التالية]، مع تسليم [ما ستسلّمه] خلال [المدة].",
      profile.portfolioLinks.length ? `أعمالي: ${profile.portfolioLinks.join(" ")}` : "[رابط أعمالك إن وُجد]",
      "",
      "يسعدني مناقشة التفاصيل.",
      profile.firstName || "[اسمك]",
    ].join("\n");
  }
  return [
    `Hi ${company},`,
    "",
    `I'm ${profile.firstName || "[your name]"}${profile.university ? `, a student at ${profile.university}` : ", [your university and major]"}, and I'm interested in "${job.card.title}".`,
    matched.length ? `My verified skills on Shaghalny include ${matched.join(", ")}.` : "[Mention the skills you have that this job needs]",
    "Recently I worked on [relevant project], where I [what you did], which resulted in [outcome].",
    "For this project I would start by [first step], then [next step], and deliver [deliverable] within [timeframe].",
    profile.portfolioLinks.length ? `Portfolio: ${profile.portfolioLinks.join(" ")}` : "[Link to your work, if you have one]",
    "",
    "I'd be happy to discuss the details.",
    profile.firstName || "[your name]",
  ].join("\n");
};

const guidance = (text, lang) => {
  const s = t(lang);
  if (/verif|interview|توثيق|مقابلة/i.test(text)) return { reply: s.verify, actions: ["skill_verification"] };
  if (/apply|application|تقديم|اقدم|أقدم/i.test(text)) return { reply: s.apply, actions: ["jobs"] };
  if (/roadmap|career|plan|learn|مسار|خطة|تعلم/i.test(text)) return { reply: s.roadmap, actions: ["career_roadmap"] };
  if (/fee|payout|refund|wallet|pay|withdraw|رسوم|محفظة|سحب|دفع|استرداد/i.test(text)) return { reply: s.payments, actions: [] };
  if (/profile|ملف/i.test(text)) return { reply: s.profile, actions: ["profile"] };
  return { reply: s.help, actions: [] };
};

// Rule-based plan from real data: the student's verified skills and the
// skills that open jobs matching the goal actually require.
const demoPlan = async ({ student, text, lang }) => {
  const ar = lang === "ar";
  const terms = await skillTermsIn(text);
  const search = await searchJobsForStudent(student, { query: terms.join(" "), limit: 6 });
  const demand = {};
  for (const card of search.jobs) for (const sk of card.missingVerifiedSkills) demand[sk] = (demand[sk] || 0) + 1;
  const gaps = Object.entries(demand).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const eligible = search.jobs.filter((c) => c.canApply).length;
  const profile = profileSummary(student);
  const steps = [];
  if (gaps.length) {
    steps.push({
      title: ar ? `وثّق: ${gaps.map(([k]) => k).join("، ")}` : `Verify ${gaps.map(([k]) => k).join(", ")}`,
      detail: ar
        ? `هذه المهارات مطلوبة في ${gaps.map(([k, n]) => `${n} وظيفة لـ ${k}`).join("، ")} من الوظائف المطابقة ولم توثّقها بعد.`
        : `Matching open jobs require these and you haven't verified them yet (${gaps.map(([k, n]) => `${k}: ${n} job${n > 1 ? "s" : ""}`).join(", ")}).`,
      page: "skill_verification",
    });
  }
  if (eligible) {
    steps.push({
      title: ar ? `قدّم على ${eligible} وظيفة مؤهل لها` : `Apply to the ${eligible} job${eligible > 1 ? "s" : ""} you're eligible for`,
      detail: ar ? "كل مهاراتها المطلوبة موثّقة لديك. راجعها في لوحة الوظائف." : "All their required skills are already verified on your profile. Review them on the Job Board.",
      page: "jobs",
    });
  }
  if (!profile.portfolioLinks.length || !profile.hasUploadedCv) {
    steps.push({
      title: ar ? "أكمل ملفك" : "Complete your profile",
      detail: ar
        ? [!profile.portfolioLinks.length && "أضف رابطًا لأعمالك", !profile.hasUploadedCv && "ارفع سيرتك الذاتية"].filter(Boolean).join(" و") + "."
        : [!profile.portfolioLinks.length && "add a portfolio link", !profile.hasUploadedCv && "upload your CV"].filter(Boolean).join(" and ").replace(/^./, (c) => c.toUpperCase()) + ".",
      page: "profile",
    });
  }
  steps.push({
    title: ar ? "ابنِ خطة تعلم مفصلة" : "Build a detailed learning plan",
    detail: ar ? "صفحة خارطة المسار المهني تنشئ خطة تعلم من هدفك." : "The Career Roadmap page creates a learning plan from your goal.",
    page: "career_roadmap",
  });
  return {
    reply: ar
      ? "خطة آلية (ردود تجريبية) مبنية على مهاراتك الموثّقة والوظائف المتاحة فعلًا، وليست تحليلًا بالذكاء الاصطناعي."
      : "Rule-based plan (demo responses) built from your verified skills and the jobs actually open now, not AI analysis.",
    cards: search.jobs.slice(0, 3),
    careerPlan: { example: true, goal: text.slice(0, 200), summary: null, steps, missingFacts: [] },
  };
};

/** Demo response for one turn. Never claims an AI produced it. */
const demoRespond = async ({ student, intent, text, lang, cvText, jobId, preferences }) => {
  const s = t(lang);
  if (intent === "chat" && jobId && /missing|skills?|require|verif|ناقص|مهار|مطلوب/i.test(text)) {
    const job = await getJobForStudent(student, jobId);
    if (!job) return { reply: s.jobGone, actions: ["jobs"] };
    return { reply: s.skillGap(job.card), cards: [job.card], actions: job.card.missingVerifiedSkills.length ? ["skill_verification"] : [] };
  }

  const resolved = intent === "chat" ? detectIntent(text) : intent;

  if (resolved === "find_jobs") return demoJobs({ student, text, lang, preferences });
  if (resolved === "plan_career") return demoPlan({ student, text, lang });

  if (resolved === "review_cv") {
    if (!cvText) return { reply: s.cvAsk, needs: "cv_text" };
    return { reply: s.cvIntro, cvReview: cvChecklist(cvText, lang) };
  }

  if (resolved === "write_proposal") {
    if (!jobId) return { reply: s.proposalAsk, actions: ["jobs"], needs: "job" };
    const job = await getJobForStudent(student, jobId);
    if (!job) return { reply: s.jobGone, actions: ["jobs"] };
    return {
      reply: s.proposalIntro,
      cards: [job.card],
      proposal: { jobId: job.card.id, text: proposalTemplate({ student, job, lang }), example: true },
    };
  }

  return guidance(text, lang);
};

module.exports = { fallbackEnabled, demoRespond, detectIntent, cvChecklist };
