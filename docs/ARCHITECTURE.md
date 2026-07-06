# DarshaTutor Architecture

This document describes the current architecture at a practical level.

## Application

DarshaTutor is a Next.js application deployed on Vercel.

The app uses:

- Next.js
- React
- Supabase
- Resend
- Google APIs
- Google Generative AI
- Vercel Speed Insights
- date-fns
- Tailwind CSS

## Main folders

```text
src/
  app/
  components/
  lib/
  proxy.js
```

## App routing structure
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
  page.js
  layout.js
  globals.css
```
## Role-based areas
### Admin

Purpose:

Manage platform-level operations.

Likely responsibilities:

- user oversight
- lesson oversight
- issue handling
- platform configuration
- operational review

### Parent

Purpose:

Allow parents to manage their child’s tutoring.

Likely responsibilities:

- view children
- view bookings
- view invoices/payment status
- view progress
- request changes
- receive updates

### Student

Purpose:

Allow students to participate in their own learning.

Likely responsibilities:

- see upcoming lessons
- access homework/resources
- view goals
- view learning history where appropriate

### Tutor

Purpose:

Allow tutors to manage lessons and student learning context.

Likely responsibilities:

- view lesson schedule
- view student profiles
- record notes
- update progress
- manage goals/concerns
- prepare for lessons
- follow up after lessons

### Library structure
```text
src/lib/
  email/
  auditClient.js
  dateUtils.js
  email.js
  notifications.js
  paymentCopy.js
  supabaseAdmin.js
  supabaseClient.js
  timeUtils.js
```

### Backend

Supabase is the main backend.

Expected responsibilities:

- authentication
- user profiles
- student profiles
- lessons
- goals
- concerns
- skill observations
- learning timeline
- invoices/payments
- notifications
- audit records

### API routes

The src/app/api folder contains server-side routes.

Expected responsibilities:

- secure backend actions
- integrations
- email sending
- payment handling
- AI calls
- authenticated data operations where client-side access is unsuitable

## Integrations
### Supabase

Used for database and authentication.

### Resend

Used for email sending.

### Google APIs

Used for Google-related workflows, possibly calendar and/or meeting integration.

### Google Generative AI

Used or planned for AI-powered tutoring support.

### Vercel

Used for hosting and deployment.

### Current architecture concerns

These areas need review:

- exact database schema
- row-level security policies
- environment variables
- whether API routes use admin access safely
- whether payment logic is current
- whether POLi references should remain
- whether AI calls are safely isolated
- whether each role sees only appropriate data
- whether the deployed site matches the intended current branch

### Documentation still needed

Create or update:

- database schema notes
- environment variable guide
- local setup guide
- deployment guide
- user role permissions matrix
- release/versioning convention