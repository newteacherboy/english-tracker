-- Apply after the verified client is publicly reachable. Secure by default on fresh installs.
update public.dm_security_settings set value=true where key='verified_games_required';
