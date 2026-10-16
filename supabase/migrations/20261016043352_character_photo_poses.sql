-- Native character poses use the existing atomic, service-only wardrobe purchase.
insert into public.dm_progress_items(id,minimum_level,price,owned_keys,style) values
('a|durus|dik',1,0,'["durus:dik"]'::jsonb,'{"durus": "dik"}'::jsonb),
('a|durus|sol',1,0,'["durus:sol"]'::jsonb,'{"durus": "sol"}'::jsonb),
('a|durus|sag',1,0,'["durus:sag"]'::jsonb,'{"durus": "sag"}'::jsonb),
('a|durus|rahat',1,0,'["durus:rahat"]'::jsonb,'{"durus": "rahat"}'::jsonb),
('a|durus|selam',1,0,'["durus:selam"]'::jsonb,'{"durus": "selam"}'::jsonb),
('a|durus|zafer',5,100,'["durus:zafer"]'::jsonb,'{"durus": "zafer"}'::jsonb),
('a|durus|belde',10,200,'["durus:belde"]'::jsonb,'{"durus": "belde"}'::jsonb),
('a|durus|capraz',15,350,'["durus:capraz"]'::jsonb,'{"durus": "capraz"}'::jsonb),
('a|durus|basparmak',20,550,'["durus:basparmak"]'::jsonb,'{"durus": "basparmak"}'::jsonb),
('a|durus|dusunur',25,800,'["durus:dusunur"]'::jsonb,'{"durus": "dusunur"}'::jsonb),
('a|durus|kalp',30,1100,'["durus:kalp"]'::jsonb,'{"durus": "kalp"}'::jsonb),
('a|durus|kahraman',35,1450,'["durus:kahraman"]'::jsonb,'{"durus": "kahraman"}'::jsonb),
('a|durus|kutlama',40,1850,'["durus:kutlama"]'::jsonb,'{"durus": "kutlama"}'::jsonb)
on conflict(id) do update set minimum_level=excluded.minimum_level,price=excluded.price,owned_keys=excluded.owned_keys,style=excluded.style;
