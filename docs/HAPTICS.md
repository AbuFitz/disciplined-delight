# Haptics

Policy lives in `src/domain/haptics.ts` (pure, tested); the adapter in `src/lib/haptics.ts`.

## Rules

- Off by default. One explicit opt-in (Buddy setup or Gym Mode), **independent of reduced motion**.
- Only acknowledgements of the person's own actions and key moments vibrate:
  `acknowledge`, `set_logged`, `rest_finished`, `personal_best`, `warning`. Passive coaching never does.
- Mute and quiet hours silence everything except `warning`.
- Web: `navigator.vibrate` only after a user interaction. **iOS Safari does not support it**, so the
  adapter reports capability `none` and the visual (and optional sound) feedback is all that happens.
- Patterns are short: set 18 ms; rest finished 30-60-30; personal best 20-50-20-50-70; warning 60-50-60.

## Native wrapper hook (not implemented here)

A future iOS/Android wrapper calls `registerNativeHaptics({ play(kind, pattern) { ... } })` once at
startup. Map kinds to platform feedback: iOS `UIImpactFeedbackGenerator` (light for `set_logged`,
`UINotificationFeedbackGenerator` success for `personal_best` / `rest_finished`, warning for `warning`);
Android `VibrationEffect.createPredefined` or `createWaveform` with the supplied pattern. The policy
still runs in the web layer, so settings, mute and quiet hours behave identically.
