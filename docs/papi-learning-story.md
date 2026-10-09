# Papi learning route

Approved design: compact forest/gold selector and learning map (concept 5), illustrated Papi/student dialogue scenes (concept 3). Game progression remains separate. The selected profile character gender `yo.karakter.cins` chooses a boy (`e`) or girl (`k`) scene; without a selection only Papi appears.

Forty original story chapters introduce A1, A2, B1 and B2 material progressively, with 399 activities. Chapters are educational content stages and do not certify proficiency. All English content and Turkish teaching explanations are authored in `scripts/build-story-curriculum.py`; client and API decks are generated identically. A short introduction and teaching cards lead to meaning selection, listening, two sentence-order tasks, application, previous-chapter recall, a topic test and a final task. There are no self-confirmed speaking or open-ended writing steps.

Progress belongs to the signed-in actor and is stored in `papi_story_progress`. Correct progress is saved before continuing. The service-only `dm_story_apply` transaction locks progress and student balances together. Every second distinct question costs one energy on its first valid attempt, including a wrong answer. Retrying the same question costs no extra energy. Energy regenerates with the existing 15-minute rule; zero energy pauses a new question while leaving paid retries available. Introduction and teaching cards are free.

First completion awards a learning leaf and the existing parkur XP amounts (42/48/60 by success rate). The existing level-5-and-every-third-stop gold schedule counts learning stops under separate keys alongside game stops. No game-map completion is inserted. Replays preserve the completed marker, resume server-side, spend energy, and never re-award XP/gold/leaves. Existing completed chapters are marked already rewarded during migration, preserving past progress without retroactive grants. Teacher previews do not alter student balances.

## Original generated imagery

Built-in image generation was used on 2026-10-09 with the user's approved concept art as a style/composition reference. Assets are production background art without baked text or controls; HTML supplies all readable UI. The original generated PNG outputs are retained under the current task workspace.

- `story-garden-map.webp`: Portrait sunny garden background with a winding sandy path, flowers, river, wooden bridge and distant castle; no UI, text or characters. Prompt: preserve the polished illustrated garden aesthetic of the approved concept and leave the central path clear for lesson markers.
- `story-scene-boy.webp`: Landscape garden/bridge scene with original blue-yellow Papi on the left and a boy in mustard hoodie with green backpack on the right, viewed from behind. Prompt: reproduce the approved concept 3 story composition; leave clear sky for a separately rendered speech bubble, no UI or text.
- `story-scene-girl.webp`: Edit of the boy scene replacing only the student with a girl in the same pose, hoodie and backpack, with brown ponytail; preserve garden, bridge, Papi and camera framing. Prompt: switch the character without changing the scene composition.

Generated assets do not establish exclusivity or legal clearance. Byte hashes and source records appear in `media-rights-manifest.json`.

Production backgrounds are exported as WebP at quality 90 for mobile delivery; original generated PNGs are retained in the task workspace. No composition or UI text is changed during encoding.
