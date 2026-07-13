-- Allow unauthenticated visitors to browse published packages (landing page)
create policy if not exists "Anon browse published packages"
  on tour_packages for select
  to anon
  using (status = 'published');

-- Allow unauthenticated visitors to read package reviews (star ratings on landing)
create policy if not exists "Anon read reviews"
  on package_reviews for select
  to anon
  using (true);
