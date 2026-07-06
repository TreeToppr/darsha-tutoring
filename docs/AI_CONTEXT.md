# DarshaTutor AI Context

This file gives AI assistants context for helping with DarshaTutor.

## What DarshaTutor is

DarshaTutor is a tutoring platform being built by Darsha.

It began as a tutoring operations platform and is evolving into an educational continuity platform.

The goal is to help tutors, parents, and students manage tutoring relationships, preserve student learning history, and reduce scattered communication across messages, screenshots, notes, spreadsheets, and memory.

## Product direction

DarshaTutor is not just a booking site.

The long-term direction is:

- tutoring operations
- student learning records
- lesson workspaces
- parent/tutor/student communication
- AI-supported educational memory
- progress visibility
- reduced admin

## Current focus

The current active product focus is:

v3.0.0 - Educational Continuity Platform

Purpose:

Make DarshaTutor preserve a student’s learning history so a tutor can understand the student without relying on memory, screenshots, messages, or random notes.

## Main user roles

### Parent

Wants to:

- book lessons
- manage their child’s tutoring
- understand progress
- communicate with tutors
- handle payments and scheduling clearly

### Student

Wants to:

- know upcoming lessons
- access homework/resources
- understand goals
- see progress where useful

### Tutor

Wants to:

- see schedule
- understand each student quickly
- record what happened
- track goals and concerns
- prepare for lessons
- follow up efficiently

### Admin

Wants to:

- oversee platform operations
- manage issues
- support users
- keep data and workflows reliable

## Current technology

The project uses:

- Next.js
- React
- Supabase
- Vercel
- Resend
- Google APIs
- Google Generative AI
- Tailwind CSS

## Current repo structure

Important folders:

```text
src/app/
  (admin)/
  (parent)/
  (student)/
  (tutor)/
  api/
  auth/
  components/
  payment/poli-return/
  updates/

src/components/
src/lib/
```
## Planning system

GitHub Issues and Milestones are used for planning.

Current major milestones:

- v3.0.0 - Educational Continuity Platform
- v3.1.0 - Lesson Workspace & Lesson Rooms
- v3.2.0 - Educational Intelligence
- v3.2.0 - Parent & Tutor Operations
- Platform Infrastructure & Reliability
- Backlog / Future Ideas

## How to help

When helping with this project:

1. Check the current milestone before suggesting new features.
2. Prefer finishing v3.0.0 before adding v3.1.0/v3.2.0 work.
3. Keep the scope practical.
4. Treat student learning history as the foundation.
5. Avoid building AI features before the underlying data is reliable.
6. Flag version confusion or architectural risks.
7. Give file-specific, copy-pasteable code where possible.
8. Suggest small commits with clear commit messages.
9. Keep docs and issues aligned.
10. Avoid overbuilding.

## Current priority

The current priority is to make v3.0.0 finishable.

This means:

- clean student profile foundation
- goals
- concerns
- observations
- timeline
- tutor-facing student overview
- parent-facing progress view
- reliable permissions
- clear release notes
## Important caution

Do not treat all open issues as equal priority.

Some issues are later-stage ideas. The immediate need is to stabilise the educational continuity foundation.


