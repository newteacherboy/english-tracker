-- Retire Tower and Word Blocks without deleting historical progress or rewards.
-- The Edge Function rejects requests early; remove the dedicated RPC entry privileges as defense in depth.
revoke execute on function public.dm_tower_status(uuid), public.dm_tower_start(uuid,uuid), public.dm_tower_finish(uuid,uuid,integer[]), public.dm_blocks_status(uuid), public.dm_blocks_start(uuid,uuid), public.dm_blocks_finish(uuid,uuid,integer[]) from service_role;
