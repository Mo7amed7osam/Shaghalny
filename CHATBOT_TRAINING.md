# Shaghalny — Chatbot Training Guide

How to train the Chatling support agent embedded in the platform, plus the full
knowledge base it needs to answer user questions accurately.

The widget is embedded in [`frontend/index.html`](frontend/index.html) (bot id
`3865182951`). It appears on every page for every visitor, signed in or not.

---

## Part 1 — How to train the bot

### 1. Add the knowledge base

1. Open [chatling.ai](https://chatling.ai) → your chatbot → **Knowledge base**.
2. Add a **Text / Document** source and paste **Part 3** of this file (everything
   from "Platform knowledge base" to the end).
3. Optionally add the public site as a **Website** source so the crawler picks up
   landing-page copy: `https://<your-vercel-domain>/`. Only `/`, `/login` and
   `/register` are public — every other route is behind auth, so the crawler will
   not reach them. The pasted text is the real source of truth.
4. Click **Train** and wait for indexing to finish.

### 2. Set the system prompt

Paste **Part 2** into **Settings → AI → Instructions / System prompt**.

### 3. Recommended settings

| Setting | Value | Why |
|---|---|---|
| Response language | Auto-detect | Users write Arabic, English, and Franco-Arabic |
| Temperature | Low (~0.2) | Answers are procedural; invention is the main failure mode |
| Fallback | "I'm not sure — contact support" | Prevents made-up policy |
| Answer only from knowledge base | On | Same reason |

### 4. Retrain after platform changes

Re-paste Part 3 whenever you change: escrow rules, the 70% pass mark, wallet
payout methods, roles, or route names. A stale bot is worse than no bot.

### 5. Test set

Before going live, ask the bot these and check each answer against Part 3:

- "How do I verify a skill?"
- "ليه مش عارف أقدم على الشغلانة دي؟" (*why can't I apply to this job?*)
- "When do I get paid?"
- "How do I top up my wallet?"
- "What score do I need to pass the interview?"
- "Can a client cancel after funding?" → must say it doesn't know, not invent a policy.

---

## Part 2 — System prompt (paste into Chatling)

```
You are the support assistant for Shaghalny (شغّلني), a student freelancing
marketplace in Egypt. You help students, clients, and admins use the platform.

TONE
- Professional, clear, encouraging. Students are early-career; never condescend.
- Match the user's language. Arabic in, Arabic out. English in, English out.
- Short answers. Numbered steps for procedures. No marketing filler.

WHAT YOU DO
- Explain how features work: jobs, proposals, skill verification interviews,
  contracts, escrow, wallet, events, AI career roadmap.
- Walk users through flows step by step, naming the exact page they need.
- Tell users which role a feature belongs to (Student / Client / Admin).

WHAT YOU NEVER DO
- Never invent fees, policies, timelines, refund rules, or dispute processes.
  If it is not in your knowledge base, say you don't know and refer to support.
- Never promise a payout date, an interview result, or an admin approval.
- Never ask for or accept passwords, card numbers, or verification codes.
- Never give investment or legal advice.
- Never claim to take actions inside the platform. You cannot post jobs, accept
  proposals, release escrow, or approve anything. Tell the user where to click.

WHEN UNSURE
Say: "I'm not certain about that one — please contact Shaghalny support so they
can check your account." Then stop. Do not guess.

All amounts are in EGP.
```

---

## Part 3 — Platform knowledge base

### What Shaghalny is

Shaghalny (شغّلني, Arabic for "employ me") is a student-focused freelancing
marketplace for MENA, primarily Egypt. It connects university students with
clients who need work done. Its differentiator is **AI-guided video skill
verification**: students must prove a skill before they can apply for work
requiring it, which lowers the screening burden for clients.

All money is in **EGP**. The app is a Progressive Web App (PWA).

### The three roles

| Role | Who | Main jobs |
|---|---|---|
| **Student** | University student / freelancer | Verify skills, browse jobs, submit proposals, deliver work, withdraw earnings |
| **Client** | Individual or small team hiring | Top up wallet, post jobs, review proposals, fund and accept work |
| **Admin** | Internal operator | Review interviews, manage skills and users, approve top-ups and withdrawals, publish events |

A user has exactly one role, chosen at registration.

### Core rule: verification gates applications

> A student can only submit a proposal to a job when **every** skill the job
> requires is already verified on their profile.

Attempting otherwise returns: *"You can only apply to jobs when all required
skills are verified on your profile."* This is the single most common support
question. The fix is always: go verify the missing skill first.

### Skill verification (AI interview)

1. Student opens **Skill Verification** (`/student/skill-verification`) and picks a skill.
2. The system generates **3 practical interview questions** for that skill using AI.
3. For each question the student records an answer. Both **camera video** and
   **screen recording** are captured and uploaded.
4. After the third answer the session completes and is scored out of 100.
5. Outcome by score:
   - **70 or above → pass.** The skill is added to the student's verified skills.
   - **50–69 → needs review.** An admin watches the recordings and decides.
   - **Below 50 → fail.**
6. Session states: `started` → `in_progress` → `completed` (or `failed`).
7. Students see past attempts under **Interview History** (`/student/interview-history`)
   and a per-session result page.
8. Admins review pending sessions from the admin dashboard and can override the
   AI verdict.

Verified skills appear as badges on the student's public profile (`/students/:id`).

### Jobs

- Clients post jobs from **Post a Job** (`/client/post-job`) with title,
  description, required skills, a budget range (min/max), and duration.
- Job status: `open` → `in_progress` → `completed` / `closed`.
- Students browse at `/student/jobs`. Jobs are also searchable from the top nav.
- Clients get an AI-assisted **matched candidates** list per job: students whose
  verified skills cover **all** the job's required skills.
- Students whose verified skills match a new job receive a notification.

### Proposals

- A student submits one proposal per job: a message plus a proposed budget.
- Proposal status: `submitted` → `shortlisted` / `rejected` / `accepted`.
- A student cannot submit twice to the same job.
- Clients review proposals at `/client/view-proposals`.
- **AI cover letter improvement:** students can run their proposal text through
  an AI rewrite that makes it more professional and concise before sending.

### Contracts and escrow

Accepting a proposal creates a contract **and moves money immediately**:

1. Client accepts a proposal.
2. The agreed budget is **deducted from the client's wallet balance** and held in
   escrow. If the balance is too low, acceptance fails with *"Insufficient client
   balance to hold escrow"* — the client must top up first.
3. A contract is created with status `active`, escrow `held_in_escrow`.
   The job flips to `in_progress` and all other proposals are rejected.
4. Student delivers via **submit work** on the contract. Contract → `submitted`.
5. Client either **accepts** the work or **requests changes**.
   - Requesting changes sends it back to the student.
   - Accepting releases escrow: the amount is **added to the student's balance**,
     escrow → `released`, contract → `completed`.
6. After completion the client can leave a **rating (1–5) and review**, which
   appears on the student's profile along with their completed-jobs count.

Contract pages: `/student/contracts`, `/client/contracts`, `/contracts/:id`.

### Wallet and payments

Payments are **manually settled by admins** — there is no automatic card
processing in the product.

**Client top-up (adding money in):**
1. Client goes to `/client/wallet` and submits a top-up request with an amount
   and a **screenshot of the transfer** as proof.
2. Request status starts `PENDING`.
3. An admin reviews it at `/admin/payments` and sets it `APPROVED` or `DECLINED`.
4. On approval the balance is credited.

**Student withdrawal (taking money out):**
1. Student goes to `/student/wallet` and requests a withdrawal.
2. Payout method is **BANK** or **INSTAPAY**; the matching account number or
   Instapay handle is required.
3. The amount cannot exceed the available balance.
4. Status starts `PENDING`; an admin approves or declines it.

Both sides see their balance and request history on their wallet page.

> The bot must never promise how long approval takes. It is a manual admin step.

### Events

Admins publish events (title, description, image, date, time, location, and an
online/offline flag). Students and admins browse them at `/events` and open
`/events/:id`. Events are reachable from the main navigation.

### AI career roadmap

Students enter a career goal at `/student/career-roadmap` and get a structured
roadmap back — a sectioned plan for reaching that goal. Student-only feature.

### Notifications

In-app notifications fire on relevant activity, including new jobs matching a
student's verified skills.

### Page map

| Path | Role | Page |
|---|---|---|
| `/` | Public | Landing page |
| `/login`, `/register` | Public | Auth |
| `/student/dashboard` | Student | Dashboard |
| `/student/profile` | Student | Edit profile, CV, photos |
| `/student/jobs` | Student | Browse and apply |
| `/student/contracts` | Student | Active and past contracts |
| `/student/skill-verification` | Student | Start a skill interview |
| `/student/ai-interview/:sessionId` | Student | Take the interview |
| `/student/interview-history` | Student | Past attempts |
| `/student/career-roadmap` | Student | AI roadmap |
| `/student/wallet` | Student | Balance, withdrawals |
| `/client/dashboard` | Client | Dashboard |
| `/client/post-job` | Client | Create a job |
| `/client/view-proposals` | Client | Review proposals |
| `/client/contracts` | Client | Contracts |
| `/client/wallet` | Client | Balance, top-ups |
| `/contracts/:id` | Student, Client, Admin | Contract detail |
| `/students/:id` | Any signed-in user | Public student profile |
| `/events`, `/events/:id` | Student, Admin | Events |
| `/admin/dashboard` | Admin | Users, jobs, skills |
| `/admin/review-interview/:id` | Admin | Grade an interview |
| `/admin/payments` | Admin | Approve top-ups and withdrawals |
| `/admin/events` | Admin | Manage events |

### Profiles

Students have: name, university, description, portfolio links, CV upload,
profile photo, cover photo, verified skill badges, reviews, completed-jobs count.
Clients have a company logo, website, and description.

---

## Part 4 — Canned answers

Use these verbatim; they match the real behavior above.

**"Why can't I apply to this job?"**
> You can only apply once every skill the job requires is verified on your
> profile. Open Skill Verification, pick the missing skill, and complete the
> 3-question video interview. Score 70 or above and the skill is added
> automatically — then the job's Apply button will work.

**"How do I verify a skill?"**
> 1. Go to Skill Verification from your dashboard.
> 2. Choose the skill.
> 3. Answer 3 practical questions on camera — your camera and screen are both
>    recorded.
> 4. You get a score out of 100. 70+ passes and the badge is added to your
>    profile. 50–69 goes to an admin for manual review. Below 50 doesn't pass.

**"When do I get paid?"**
> When you accept a contract, the client's money is already held in escrow, so
> the funds are reserved before you start. Once you submit your work and the
> client accepts it, the amount is released into your Shaghalny wallet balance.
> From there, request a withdrawal to your bank account or Instapay from your
> Wallet page. Withdrawals are reviewed by an admin before they're sent.

**"How do I add money to my wallet?" (client)**
> Go to your Wallet page and submit a top-up request: enter the amount and
> attach a screenshot of your transfer as proof. An admin reviews it, and once
> it's approved your balance is credited. You need enough balance before you can
> accept a proposal, because the full agreed budget is held in escrow at that
> moment.

**"I was charged when I accepted a proposal."**
> That's escrow, not a fee. The agreed budget leaves your available balance and
> is held until you accept the delivered work. When you accept, it goes to the
> student. Nothing extra is deducted.

**Anything about refunds, cancellations, disputes, fees, or timelines:**
> I'm not certain about that one — please contact Shaghalny support so they can
> check your account.
