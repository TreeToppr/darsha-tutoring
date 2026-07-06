# DarshaTutor Project Status

Last updated: 2026-07-07  
Repository: TreeToppr/darsha-tutoring  
Default branch: master  
Live site: https://darsha-tutoring.vercel.app  
Current public release: v2.0.0 - Tutoring Operations Platform  
Current planning focus: v3.0.0 - Educational Continuity Platform

## Current state

DarshaTutor is a live tutoring operations platform built with Next.js, Supabase, Vercel, Resend, Google APIs, and related tooling.

The application currently has role-based areas for:

- Admin
- Parent
- Student
- Tutor

The public site allows users to understand the tutoring offer, sign in, and get started.

The platform direction has moved beyond simple booking. The next product phase is to become an educational continuity platform: a place where tutors, parents, and students can preserve learning history, goals, concerns, progress, lesson notes, and follow-up actions.

## Known version issue

The GitHub Release says v2.0.0, while `package.json` still says `0.1.0`.

This should be cleaned up so the codebase, release notes, and roadmap agree.

Suggested convention:

- Product release version: tracked in GitHub Releases and this docs folder
- Technical package version: optional, but should match the public product version once releases become formal
- Milestone version: GitHub Milestones are used for planning future feature groups

## Current completed release

### v2.0.0 - Tutoring Operations Platform

Known purpose:

- booking
- lesson operations
- role-based dashboards
- parent/tutor/student/admin foundation
- payments/invoices workflow
- notifications and platform operations

## Current active milestone

### v3.0.0 - Educational Continuity Platform

Purpose:

Make DarshaTutor preserve a student’s learning history so a tutor can understand the student without relying on memory, screenshots, messages, or random notes.

Success criteria:

A tutor can open a student profile and quickly understand:

- who the student is
- what they are working on
- what they struggle with
- what goals they have
- what has happened recently
- what needs attention next

## Current risk

The main risk is project sprawl.

There are many good ideas already captured in issues and milestones, but v3.0.0 needs to be finished before building too far into lesson rooms, AI intelligence, smart actions, advanced parent operations, or marketplace-style features.

## Current priority

Finish v3.0.0 as a stable educational records foundation.

Do this before expanding into v3.1.0 and v3.2.0 features.

## Next checkpoint

Before new feature work, confirm:

- the app runs locally from a clean clone
- environment variables are documented
- Supabase tables used by current features are documented
- current v3.0.0 issues are reviewed and prioritised
- the deployed version matches the expected branch
- old payment references, especially POLi, are reviewed