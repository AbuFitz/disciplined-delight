# Personalisation, setup and companion boundaries

The six-step setup is optional and reversible. It records identity/timezone, enabled product areas, explicit faith choice, training goal/experience/days/time/environment/equipment/avoidances, nutrition approach, sleep/work/quiet windows and reminder intensity. No religion is inferred; Muslim prayer tools are off unless explicitly enabled.

The inputs are functional:

- enabled areas determine navigation and Today widgets;
- the plan builder is seeded through `derivePlanDefaults`, converting goal, experience, days, time, environment, kit and movement avoidances into deterministic planner inputs;
- disclosed pain, injury, surgery or clinical restrictions stop automatic generation instead of guessing;
- sleep and work become editable routine blocks; quiet hours and reminder intensity become reminder preferences;
- the review step explains why the starting plan uses its schedule, time cap, equipment filter, avoidances and volume.

The optional companion is disabled by default. Its persisted settings cover name, tone, intervention frequency, celebrations, motion, quiet hours and allowed topics. Its deterministic state machine reads coarse status only (planned/active/completed, offline/sync and empty planning states), never entry text, prayer history, health content, account secrets or workout notes. It is silent when disabled or within quiet hours and CSS motion is suppressed by the device reduced-motion preference.

Optional physiology inputs are deliberately minimal: age band, units, height/weight, activity baseline, current volume, sleep, recovery/energy, movement limitations and a medical safety flag. Sex/gender is not requested because no current calculation needs it. Low sleep/recovery caps a starting plan at three 45-minute sessions; medical flags, disclosed pain/injury and under-18 setup pause automatic generation. This is a conservative product guardrail, not a diagnosis.

Behavior copy follows autonomy (choices and skip), competence (one achievable next action and visible completion), optional relatedness (Community), real temporal/routine cues, actionable goal-linked feedback, explicit prompt frequency/quiet hours and flexible recovery after misses. It does not promise a “21-day” habit, guaranteed just-in-time efficacy or a universally optimal dose.

## Feedback delivery boundary

No support backend is configured. Settings provides a local draft and privacy-previewed JSON export for bug, exercise/media correction, accessibility, account/sync and feature feedback. Diagnostics use an allowlist: app build, route without query text, platform, online state, sync mode and safe-format error IDs. Journal/prayer/health content, passwords, tokens and workout notes cannot enter diagnostics. Screenshot contents are not embedded; only filename/type/size are recorded and the image must be attached separately. Exporting produces a reference but does not promise delivery or a response.
