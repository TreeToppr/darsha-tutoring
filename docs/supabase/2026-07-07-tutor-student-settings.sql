-- DarshaTutor v3.0.0
-- Tutor-specific student settings, starting with custom hourly rate

create table if not exists tutor_student_settings (
    id uuid primary key default gen_random_uuid(),
    tutor_id uuid not null references tutors(id) on delete cascade,
    student_id uuid not null references students(id) on delete cascade,
    custom_hourly_rate numeric check (custom_hourly_rate is null or custom_hourly_rate > 0),
    notes text,
    created_by uuid references profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (tutor_id, student_id)
);

create index if not exists tutor_student_settings_tutor_id_idx
on tutor_student_settings(tutor_id);

create index if not exists tutor_student_settings_student_id_idx
on tutor_student_settings(student_id);

alter table tutor_student_settings enable row level security;

drop policy if exists "tutor_student_settings_select_access" on tutor_student_settings;
drop policy if exists "tutor_student_settings_insert_own" on tutor_student_settings;
drop policy if exists "tutor_student_settings_update_own" on tutor_student_settings;
drop policy if exists "tutor_student_settings_delete_own" on tutor_student_settings;

create policy "tutor_student_settings_select_access"
on tutor_student_settings
for select
to authenticated
using (
    exists (
        select 1
        from tutors t
        where t.id = tutor_student_settings.tutor_id
        and t.profile_id = auth.uid()
    )
    or exists (
        select 1
        from students s
        where s.id = tutor_student_settings.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
);

create policy "tutor_student_settings_insert_own"
on tutor_student_settings
for insert
to authenticated
with check (
    created_by = auth.uid()
    and exists (
        select 1
        from tutors t
        where t.id = tutor_student_settings.tutor_id
        and t.profile_id = auth.uid()
    )
    and exists (
        select 1
        from bookings b
        where b.tutor_id = tutor_student_settings.tutor_id
        and b.student_id = tutor_student_settings.student_id
        and b.status <> 'cancelled'
    )
);

create policy "tutor_student_settings_update_own"
on tutor_student_settings
for update
to authenticated
using (
    exists (
        select 1
        from tutors t
        where t.id = tutor_student_settings.tutor_id
        and t.profile_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from tutors t
        where t.id = tutor_student_settings.tutor_id
        and t.profile_id = auth.uid()
    )
);

create policy "tutor_student_settings_delete_own"
on tutor_student_settings
for delete
to authenticated
using (
    exists (
        select 1
        from tutors t
        where t.id = tutor_student_settings.tutor_id
        and t.profile_id = auth.uid()
    )
);