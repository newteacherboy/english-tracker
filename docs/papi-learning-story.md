# Papi learning route

Approved design: compact forest/gold selector and learning map (concept 5), illustrated Papi/student dialogue scenes (concept 3). Game progression remains separate. The selected profile character gender `yo.karakter.cins` chooses a boy (`e`) or girl (`k`) scene; without a selection only Papi appears.

Forty original story chapters introduce A1, A2, B1 and B2 material progressively, with 399 activities. Chapters are educational content stages and do not certify proficiency. All English content and Turkish teaching explanations are authored in `scripts/build-story-curriculum.py`; client and API decks are generated identically. A short introduction, teaching cards, meaning selection, listening, sentence construction, spoken rehearsal, application, previous-chapter recall, scaffolded writing and a final task make up each chapter. Writing is recorded without automatic assessment. Spoken rehearsal is self-confirmed without microphone capture or an automatic pronunciation score.

Progress and writing belong to the signed-in actor and are stored in `papi_story_progress`. The API checks predecessor completion and current step/version. Correct progress is saved before continuing. Wrong answers retain the step and offer explanation, with no balance penalty. Each first chapter completion contributes one learning leaf; repeat runs do not award another. No XP, gold, energy or existing stop progress is modified.

## Original generated imagery

Built-in image generation was used on 2026-10-09 with the user's approved concept art as a style/composition reference. Assets are production background art without baked text or controls; HTML supplies all readable UI. The original generated PNG outputs are retained under the current task workspace.

- `story-garden-map.webp`: Portrait sunny garden background with a winding sandy path, flowers, river, wooden bridge and distant castle; no UI, text or characters. Prompt: preserve the polished illustrated garden aesthetic of the approved concept and leave the central path clear for lesson markers.
- `story-scene-boy.webp`: Landscape garden/bridge scene with original blue-yellow Papi on the left and a boy in mustard hoodie with green backpack on the right, viewed from behind. Prompt: reproduce the approved concept 3 story composition; leave clear sky for a separately rendered speech bubble, no UI or text.
- `story-scene-girl.webp`: Edit of the boy scene replacing only the student with a girl in the same pose, hoodie and backpack, with brown ponytail; preserve garden, bridge, Papi and camera framing. Prompt: switch the character without changing the scene composition.

Generated assets do not establish exclusivity or legal clearance. Byte hashes and source records appear in `media-rights-manifest.json`.

Production backgrounds are exported as WebP at quality 90 for mobile delivery; original generated PNGs are retained in the task workspace. No composition or UI text is changed during encoding.
