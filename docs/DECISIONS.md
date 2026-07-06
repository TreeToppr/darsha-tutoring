# DarshaTutor Decisions Log

This file records important product and technical decisions so the project does not keep re-litigating the same questions.

## Decision: Use Next.js for the web app

Status: Active

Reason:

Next.js supports a public website, authenticated dashboards, API routes, Vercel deployment, and future app-like behaviour from one codebase.

Trade-offs:

- Good for web-first development
- Strong deployment path through Vercel
- Requires discipline around routing, server/client boundaries, and environment variables

## Decision: Use Supabase as the backend foundation

Status: Active

Reason:

Supabase provides authentication, Postgres database, row-level security, and backend services suitable for a multi-role tutoring platform.

Trade-offs:

- Fast to build with
- Strong fit for relational educational data
- Requires careful RLS and data modelling
- Database schema must be documented as the app grows

## Decision: Keep DarshaTutor web-first for now

Status: Active

Reason:

The current priority is to make the tutoring platform work well. Mobile app development can come later.

Trade-offs:

- Faster progress now
- Easier deployment
- Mobile experience still matters through responsive web design
- Native mobile can be considered after product-market fit

## Decision: Treat v3.0.0 as the educational records foundation

Status: Active

Reason:

Future AI features, lesson rooms, parent updates, and tutor support depend on reliable student learning history.

Trade-offs:

- Less flashy than AI features
- More valuable as a foundation
- Reduces chaos for tutors and parents
- Prevents AI features from being built on weak data

## Decision: Use GitHub Issues and Milestones for planning

Status: Active

Reason:

Issues and milestones keep project planning close to the code.

Rules:

- Every significant feature should have an issue.
- Every issue should belong to the right milestone or backlog.
- Milestones should represent coherent product outcomes.
- Docs should explain the plan at a higher level.

## Decision: Add project docs inside the repo

Status: Active

Reason:

The repo should be understandable to Darsha, future collaborators, and AI assistants without relying on old chat history.

Docs to maintain:

- PROJECT_STATUS.md
- ROADMAP.md
- DECISIONS.md
- ARCHITECTURE.md
- NEXT_ACTIONS.md
- AI_CONTEXT.md

## Decision: Stripe later, payment cleanup first

Status: Tentative

Reason:

The product needs operational clarity before adding payment complexity.

Current concern:

The public site still references POLi payment language. This should be reviewed because the intended future direction may be Stripe or another cleaner payment workflow.

## Decision: AI should support tutoring context, not become the whole product

Status: Active

Reason:

DarshaTutor’s value is the tutoring relationship and continuity of learning. AI should summarise, assist, recommend, and reduce admin. It should not replace the tutor.

Examples of good AI use:

- lesson summaries
- parent-friendly updates
- tutor preparation notes
- pattern detection
- suggested next steps
- help centre support

Examples to avoid for now:

- fully automated tutoring as the main product
- complex AI agents before the core data model is stable
- AI features that require data the platform does not yet reliably collect