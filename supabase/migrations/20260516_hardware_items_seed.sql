-- Hardware page · Phase 2 · seed from the operations spreadsheet
--
-- Idempotent on (type, type_index) — re-running the migration
-- won't double-seed because every insert is guarded by a
-- where-not-exists. value_price_cents is the integer cents
-- representation of the spreadsheet's "$xxx.xx" column;
-- "missing" becomes null.

insert into public.hardware_items (type, type_index, is_personal_computer, model, assigned_to, location, value_price_cents, status, account, pin)
select * from (values
  ('Desktop', 1, false, 'Apple Mac Mini M1', 'Zoom Room for Clients', 'Admin Building', 38539, null::text, null::text, null::text),
  ('Desktop', 2, false, 'Apple Mac Mini M1', 'Group room', 'Group room', 38539, null, null, null),
  ('Desktop', 3, false, 'Apple IMac Pro', 'Max Swann', 'Nurse''s Office', 149900, null, null, null),

  ('Dock', 1, false, 'Belkin Triple Display DisplayLink Docking Station Hub', 'Pamela Calvo', 'Admin Building', 18900, null, null, null),
  ('Dock', 2, false, 'Belkin 15-in-1 Universal Triple Display', 'Mario Salcedo', 'with Mario', 24995, null, null, null),

  ('iPad', 1, false, 'iPad Air (5th generation) Magic Keyboard for iPad Pro 11-inch', 'Patient Portal for Clients', 'Lodge/Library', 29900, null, null, null),
  ('iPad', 2, false, 'iPad Air (5th generation) Magic Keyboard for iPad Pro 11-inch', 'Patient Portal for Clients', 'Lodge/Library', 29900, null, null, null),
  ('iPad', 3, false, 'Apple iPad 11-inch - Pink', 'Employee Kiosk', 'BHT Space', 29900, null, null, null),

  ('Keyboard', 1, false, 'Apple Magic Keyboard', 'Group', 'Lodge/Group Room', 14900, null, null, null),
  ('Keyboard', 2, false, 'Apple Magic Keyboard', 'Lindsay Rothschild', 'Admin Building', 12839, null, null, null),
  ('Keyboard', 3, false, 'Apple Magic Keyboard', 'Unassigned', 'Admin Building', 12839, null, null, null),
  ('Keyboard', 4, false, 'Logitech MX Key. Mini', 'Melissa Simard', 'Barn', 7999, null, null, null),
  ('Keyboard', 5, false, 'Logitech Wireless Keyboard', 'Pamela Calvo', 'Admin Building', 10900, null, null, null),
  ('Keyboard', 6, false, 'Logitech Wireless Keyboard', 'Unassigned', 'Admin Building', 10900, null, null, null),
  ('Keyboard', 7, false, 'Wireless Keyboard mouse combo Pink', 'Placida Valdez', 'Admin Building', 2999, null, null, null),
  ('Keyboard', 8, false, 'Surface Pink Keyboard', 'Placida Valdez', 'Admin Building', 4999, null, null, null),
  ('Keyboard', 9, false, 'Logitech Wireless Keyboard', 'Tiffany Welch', 'Admin Building', 10900, null, null, null),
  ('Keyboard', 10, false, 'Logitech Wireless Keyboard', 'Rosa Andrade', 'Admin Building', 10900, null, null, null),
  ('Keyboard', 11, false, 'Logitech Wireless Keyboard', 'Pamela Calvo', 'Pam Home', 10900, null, null, null),
  ('Keyboard', 12, false, 'Logitech Wireless Keyboard', 'Mario Salcedo', 'with Mario', 10900, null, null, null),
  ('Keyboard', 13, false, 'Logitech Wireless Keyboard', 'Melissa Simard', 'with Melissa', 10900, null, null, null),

  ('Laptop', 1, false, 'Macbook Pro M1', 'JoAnna O''Bryan', 'Roaming', 98112, null, null, null),
  ('Laptop', 2, false, 'Macbook Air M3', 'Rosa Andrade', 'Roaming', 115900, null, null, null),
  ('Laptop', 3, false, 'Macbook Pro M2', 'Melissa Simard', 'Roaming', 164995, null, null, null),
  ('Laptop', 4, false, 'Macbook Pro', 'Donald Mackillop', 'Roaming', 177900, null, null, null),
  ('Laptop', 5, false, 'MacBook Air', 'Unassigned', 'with Tiffany (temp)', 109900, null, 'Feather1234', null),
  ('Laptop', 6, false, 'Macbook Air M4', 'Tiffany Welch', 'Admin/Remote', 97400, null, null, null),
  ('Laptop', 7, true,  'HP', 'Lindsay Rothschild', 'Roaming', null, null, null, null),
  ('Laptop', 8, false, 'Macbook Air M4', 'Tania Tafoya', 'Roaming', 97400, 'Using on her Admin day', 'sevenarrowsrecovery', null),
  ('Laptop', 9, false, 'Apple 2025 MacBook Air 13-inch Laptop', 'Olivia Avanzato', 'Admin Building', 84900, null, 'rosad1972Arrows@icloud.com', null),
  ('Laptop', 10, false, 'Apple 2025 MacBook Air 13', 'Pamela Calvo', 'with Pamela', 79900, null, 'sevenarrows', null),
  ('Laptop', 11, false, 'Apple 2025 MacBook Air 13-inch', 'Mario Salcedo', 'with Mario', 74900, null, null, null),

  ('Monitor', 1, false, 'Samsung Frame', 'Main Lodge', 'Main Lodge Hallway', 124799, null, null, null),
  ('Monitor', 2, false, 'LG 27QN600-B 27', 'Tiffany Welch', 'Admin Building/Case Management', 24699, null, null, null),
  ('Monitor', 3, false, 'LG 27QN600-B 27', 'Unassigned', 'Admin Building', 19100, null, null, null),
  ('Monitor', 4, false, 'LG 27QN600-B 27', 'Unassigned', 'Clinical Building', 19100, null, null, null),
  ('Monitor', 5, false, 'LG 27QN600-B 27', 'Pamela Calvo', 'Admin Building', 19100, null, null, null),
  ('Monitor', 6, false, 'LG 27UL500W', 'Lindsay Rothschild', 'Admin Building', 19999, null, null, null),
  ('Monitor', 7, false, 'Dell 27 4K UHD USB-C', 'Clients', 'Zoom Room', 14999, null, null, null),
  ('Monitor', 8, false, 'Dell 27 22DZ USB-C', 'Tiffany Welch', 'Admin Building/Tiffany', 26699, null, null, null),
  ('Monitor', 9, false, 'Dell 27 22DZ USB-C', 'Pamela Calvo', 'Admin Building', 32900, null, null, null),
  ('Monitor', 10, false, 'LG 32MN60T', 'clients', 'Group Room', 17463, null, null, null),
  ('Monitor', 11, false, 'Dell UltraSharp U2723QE', 'Rosa Andrade', 'Admin Building', 48000, null, null, null),
  ('Monitor', 12, false, 'Dell UltraSharp U3223QE 31.5', 'Rosa Andrade', 'Admin Building', 82600, null, null, null),
  ('Monitor', 13, false, 'Dell S3221QS 32 Inch Curved 4K UHD (3840 x 2160)', 'Bobby Burton', 'Tucson', 34999, null, null, null),
  ('Monitor', 14, false, 'Dell 27in 4k Monitor', 'Melissa Simard', 'Barn', 31999, null, null, null),
  ('Monitor', 15, false, 'Dell S2722QC 27-inch 4K USB-C Monitor', 'Placida Valdez', 'Admin Building', 31999, null, null, null),
  ('Monitor', 16, false, 'Dell 27in 4k Monitor', 'Erica Hawk', 'Barn', 31999, null, null, null),
  ('Monitor', 17, false, 'Dell 27 Plus 4K Monitor S2725QC', 'Rosa Andrade', 'Rosa Home', 32999, null, null, null),
  ('Monitor', 18, false, 'Dell 27 Plus 4K Monitor S2725QC', 'Melissa Simard', 'Melissa Home', 32999, null, null, null),
  ('Monitor', 19, false, 'Dell 34 Plus', 'Pamela Calvo', 'Pam Home', 39999, null, null, null),
  ('Monitor', 20, false, 'Dell S2722DC Monitor - 27-inch WQHD', 'Mario Salcedo', 'Mario Home', 22999, null, null, null),
  ('Monitor', 21, false, 'Dell 32 Plus 4K Monitor - S3225QS', 'Mario Salcedo', 'Mario Home', 27999, null, null, null),
  ('Monitor', 22, false, 'Dell 27 Plus 4K USB-C Monitor - S2725QC', 'Mario Salcedo', 'Mario Home', 29126, null, null, null),
  ('Monitor', 23, false, 'Dell 27 Plus 4K USB-C Monitor - S2725QC', 'Pamela Calvo', 'Admin', 25998, null, null, null),

  ('Mouse', 1, false, 'Logitech MX Master 3S', 'Group', 'Lodge/Group Room', 8999, null, null, null),
  ('Mouse', 2, false, 'Logitech MX Master 3S', 'Clients', 'Zoom room', 8999, null, null, null),
  ('Mouse', 3, false, 'Logitech MX Master 3S', 'Lindsay Rothschild', 'Admin Building', 8999, null, null, null),
  ('Mouse', 4, false, 'Logitech MX Master 3S', 'Melissa Simard', 'Barn', 8599, null, null, null),
  ('Mouse', 5, false, 'Logitech MX Master 3S', 'Pamela Calvo', 'Admin Building', 8599, null, null, null),
  ('Mouse', 6, false, 'Logitech MX Master 3S', 'BHTs', 'BHT Office', 8599, null, null, null),
  ('Mouse', 7, false, 'Logitech MX Master 3S', 'BHTs', 'BHT Office', 8599, null, null, null),
  ('Mouse', 8, false, 'Logitech MX Master 3S', 'Unassigned', 'Admin Building', 8599, null, null, null),
  ('Mouse', 9, false, 'Logitech MX Master 3S', 'Tiffany Welch', 'Admin Building', 8599, null, null, null),
  ('Mouse', 10, false, 'Logitech MX Master 3S', 'Rosa Andrade', 'Admin Building', 8599, null, null, null),
  ('Mouse', 11, false, 'Logitech MX Master 3S', 'Pamela Calvo', 'Pam Home', 8599, null, null, null),
  ('Mouse', 12, false, 'Logitech MX Master 3S', 'Mario Salcedo', 'with Mario', 8599, null, null, null),
  ('Mouse', 13, false, 'Logitech MX Master 3S', 'Melissa Simard', 'with Melissa', 8599, null, null, null),

  ('Printers', 1, false, 'Canon MF267dwII', 'BHTs', 'BHT Office', 25300, null, null, null),
  ('Printers', 2, false, 'Cannon', 'Admin', 'Admin Building', null, null, null, null),

  ('Router', 1, false, 'Dream Machine Special Edition', 'Pending', 'Pending', 55444, null, null, null),

  ('Scanner', 1, false, 'Brother Wireless Scanner, ADS-2700W', 'Pamela Calvo', 'Admin Building', 36000, null, null, null),
  ('Scanner', 2, false, 'Brother Wireless Scanner, ADS-2700W', 'Max Swann', 'Nurse''s Station', 36000, null, null, null),
  ('Scanner', 3, false, 'Brother Wireless Scanner Ads 3200W', 'New Clinical Building', 'Clinical Building', 39999, null, null, null),

  ('Surface', 1, false, 'Microsoft Surface Pro 8', 'BHT', 'Tech Office Lodge', 96607, null, 'feather@sevenarrowsrecovery.com', '8771'),
  ('Surface', 2, false, 'Microsoft Surface Pro 8', 'BHT', 'Tech Office Lodge', 96607, null, 'feather@sevenarrowsrecovery.com', '8771'),
  ('Surface', 3, false, 'Microsoft Surface Pro 8', 'Rosa Andrade', 'Roaming/Admin Building', 96607, null, null, '8771'),
  ('Surface', 4, false, 'Microsoft Surface Pro 8', 'Kitchen', 'Roaming/Admin Building', 96607, 'LOST', null, '8771'),
  ('Surface', 5, false, 'Microsoft Surface Pro 8', 'John Sanchez', 'Admin Building', 96607, null, null, '8771'),
  ('Surface', 6, false, 'Microsoft Surface Pro 8', 'Placida Valdez', 'Admin Building', 96607, null, null, '8771'),
  ('Surface', 7, false, 'Microsoft Surface Pro 9', 'Pamela Calvo', 'Admin Building', 96607, null, null, '8771')
) as src(type, type_index, is_personal_computer, model, assigned_to, location, value_price_cents, status, account, pin)
where not exists (
  select 1 from public.hardware_items existing
  where existing.type = src.type
    and existing.type_index = src.type_index
);
