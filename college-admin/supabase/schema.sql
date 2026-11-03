-- ===== ລັນໃນ Supabase > SQL Editor =====

-- 1) ຕາຕະລາງສົກຮຽນ
create table if not exists academic_years (
  id serial primary key,
  name text not null unique            -- ຕົວຢ່າງ: 2026-2027
);

-- 2) ຕາຕະລາງປະຫວັດນັກສຶກສາ
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  academic_year_id int not null references academic_years(id) on delete restrict,
  photo_url text,
  first_name_lo text not null,
  last_name_lo text not null,
  first_name_en text,
  last_name_en text,
  gender text check (gender in ('ຊາຍ','ຍິງ')),
  dob date,                            -- ສະແດງເປັນລາວ/ອັງກິດໃນແອັບ
  birth_village text,
  birth_district text,
  birth_province text,
  high_school text,                    -- ຮຽນຈົບ ມ.7 ຈາກ ມ.ສ ໃດ
  phone text,
  father_phone text,
  mother_phone text,
  emergency_phone text,
  created_at timestamptz default now()
);
create index if not exists students_year_idx on students(academic_year_id);

-- 3) ຄວາມປອດໄພ (RLS): ທຸກຄົນເບິ່ງໄດ້, ສະເພາະຜູ້ບໍລິຫານ (ລັອກອິນແລ້ວ) ແກ້ໄຂ/ລົບໄດ້
alter table academic_years enable row level security;
alter table students enable row level security;

create policy "public read years"    on academic_years for select using (true);
create policy "admin write years"    on academic_years for all to authenticated using (true) with check (true);
create policy "public read students" on students for select using (true);
create policy "admin write students" on students for all to authenticated using (true) with check (true);

-- 4) ບ່ອນເກັບຮູບ
insert into storage.buckets (id, name, public) values ('student-photos','student-photos', true)
on conflict (id) do nothing;

create policy "public read photos" on storage.objects for select using (bucket_id = 'student-photos');
create policy "admin write photos" on storage.objects for all to authenticated
  using (bucket_id = 'student-photos') with check (bucket_id = 'student-photos');

-- 5) ຂໍ້ມູນຕົວຢ່າງ
insert into academic_years (name) values ('2026-2027') on conflict do nothing;
