alter table tour_packages
  add column if not exists available_slots integer;

update tour_packages set available_slots = max_slots where available_slots is null;

create or replace function update_package_slots()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'confirmed' and (old.status is null or old.status <> 'confirmed') then
    update tour_packages
      set available_slots = greatest(0, coalesce(available_slots, max_slots) - 1)
      where id = new.package_id::text;
  end if;
  if new.status = 'cancelled' and old.status = 'confirmed' then
    update tour_packages
      set available_slots = least(max_slots, coalesce(available_slots, max_slots) + 1)
      where id = new.package_id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_package_slots on tour_bookings;
create trigger trg_update_package_slots
  after update on tour_bookings
  for each row execute function update_package_slots();
