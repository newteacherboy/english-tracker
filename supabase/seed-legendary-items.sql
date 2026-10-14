-- Server-owned level and price for the three prestige sets and nine parts.
insert into public.dm_progress_items(id,minimum_level,price,owned_keys,style) values
('u:kahraman:#ef4444:anka',40,20000,'["d:u:kahraman:#ef4444:anka"]'::jsonb,'{"ust":"u:kahraman:#ef4444:anka"}'::jsonb),
('a:pantolon:#ef4444:yildiz',40,12000,'["d:a:pantolon:#ef4444:yildiz"]'::jsonb,'{"alt":"a:pantolon:#ef4444:yildiz"}'::jsonb),
('a:bot:#fbbf24:yildiz',40,8000,'["d:a:bot:#fbbf24:yildiz"]'::jsonb,'{"ayak":"a:bot:#fbbf24:yildiz"}'::jsonb),
('u:kahraman:#6366f1:galaksi',40,24000,'["d:u:kahraman:#6366f1:galaksi"]'::jsonb,'{"ust":"u:kahraman:#6366f1:galaksi"}'::jsonb),
('a:pantolon:#6366f1:yildiz',40,16000,'["d:a:pantolon:#6366f1:yildiz"]'::jsonb,'{"alt":"a:pantolon:#6366f1:yildiz"}'::jsonb),
('a:bot:#22d3ee:yildiz',40,8000,'["d:a:bot:#22d3ee:yildiz"]'::jsonb,'{"ayak":"a:bot:#22d3ee:yildiz"}'::jsonb),
('u:kahraman:#059669:ejderha',40,28000,'["d:u:kahraman:#059669:ejderha"]'::jsonb,'{"ust":"u:kahraman:#059669:ejderha"}'::jsonb),
('a:pantolon:#059669:yildiz',40,20000,'["d:a:pantolon:#059669:yildiz"]'::jsonb,'{"alt":"a:pantolon:#059669:yildiz"}'::jsonb),
('a:bot:#a3e635:yildiz',40,8000,'["d:a:bot:#a3e635:yildiz"]'::jsonb,'{"ayak":"a:bot:#a3e635:yildiz"}'::jsonb),
('k:efsane-anka',40,30000,'["d:u:kahraman:#ef4444:anka","d:a:pantolon:#ef4444:yildiz","d:a:bot:#fbbf24:yildiz"]'::jsonb,'{"ust":"u:kahraman:#ef4444:anka","alt":"a:pantolon:#ef4444:yildiz","ayak":"a:bot:#fbbf24:yildiz"}'::jsonb),
('k:efsane-galaksi',40,36000,'["d:u:kahraman:#6366f1:galaksi","d:a:pantolon:#6366f1:yildiz","d:a:bot:#22d3ee:yildiz"]'::jsonb,'{"ust":"u:kahraman:#6366f1:galaksi","alt":"a:pantolon:#6366f1:yildiz","ayak":"a:bot:#22d3ee:yildiz"}'::jsonb),
('k:efsane-ejderha',40,42000,'["d:u:kahraman:#059669:ejderha","d:a:pantolon:#059669:yildiz","d:a:bot:#a3e635:yildiz"]'::jsonb,'{"ust":"u:kahraman:#059669:ejderha","alt":"a:pantolon:#059669:yildiz","ayak":"a:bot:#a3e635:yildiz"}'::jsonb)
on conflict(id) do update set minimum_level=excluded.minimum_level,price=excluded.price,owned_keys=excluded.owned_keys,style=excluded.style;
