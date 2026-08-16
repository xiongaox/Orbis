create table if not exists public.sanyuan_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  case_type text check (case_type in ('yangzhai', 'yinzhai')) not null,
  mountain text check (mountain in ('壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥')) not null,
  facing text check (facing in ('壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥')) not null,
  yun smallint check (yun between 1 and 9) not null,
  pan_type text check (pan_type in ('xia', 'ti')) not null,
  yuan_phase text check (yuan_phase in ('upper', 'lower')) not null,
  location_label text,
  site_usage text,
  landform_notes text,
  analysis text,
  feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sanyuan_cases enable row level security;

drop policy if exists "用户只能查看自己的三元案例" on public.sanyuan_cases;
drop policy if exists "用户只能创建自己的三元案例" on public.sanyuan_cases;
drop policy if exists "用户只能更新自己的三元案例" on public.sanyuan_cases;
drop policy if exists "用户只能删除自己的三元案例" on public.sanyuan_cases;

create policy "用户只能查看自己的三元案例"
  on public.sanyuan_cases for select
  using (auth.uid() = user_id);

create policy "用户只能创建自己的三元案例"
  on public.sanyuan_cases for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的三元案例"
  on public.sanyuan_cases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "用户只能删除自己的三元案例"
  on public.sanyuan_cases for delete
  using (auth.uid() = user_id);

drop trigger if exists sanyuan_cases_updated_at on public.sanyuan_cases;
create trigger sanyuan_cases_updated_at
  before update on public.sanyuan_cases
  for each row execute function public.update_updated_at();

create index if not exists idx_sanyuan_cases_user_id on public.sanyuan_cases(user_id);
create index if not exists idx_sanyuan_cases_updated_at on public.sanyuan_cases(updated_at desc);
create index if not exists idx_sanyuan_cases_case_type on public.sanyuan_cases(case_type);;
