-- DarshaTutor v3.0.0 Educational Continuity
-- Student Goals + Concerns foundation

create table if not exists student_goals (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references students(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'active' check (status in ('active', 'completed', 'paused', 'archived')),
    target_date date,
    created_by uuid references profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists student_concerns (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references students(id) on delete cascade,
    title text not null,
    detail text,
    severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
    status text not null default 'active' check (status in ('active', 'resolved', 'archived')),
    created_by uuid references profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists student_goals_student_id_idx on student_goals(student_id);
create index if not exists student_concerns_student_id_idx on student_concerns(student_id);

alter table student_goals enable row level security;
alter table student_concerns enable row level security;

drop policy if exists "student_goals_select_access" on student_goals;
drop policy if exists "student_goals_insert_access" on student_goals;
drop policy if exists "student_goals_update_access" on student_goals;

drop policy if exists "student_concerns_select_access" on student_concerns;
drop policy if exists "student_concerns_insert_access" on student_concerns;
drop policy if exists "student_concerns_update_access" on student_concerns;

create policy "student_goals_select_access"
on student_goals
for select
to authenticated
using (
    exists (
        select 1
        from students s
        where s.id = student_goals.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_goals.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
);

create policy "student_goals_insert_access"
on student_goals
for insert
to authenticated
with check (
    created_by = auth.uid()
    and (
        exists (
            select 1
            from students s
            where s.id = student_goals.student_id
            and s.parent_id = auth.uid()
        )
        or exists (
            select 1
            from tutors t
            join bookings b on b.tutor_id = t.id
            where t.profile_id = auth.uid()
            and b.student_id = student_goals.student_id
            and b.status <> 'cancelled'
        )
        or exists (
            select 1
            from profiles p
            where p.id = auth.uid()
            and p.role = 'admin'
        )
    )
);

create policy "student_goals_update_access"
on student_goals
for update
to authenticated
using (
    exists (
        select 1
        from students s
        where s.id = student_goals.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_goals.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from students s
        where s.id = student_goals.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_goals.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
);

create policy "student_concerns_select_access"
on student_concerns
for select
to authenticated
using (
    exists (
        select 1
        from students s
        where s.id = student_concerns.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_concerns.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
);

create policy "student_concerns_insert_access"
on student_concerns
for insert
to authenticated
with check (
    created_by = auth.uid()
    and (
        exists (
            select 1
            from students s
            where s.id = student_concerns.student_id
            and s.parent_id = auth.uid()
        )
        or exists (
            select 1
            from tutors t
            join bookings b on b.tutor_id = t.id
            where t.profile_id = auth.uid()
            and b.student_id = student_concerns.student_id
            and b.status <> 'cancelled'
        )
        or exists (
            select 1
            from profiles p
            where p.id = auth.uid()
            and p.role = 'admin'
        )
    )
);

create policy "student_concerns_update_access"
on student_concerns
for update
to authenticated
using (
    exists (
        select 1
        from students s
        where s.id = student_concerns.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_concerns.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from students s
        where s.id = student_concerns.student_id
        and s.parent_id = auth.uid()
    )
    or exists (
        select 1
        from tutors t
        join bookings b on b.tutor_id = t.id
        where t.profile_id = auth.uid()
        and b.student_id = student_concerns.student_id
        and b.status <> 'cancelled'
    )
    or exists (
        select 1
        from profiles p
        where p.id = auth.uid()
        and p.role = 'admin'
    )
);