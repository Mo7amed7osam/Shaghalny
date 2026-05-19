/*
  Demo Seeder for Shaghalny
  - Loads MONGO_URI from backend/.env
  - Replaces existing demo marketplace data with fictional Egyptian-themed records
  - Creates admin, clients, students, skills, jobs, proposals, contracts, escrow, submissions, and reviews
*/
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Skill = require('../models/Skill');
const User = require('../models/User');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Escrow = require('../models/Escrow');
const Transaction = require('../models/Transaction');
const WorkSubmission = require('../models/WorkSubmission');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/shaghalny-dev';
const DEMO_PASSWORD = 'DemoPass123';

const skillSeed = [
  { name: 'React', description: 'Frontend interfaces for dashboards, landing pages, and internal tools.' },
  { name: 'Node.js', description: 'Backend APIs, authentication flows, and service integrations.' },
  { name: 'UI/UX', description: 'Wireframes, polished interfaces, and design system work.' },
  { name: 'Flutter', description: 'Cross-platform mobile application development.' },
  { name: 'Data Analysis', description: 'Dashboards, spreadsheets, and business reporting.' },
  { name: 'DevOps', description: 'CI/CD, Docker, deployment pipelines, and observability.' },
  { name: 'Content Writing', description: 'Arabic and English product content, copy, and documentation.' },
  { name: 'Motion Design', description: 'Short-form animation, explainers, and visual storytelling.' },
  { name: 'Python', description: 'Automation scripts, AI prototypes, and backend services.' },
  { name: 'MongoDB', description: 'Schema design, aggregation, and application data modeling.' },
];

const clientSeed = [
  {
    key: 'nilecart',
    name: 'NileCart',
    email: 'ops@nilecart.demo',
    description: 'Cairo-based grocery delivery startup building faster customer support and conversion flows.',
    balance: 26000,
  },
  {
    key: 'forsa',
    name: 'Forsa Studio',
    email: 'projects@forsastudio.demo',
    description: 'Alexandria creative studio delivering brand systems, launch campaigns, and social content.',
    balance: 18000,
  },
  {
    key: 'masrtech',
    name: 'Masr Tech Hub',
    email: 'talent@masrtechhub.demo',
    description: 'Product team hiring student freelancers for dashboards, data cleanup, and product experiments.',
    balance: 32000,
  },
  {
    key: 'seascope',
    name: 'SeaScope Travel',
    email: 'hello@seascopetravel.demo',
    description: 'Red Sea travel operator improving online booking flows, content, and lead generation.',
    balance: 14500,
  },
];

const studentSeed = [
  {
    key: 'salma',
    name: 'Salma Elshazly',
    email: 'salma.elshazly.demo@student.test',
    university: 'Cairo University',
    description: 'Frontend-focused computer science student building clean React interfaces for early-stage products.',
    portfolioLinks: ['https://demo-portfolio.test/salma-elshazly', 'https://behance.net/salma-ui-demo'],
    verifiedSkills: [
      { skill: 'React', score: 93 },
      { skill: 'UI/UX', score: 88 },
      { skill: 'MongoDB', score: 72 },
    ],
    balance: 6200,
    jobsCompleted: 1,
  },
  {
    key: 'omar',
    name: 'Omar Tarek',
    email: 'omar.tarek.demo@student.test',
    university: 'Ain Shams University',
    description: 'Full-stack student with strong Node.js and DevOps skills, comfortable owning small products end to end.',
    portfolioLinks: ['https://demo-portfolio.test/omar-tarek', 'https://github.com/demo/omartarek'],
    verifiedSkills: [
      { skill: 'Node.js', score: 91 },
      { skill: 'DevOps', score: 86 },
      { skill: 'MongoDB', score: 84 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: 'mariam',
    name: 'Mariam Hany',
    email: 'mariam.hany.demo@student.test',
    university: 'Alexandria University',
    description: 'Product designer working on student ventures, event apps, and social-first campaign visuals.',
    portfolioLinks: ['https://demo-portfolio.test/mariam-hany'],
    verifiedSkills: [
      { skill: 'UI/UX', score: 95 },
      { skill: 'Motion Design', score: 82 },
      { skill: 'Content Writing', score: 77 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: 'youssef',
    name: 'Youssef Adel',
    email: 'youssef.adel.demo@student.test',
    university: 'Mansoura University',
    description: 'Backend and automation student building APIs, scripts, and data pipelines for operations teams.',
    portfolioLinks: ['https://demo-portfolio.test/youssef-adel'],
    verifiedSkills: [
      { skill: 'Python', score: 92 },
      { skill: 'Node.js', score: 81 },
      { skill: 'Data Analysis', score: 79 },
    ],
    balance: 5400,
    jobsCompleted: 1,
  },
  {
    key: 'habiba',
    name: 'Habiba Mostafa',
    email: 'habiba.mostafa.demo@student.test',
    university: 'Helwan University',
    description: 'UI designer with solid product thinking and a strong eye for Arabic and English visual systems.',
    portfolioLinks: ['https://demo-portfolio.test/habiba-mostafa'],
    verifiedSkills: [
      { skill: 'UI/UX', score: 90 },
      { skill: 'Content Writing', score: 74 },
      { skill: 'Motion Design', score: 80 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: 'karim',
    name: 'Karim Nabil',
    email: 'karim.nabil.demo@student.test',
    university: 'German University in Cairo',
    description: 'Mobile engineer building Flutter MVPs, admin panels, and internal ops tools.',
    portfolioLinks: ['https://demo-portfolio.test/karim-nabil', 'https://github.com/demo/karimnabil'],
    verifiedSkills: [
      { skill: 'Flutter', score: 89 },
      { skill: 'React', score: 76 },
      { skill: 'Node.js', score: 73 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: 'rana',
    name: 'Rana Samir',
    email: 'rana.samir.demo@student.test',
    university: 'The American University in Cairo',
    description: 'Data and reporting student turning raw operations data into clean dashboards and management summaries.',
    portfolioLinks: ['https://demo-portfolio.test/rana-samir'],
    verifiedSkills: [
      { skill: 'Data Analysis', score: 94 },
      { skill: 'Python', score: 83 },
      { skill: 'Content Writing', score: 78 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
  {
    key: 'ziad',
    name: 'Ziad Fathy',
    email: 'ziad.fathy.demo@student.test',
    university: 'Benha University',
    description: 'Junior full-stack builder focused on CRUD products, dashboards, and internal business tools.',
    portfolioLinks: ['https://demo-portfolio.test/ziad-fathy'],
    verifiedSkills: [
      { skill: 'React', score: 80 },
      { skill: 'Node.js', score: 78 },
      { skill: 'MongoDB', score: 75 },
    ],
    balance: 0,
    jobsCompleted: 0,
  },
];

const jobSeed = [
  {
    key: 'nilecart-support-dashboard',
    clientKey: 'nilecart',
    title: 'Customer support dashboard for daily orders',
    description: 'Build a React dashboard for support agents to track delayed orders, delivery status, and refund requests across Cairo and Giza.',
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    budgetMin: 4500,
    budgetMax: 6500,
    duration: '3 weeks',
  },
  {
    key: 'nilecart-onboarding-revamp',
    clientKey: 'nilecart',
    title: 'Mobile-first onboarding redesign for new shoppers',
    description: 'Refresh the first-time user journey with better visuals, faster signup, and localized trust sections for Egyptian shoppers.',
    requiredSkills: ['UI/UX', 'Content Writing', 'React'],
    budgetMin: 3000,
    budgetMax: 4800,
    duration: '2 weeks',
  },
  {
    key: 'forsa-campaign-kit',
    clientKey: 'forsa',
    title: 'Launch campaign visuals for student entrepreneurship event',
    description: 'Create a compact campaign kit with social posters, motion snippets, and a small landing page visual direction.',
    requiredSkills: ['UI/UX', 'Motion Design', 'Content Writing'],
    budgetMin: 3800,
    budgetMax: 5200,
    duration: '2 weeks',
  },
  {
    key: 'masrtech-admin-portal',
    clientKey: 'masrtech',
    title: 'Internal admin portal for mentor matching',
    description: 'Develop an internal admin portal to manage mentor applications, track review stages, and export weekly summaries.',
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    budgetMin: 7000,
    budgetMax: 9800,
    duration: '4 weeks',
  },
  {
    key: 'masrtech-analytics-cleanup',
    clientKey: 'masrtech',
    title: 'Operations analytics cleanup and reporting',
    description: 'Clean historical spreadsheet exports, standardize metrics, and ship a lightweight reporting view for leadership.',
    requiredSkills: ['Data Analysis', 'Python'],
    budgetMin: 4200,
    budgetMax: 6000,
    duration: '3 weeks',
  },
  {
    key: 'seascope-booking-content',
    clientKey: 'seascope',
    title: 'Booking page rewrite for Red Sea package pages',
    description: 'Improve package descriptions, trust copy, and CTA structure on booking pages targeting domestic travelers.',
    requiredSkills: ['Content Writing', 'UI/UX'],
    budgetMin: 2400,
    budgetMax: 3600,
    duration: '10 days',
  },
  {
    key: 'seascope-mobile-mvp',
    clientKey: 'seascope',
    title: 'Flutter MVP for trip inquiry follow-up',
    description: 'Build a simple mobile app for sales agents to manage inbound trip inquiries and follow-up reminders.',
    requiredSkills: ['Flutter', 'Node.js'],
    budgetMin: 5200,
    budgetMax: 7600,
    duration: '4 weeks',
  },
  {
    key: 'masrtech-devops-refresh',
    clientKey: 'masrtech',
    title: 'CI/CD refresh for staging environment',
    description: 'Stabilize staging deploys, add build checks, and document a cleaner rollout workflow for the internal engineering team.',
    requiredSkills: ['DevOps', 'Node.js'],
    budgetMin: 5000,
    budgetMax: 7200,
    duration: '2 weeks',
  },
];

const proposalSeed = [
  {
    jobKey: 'nilecart-support-dashboard',
    studentKey: 'omar',
    proposedBudget: 6100,
    status: 'accepted',
    details: 'I can deliver the dashboard with a clean React frontend, Express API endpoints, and Mongo-backed filtering for support operations.',
  },
  {
    jobKey: 'nilecart-support-dashboard',
    studentKey: 'ziad',
    proposedBudget: 5600,
    status: 'rejected',
    details: 'I have built similar admin dashboards and can keep the scope tight with reusable components and simple reporting flows.',
  },
  {
    jobKey: 'nilecart-support-dashboard',
    studentKey: 'salma',
    proposedBudget: 6400,
    status: 'rejected',
    details: 'I can focus on the frontend experience and collaborate with an existing backend if needed.',
  },
  {
    jobKey: 'nilecart-onboarding-revamp',
    studentKey: 'habiba',
    proposedBudget: 4300,
    status: 'submitted',
    details: 'I would redesign the mobile onboarding journey with stronger hierarchy, cleaner visuals, and clearer Arabic-first trust moments.',
  },
  {
    jobKey: 'nilecart-onboarding-revamp',
    studentKey: 'mariam',
    proposedBudget: 4550,
    status: 'shortlisted',
    details: 'I can provide wireframes, polished final screens, and a lightweight content direction for higher shopper conversion.',
  },
  {
    jobKey: 'forsa-campaign-kit',
    studentKey: 'mariam',
    proposedBudget: 5000,
    status: 'accepted',
    details: 'I can deliver static visuals, short motion snippets, and a small event landing page art direction package.',
  },
  {
    jobKey: 'forsa-campaign-kit',
    studentKey: 'habiba',
    proposedBudget: 4700,
    status: 'rejected',
    details: 'My focus would be a refined visual identity, social cards, and event announcement assets for Instagram and LinkedIn.',
  },
  {
    jobKey: 'masrtech-admin-portal',
    studentKey: 'salma',
    proposedBudget: 9300,
    status: 'submitted',
    details: 'I can lead the frontend dashboard experience and coordinate with backend requirements for admin review tools.',
  },
  {
    jobKey: 'masrtech-admin-portal',
    studentKey: 'ziad',
    proposedBudget: 8400,
    status: 'shortlisted',
    details: 'I can build the full stack portal with role-based views, filters, and export functionality for the ops team.',
  },
  {
    jobKey: 'masrtech-analytics-cleanup',
    studentKey: 'rana',
    proposedBudget: 5800,
    status: 'submitted',
    details: 'I can clean the data model, rebuild the weekly report structure, and provide a clear executive summary view.',
  },
  {
    jobKey: 'masrtech-analytics-cleanup',
    studentKey: 'youssef',
    proposedBudget: 5400,
    status: 'accepted',
    details: 'I can automate the cleanup workflow in Python and deliver a reliable reporting pipeline with documented steps.',
  },
  {
    jobKey: 'seascope-booking-content',
    studentKey: 'habiba',
    proposedBudget: 3100,
    status: 'submitted',
    details: 'I can refine content and page structure for better trust, readability, and package clarity.',
  },
  {
    jobKey: 'seascope-booking-content',
    studentKey: 'mariam',
    proposedBudget: 3350,
    status: 'submitted',
    details: 'I can provide copy and supporting page visuals that make the booking page feel more premium and direct.',
  },
  {
    jobKey: 'seascope-mobile-mvp',
    studentKey: 'karim',
    proposedBudget: 7100,
    status: 'submitted',
    details: 'I can build the Flutter MVP with a practical inquiry pipeline, reminders, and a clean agent-facing interface.',
  },
  {
    jobKey: 'seascope-mobile-mvp',
    studentKey: 'omar',
    proposedBudget: 7400,
    status: 'submitted',
    details: 'I can support the backend services and simple mobile workflows for the inquiry pipeline.',
  },
  {
    jobKey: 'masrtech-devops-refresh',
    studentKey: 'omar',
    proposedBudget: 6800,
    status: 'submitted',
    details: 'I can stabilize the pipeline, add staging checks, and document the deploy workflow so the team can maintain it.',
  },
  {
    jobKey: 'masrtech-devops-refresh',
    studentKey: 'youssef',
    proposedBudget: 6400,
    status: 'submitted',
    details: 'I can improve CI scripts, build validation, and rollback visibility with a simple deployment playbook.',
  },
];

const contractSeed = [
  {
    jobKey: 'nilecart-support-dashboard',
    proposalStudentKey: 'omar',
    status: 'active',
    escrowStatus: 'held_in_escrow',
    agreedBudget: 6100,
  },
  {
    jobKey: 'forsa-campaign-kit',
    proposalStudentKey: 'mariam',
    status: 'submitted',
    escrowStatus: 'held_in_escrow',
    agreedBudget: 5000,
    submission: {
      message: 'Uploaded final campaign posters, motion teaser drafts, and export-ready social media variants for review.',
      links: ['https://demo-deliverables.test/forsa-campaign-kit'],
      attachments: ['campaign-kit-overview.pdf', 'social-pack.zip'],
    },
  },
  {
    jobKey: 'masrtech-analytics-cleanup',
    proposalStudentKey: 'youssef',
    status: 'completed',
    escrowStatus: 'released',
    agreedBudget: 5400,
    submission: {
      message: 'Delivered cleaned reporting sheets, Python automation scripts, and a handoff summary for the operations lead.',
      links: ['https://demo-deliverables.test/masrtech-analytics'],
      attachments: ['weekly-report-template.xlsx', 'cleanup-readme.pdf'],
    },
    review: {
      rating: 5,
      comment: 'Very reliable delivery, strong communication, and the weekly report now takes a fraction of the original time.',
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
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO);

  console.log('Clearing demo collections...');
  await clearCollections();

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const createdSkills = await Skill.insertMany(skillSeed);
  const skillsByName = new Map(createdSkills.map((skill) => [skill.name, skill]));

  const admin = await User.create({
    name: 'Dr. Demo Admin',
    email: 'admin@shaghalny.demo',
    password: passwordHash,
    role: 'Admin',
    description: 'Demo administrator account for reviewing the full marketplace state.',
    balance: 0,
  });

  const clientsByKey = new Map();
  for (const client of clientSeed) {
    const created = await User.create({
      name: client.name,
      email: client.email,
      password: passwordHash,
      role: 'Client',
      description: client.description,
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
      role: 'Student',
      description: student.description,
      university: student.university,
      portfolioLinks: student.portfolioLinks,
      verifiedSkills: student.verifiedSkills.map((item) => ({
        skill: skillsByName.get(item.skill)._id,
        score: item.score,
        verifiedAt: new Date('2026-04-01T10:00:00Z'),
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
      requiredSkills: item.requiredSkills.map((skillName) => skillsByName.get(skillName)._id),
      budgetMin: item.budgetMin,
      budgetMax: item.budgetMax,
      duration: item.duration,
      employer: clientsByKey.get(item.clientKey)._id,
      status: 'open',
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
      createdAt: new Date('2026-05-01T09:00:00Z'),
      updatedAt: new Date('2026-05-01T09:00:00Z'),
    });

    proposalsByKey.set(`${item.jobKey}:${item.studentKey}`, proposal);
  }

  for (const job of jobsByKey.values()) {
    const applicantIds = await Proposal.find({ jobId: job._id }).distinct('studentId');
    job.applicants = applicantIds;
    await job.save();
  }

  for (const item of contractSeed) {
    const job = jobsByKey.get(item.jobKey);
    const client = await User.findById(job.employer);
    const student = studentsByKey.get(item.proposalStudentKey);
    const proposal = proposalsByKey.get(`${item.jobKey}:${item.proposalStudentKey}`);

    const contract = await Contract.create({
      jobId: job._id,
      clientId: client._id,
      studentId: student._id,
      proposalId: proposal._id,
      agreedBudget: item.agreedBudget,
      status: item.status,
      escrowStatus: item.escrowStatus,
      submittedAt: item.status === 'submitted' || item.status === 'completed' ? new Date('2026-05-09T12:00:00Z') : undefined,
      acceptedAt: item.status === 'completed' ? new Date('2026-05-12T15:00:00Z') : undefined,
      completedAt: item.status === 'completed' ? new Date('2026-05-12T15:00:00Z') : undefined,
    });

    await Escrow.create({
      contractId: contract._id,
      clientId: client._id,
      studentId: student._id,
      amount: item.agreedBudget,
      status: item.escrowStatus,
      releasedAt: item.escrowStatus === 'released' ? new Date('2026-05-12T15:00:00Z') : undefined,
      createdAt: new Date('2026-05-04T11:00:00Z'),
      updatedAt: new Date('2026-05-12T15:00:00Z'),
    });

    await Transaction.create({
      fromUserId: client._id,
      toUserId: student._id,
      amount: item.agreedBudget,
      type: 'ESCROW_HOLD',
      contractId: contract._id,
      createdAt: new Date('2026-05-04T11:00:00Z'),
      updatedAt: new Date('2026-05-04T11:00:00Z'),
    });

    client.balance = Number(client.balance || 0) - item.agreedBudget;
    await client.save();

    if (item.status === 'completed') {
      await Transaction.create({
        fromUserId: client._id,
        toUserId: student._id,
        amount: item.agreedBudget,
        type: 'ESCROW_RELEASE',
        contractId: contract._id,
        createdAt: new Date('2026-05-12T15:00:00Z'),
        updatedAt: new Date('2026-05-12T15:00:00Z'),
      });
    }

    if (item.submission) {
      await WorkSubmission.create({
        contractId: contract._id,
        studentId: student._id,
        message: item.submission.message,
        links: item.submission.links,
        attachments: item.submission.attachments,
        createdAt: new Date('2026-05-09T12:00:00Z'),
        updatedAt: new Date('2026-05-09T12:00:00Z'),
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
        createdAt: new Date('2026-05-12T16:00:00Z'),
      });
      refreshedStudent.jobsCompleted = Math.max(refreshedStudent.jobsCompleted || 0, 1);
      refreshedStudent.balance = Number(refreshedStudent.balance || 0) + item.agreedBudget;
      await refreshedStudent.save();
    }

    job.selectedStudent = student._id;
    job.activeContract = contract._id;
    job.status = item.status === 'completed' ? 'completed' : 'in_progress';
    await job.save();
  }

  console.log('Demo seeding complete.');
  console.log('');
  console.log('Login password for all demo accounts:', DEMO_PASSWORD);
  console.log('Admin:', admin.email);
  console.log('Clients:');
  clientSeed.forEach((client) => console.log(`- ${client.name}: ${client.email}`));
  console.log('Students:');
  studentSeed.forEach((student) => console.log(`- ${student.name}: ${student.email}`));

  await pause(500);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

seed().catch(async (error) => {
  console.error('Seeder error:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('Disconnect error:', disconnectError);
  }
  process.exit(1);
});
