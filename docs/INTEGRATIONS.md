# Optional integrations

VAYVOR treats every external provider as optional. The code reports what each one would need
(`src/domain/integrations.ts`, shown in Settings > Training > Connections) and never presents a
provider as connected unless a real adapter and credentials exist. **No provider adapter ships
in this build**, so nothing here is connected.

| Provider | Today | To make it real |
| --- | --- | --- |
| Spotify | Saved playlist link opens in Spotify from Gym Mode. | Register a Spotify app, set `VITE_SPOTIFY_CLIENT_ID`, implement PKCE auth and a playback adapter behind the provider interface, ask for consent in-app. |
| Apple Music | Saved playlist link opens in Apple Music. | Apple developer account, set `VITE_APPLE_MUSIC_DEVELOPER_TOKEN`, add a MusicKit adapter, ask for consent. |
| Wearables / health | Not available. Apple Health and Health Connect cannot be read from a web app. | Native wrapper with HealthKit / Health Connect entitlements and per-data-type consent. |
| Location | Optional foreground check from Gym settings, after a direct tap. | Background arrival needs native geofencing and "always" location permission. |
| Notifications | Local reminders while the app is open or installed. | Closed-app delivery needs `VITE_VAPID_PUBLIC_KEY` and a server-side push sender (server key never in the client). |

## Boundaries

- Missing secrets are named, never read or displayed.
- Permission prompts only follow a direct user action.
- Denied, unsupported and offline states have their own plain-language copy (`STATUS_COPY`).
- Provider status is computed from facts (`Facts`), so it is unit-tested without a browser.
