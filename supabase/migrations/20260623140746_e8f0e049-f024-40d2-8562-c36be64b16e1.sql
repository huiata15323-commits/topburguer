-- RLS policies for menu-images bucket
-- Public read (so customers can load images), authenticated write.

create policy "menu_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'menu-images');

create policy "menu_images_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'menu-images');

create policy "menu_images_auth_update"
on storage.objects for update
to authenticated
using (bucket_id = 'menu-images')
with check (bucket_id = 'menu-images');

create policy "menu_images_auth_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'menu-images');