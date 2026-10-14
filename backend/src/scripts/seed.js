/*
  Demo Seeder for Shaghalny
  - Loads MONGO_URI from backend/.env
  - Replaces existing demo marketplace data with recognizable Egyptian-market company records
  - Creates admin, clients, students, skills, jobs, proposals, contracts, escrow, submissions, and reviews
*/
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Skill = require("../models/Skill");
const User = require("../models/User");
const Job = require("../models/Job");
const Proposal = require("../models/Proposal");
const Contract = require("../models/Contract");
const Escrow = require("../models/Escrow");
const Transaction = require("../models/Transaction");
const WorkSubmission = require("../models/WorkSubmission");

const MONGO =
  process.env.MONGO_URI || "mongodb://localhost:27017/shaghalny-dev";
const DEMO_PASSWORD = "DemoPass123";

const skillSeed = [
  {
    name: "React",
    category: "Programming",
    description:
      "Frontend interfaces for dashboards, landing pages, and internal tools.",
  },
  {
    name: "Next.js",
    category: "Programming",
    description:
      "Server-rendered React applications, SEO pages, and production frontend architecture.",
  },
  {
    name: "TypeScript",
    category: "Programming",
    description:
      "Typed frontend and backend codebases with safer component and API contracts.",
  },
  {
    name: "Node.js",
    category: "Programming",
    description:
      "Backend APIs, authentication flows, and service integrations.",
  },
  {
    name: "UI/UX",
    category: "Design",
    description: "Wireframes, polished interfaces, and design system work.",
  },
  {
    name: "Figma",
    category: "Design",
    description:
      "Interface design, prototyping, handoff systems, and product design collaboration.",
  },
  {
    name: "Flutter",
    category: "Programming",
    description: "Cross-platform mobile application development.",
  },
  {
    name: "Data Analysis",
    category: "Programming",
    description: "Dashboards, spreadsheets, and business reporting.",
  },
  {
    name: "DevOps",
    category: "Programming",
    description: "CI/CD, Docker, deployment pipelines, and observability.",
  },
  {
    name: "Content Writing",
    category: "Media",
    description: "Arabic and English product content, copy, and documentation.",
  },
  {
    name: "Motion Design",
    category: "Design",
    description: "Short-form animation, explainers, and visual storytelling.",
  },
  {
    name: "Python",
    category: "Programming",
    description: "Automation scripts, AI prototypes, and backend services.",
  },
  {
    name: "MongoDB",
    category: "Programming",
    description: "Schema design, aggregation, and application data modeling.",
  },
];
const clientSeed = [
  {
    key: "amazon",
    name: "Amazon Egypt",
    email: "amazon.egypt@shaghalny.demo",
    description:
      "Egypt marketplace and operations team hiring student freelancers for internal tools and seller experience work.",
    website: "https://www.amazon.eg",
    companyLogoUrl: "https://logo.clearbit.com/amazon.com",
    isVerified: true,
    balance: 120000,
  },
  {
    key: "vodafone",
    name: "Vodafone Egypt",
    email: "vodafone.egypt@shaghalny.demo",
    description:
      "Telecom product and support teams improving digital self-service journeys for Egyptian customers.",
    website: "https://web.vodafone.com.eg",
    companyLogoUrl: "https://logo.clearbit.com/vodafone.com",
    isVerified: true,
    balance: 95000,
  },
  {
    key: "fawry",
    name: "Fawry",
    email: "fawry@shaghalny.demo",
    description:
      "Egyptian fintech platform working on merchant dashboards, reporting, and payment operations tooling.",
    website: "https://www.fawry.com",
    companyLogoUrl: "https://logo.clearbit.com/fawry.com",
    isVerified: true,
    balance: 85000,
  },
  {
    key: "talabat",
    name: "talabat Egypt",
    email: "talabat.egypt@shaghalny.demo",
    description:
      "Food delivery operations and growth teams improving restaurant, rider, and customer workflows.",
    website: "https://www.talabat.com/egypt",
    companyLogoUrl: "https://logo.clearbit.com/talabat.com",
    isVerified: true,
    balance: 76000,
  },
  {
    key: "instabug",
    name: "Instabug",
    email: "instabug@shaghalny.demo",
    description:
      "Cairo-born software company building developer tooling, mobile observability, and product documentation.",
    website: "https://www.instabug.com",
    companyLogoUrl: "https://logo.clearbit.com/instabug.com",
    isVerified: true,
    balance: 68000,
  },
  {
    key: "microsoft",
    name: "Microsoft Egypt",
    email: "microsoft.egypt@shaghalny.demo",
    description:
      "Technology and community teams supporting developer programs, events, and cloud education in Egypt.",
    website: "https://www.microsoft.com",
    companyLogoUrl: "https://logo.clearbit.com/microsoft.com",
    isVerified: true,
    balance: 110000,
  },
  {
    key: "apple",
    name: "Apple Egypt",
    email: "apple.egypt@shaghalny.demo",
    description:
      "Retail and education-facing product marketing work for premium customer experiences and training materials.",
    website: "https://www.apple.com",
    companyLogoUrl: "https://logo.clearbit.com/apple.com",
    isVerified: true,
    balance: 90000,
  },
  {
    key: "google",
    name: "Google MENA",
    email: "google.mena@shaghalny.demo",
    description:
      "Regional product and community teams supporting developer education, cloud events, and growth experiments.",
    website: "https://www.google.com",
    companyLogoUrl: "https://logo.clearbit.com/google.com",
    isVerified: true,
    balance: 130000,
  },
  {
    key: "meta",
    name: "Meta MENA",
    email: "meta.mena@shaghalny.demo",
    description:
      "Community, creator, and small-business enablement teams building campaign assets and learning experiences.",
    website: "https://www.meta.com",
    companyLogoUrl: "https://logo.clearbit.com/meta.com",
    isVerified: true,
    balance: 115000,
  },
  {
    key: "uber",
    name: "Uber Egypt",
    email: "uber.egypt@shaghalny.demo",
    description:
      "Operations and safety teams improving driver support, city analytics, and internal workflow tooling.",
    website: "https://www.uber.com/eg/en/",
    companyLogoUrl: "https://logo.clearbit.com/uber.com",
    isVerified: true,
    balance: 105000,
  },
  {
    key: "orange",
    name: "Orange Egypt",
    email: "orange.egypt@shaghalny.demo",
    description:
      "Telecom digital teams working on customer journeys, campaign microsites, and support content.",
    website: "https://www.orange.eg",
    companyLogoUrl: "https://logo.clearbit.com/orange.com",
    isVerified: true,
    balance: 98000,
  },
  {
    key: "jumia",
    name: "Jumia Egypt",
    email: "jumia.egypt@shaghalny.demo",
    description:
      "E-commerce marketplace teams improving seller operations, merchandising, and campaign reporting.",
    website: "https://www.jumia.com.eg",
    companyLogoUrl: "https://logo.clearbit.com/jumia.com.eg",
    isVerified: true,
    balance: 88000,
  },
  {
    key: "noon",
    name: "noon Egypt",
    email: "noon.egypt@shaghalny.demo",
    description:
      "Marketplace growth and retail operations teams building merchandising tools and seasonal campaign pages.",
    website: "https://www.noon.com/egypt-en/",
    companyLogoUrl: "https://logo.clearbit.com/noon.com",
    isVerified: true,
    balance: 92000,
  },
  {
    key: "paymob",
    name: "Paymob",
    email: "paymob@shaghalny.demo",
    description:
      "Egyptian fintech teams creating merchant dashboards, onboarding flows, and payment reporting tools.",
    website: "https://paymob.com",
    companyLogoUrl: "https://logo.clearbit.com/paymob.com",
    isVerified: true,
    balance: 84000,
  },
  {
    key: "breadfast",
    name: "Breadfast",
    email: "breadfast@shaghalny.demo",
    description:
      "Quick-commerce teams improving catalog tools, customer journeys, and operations dashboards.",
    website: "https://www.breadfast.com",
    companyLogoUrl: "https://logo.clearbit.com/breadfast.com",
    isVerified: true,
    balance: 78000,
  },
  {
    key: "swvl",
    name: "Swvl",
    email: "swvl@shaghalny.demo",
    description:
      "Mobility operations teams building route dashboards, rider communications, and fleet reporting workflows.",
    website: "https://www.swvl.com",
    companyLogoUrl: "https://logo.clearbit.com/swvl.com",
    isVerified: true,
    balance: 72000,
  },
  {
    key: "valeo",
    name: "Valeo Egypt",
    email: "valeo.egypt@shaghalny.demo",
    description:
      "Automotive software and engineering teams needing documentation, QA support, and internal tooling.",
    website: "https://www.valeo.com",
    companyLogoUrl: "https://logo.clearbit.com/valeo.com",
    isVerified: true,
    balance: 102000,
  },
  {
    key: "cib",
    name: "CIB Egypt",
    email: "cib.egypt@shaghalny.demo",
    description:
      "Banking digital teams prototyping customer education, internal reporting, and secure service journeys.",
    website: "https://www.cibeg.com",
    companyLogoUrl: "https://logo.clearbit.com/cibeg.com",
    isVerified: true,
    balance: 125000,
  },
  {
    key: "banquemisr",
    name: "Banque Misr",
    email: "banque.misr@shaghalny.demo",
    description:
      "Financial services teams improving digital branch content, dashboards, and customer-facing explainers.",
    website: "https://www.banquemisr.com",
    companyLogoUrl: "https://logo.clearbit.com/banquemisr.com",
    isVerified: true,
    balance: 118000,
  },
  {
    key: "efg",
    name: "EFG Hermes",
    email: "efg.hermes@shaghalny.demo",
    description:
      "Investment and fintech teams creating market education content, analytics prototypes, and client reporting pages.",
    website: "https://www.efghermes.com",
    companyLogoUrl: "https://logo.clearbit.com/efghermes.com",
    isVerified: true,
    balance: 97000,
  },
  {
    key: "vezeeta",
    name: "Vezeeta",
    email: "vezeeta@shaghalny.demo",
    description:
      "Healthtech product teams building patient education, booking analytics, and clinic operations workflows.",
    website: "https://www.vezeeta.com",
    companyLogoUrl: "https://logo.clearbit.com/vezeeta.com",
    isVerified: true,
    balance: 76000,
  },
  {
    key: "trella",
    name: "Trella",
    email: "trella@shaghalny.demo",
    description:
      "Logistics technology teams building shipper dashboards, fleet performance reports, and operations tools.",
    website: "https://www.trella.app",
    companyLogoUrl: "https://logo.clearbit.com/trella.app",
    isVerified: true,
    balance: 74000,
  },
  {
    key: "synapse",
    name: "Synapse Analytics",
    email: "synapse.analytics@shaghalny.demo",
    description:
      "AI and data teams building analytics demos, dashboards, and business intelligence prototypes.",
    website: "https://www.synapse-analytics.io",
    companyLogoUrl: "https://logo.clearbit.com/synapse-analytics.io",
    isVerified: true,
    balance: 70000,
  },
  {
    key: "robusta",
    name: "Robusta Studio",
    email: "robusta@shaghalny.demo",
    description:
      "Digital product studio hiring student talent for frontend execution, QA passes, and design system support.",
    website: "https://robustastudio.com",
    companyLogoUrl: "https://logo.clearbit.com/robustastudio.com",
    isVerified: true,
    balance: 65000,
  },
];

const studentSeed = [
  {
    key: "salma",
    name: "Salma Elshazly",
    email: "salma.elshazly.demo@student.test",
    university: "Cairo University",
    description:
      "Frontend-focused computer science student building clean React interfaces for early-stage products.",
    portfolioLinks: [
      "https://demo-portfolio.test/salma-elshazly",
      "https://behance.net/salma-ui-demo",
    ],
    verifiedSkills: [
      { skill: "React", score: 93 },
      { skill: "UI/UX", score: 88 },
      { skill: "TypeScript", score: 90 },
      { skill: "Next.js", score: 86 },
      { skill: "MongoDB", score: 72 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "omar",
    name: "Omar Tarek",
    email: "omar.tarek.demo@student.test",
    university: "Ain Shams University",
    description:
      "Full-stack student with strong Node.js and DevOps skills, comfortable owning small products end to end.",
    portfolioLinks: [
      "https://demo-portfolio.test/omar-tarek",
      "https://github.com/demo/omartarek",
    ],
    verifiedSkills: [
      { skill: "Node.js", score: 91 },
      { skill: "DevOps", score: 86 },
      { skill: "MongoDB", score: 84 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "mariam",
    name: "Mariam Hany",
    email: "mariam.hany.demo@student.test",
    university: "Alexandria University",
    description:
      "Product designer working on student ventures, event apps, and social-first campaign visuals.",
    portfolioLinks: ["https://demo-portfolio.test/mariam-hany"],
    verifiedSkills: [
      { skill: "UI/UX", score: 95 },
      { skill: "Motion Design", score: 82 },
      { skill: "Content Writing", score: 77 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "youssef",
    name: "Youssef Adel",
    email: "youssef.adel.demo@student.test",
    university: "Mansoura University",
    description:
      "Backend and automation student building APIs, scripts, and data pipelines for operations teams.",
    portfolioLinks: ["https://demo-portfolio.test/youssef-adel"],
    verifiedSkills: [
      { skill: "Python", score: 92 },
      { skill: "Node.js", score: 81 },
      { skill: "Data Analysis", score: 79 },
    ],
    balance: 5400,
    jobsCompleted: 1,
  },
  {
    key: "habiba",
    name: "Habiba Mostafa",
    email: "habiba.mostafa.demo@student.test",
    university: "Helwan University",
    description:
      "UI designer with solid product thinking and a strong eye for Arabic and English visual systems.",
    portfolioLinks: ["https://demo-portfolio.test/habiba-mostafa"],
    verifiedSkills: [
      { skill: "UI/UX", score: 90 },
      { skill: "Content Writing", score: 74 },
      { skill: "Motion Design", score: 80 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "karim",
    name: "Karim Nabil",
    email: "karim.nabil.demo@student.test",
    university: "German University in Cairo",
    description:
      "Mobile engineer building Flutter MVPs, admin panels, and internal ops tools.",
    portfolioLinks: [
      "https://demo-portfolio.test/karim-nabil",
      "https://github.com/demo/karimnabil",
    ],
    verifiedSkills: [
      { skill: "Flutter", score: 89 },
      { skill: "React", score: 76 },
      { skill: "Node.js", score: 73 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "rana",
    name: "Rana Samir",
    email: "rana.samir.demo@student.test",
    university: "The American University in Cairo",
    description:
      "Data and reporting student turning raw operations data into clean dashboards and management summaries.",
    portfolioLinks: ["https://demo-portfolio.test/rana-samir"],
    verifiedSkills: [
      { skill: "Data Analysis", score: 94 },
      { skill: "Python", score: 83 },
      { skill: "Content Writing", score: 78 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: "ziad",
    name: "Ziad Fathy",
    email: "ziad.fathy.demo@student.test",
    university: "Benha University",
    description:
      "Junior full-stack builder focused on CRUD products, dashboards, and internal business tools.",
    portfolioLinks: ["https://demo-portfolio.test/ziad-fathy"],
    verifiedSkills: [
      { skill: "React", score: 80 },
      { skill: "Node.js", score: 78 },
      { skill: "MongoDB", score: 75 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
];

const jobSeed = [
  {
    key: "amazon-seller-dashboard",
    clientKey: "amazon",
    title: "Seller operations dashboard for Amazon Egypt",
    description:
      "Build a React dashboard for marketplace ops to track seller onboarding, delayed listings, and support tickets across Egypt.",
    requiredSkills: ["React", "Node.js", "MongoDB"],
    budgetMin: 18000,
    budgetMax: 26000,
    duration: "3 weeks",
  },
  {
    key: "vodafone-self-service-redesign",
    clientKey: "vodafone",
    title: "Self-service flow redesign for Vodafone Egypt",
    description:
      "Redesign the prepaid support journey with clearer Arabic-first UX, faster issue selection, and stronger account status visibility.",
    requiredSkills: ["UI/UX", "Content Writing", "React"],
    budgetMin: 14000,
    budgetMax: 22000,
    duration: "2 weeks",
  },
  {
    key: "fawry-merchant-analytics",
    clientKey: "fawry",
    title: "Merchant analytics cleanup for Fawry reports",
    description:
      "Clean merchant transaction exports, standardize KPIs, and prepare a lightweight reporting view for operations managers.",
    requiredSkills: ["Data Analysis", "Python"],
    budgetMin: 16000,
    budgetMax: 24000,
    duration: "3 weeks",
  },
  {
    key: "talabat-restaurant-portal",
    clientKey: "talabat",
    title: "Restaurant portal UI polish for talabat Egypt",
    description:
      "Improve restaurant onboarding screens, menu edit flows, and issue states for small food businesses using the portal.",
    requiredSkills: ["React", "UI/UX"],
    budgetMin: 15000,
    budgetMax: 23000,
    duration: "3 weeks",
  },
  {
    key: "instabug-docs-refresh",
    clientKey: "instabug",
    title: "Developer docs refresh for mobile SDK guides",
    description:
      "Rewrite and restructure SDK guide pages with clearer examples, better hierarchy, and concise setup instructions.",
    requiredSkills: ["Content Writing", "React", "UI/UX"],
    budgetMin: 11000,
    budgetMax: 17000,
    duration: "2 weeks",
  },
  {
    key: "microsoft-community-landing",
    clientKey: "microsoft",
    title: "Developer community event landing page",
    description:
      "Create a responsive landing page for an Egypt developer event with agenda blocks, registration CTA, and partner sections.",
    requiredSkills: ["React", "UI/UX", "Content Writing"],
    budgetMin: 13000,
    budgetMax: 20000,
    duration: "2 weeks",
  },
  {
    key: "apple-training-microsite",
    clientKey: "apple",
    title: "Retail training microsite for product sessions",
    description:
      "Design and build a polished training microsite for product session materials, quizzes, and store team references.",
    requiredSkills: ["React", "UI/UX", "Content Writing"],
    budgetMin: 19000,
    budgetMax: 28000,
    duration: "4 weeks",
  },
  {
    key: "amazon-fulfillment-mobile-tool",
    clientKey: "amazon",
    title: "Flutter tool for fulfillment follow-up tasks",
    description:
      "Build a small mobile workflow for internal follow-up tasks, daily checklists, and handoff notes in fulfillment operations.",
    requiredSkills: ["Flutter", "Node.js"],
    budgetMin: 17000,
    budgetMax: 25000,
    duration: "4 weeks",
  },
  {
    key: "instabug-ci-refresh",
    clientKey: "instabug",
    title: "CI refresh for frontend documentation builds",
    description:
      "Stabilize documentation preview deploys, add build checks, and document a cleaner rollout workflow for contributors.",
    requiredSkills: ["DevOps", "Node.js"],
    budgetMin: 15000,
    budgetMax: 23000,
    duration: "2 weeks",
  },
  {
    key: "google-cloud-workshop-hub",
    clientKey: "google",
    title: "Cloud workshop registration hub for student developers",
    description:
      "Build a Next.js event hub with agenda cards, mentor profiles, registration states, and SEO-friendly workshop pages.",
    requiredSkills: ["Next.js", "TypeScript", "UI/UX"],
    budgetMin: 22000,
    budgetMax: 34000,
    duration: "4 weeks",
  },
  {
    key: "meta-creator-dashboard",
    clientKey: "meta",
    title: "Creator education dashboard prototype",
    description:
      "Design and implement a responsive dashboard prototype for creator learning modules, progress states, and resource recommendations.",
    requiredSkills: ["React", "TypeScript", "Figma"],
    budgetMin: 24000,
    budgetMax: 36000,
    duration: "4 weeks",
  },
  {
    key: "uber-driver-support-analytics",
    clientKey: "uber",
    title: "Driver support analytics cleanup",
    description:
      "Clean support ticket exports, define weekly KPIs, and build a lightweight dashboard for driver support managers.",
    requiredSkills: ["Data Analysis", "Python"],
    budgetMin: 18000,
    budgetMax: 27000,
    duration: "3 weeks",
  },
  {
    key: "orange-campaign-microsite",
    clientKey: "orange",
    title: "Mobile campaign microsite for Orange Egypt",
    description:
      "Create a fast campaign microsite with Arabic-first content blocks, package comparison, and conversion-focused CTAs.",
    requiredSkills: ["Next.js", "Content Writing", "UI/UX"],
    budgetMin: 19000,
    budgetMax: 29500,
    duration: "3 weeks",
  },
  {
    key: "jumia-seller-catalog-tool",
    clientKey: "jumia",
    title: "Seller catalog quality review tool",
    description:
      "Build an internal React tool for reviewing product titles, images, missing attributes, and category mismatches.",
    requiredSkills: ["React", "Node.js", "MongoDB"],
    budgetMin: 21000,
    budgetMax: 32000,
    duration: "4 weeks",
  },
  {
    key: "noon-seasonal-campaign-builder",
    clientKey: "noon",
    title: "Seasonal campaign landing page builder",
    description:
      "Implement reusable frontend sections for seasonal retail campaigns, category strips, offer modules, and analytics events.",
    requiredSkills: ["React", "TypeScript", "UI/UX"],
    budgetMin: 23000,
    budgetMax: 35000,
    duration: "4 weeks",
  },
  {
    key: "paymob-merchant-onboarding",
    clientKey: "paymob",
    title: "Merchant onboarding flow polish",
    description:
      "Improve onboarding screens for small merchants with clearer form states, document upload guidance, and status tracking.",
    requiredSkills: ["UI/UX", "Figma", "Content Writing"],
    budgetMin: 16000,
    budgetMax: 25000,
    duration: "2 weeks",
  },
  {
    key: "breadfast-catalog-dashboard",
    clientKey: "breadfast",
    title: "Grocery catalog operations dashboard",
    description:
      "Build a React dashboard for catalog availability, missing photos, out-of-stock items, and daily merchandising notes.",
    requiredSkills: ["React", "TypeScript", "Data Analysis"],
    budgetMin: 20000,
    budgetMax: 31000,
    duration: "3 weeks",
  },
  {
    key: "swvl-route-performance-report",
    clientKey: "swvl",
    title: "Route performance report automation",
    description:
      "Automate route-level performance reporting using CSV exports, Python cleanup, and a management summary template.",
    requiredSkills: ["Python", "Data Analysis"],
    budgetMin: 15000,
    budgetMax: 22000,
    duration: "2 weeks",
  },
  {
    key: "valeo-qa-docs-portal",
    clientKey: "valeo",
    title: "QA documentation portal refresh",
    description:
      "Create a searchable internal docs portal for QA checklists, release notes, and engineering handoff templates.",
    requiredSkills: ["Next.js", "Content Writing", "DevOps"],
    budgetMin: 21000,
    budgetMax: 33000,
    duration: "4 weeks",
  },
  {
    key: "cib-financial-education-page",
    clientKey: "cib",
    title: "Financial education landing page",
    description:
      "Design and build an accessible landing page explaining digital banking safety tips with Arabic and English content sections.",
    requiredSkills: ["Next.js", "UI/UX", "Content Writing"],
    budgetMin: 20000,
    budgetMax: 30000,
    duration: "3 weeks",
  },
  {
    key: "banquemisr-branch-dashboard",
    clientKey: "banquemisr",
    title: "Branch service dashboard prototype",
    description:
      "Prototype a dashboard that summarizes branch service metrics, wait-time insights, and weekly performance snapshots.",
    requiredSkills: ["React", "Data Analysis", "UI/UX"],
    budgetMin: 23000,
    budgetMax: 34500,
    duration: "4 weeks",
  },
  {
    key: "efg-market-insights-cards",
    clientKey: "efg",
    title: "Market insights card system",
    description:
      "Create reusable content cards and charts for daily market summaries, educational snippets, and investor-facing explainers.",
    requiredSkills: ["React", "Data Analysis", "Content Writing"],
    budgetMin: 19000,
    budgetMax: 28500,
    duration: "3 weeks",
  },
  {
    key: "vezeeta-clinic-booking-audit",
    clientKey: "vezeeta",
    title: "Clinic booking UX audit and fixes",
    description:
      "Audit booking screens, write issue notes, and implement high-priority UI improvements for appointment selection.",
    requiredSkills: ["UI/UX", "React", "Figma"],
    budgetMin: 17000,
    budgetMax: 26000,
    duration: "2 weeks",
  },
  {
    key: "trella-shipper-dashboard",
    clientKey: "trella",
    title: "Shipper dashboard for load tracking",
    description:
      "Build a responsive dashboard for shipment status, document readiness, delayed loads, and operations notes.",
    requiredSkills: ["React", "Node.js", "MongoDB"],
    budgetMin: 24000,
    budgetMax: 36000,
    duration: "4 weeks",
  },
  {
    key: "synapse-ai-demo-landing",
    clientKey: "synapse",
    title: "AI analytics demo landing page",
    description:
      "Design and build a polished landing page for an AI analytics demo with strong visuals, case-study blocks, and lead capture sections.",
    requiredSkills: ["Next.js", "UI/UX", "Content Writing"],
    budgetMin: 18000,
    budgetMax: 28000,
    duration: "3 weeks",
  },
  {
    key: "robusta-design-system-cleanup",
    clientKey: "robusta",
    title: "Design system cleanup for SaaS dashboard",
    description:
      "Refactor dashboard components, normalize spacing tokens, and document a small reusable React component set.",
    requiredSkills: ["React", "TypeScript", "UI/UX"],
    budgetMin: 25000,
    budgetMax: 38000,
    duration: "4 weeks",
  },
  {
    key: "google-student-community-site",
    clientKey: "google",
    title: "Student community resources site",
    description:
      "Build a resource site for student developer clubs with event listings, learning tracks, and featured project stories.",
    requiredSkills: ["Next.js", "Content Writing", "React"],
    budgetMin: 21000,
    budgetMax: 32000,
    duration: "4 weeks",
  },
  {
    key: "paymob-settlement-reporting",
    clientKey: "paymob",
    title: "Settlement reporting data cleanup",
    description:
      "Prepare cleaned settlement exports, flag abnormal records, and produce a dashboard-ready data model for merchant reports.",
    requiredSkills: ["Python", "Data Analysis"],
    budgetMin: 17000,
    budgetMax: 25500,
    duration: "3 weeks",
  },
  {
    key: "breadfast-mobile-empty-states",
    clientKey: "breadfast",
    title: "Mobile empty states and microcopy refresh",
    description:
      "Redesign empty states, delivery issue messages, and cart recovery prompts for a grocery mobile experience.",
    requiredSkills: ["UI/UX", "Figma", "Content Writing"],
    budgetMin: 12000,
    budgetMax: 19000,
    duration: "10 days",
  },
  {
    key: "salma-cib-dashboard-completed",
    clientKey: "cib",
    title: "Completed digital banking dashboard module",
    description:
      "A completed demo project for Salma: reusable dashboard modules for digital banking education and account safety insights.",
    requiredSkills: ["React", "TypeScript", "UI/UX"],
    budgetMin: 18000,
    budgetMax: 24000,
    duration: "3 weeks",
  },
  {
    key: "salma-noon-campaign-completed",
    clientKey: "noon",
    title: "Completed retail campaign page refresh",
    description:
      "A completed demo project for Salma: responsive retail campaign sections with clean component structure and polished visuals.",
    requiredSkills: ["React", "UI/UX", "Content Writing"],
    budgetMin: 16000,
    budgetMax: 22500,
    duration: "2 weeks",
  },
  {
    key: "salma-google-resource-completed",
    clientKey: "google",
    title: "Completed student resource hub UI",
    description:
      "A completed demo project for Salma: student learning cards, resource navigation, and responsive UI implementation.",
    requiredSkills: ["Next.js", "TypeScript", "React"],
    budgetMin: 22000,
    budgetMax: 30000,
    duration: "3 weeks",
  },
];

const proposalSeed = [
  {
    jobKey: "amazon-seller-dashboard",
    studentKey: "omar",
    proposedBudget: 24500,
    status: "accepted",
    details:
      "I can deliver the dashboard with a clean React frontend, Express API endpoints, and Mongo-backed filtering for seller operations.",
  },
  {
    jobKey: "amazon-seller-dashboard",
    studentKey: "ziad",
    proposedBudget: 21800,
    status: "rejected",
    details:
      "I have built similar admin dashboards and can keep the scope tight with reusable components and clear seller status views.",
  },
  {
    jobKey: "amazon-seller-dashboard",
    studentKey: "salma",
    proposedBudget: 25800,
    status: "rejected",
    details:
      "I can focus on the frontend experience and collaborate with an existing backend if needed.",
  },
  {
    jobKey: "vodafone-self-service-redesign",
    studentKey: "habiba",
    proposedBudget: 18500,
    status: "submitted",
    details:
      "I would redesign the mobile support flow with stronger hierarchy, clearer Arabic-first copy, and faster issue selection.",
  },
  {
    jobKey: "vodafone-self-service-redesign",
    studentKey: "mariam",
    proposedBudget: 21000,
    status: "shortlisted",
    details:
      "I can provide wireframes, polished screens, and a content direction that reduces support friction.",
  },
  {
    jobKey: "fawry-merchant-analytics",
    studentKey: "rana",
    proposedBudget: 22500,
    status: "submitted",
    details:
      "I can clean the merchant exports, rebuild the weekly report structure, and provide a clear operations dashboard handoff.",
  },
  {
    jobKey: "fawry-merchant-analytics",
    studentKey: "youssef",
    proposedBudget: 21800,
    status: "accepted",
    details:
      "I can automate cleanup in Python and deliver a documented reporting pipeline for recurring merchant metrics.",
  },
  {
    jobKey: "talabat-restaurant-portal",
    studentKey: "salma",
    proposedBudget: 22000,
    status: "submitted",
    details:
      "I can lead the React portal polish with reusable states for onboarding, menu editing, and restaurant issue handling.",
  },
  {
    jobKey: "talabat-restaurant-portal",
    studentKey: "mariam",
    proposedBudget: 20500,
    status: "shortlisted",
    details:
      "I can refine the portal UX and deliver polished restaurant-facing screens with clear empty and error states.",
  },
  {
    jobKey: "instabug-docs-refresh",
    studentKey: "habiba",
    proposedBudget: 14500,
    status: "submitted",
    details:
      "I can refine the documentation hierarchy, developer-facing copy, and examples for faster SDK onboarding.",
  },
  {
    jobKey: "microsoft-community-landing",
    studentKey: "mariam",
    proposedBudget: 18800,
    status: "accepted",
    details:
      "I can deliver a landing page direction, speaker sections, agenda blocks, and responsive event visuals.",
  },
  {
    jobKey: "microsoft-community-landing",
    studentKey: "habiba",
    proposedBudget: 17600,
    status: "submitted",
    details:
      "I can refine event content and page structure for better trust, readability, and registration conversion.",
  },
  {
    jobKey: "apple-training-microsite",
    studentKey: "salma",
    proposedBudget: 26500,
    status: "submitted",
    details:
      "I can build the microsite in React with polished training modules, quiz states, and reusable content blocks.",
  },
  {
    jobKey: "amazon-fulfillment-mobile-tool",
    studentKey: "karim",
    proposedBudget: 23800,
    status: "submitted",
    details:
      "I can build the Flutter workflow with checklists, task history, and a clean operations-facing interface.",
  },
  {
    jobKey: "amazon-fulfillment-mobile-tool",
    studentKey: "omar",
    proposedBudget: 24700,
    status: "submitted",
    details:
      "I can support the backend services and mobile workflows for fulfillment follow-up tasks.",
  },
  {
    jobKey: "instabug-ci-refresh",
    studentKey: "omar",
    proposedBudget: 21800,
    status: "submitted",
    details:
      "I can stabilize the preview pipeline, add build validation, and document the workflow for contributors.",
  },
  {
    jobKey: "instabug-ci-refresh",
    studentKey: "youssef",
    proposedBudget: 20500,
    status: "submitted",
    details:
      "I can improve CI scripts, build validation, and rollback visibility with a simple deployment playbook.",
  },
  {
    jobKey: "google-cloud-workshop-hub",
    studentKey: "salma",
    proposedBudget: 32500,
    status: "shortlisted",
    details:
      "I can build the event hub in Next.js with clean typed components, SEO metadata, and a polished registration experience.",
  },
  {
    jobKey: "google-cloud-workshop-hub",
    studentKey: "ziad",
    proposedBudget: 29800,
    status: "submitted",
    details:
      "I can implement the registration flow and content pages with a simple admin-friendly component structure.",
  },
  {
    jobKey: "meta-creator-dashboard",
    studentKey: "salma",
    proposedBudget: 34800,
    status: "submitted",
    details:
      "I can own the dashboard UI with reusable cards, progress states, and a focused visual system for creator learning.",
  },
  {
    jobKey: "meta-creator-dashboard",
    studentKey: "mariam",
    proposedBudget: 33500,
    status: "shortlisted",
    details:
      "I can design the full prototype in Figma and hand off clean interaction states before implementation.",
  },
  {
    jobKey: "uber-driver-support-analytics",
    studentKey: "rana",
    proposedBudget: 24800,
    status: "submitted",
    details:
      "I can clean the exports, define support KPIs, and build a dashboard-ready report for weekly operations reviews.",
  },
  {
    jobKey: "orange-campaign-microsite",
    studentKey: "habiba",
    proposedBudget: 26800,
    status: "submitted",
    details:
      "I can refine Arabic-first campaign copy, page hierarchy, and conversion-focused content sections.",
  },
  {
    jobKey: "jumia-seller-catalog-tool",
    studentKey: "omar",
    proposedBudget: 30400,
    status: "submitted",
    details:
      "I can build the React interface and Node endpoints for catalog review queues and seller issue notes.",
  },
  {
    jobKey: "noon-seasonal-campaign-builder",
    studentKey: "salma",
    proposedBudget: 33200,
    status: "submitted",
    details:
      "I can deliver reusable retail campaign sections with TypeScript props, responsive variants, and clear visual polish.",
  },
  {
    jobKey: "paymob-merchant-onboarding",
    studentKey: "mariam",
    proposedBudget: 23600,
    status: "submitted",
    details:
      "I can audit and redesign the onboarding journey with clearer upload guidance and merchant-friendly status messaging.",
  },
  {
    jobKey: "breadfast-catalog-dashboard",
    studentKey: "salma",
    proposedBudget: 29200,
    status: "shortlisted",
    details:
      "I can build the dashboard UI and coordinate with data exports to create clean catalog health sections.",
  },
  {
    jobKey: "swvl-route-performance-report",
    studentKey: "rana",
    proposedBudget: 20800,
    status: "submitted",
    details:
      "I can automate route reporting and produce a clean weekly summary for operations managers.",
  },
  {
    jobKey: "valeo-qa-docs-portal",
    studentKey: "omar",
    proposedBudget: 31800,
    status: "submitted",
    details:
      "I can structure the docs portal, add build checks, and document the release handoff workflow.",
  },
  {
    jobKey: "cib-financial-education-page",
    studentKey: "salma",
    proposedBudget: 28600,
    status: "submitted",
    details:
      "I can design and implement the page with strong accessibility, clean sections, and bilingual-friendly layout decisions.",
  },
  {
    jobKey: "banquemisr-branch-dashboard",
    studentKey: "youssef",
    proposedBudget: 32400,
    status: "submitted",
    details:
      "I can combine the data model and dashboard interface for weekly branch performance snapshots.",
  },
  {
    jobKey: "efg-market-insights-cards",
    studentKey: "rana",
    proposedBudget: 26800,
    status: "submitted",
    details:
      "I can prepare the analytics cards, chart copy, and daily summary structure for investor-facing content.",
  },
  {
    jobKey: "vezeeta-clinic-booking-audit",
    studentKey: "mariam",
    proposedBudget: 23800,
    status: "shortlisted",
    details:
      "I can audit the booking journey, prioritize UX issues, and deliver improved screens and implementation notes.",
  },
  {
    jobKey: "trella-shipper-dashboard",
    studentKey: "omar",
    proposedBudget: 34200,
    status: "submitted",
    details:
      "I can build the shipper dashboard with Node-backed status endpoints and MongoDB models for operations notes.",
  },
  {
    jobKey: "synapse-ai-demo-landing",
    studentKey: "habiba",
    proposedBudget: 25200,
    status: "submitted",
    details:
      "I can shape the story, visual hierarchy, and content blocks for a polished AI analytics demo page.",
  },
  {
    jobKey: "robusta-design-system-cleanup",
    studentKey: "salma",
    proposedBudget: 36500,
    status: "submitted",
    details:
      "I can refactor the component set with typed variants, consistent spacing, and documentation examples.",
  },
  {
    jobKey: "google-student-community-site",
    studentKey: "salma",
    proposedBudget: 30600,
    status: "submitted",
    details:
      "I can build the resource hub with a polished frontend, content-ready sections, and responsive navigation.",
  },
  {
    jobKey: "paymob-settlement-reporting",
    studentKey: "youssef",
    proposedBudget: 23800,
    status: "submitted",
    details:
      "I can clean settlement exports, flag abnormal records, and document a repeatable reporting workflow.",
  },
  {
    jobKey: "breadfast-mobile-empty-states",
    studentKey: "habiba",
    proposedBudget: 17400,
    status: "submitted",
    details:
      "I can redesign empty states and write compact microcopy that fits the grocery mobile experience.",
  },
  {
    jobKey: "salma-cib-dashboard-completed",
    studentKey: "salma",
    proposedBudget: 22800,
    status: "accepted",
    details:
      "I delivered a clean banking dashboard module with typed React components, accessible cards, and polished responsive states.",
  },
  {
    jobKey: "salma-noon-campaign-completed",
    studentKey: "salma",
    proposedBudget: 21400,
    status: "accepted",
    details:
      "I delivered reusable retail campaign sections with strong visual consistency and practical content slots.",
  },
  {
    jobKey: "salma-google-resource-completed",
    studentKey: "salma",
    proposedBudget: 28600,
    status: "accepted",
    details:
      "I delivered a student resource hub UI with clear navigation, learning cards, and responsive implementation details.",
  },
];

const contractSeed = [
  {
    jobKey: "amazon-seller-dashboard",
    proposalStudentKey: "omar",
    status: "active",
    escrowStatus: "held_in_escrow",
    agreedBudget: 24500,
  },
  {
    jobKey: "microsoft-community-landing",
    proposalStudentKey: "mariam",
    status: "submitted",
    escrowStatus: "held_in_escrow",
    agreedBudget: 18800,
    submission: {
      message:
        "Uploaded the event landing page layout, agenda sections, and responsive visual package for review.",
      links: ["https://demo-deliverables.test/microsoft-community-landing"],
      attachments: ["event-landing-overview.pdf", "responsive-screens.zip"],
    },
  },
  {
    jobKey: "fawry-merchant-analytics",
    proposalStudentKey: "youssef",
    status: "completed",
    escrowStatus: "released",
    agreedBudget: 21800,
    submission: {
      message:
        "Delivered cleaned merchant reports, Python automation scripts, and a handoff summary for the operations lead.",
      links: ["https://demo-deliverables.test/fawry-merchant-analytics"],
      attachments: ["weekly-report-template.xlsx", "cleanup-readme.pdf"],
    },
    review: {
      rating: 5,
      comment:
        "Very reliable delivery, strong communication, and the weekly report now takes a fraction of the original time.",
    },
  },
  {
    jobKey: "salma-cib-dashboard-completed",
    proposalStudentKey: "salma",
    status: "completed",
    escrowStatus: "released",
    agreedBudget: 22800,
    submission: {
      message:
        "Delivered the dashboard module with reusable card components, responsive layouts, and accessibility notes.",
      links: ["https://demo-deliverables.test/salma-cib-dashboard"],
      attachments: ["dashboard-module-handoff.pdf", "component-screens.zip"],
    },
    review: {
      rating: 5,
      comment:
        "Salma delivered a polished interface with excellent attention to spacing, responsive behavior, and dashboard clarity.",
    },
  },
  {
    jobKey: "salma-noon-campaign-completed",
    proposalStudentKey: "salma",
    status: "completed",
    escrowStatus: "released",
    agreedBudget: 21400,
    submission: {
      message:
        "Delivered campaign sections, mobile states, and a compact implementation guide for the retail page refresh.",
      links: ["https://demo-deliverables.test/salma-noon-campaign"],
      attachments: ["campaign-components.pdf", "responsive-preview.zip"],
    },
    review: {
      rating: 5,
      comment:
        "Strong frontend delivery. The campaign sections were clean, reusable, and ready for a real merchandising workflow.",
    },
  },
  {
    jobKey: "salma-google-resource-completed",
    proposalStudentKey: "salma",
    status: "completed",
    escrowStatus: "released",
    agreedBudget: 28600,
    submission: {
      message:
        "Delivered the student resource hub UI with learning cards, navigation states, and responsive page sections.",
      links: ["https://demo-deliverables.test/salma-google-resource-hub"],
      attachments: ["resource-hub-ui.pdf", "nextjs-components.zip"],
    },
    review: {
      rating: 5,
      comment:
        "Excellent work from Salma. The UI felt professional, fast to scan, and very easy for a developer team to extend.",
    },
  },
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clearCollections() {
  await Promise.all([
    WorkSubmission.deleteMany({}),
    Transaction.deleteMany({}),
    Escrow.deleteMany({}),
    Contract.deleteMany({}),
    Proposal.deleteMany({}),
    Job.deleteMany({}),
    User.deleteMany({}),
    Skill.deleteMany({}),
  ]);
}

async function seed() {
  const isRemote = /mongodb\+srv:|mongodb\.net/i.test(MONGO);
  if (isRemote && !process.argv.includes("--allow-remote")) {
    console.error(
      "Refusing to run: MONGO_URI points to a remote database and this seeder DELETES users, jobs, skills and contracts.",
    );
    console.error(
      "Use a local database, or pass --allow-remote if you are absolutely sure.",
    );
    process.exit(1);
  }
  console.log("Connecting to", isRemote ? "remote database" : MONGO);
  await mongoose.connect(MONGO);

  console.log("Clearing demo collections...");
  await clearCollections();

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const createdSkills = await Skill.insertMany(skillSeed);
  const skillsByName = new Map(
    createdSkills.map((skill) => [skill.name, skill]),
  );

  const admin = await User.create({
    name: "Dr. Demo Admin",
    email: "admin@shaghalny.demo",
    password: passwordHash,
    role: "Admin",
    description:
      "Demo administrator account for reviewing the full marketplace state.",
    balance: 0,
  });

  const clientsByKey = new Map();
  for (const client of clientSeed) {
    const created = await User.create({
      name: client.name,
      email: client.email,
      password: passwordHash,
      role: "Client",
      description: client.description,
      website: client.website,
      companyLogoUrl: client.companyLogoUrl,
      isVerified: client.isVerified,
      balance: client.balance,
    });
    clientsByKey.set(client.key, created);
  }

  const studentsByKey = new Map();
  for (const student of studentSeed) {
    const created = await User.create({
      name: student.name,
      email: student.email,
      password: passwordHash,
      role: "Student",
      description: student.description,
      university: student.university,
      portfolioLinks: student.portfolioLinks,
      verifiedSkills: student.verifiedSkills.map((item) => ({
        skill: skillsByName.get(item.skill)._id,
        score: item.score,
        verifiedAt: new Date("2026-04-01T10:00:00Z"),
      })),
      jobsCompleted: student.jobsCompleted,
      balance: student.balance,
    });
    studentsByKey.set(student.key, created);
  }

  const jobsByKey = new Map();
  for (const item of jobSeed) {
    const job = await Job.create({
      title: item.title,
      description: item.description,
      requiredSkills: item.requiredSkills.map(
        (skillName) => skillsByName.get(skillName)._id,
      ),
      budgetMin: item.budgetMin,
      budgetMax: item.budgetMax,
      duration: item.duration,
      employer: clientsByKey.get(item.clientKey)._id,
      status: "open",
    });
    jobsByKey.set(item.key, job);
  }

  const proposalsByKey = new Map();
  for (const item of proposalSeed) {
    const job = jobsByKey.get(item.jobKey);
    const student = studentsByKey.get(item.studentKey);
    const proposal = await Proposal.create({
      jobId: job._id,
      studentId: student._id,
      details: item.details,
      proposedBudget: item.proposedBudget,
      status: item.status,
      createdAt: new Date("2026-05-01T09:00:00Z"),
      updatedAt: new Date("2026-05-01T09:00:00Z"),
    });

    proposalsByKey.set(`${item.jobKey}:${item.studentKey}`, proposal);
  }

  for (const job of jobsByKey.values()) {
    const applicantIds = await Proposal.find({ jobId: job._id }).distinct(
      "studentId",
    );
    job.applicants = applicantIds;
    await job.save();
  }

  for (const item of contractSeed) {
    const job = jobsByKey.get(item.jobKey);
    const client = await User.findById(job.employer);
    const student = studentsByKey.get(item.proposalStudentKey);
    const proposal = proposalsByKey.get(
      `${item.jobKey}:${item.proposalStudentKey}`,
    );

    const contract = await Contract.create({
      jobId: job._id,
      clientId: client._id,
      studentId: student._id,
      proposalId: proposal._id,
      agreedBudget: item.agreedBudget,
      status: item.status,
      escrowStatus: item.escrowStatus,
      submittedAt:
        item.status === "submitted" || item.status === "completed"
          ? new Date("2026-05-09T12:00:00Z")
          : undefined,
      acceptedAt:
        item.status === "completed"
          ? new Date("2026-05-12T15:00:00Z")
          : undefined,
      completedAt:
        item.status === "completed"
          ? new Date("2026-05-12T15:00:00Z")
          : undefined,
    });

    await Escrow.create({
      contractId: contract._id,
      clientId: client._id,
      studentId: student._id,
      amount: item.agreedBudget,
      status: item.escrowStatus,
      releasedAt:
        item.escrowStatus === "released"
          ? new Date("2026-05-12T15:00:00Z")
          : undefined,
      createdAt: new Date("2026-05-04T11:00:00Z"),
      updatedAt: new Date("2026-05-12T15:00:00Z"),
    });

    await Transaction.create({
      fromUserId: client._id,
      toUserId: student._id,
      amount: item.agreedBudget,
      type: "ESCROW_HOLD",
      contractId: contract._id,
      createdAt: new Date("2026-05-04T11:00:00Z"),
      updatedAt: new Date("2026-05-04T11:00:00Z"),
    });

    client.balance = Number(client.balance || 0) - item.agreedBudget;
    await client.save();

    if (item.status === "completed") {
      await Transaction.create({
        fromUserId: client._id,
        toUserId: student._id,
        amount: item.agreedBudget,
        type: "ESCROW_RELEASE",
        contractId: contract._id,
        createdAt: new Date("2026-05-12T15:00:00Z"),
        updatedAt: new Date("2026-05-12T15:00:00Z"),
      });
    }

    if (item.submission) {
      await WorkSubmission.create({
        contractId: contract._id,
        studentId: student._id,
        message: item.submission.message,
        links: item.submission.links,
        attachments: item.submission.attachments,
        createdAt: new Date("2026-05-09T12:00:00Z"),
        updatedAt: new Date("2026-05-09T12:00:00Z"),
      });
    }

    if (item.review) {
      const refreshedStudent = await User.findById(student._id);
      refreshedStudent.reviews.push({
        jobId: job._id,
        contractId: contract._id,
        clientName: client.name,
        rating: item.review.rating,
        comment: item.review.comment,
        jobTitle: job.title,
        createdAt: new Date("2026-05-12T16:00:00Z"),
      });
      refreshedStudent.jobsCompleted =
        Number(refreshedStudent.jobsCompleted || 0) + 1;
      refreshedStudent.balance =
        Number(refreshedStudent.balance || 0) + item.agreedBudget;
      await refreshedStudent.save();
    }

    job.selectedStudent = student._id;
    job.activeContract = contract._id;
    job.status = item.status === "completed" ? "completed" : "in_progress";
    await job.save();
  }

  console.log("Demo seeding complete.");
  console.log("");
  console.log("Login password for all demo accounts:", DEMO_PASSWORD);
  console.log("Admin:", admin.email);
  console.log("Clients:");
  clientSeed.forEach((client) =>
    console.log(`- ${client.name}: ${client.email}`),
  );
  console.log("Students:");
  studentSeed.forEach((student) =>
    console.log(`- ${student.name}: ${student.email}`),
  );

  await pause(500);
  await mongoose.disconnect();
  console.log("Disconnected.");
}

seed().catch(async (error) => {
  console.error("Seeder error:", error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error("Disconnect error:", disconnectError);
  }
  process.exit(1);
});
