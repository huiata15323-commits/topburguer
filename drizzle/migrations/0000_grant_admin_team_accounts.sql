INSERT INTO public.user_roles (user_id, role) VALUES
('ba1f4ad3-dc18-40c6-b8cc-2ebcf1eb33a7','admin'),
('aa5d7d1b-ad9f-47a6-a87f-5aeaee07d292','admin')
ON CONFLICT (user_id, role) DO NOTHING;