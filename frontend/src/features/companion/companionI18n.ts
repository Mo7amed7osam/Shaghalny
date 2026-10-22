import type { CardNote, CompanionLang, CompanionPage, DemoNotice } from './types';

const en = {
  name: 'Shaghol',
  tagline: 'Your career companion',
  openLabel: 'Open Shaghol, your career companion',
  minimize: 'Minimize',
  close: 'Hide companion',
  reopen: 'Show Shaghol',
  newChat: 'New chat',
  language: 'العربية',
  languageLabel: 'Switch to Arabic',
  greeting: "Hi, I'm Shaghol! I can find jobs that fit your skills, review your CV, and help you write proposals.",
  guestGreeting: "Hi, I'm Shaghol! Sign in as a student and I'll help you find work, polish your CV and write proposals.",
  peek: 'Need help finding work?',
  signIn: 'Sign in',
  register: 'Create account',
  inputLabel: 'Message Shaghol',
  inputPlaceholder: 'Ask Shaghol anything…',
  send: 'Send',
  thinking: 'Thinking…',
  searching: 'Searching real listings…',
  reviewing: 'Reading your CV…',
  writing: 'Drafting your proposal…',
  retry: 'Retry',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  demoBadge: 'Demo responses',
  demoNotice: {
    not_configured: 'Demo responses: the AI provider isn’t configured, so answers are rule-based. Job results are real listings.',
    quota: 'Demo responses: the AI quota is used up right now. Job results are real; retry later for AI answers.',
    rate_limited: 'Demo responses: the AI provider is busy. Job results are real; retry in a moment.',
    timeout: 'Demo responses: the AI took too long. Job results are real; you can retry.',
    provider_error: 'Demo responses: the AI provider failed. Job results are real; you can retry.',
  } as Record<DemoNotice, string>,
  errorGeneric: 'Something went wrong. Please try again.',
  errorNotConfigured: 'The AI companion isn’t set up on this server yet.',
  errorRate: 'You’re sending messages quickly. Wait a few minutes and try again.',
  errorNetwork: 'Can’t reach the server. Check your connection and retry.',
  starters: {
    findJobs: 'Find jobs for me',
    reviewCv: 'Review my CV',
    writeProposal: 'Help me write a proposal',
    verification: 'How does skill verification work?',
    profile: 'How can I improve my profile?',
    roadmap: 'Help me plan my career',
    missing: 'What skills am I missing for this job?',
  },
  cvTitle: 'Paste your CV text',
  cvHint: 'Plain text works best. Nothing is saved to your profile.',
  cvPlaceholder: 'Paste your CV here…',
  cvSubmit: 'Review CV',
  cvCancel: 'Cancel',
  cvTailored: 'Tailor to',
  cvUserMessage: (chars: number, job?: string) => `Review my CV (${chars.toLocaleString()} characters pasted)${job ? ` for “${job}”` : ''}.`,
  proposalUserMessage: (job: string) => `Help me write a proposal for “${job}”.`,
  selectedJob: 'Selected job',
  clearSelection: 'Clear selected job',
  card: {
    internal: 'Shaghalny project',
    external: 'External listing',
    verifiedCompany: 'Verified client',
    budget: 'Budget',
    unpaid: 'Unpaid',
    notPublished: 'Not published',
    location: 'Location',
    online: 'Online',
    onsite: 'Onsite',
    hybrid: 'Hybrid',
    freelance: 'Freelance',
    internship: 'Internship',
    why: 'Why it may fit',
    watch: 'Check before applying',
    viewApply: 'View & apply',
    viewJob: 'View job',
    openListing: 'Apply on source site',
    applyThere: (src: string) => `You apply on ${src}, not on Shaghalny.`,
    select: 'Select',
    selected: 'Selected',
    proposal: 'Write proposal',
    tailorCv: 'Tailor CV',
    applied: 'Applied',
  },
  reason: (n: CardNote): string => {
    switch (n.code) {
      case 'verified_match': return `Uses your verified skills: ${n.skills?.join(', ')}`;
      case 'eligible': return 'All required skills are verified, so you can apply';
      case 'internship': return 'Internship, often suited to students';
      default: return '';
    }
  },
  caution: (n: CardNote): string => {
    switch (n.code) {
      case 'missing_verified': return `Verify first: ${n.skills?.join(', ')}`;
      case 'unverified_listed': return `Listed skills not verified on Shaghalny: ${n.skills?.join(', ')}`;
      case 'senior_role': return 'Senior-level title: likely expects more experience than most students have';
      case 'external_apply': return `Applications go through ${n.source || 'the original site'}`;
      case 'remote_restrictions': return 'Remote doesn’t mean worldwide: check country or timezone limits';
      case 'location_unknown': return 'Location eligibility not stated: check the listing';
      case 'already_applied': return 'You already applied to this job';
      case 'unpaid': return 'Unpaid position';
      default: return '';
    }
  },
  cv: {
    exampleLabel: 'Rule-based checklist, not AI analysis',
    summary: 'Summary',
    strengths: 'Strengths',
    issues: 'Issues to fix',
    rewrites: 'Suggested rewrites',
    before: 'Before',
    after: 'After',
    exampleRewrite: 'Example only',
    missingFacts: 'Facts I need from you',
    copyAll: 'Copy improvements',
    notSaved: 'Nothing was changed on your profile.',
  },
  proposal: {
    title: 'Proposal draft',
    exampleLabel: 'Example template, not personalized AI writing',
    editLabel: 'Edit proposal draft',
    useInApplication: 'Use in application',
    notSent: 'Not sent. Review it, then submit from the Job Board.',
    placeholders: 'Replace every [bracketed] placeholder with real facts.',
    cantApply: 'Verify the required skills before applying to this job.',
  },
  pages: {
    jobs: 'Job Board',
    profile: 'My profile',
    skill_verification: 'Skill Verification',
    career_roadmap: 'Career Roadmap',
    dashboard: 'Dashboard',
    contracts: 'Contracts',
    interview_history: 'Interview history',
  } as Record<CompanionPage, string>,
  openPage: 'Open',
  jobGone: 'This job is no longer listed.',
};

export type CompanionStrings = typeof en;

const ar: CompanionStrings = {
  ...en,
  name: 'شغّول',
  tagline: 'رفيقك المهني',
  openLabel: 'افتح شغّول، رفيقك المهني',
  minimize: 'تصغير',
  close: 'إخفاء الرفيق',
  reopen: 'إظهار شغّول',
  newChat: 'محادثة جديدة',
  language: 'English',
  languageLabel: 'التبديل إلى الإنجليزية',
  greeting: 'أهلًا، أنا شغّول! أقدر أساعدك تلاقي وظائف تناسب مهاراتك، وأراجع سيرتك الذاتية، وأكتب معاك عروض التقديم.',
  guestGreeting: 'أهلًا، أنا شغّول! سجّل دخولك كطالب وسأساعدك في إيجاد عمل وتحسين سيرتك وكتابة العروض.',
  peek: 'محتاج مساعدة تلاقي شغل؟',
  signIn: 'تسجيل الدخول',
  register: 'إنشاء حساب',
  inputLabel: 'راسل شغّول',
  inputPlaceholder: 'اسأل شغّول…',
  send: 'إرسال',
  thinking: 'أفكر…',
  searching: 'أبحث في الوظائف الحقيقية…',
  reviewing: 'أقرأ سيرتك الذاتية…',
  writing: 'أكتب مسودة العرض…',
  retry: 'إعادة المحاولة',
  copy: 'نسخ',
  copied: 'تم النسخ',
  copyFailed: 'تعذّر النسخ',
  demoBadge: 'ردود تجريبية',
  demoNotice: {
    not_configured: 'ردود تجريبية: مزوّد الذكاء الاصطناعي غير مُعدّ، لذا الإجابات آلية. نتائج الوظائف حقيقية.',
    quota: 'ردود تجريبية: انتهت حصة الذكاء الاصطناعي حاليًا. نتائج الوظائف حقيقية؛ أعد المحاولة لاحقًا.',
    rate_limited: 'ردود تجريبية: مزوّد الذكاء الاصطناعي مشغول. نتائج الوظائف حقيقية؛ أعد المحاولة بعد قليل.',
    timeout: 'ردود تجريبية: استغرق الذكاء الاصطناعي وقتًا طويلًا. نتائج الوظائف حقيقية؛ يمكنك إعادة المحاولة.',
    provider_error: 'ردود تجريبية: فشل مزوّد الذكاء الاصطناعي. نتائج الوظائف حقيقية؛ يمكنك إعادة المحاولة.',
  },
  errorGeneric: 'حدث خطأ. حاول مرة أخرى.',
  errorNotConfigured: 'رفيق الذكاء الاصطناعي غير مُعدّ على هذا الخادم بعد.',
  errorRate: 'أنت ترسل رسائل بسرعة. انتظر بضع دقائق ثم حاول مجددًا.',
  errorNetwork: 'تعذّر الوصول إلى الخادم. تحقّق من الاتصال وأعد المحاولة.',
  starters: {
    findJobs: 'دوّر لي على شغل',
    reviewCv: 'راجع سيرتي الذاتية',
    writeProposal: 'ساعدني أكتب عرض تقديم',
    verification: 'إزاي يتم توثيق المهارات؟',
    profile: 'إزاي أحسّن ملفي؟',
    roadmap: 'ساعدني أخطط لمساري المهني',
    missing: 'ما المهارات الناقصة لهذه الوظيفة؟',
  },
  cvTitle: 'الصق نص سيرتك الذاتية',
  cvHint: 'النص العادي هو الأفضل. لن يُحفظ شيء في ملفك.',
  cvPlaceholder: 'الصق سيرتك هنا…',
  cvSubmit: 'راجع السيرة',
  cvCancel: 'إلغاء',
  cvTailored: 'مخصّصة لـ',
  cvUserMessage: (chars: number, job?: string) => `راجع سيرتي الذاتية (${chars.toLocaleString('ar-EG')} حرف)${job ? ` لوظيفة «${job}»` : ''}.`,
  proposalUserMessage: (job: string) => `ساعدني أكتب عرض تقديم لوظيفة «${job}».`,
  selectedJob: 'الوظيفة المختارة',
  clearSelection: 'إلغاء اختيار الوظيفة',
  card: {
    internal: 'مشروع على شغّلني',
    external: 'وظيفة خارجية',
    verifiedCompany: 'عميل موثّق',
    budget: 'الميزانية',
    unpaid: 'غير مدفوع',
    notPublished: 'غير منشورة',
    location: 'الموقع',
    online: 'أونلاين',
    onsite: 'في المقر',
    hybrid: 'هجين',
    freelance: 'عمل حر',
    internship: 'تدريب',
    why: 'لماذا قد تناسبك',
    watch: 'انتبه قبل التقديم',
    viewApply: 'عرض وتقديم',
    viewJob: 'عرض الوظيفة',
    openListing: 'قدّم في الموقع الأصلي',
    applyThere: (src: string) => `التقديم يتم على ${src} وليس على شغّلني.`,
    select: 'اختيار',
    selected: 'مختارة',
    proposal: 'اكتب عرضًا',
    tailorCv: 'خصّص السيرة',
    applied: 'تم التقديم',
  },
  reason: (n: CardNote): string => {
    switch (n.code) {
      case 'verified_match': return `تستخدم مهاراتك الموثّقة: ${n.skills?.join('، ')}`;
      case 'eligible': return 'كل المهارات المطلوبة موثّقة، يمكنك التقديم';
      case 'internship': return 'تدريب، غالبًا مناسب للطلاب';
      default: return '';
    }
  },
  caution: (n: CardNote): string => {
    switch (n.code) {
      case 'missing_verified': return `وثّق أولًا: ${n.skills?.join('، ')}`;
      case 'unverified_listed': return `مهارات مطلوبة غير موثّقة على شغّلني: ${n.skills?.join('، ')}`;
      case 'senior_role': return 'مسمّى لمستوى متقدم: غالبًا يتطلب خبرة أكبر من معظم الطلاب';
      case 'external_apply': return `التقديم عبر ${n.source || 'الموقع الأصلي'}`;
      case 'remote_restrictions': return 'العمل عن بُعد لا يعني متاحًا لكل الدول: تحقّق من قيود الدولة أو المنطقة الزمنية';
      case 'location_unknown': return 'شروط الموقع غير مذكورة: راجع الإعلان';
      case 'already_applied': return 'قدّمت على هذه الوظيفة بالفعل';
      case 'unpaid': return 'وظيفة غير مدفوعة';
      default: return '';
    }
  },
  cv: {
    exampleLabel: 'قائمة فحص آلية، ليست تحليلًا بالذكاء الاصطناعي',
    summary: 'الملخص',
    strengths: 'نقاط القوة',
    issues: 'مشكلات يجب إصلاحها',
    rewrites: 'إعادة صياغة مقترحة',
    before: 'قبل',
    after: 'بعد',
    exampleRewrite: 'مثال فقط',
    missingFacts: 'معلومات أحتاجها منك',
    copyAll: 'نسخ التحسينات',
    notSaved: 'لم يتم تغيير أي شيء في ملفك.',
  },
  proposal: {
    title: 'مسودة العرض',
    exampleLabel: 'قالب تجريبي، ليس كتابة مخصّصة بالذكاء الاصطناعي',
    editLabel: 'تعديل مسودة العرض',
    useInApplication: 'استخدمها في التقديم',
    notSent: 'لم يتم الإرسال. راجعها ثم قدّم من لوحة الوظائف.',
    placeholders: 'استبدل كل نص بين [أقواس] بمعلومات حقيقية.',
    cantApply: 'وثّق المهارات المطلوبة قبل التقديم على هذه الوظيفة.',
  },
  pages: {
    jobs: 'لوحة الوظائف',
    profile: 'ملفي',
    skill_verification: 'توثيق المهارات',
    career_roadmap: 'خارطة المسار المهني',
    dashboard: 'لوحة التحكم',
    contracts: 'العقود',
    interview_history: 'سجل المقابلات',
  },
  openPage: 'افتح',
  jobGone: 'هذه الوظيفة لم تعد معروضة.',
};

export const COMPANION_STRINGS: Record<CompanionLang, CompanionStrings> = { en, ar };

export const PAGE_ROUTES: Record<CompanionPage, string> = {
  jobs: '/student/jobs',
  profile: '/student/profile',
  skill_verification: '/student/skill-verification',
  career_roadmap: '/student/career-roadmap',
  dashboard: '/student/dashboard',
  contracts: '/student/contracts',
  interview_history: '/student/interview-history',
};
