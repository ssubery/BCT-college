-- ===== ອັບເດດ (ລັນຕື່ມ ຖ້າໄດ້ລັນ schema.sql ແລ້ວ) : ເພີ່ມສາຂາວິຊາ + ອາຈານ =====

create table if not exists majors (
  id serial primary key,
  code text,
  name text not null unique
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  gender text check (gender in ('ຊາຍ','ຍິງ')),
  position text,
  phone text,
  email text,
  major_id int references majors(id) on delete set null,
  created_at timestamptz default now()
);

alter table students add column if not exists major_id int references majors(id) on delete set null;

alter table majors enable row level security;
alter table teachers enable row level security;

drop policy if exists "public read majors" on majors;
drop policy if exists "admin write majors" on majors;
drop policy if exists "public read teachers" on teachers;
drop policy if exists "admin write teachers" on teachers;

create policy "public read majors"   on majors for select using (true);
create policy "admin write majors"   on majors for all to authenticated using (true) with check (true);
create policy "public read teachers" on teachers for select using (true);
create policy "admin write teachers" on teachers for all to authenticated using (true) with check (true);

insert into majors (code, name) values
  ('SE','ວິສະວະກຳຊອບແວ'),('NET','ເຄືອຂ່າຍຄອມພິວເຕີ'),('BA','ບໍລິຫານທຸລະກິດ')
on conflict (name) do nothing;
