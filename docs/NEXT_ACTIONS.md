# DarshaTutor Next Actions

This file is the current working priority list.

Last updated: 2026-07-07

## Rule

Do not start a new major feature until the current foundation is clear.

Current focus:

v3.0.0 - Educational Continuity Platform

## Immediate actions

### 1. Confirm local project state

Goal:

Make sure the GitHub repo can be cloned and run from a clean folder.

Tasks:

- clone the repo into a clean local folder
- run `npm install`
- run `npm run dev`
- confirm the homepage loads locally
- confirm sign-in/sign-up pages load
- note any errors

Done when:

A clean clone can run locally.

### 2. Confirm deployed branch

Goal:

Make sure Vercel is deploying from the branch we expect.

Tasks:

- check Vercel project settings
- confirm production branch
- confirm latest deployment commit
- compare with GitHub master branch

Done when:

We know exactly what code is live.

### 3. Fix version confusion

Goal:

Make versioning understandable.

Tasks:

- decide current product version
- update docs with current version
- decide whether `package.json` should be updated from `0.1.0`
- add a simple release convention

Suggested convention:

- v2.0.0 = current released operations platform
- v3.0.0 = active educational continuity milestone
- package version may match the latest public release

Done when:

README, docs, GitHub Release, and package version no longer contradict each other.

### 4. Review v3.0.0 issues

Goal:

Turn v3.0.0 from a broad milestone into a finishable scope.

Tasks:

- review every open v3.0.0 issue
- mark each as:
  - must-have for v3.0.0
  - should-have
  - defer to v3.1.0
  - defer to backlog
- close stale or duplicate issues
- reorder priorities

Done when:

v3.0.0 has a clear must-have list.

### 5. Document Supabase schema

Goal:

Know what data exists and what the app depends on.

Tasks:

- list current tables
- list key columns
- list relationships
- list RLS policies
- map tables to features

Done when:

`docs/DATABASE_SCHEMA.md` exists.

### 6. Review payment state

Goal:

Avoid old or confusing payment messaging.

Tasks:

- identify current payment flow
- check whether POLi is still used
- check homepage copy
- decide whether Stripe is future v3.3+ work
- document the interim payment approach

Done when:

Payment copy and product plan agree.

### 7. Create v3.0.0 build order

Goal:

Know exactly what to build next.

Recommended order:

1. Student profile foundation
2. Goals
3. Concerns
4. Skill observations
5. Timeline
6. Tutor student overview
7. Parent progress view
8. Basic admin visibility
9. Permission/RLS review
10. Release notes

Done when:

Each v3.0.0 issue has a clear build order.

## Do not prioritise yet

These are valuable, but should wait until v3.0.0 is stable:

- advanced AI support assistant
- smart actions
- full lesson rooms
- complex announcements
- marketplace features
- mobile app
- Stripe integration
- advanced analytics
- native recording/transcript system

## Current next best task

Create the docs folder and add:

- PROJECT_STATUS.md
- ROADMAP.md
- DECISIONS.md
- ARCHITECTURE.md
- NEXT_ACTIONS.md
- AI_CONTEXT.md

Then commit:

```bash
git add docs
git commit -m "Add project planning documentation"
git push
```