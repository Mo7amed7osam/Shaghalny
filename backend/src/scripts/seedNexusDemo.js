const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const catalog = require('./demoCatalog');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const Contract = require('../models/Contract');
const Escrow = require('../models/Escrow');
const Transaction = require('../models/Transaction');
const WorkSubmission = require('../models/WorkSubmission');
const TopUpRequest = require('../models/TopUpRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Notification = require('../models/Notification');
const Event = require('../models/Event');
const Interview = require('../modules/ai-interview/interview.model');
const { normalizeExternalJob } = require('../utils/externalJobs');
const id = () => new mongoose.Types.ObjectId();
const DAY = 86400000;
const now = new Date();
const ago = (days) => new Date(now.getTime() - days * DAY);
const stamp = (date, extra = {}) => ({ createdAt: date, updatedAt: date, ...extra });
const svg = (label, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" rx="72" fill="${color}"/><text x="240" y="275" text-anchor="middle" font-family="sans-serif" font-size="120" fill="white">${label}</text><text x="240" y="420" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white">DEMO</text></svg>`;

async function seedNexusDemo() {
  const [database, snapshotFile, reset] = process.argv.slice(2);
  if (!/^Shaghalny-Demo-\d{8}$/.test(database || '') || !snapshotFile) throw new Error('Usage: node src/scripts/seedNexusDemo.js Shaghalny-Demo-YYYYMMDD <source-snapshot.json> [--reset-demo]');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is not set.');
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile));
  if (snapshot.source !== 'Arbeitnow' || !Array.isArray(snapshot.jobs) || !snapshot.jobs.length) throw new Error('Valid external source snapshot required.');
  const source = await mongoose.createConnection(uri).asPromise();
  let admins;
  try {
    if (source.name === database) throw new Error('Demo target must differ from source.');
    admins = await source.db.collection('users').find({ role: 'Admin' }).toArray();
    const target = source.getClient().db(database);
    const collections = await target.listCollections({}, { nameOnly: true }).toArray();
    const populated = collections.length > 0;
    if (populated) {
      const marker = await target.collection('demometadata').findOne({ _id: 'nexus-demo-v1' });
      if (reset !== '--reset-demo' || !marker) throw new Error('Target already exists. Refusing to overwrite data.');
      await target.dropDatabase();
    }
  } finally { await source.close(); }
  await mongoose.connect(uri, { dbName: database });
  try {
    await mongoose.connection.db.collection('demometadata').insertOne({ _id: 'nexus-demo-v1', isDemo: true, startedAt: now, status: 'preparing', syntheticHistoryDays: 60 });
    await Promise.all([User, Skill, Job, Proposal, Contract, Escrow, Transaction, WorkSubmission, TopUpRequest, WithdrawalRequest, Notification, Event, Interview].map(model => model.init()));
    const folder = path.join(os.homedir(), '.codex/backups/shaghalny', database);
    fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
    const credentialFile = path.join(folder, 'demo-credentials.json');
    let credentials;
    if (fs.existsSync(credentialFile)) credentials = JSON.parse(fs.readFileSync(credentialFile));
    else {
      credentials = { database, sharedPassword: crypto.randomBytes(18).toString('base64url'), admin: 'admin@shaghalny.test', client: 'client@shaghalny.test', student: 'student@shaghalny.test' };
      fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: 'wx' });
    }
    const hash = await bcrypt.hash(credentials.sharedPassword, 12);
    const assets = path.join(__dirname, '../../assets/demo');
    fs.mkdirSync(assets, { recursive: true });
    const colors = ['#4338ca', '#047857', '#9a3412', '#7e22ce', '#075985', '#9f1239'];
    const companies = ['Nile Nest Studio', 'Cedarline Labs', 'Mosaic Learning', 'Palm Works Agency', 'Orbit Craft', 'Delta Field Office', 'Paper Lantern Media', 'Horizon Campus Services'];
    const names = ['Omar Adel', 'Salma Hany', 'Youssef Tarek', 'Mariam Ashraf', 'Ahmed Ziad', 'Nour Khaled', 'Karim Samir', 'Farida Mostafa', 'Hassan Amr', 'Dina Mahmoud', 'Ali Emad', 'Hana Sherif', 'Mostafa Wael', 'Yasmin Fathy', 'Adam Magdy', 'Laila Osama', 'Seif Ibrahim', 'Nada Sameh', 'Tarek Nabil', 'Malak Hesham', 'Amr Gamal', 'Jana Essam', 'Khaled Ayman', 'Reem Salah', 'Ziad Mohamed', 'Habiba Adel', 'Sherif Ahmed', 'Aya Hossam', 'Mahmoud Hassan', 'Rana Fares'];
    const admin = { _id: id(), name: 'Nexus Demo Administrator', email: credentials.admin, password: hash, role: 'Admin', isDemo: true, balance: 0 };
    const users = admins.map(({ _id, name, email, password }) => ({ _id, name, email, password, role: 'Admin', balance: 0 }));
    users.push(admin);
    const skills = [];
    const groups = catalog.map((group, categoryIndex) => {
      const list = group.skills.map(name => ({ _id: id(), name, category: group.category, description: `${name} services for student freelance projects.` }));
      skills.push(...list);
      const file = `portfolio-${categoryIndex}.md`;
      fs.writeFileSync(path.join(assets, file), `# Sample ${group.category} portfolio\n\nDEMO DATA — fictional participant and projects.\n\n## Example deliverable\n${group.titles[0]}\n\n## Workflow\nClarify requirements, agree milestones, produce a first draft, incorporate feedback, and verify acceptance criteria.\n\nThis document is a demonstration asset, not a claim of real client work.\n`);
      return list;
    });
    const clients = companies.map((name, index) => {
      const logo = `company-${index}.svg`;
      fs.writeFileSync(path.join(assets, logo), svg(name.split(' ').slice(0, 2).map(x=>x[0]).join(''), colors[index % colors.length]));
      return { _id: id(), name, email: index === 0 ? credentials.client : `client-${index + 1}@shaghalny.test`, password: hash, role: 'Client', isDemo: true, balance: 100000, companyLogoUrl: `/api/demo-assets/${logo}`, description: 'Fictional company for the disclosed hackathon demo. Budgets and transactions use simulated credits.', isVerified: false };
    });
    users.push(...clients);
    const students = names.map((name, index) => {
      const category = Math.floor(index / 5);
      const avatar = `student-${index}.svg`;
      fs.writeFileSync(path.join(assets, avatar), svg(name.split(' ').map(x=>x[0]).join(''), colors[category]));
      return { _id: id(), name, email: index === 0 ? credentials.student : `student-${index + 1}@shaghalny.test`, password: hash, role: 'Student', isDemo: true, balance: 0, university: ['Cairo University', 'Ain Shams University', 'Helwan University', 'Alexandria University'][index % 4], profilePhotoUrl: `/api/demo-assets/${avatar}`, description: `Demo student profile specializing in ${catalog[category].category.toLowerCase()}. Sample work and assessments are synthetic.`, portfolioLinks: [`https://shaghalny.quantara-eg.com/api/demo-assets/portfolio-${category}.md`], verifiedSkills: groups[category].map((skill, k) => ({ skill: skill._id, score: 74 + (index + k * 3) % 21, verifiedAt: ago(58 - k * 2 - index % 3) })), reviews: [], jobsCompleted: 0 };
    });
    users.push(...students);
    const jobs = [], proposals = [], contracts = [], escrows = [], transactions = [], topups = [], withdrawals = [], submissions = [], sessions = [], notifications = [], events = [];
    clients.forEach((client, index) => {
      const request = { _id: id(), clientId: client._id, amount: 100000, screenshotPath: 'assets/demo-payment.svg', note: 'DEMO: simulated initial funding; no real transfer.', status: 'APPROVED', adminId: admin._id, processedAt: ago(61), ...stamp(ago(61.5)) };
      topups.push(request);
      transactions.push({ _id: id(), toUserId: client._id, amount: request.amount, type: 'TOPUP_APPROVED', relatedRequestId: request._id, ...stamp(ago(61)) });
      if (index < 4) topups.push({ _id: id(), clientId: client._id, amount: 10000 + index * 2500, screenshotPath: 'assets/demo-payment.svg', note: 'DEMO: synthetic additional funding request.', status: index === 3 ? 'DECLINED' : 'PENDING', ...(index === 3 ? { adminId: admin._id, decisionReason: 'Demo decline example: amount needs clarification.', processedAt: ago(2) } : {}), ...stamp(ago(index + 0.5)) });
    });
    students.forEach((student, studentIndex) => {
      const category = Math.floor(studentIndex / 5);
      student.verifiedSkills.forEach((verified, k) => {
        const skill = groups[category][k], date = verified.verifiedAt;
        sessions.push({ _id: id(), user: student._id, skill: skill.name, skillRef: skill._id, isDemo: true, status: 'completed', questions: [{ questionId: 'q1', text: `How would you plan and validate a ${skill.name} task?`, order: 1 }], answers: [{ questionId: 'q1', questionText: `How would you plan and validate a ${skill.name} task?`, transcript: 'Synthetic demo response: clarify requirements, choose an approach, validate the deliverable and incorporate client feedback.', score: verified.score, feedback: 'Synthetic assessment for the hackathon demonstration. Not a real candidate evaluation.', strengths: ['Example: structured task planning'], weaknesses: ['Example: provide more measurable acceptance criteria'], recommendation: 'pass', evaluationSource: 'demo', ...stamp(date) }], finalScore: verified.score, finalRecommendation: 'pass', reviewStatus: 'pass', reviewedBy: admin._id, reviewedAt: new Date(date.getTime() + 3600000), ...stamp(date) });
      });
      if (studentIndex < 12) {
        const pending = studentIndex < 6;
        sessions.push({ _id: id(), user: student._id, skill: groups[category][0].name, skillRef: groups[category][0]._id, isDemo: true, status: 'completed', questions: [{ questionId: 'review-q1', text: 'How would you handle unclear requirements?', order: 1 }], answers: [{ questionId: 'review-q1', questionText: 'How would you handle unclear requirements?', transcript: 'Synthetic review example for demonstrating human oversight.', score: pending ? null : 42, feedback: 'DEMO: example needing human review or a retry.', recommendation: pending ? 'needs_review' : 'fail', evaluationSource: 'demo', ...stamp(ago(2)) }], finalScore: pending ? null : 42, finalRecommendation: pending ? 'needs_review' : 'fail', reviewStatus: pending ? 'pending' : 'fail', ...(pending ? {} : { reviewedBy: admin._id, reviewedAt: ago(1) }), ...stamp(ago(2)) });
      }
    });
    catalog.forEach((group, categoryIndex) => group.titles.forEach((title, j) => {
      const client = clients[(categoryIndex + j) % clients.length];
      const categoryStudents = students.slice(categoryIndex * 5, categoryIndex * 5 + 5);
      const selected = categoryStudents[j % 5];
      const postedDays = j < 3 ? 60 - j * 8 - categoryIndex * 0.2 : j === 3 ? 10 : j === 4 ? 6 : j === 5 ? 30 : (9 - j) * 3 + 0.1 + categoryIndex * 0.01;
      const posted = ago(postedDays), accepted = ago(postedDays - 1.2), delivered = ago(postedDays - 4), completed = ago(postedDays - 5);
      const amount = group.base + j * 500;
      const job = { _id: id(), title, description: `${title}. Scope: clarify the brief, prepare a first version, handle one review cycle and deliver organized source files with a short handover note. Category: ${group.category}. This is a fictional marketplace project in the disclosed hackathon demo; all budgets are simulated credits.`, requiredSkills: [groups[categoryIndex][j % 5]._id], employer: client._id, isDemo: true, budgetMin: amount - 500, budgetMax: amount + 1000, duration: `${3 + j % 8} days`, type: 'freelance', isUnpaid: false, workMode: j % 4 === 0 ? 'hybrid' : 'online', location: ['Cairo, Egypt', 'Giza, Egypt', 'Alexandria, Egypt'][categoryIndex % 3], positions: 1, positionsFilled: j < 5 ? 1 : 0, status: j < 3 ? 'completed' : j < 5 ? 'in_progress' : j === 5 ? 'closed' : 'open', applicants: [], ...stamp(posted, { updatedAt: j < 3 ? completed : posted }) };
      const jobProposals = [];
      for (let p = 0; p < 3; p += 1) {
        const student = categoryStudents[(j + p) % 5];
        const proposal = { _id: id(), jobId: job._id, studentId: student._id, details: `I can help with ${title.toLowerCase()}. I will confirm the requirements, share an early draft and deliver the agreed files with a clear handover. Demo proposal for a fictional project.`, proposedBudget: amount + p * 100, status: j < 5 ? p === 0 ? 'accepted' : 'rejected' : j === 5 ? 'rejected' : p === 1 ? 'shortlisted' : 'submitted', ...stamp(ago(Math.max(0.01, postedDays - 0.5 - p * 0.1))) };
        jobProposals.push(proposal); proposals.push(proposal); job.applicants.push(student._id);
      }
      if (j < 5) {
        const contract = { _id: id(), jobId: job._id, clientId: client._id, studentId: selected._id, proposalId: jobProposals[0]._id, agreedBudget: amount, status: j < 3 ? 'completed' : j === 3 ? 'active' : 'submitted', escrowStatus: j < 3 ? 'released' : 'held_in_escrow', ...(j !== 3 ? { submittedAt: delivered } : {}), ...(j < 3 ? { acceptedAt: completed, completedAt: completed } : {}), ...stamp(accepted, { updatedAt: j < 3 ? completed : j === 4 ? delivered : accepted }) };
        contracts.push(contract); job.selectedStudent = selected._id; job.activeContract = contract._id;
        const escrow = { _id: id(), contractId: contract._id, clientId: client._id, studentId: selected._id, amount, status: j < 3 ? 'released' : 'held_in_escrow', ...(j < 3 ? { releasedAt: completed } : {}), ...stamp(accepted, { updatedAt: j < 3 ? completed : accepted }) };
        escrows.push(escrow); client.balance -= amount;
        transactions.push({ _id: id(), fromUserId: client._id, toUserId: selected._id, amount, type: 'ESCROW_HOLD', contractId: contract._id, ...stamp(accepted) });
        if (j !== 3) submissions.push({ _id: id(), contractId: contract._id, studentId: selected._id, message: `Demo delivery for ${title}: sample source material and handover notes attached. This is generated demonstration history, not completed external client work.`, links: [`https://shaghalny.quantara-eg.com/api/demo-assets/portfolio-${categoryIndex}.md`], attachments: [], ...stamp(delivered) });
        if (j === 1) submissions.push({ _id: id(), contractId: contract._id, studentId: selected._id, message: 'Demo revision: incorporated the sample review comments and clarified the acceptance checklist.', links: [`https://shaghalny.quantara-eg.com/api/demo-assets/portfolio-${categoryIndex}.md`], ...stamp(ago(postedDays - 4.5)) });
        if (j < 3) {
          selected.balance += amount; selected.jobsCompleted += 1;
          transactions.push({ _id: id(), fromUserId: client._id, toUserId: selected._id, amount, type: 'ESCROW_RELEASE', contractId: contract._id, ...stamp(completed) });
          selected.reviews.push({ jobId: job._id, contractId: contract._id, clientName: client.name, rating: j === 1 ? 4 : 5, comment: 'Synthetic demo review: clear communication, useful draft and organized delivery. Not a real customer endorsement.', jobTitle: title, jobType: 'freelance', createdAt: ago(postedDays - 6) });
          const withdrawal = { _id: id(), studentId: selected._id, amount: Math.floor(amount * 0.3 / 100) * 100, payoutMethod: 'INSTAPAY', instapayHandle: `demo-student-${categoryIndex * 5 + j + 1}@shaghalny.test`, note: 'DEMO ONLY: no actual bank or Instapay transfer.', status: j === 0 ? 'APPROVED' : j === 1 ? 'PENDING' : 'DECLINED', ...(j === 1 ? {} : { adminId: admin._id, processedAt: ago(postedDays - 8) }), ...(j === 2 ? { decisionReason: 'Demo decline example: confirm the test payout details.' } : {}), ...stamp(ago(postedDays - 7)) };
          withdrawals.push(withdrawal);
          if (j === 0) { selected.balance -= withdrawal.amount; transactions.push({ _id: id(), fromUserId: selected._id, amount: withdrawal.amount, type: 'WITHDRAWAL_APPROVED', relatedRequestId: withdrawal._id, ...stamp(withdrawal.processedAt) }); }
        }
        notifications.push({ _id: id(), userId: selected._id, title: j < 3 ? 'Demo delivery accepted' : 'Demo contract update', message: `Sample activity for ${title}.`, type: 'contract', isRead: j < 3, createdAt: j < 3 ? completed : accepted });
      }
      jobs.push(job);
    }));
    for (let k = 0; k < 6; k += 1) {
      const event = { _id: id(), title: ['Portfolio clinic', 'Accessible web workshop', 'Freelance pricing practice', 'Student project showcase', 'AI review Q&A', 'Client communication lab'][k] + ' — Demo', description: 'Fictional community event for the hackathon demo. No real booking or attendance is claimed.', imageUrl: `/api/demo-assets/company-${k}.svg`, date: ago(k < 3 ? 35 - k * 10 : -(k - 2) * 3), time: '18:00', location: k % 2 ? 'Online — demo session' : 'Giza — demo venue', isOnline: k % 2 === 1, createdBy: admin._id, createdAt: ago(45 - k * 4) };
      events.push(event);
      students.slice(k * 5, k * 5 + 5).forEach(student => notifications.push({ _id: id(), userId: student._id, eventId: event._id, title: event.title, message: 'Sample event notification in the demonstration environment.', type: 'event', isRead: k < 3, createdAt: ago(k < 3 ? 20 : 1) }));
    }
    await Skill.insertMany(skills);
    await User.insertMany(users);
    for (const [model, documents] of [[Job, jobs], [Proposal, proposals], [Contract, contracts], [Escrow, escrows], [Transaction, transactions], [WorkSubmission, submissions], [TopUpRequest, topups], [WithdrawalRequest, withdrawals], [Interview, sessions], [Event, events], [Notification, notifications]]) await model.insertMany(documents, { timestamps: false });
    const observed = new Date(snapshot.fetchedAt);
    if (Date.now() - observed.getTime() > DAY) throw new Error('External snapshot is too old. Fetch current listings and import separately.');
    const imported = snapshot.jobs.map(job => normalizeExternalJob({ title: job.title, slug: job.sourceId, company_name: job.sourceCompanyName, description: job.description, url: job.sourceUrl, location: job.sourceLocation, tags: job.sourceTags, remote: job.workMode === 'online', created_at: new Date(job.sourcePublishedAt).getTime() / 1000 }, observed));
    if (imported.some(job => !job)) throw new Error('Invalid source records.');
    await Job.insertMany(imported.map(job => ({ ...job, requiredSkills: [], createdAt: job.sourcePublishedAt, updatedAt: observed })), { timestamps: false });
    const available = users.reduce((sum, user) => sum + user.balance, 0);
    const held = escrows.filter(e => e.status === 'held_in_escrow').reduce((sum, e) => sum + e.amount, 0);
    const funded = transactions.filter(t => t.type === 'TOPUP_APPROVED').reduce((sum, t) => sum + t.amount, 0);
    const paidOut = transactions.filter(t => t.type === 'WITHDRAWAL_APPROVED').reduce((sum, t) => sum + t.amount, 0);
    if (available + held !== funded - paidOut || users.some(user => user.balance < 0)) throw new Error('Ledger reconciliation failed. Do not deploy.');
    const summary = { database, isDemo: true, historyDays: 60, users: users.length, students: students.length, clients: clients.length, skills: skills.length, nativeJobs: jobs.length, externalJobs: imported.length, proposals: proposals.length, contracts: contracts.length, escrows: escrows.length, transactions: transactions.length, submissions: submissions.length, interviews: sessions.length, topups: topups.length, withdrawals: withdrawals.length, reviews: students.reduce((n, s) => n + s.reviews.length, 0), events: events.length, notifications: notifications.length, ledger: { available, held, funded, simulatedPaidOut: paidOut, reconciled: true }, categories: catalog.map(x=>x.category), credentialsFile: credentialFile };
    await mongoose.connection.db.collection('demometadata').updateOne({ _id: 'nexus-demo-v1' }, { $set: { status: 'ready', completedAt: new Date(), summary } });
    fs.mkdirSync(path.resolve(__dirname, '../../../output/job-import'), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, '../../../output/job-import/demo-seed-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) seedNexusDemo().catch(error => { console.error(error.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '[redacted]')); process.exitCode = 1; });
module.exports = { seedNexusDemo };
