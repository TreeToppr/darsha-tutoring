# DarshaTutor Database Schema

Last updated: 2026-07-07

This document records the database tables currently used by DarshaTutor based on the application code.

It should be updated whenever a table, column, relationship, or major data workflow changes.

## Current student model

DarshaTutor currently uses a `students` table as the core student record.

This table is used by:

- parent student management
- tutor student roster
- tutor student profile/dossier
- lesson upload workflow
- lesson reports

Current known fields used in code:

| Field | Purpose | Used in |
|---|---|---|
| id | Student identifier | bookings, lesson reports, profile pages |
| parent_id | Links student to parent user/profile | parent students page, student creation API |
| full_name | Student display name | parent view, tutor roster, tutor profile |
| year_level | Student school year | parent view, edit form |
| billing_code | Student billing/reference code | parent view, tutor roster, student creation API |
| can_student_book | Allows student portal booking | parent view, edit form |
| custom_hourly_rate | Referenced in form state, needs review | parent students page |

## Current student creation flow

Parents create students from:

```text
src/app/(parent)/students/page.js
```

The page calls:
```text
src/app/api/students/route.js
```

The API creates a student record and generates a billing code.

Current creation payload:

- fullName
- yearLevel
- parentId
- can_student_book

Current saved fields:

- parent_id
- full_name
- year_level
- billing_code
- can_student_book

## Tutor roster flow

Tutor roster page:
```text
src/app/(tutor)/tutor-students/page.js
```

Current behaviour:

- gets the logged-in user's tutor record from tutors
- fetches bookings for that tutor from bookings
- joins each booking to students
- removes cancelled bookings
- deduplicates students into a roster
- counts lessons per student

Important implication:

A student appears in the tutor roster only when they have at least one non-cancelled booking with that tutor.

## Tutor student profile flow

Tutor student profile page:

src/app/(tutor)/tutor-students/[id]/page.js

Current behaviour:

- loads the student from students
- loads bookings for that student and tutor from bookings
- loads reports from lesson_reports
- derives latest skills from ai_skills_analysis
- displays lesson history and mastery information

Current related tables:

- students
- tutors
- bookings
- lesson_reports

## Lesson upload / report flow

Lesson upload page:
```text
src/app/(tutor)/upload-lesson/page.js
```

Current behaviour:

- selects a student
- selects a term
- selects a lesson booking
- uploads screenshots to lesson-media
- uploads audio to lesson-media
- uploads videos to lesson-recordings
- creates transcription records in transcriptions
- creates a lesson report in lesson_reports
- triggers /api/ai/analyze-lesson

Current related tables/storage:

- students
- bookings
- lesson_reports
- transcriptions
- lesson-media storage bucket
- lesson-recordings storage bucket

Current known tables from student-related code
| Table | Current role |
|---|---|
|students	| Core student record |
|tutors	| Tutor profile/record |
|profiles	| User profile and contact/rate information |
|bookings	| Lesson booking records |
|lesson_reports	| Lesson wrap-up, AI summary, skills analysis |
|transcriptions	| Pending transcription jobs for lesson recordings |
|audit_events	| Audit logging |

## Current concerns
### 1. `students` is doing the job of `student_profiles`

The project docs mention student profiles, but the actual code currently uses `students`.

Decision needed:

Use `students` as the official student profile table, or introduce `student_profiles`.

Recommendation:

Keep `students` as the official table for now. Renaming or duplicating it would create unnecessary migration risk.

### 2. Tutor roster depends on bookings

Current tutor-student relationships are inferred from bookings.

This works for now, but it may become limiting if:

- a tutor needs to prepare before the first booking
- students are assigned to tutors before a lesson is booked
- a parent changes tutors
- a tutor needs access to historical students after cancelled bookings

Possible future table:
```text
student_tutor_relationships
```

Suggested fields:

- id
- student_id
- tutor_id
- status
- created_at
- ended_at
- notes

Do not build this until the current v3.0.0 needs are clearer.

### 3. Goals and concerns do not appear to be implemented yet

The current visible code shows skill analysis and lesson reports, but not dedicated goals or concerns tables.

Possible future tables:

- student_goals
- student_concerns
- student_skill_observations
- student_timeline_events

4. AI skills are embedded inside `lesson_reports`

The tutor student profile derives mastery from `lesson_reports.ai_skills_analysis`.

This is good enough for a first version.

Future concern:

If skill tracking becomes more important, skills may need to be normalised into a separate table.

Possible future table:
```text
student_skill_observations
```

## Recommended v3.0.0 data direction

For v3.0.0, avoid renaming or restructuring everything.

Use the current model:

- students
- bookings
- lesson_reports
- transcriptions

Then add only the minimum new tables needed for educational continuity:

- student_goals
- student_concerns
- student_timeline_events

Defer advanced normalisation until the product behaviour is clearer.