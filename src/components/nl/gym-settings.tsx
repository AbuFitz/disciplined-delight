import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Field, NumberField, Select, Switch, TextInput } from "./ui";
import { saveProfile } from "@/data/actions";
import { newId, put, remove } from "@/data/db";
import { useCollection, useProfile } from "@/data/hooks";
import { COL, type GymLocation } from "@/data/types";
import { nearbyGym, validateMusicUrl } from "@/domain/gym-mode";
import { VIcon } from "./icon";

export function GymSettings() {
  const { profile } = useProfile();
  const locations = useCollection<GymLocation>(COL.gymLocations);
  const [music, setMusic] = useState(profile?.trainingMusic?.url ?? "");
  const [provider, setProvider] = useState<"spotify" | "apple">(
    profile?.trainingMusic?.provider ?? "spotify",
  );
  const [name, setName] = useState("My gym");
  const [radius, setRadius] = useState(150);
  const [deleteTarget, setDeleteTarget] = useState<GymLocation | null>(null);
  const [arrival, setArrival] = useState("");
  useEffect(() => setMusic(profile?.trainingMusic?.url ?? ""), [profile?.trainingMusic?.url]);
  useEffect(() => {
    if (profile?.trainingMusic?.provider) setProvider(profile.trainingMusic.provider);
  }, [profile?.trainingMusic?.provider]);
  if (!profile) return null;
  const prefs = profile.gymMode ?? {
    voice: false,
    haptics: false,
    autoMedia: false,
    livePulse: false,
  };
  const update = (patch: Partial<typeof prefs>) => saveProfile({ gymMode: { ...prefs, ...patch } });
  const addCurrent = () => {
    if (!("geolocation" in navigator))
      return toast.error("Location is not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const item: GymLocation = {
          id: newId(),
          name: name.trim() || "My gym",
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusM: radius,
          enabled: true,
          createdAt: Date.now(),
        };
        await put(COL.gymLocations, item.id, item);
        toast.success("Gym location saved on this device");
      },
      () => toast.error("Location was not available. Nothing was saved."),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };
  const checkArrival = () => {
    if (!("geolocation" in navigator)) return setArrival("Location is not supported here.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const gym = nearbyGym(coords, locations.items);
        setArrival(
          gym
            ? `You appear to be within ${gym.radiusM} m of ${gym.name}. Gym Mode is available from an active workout.`
            : "You are not inside an enabled saved gym radius.",
        );
      },
      () => setArrival("Location permission was denied or unavailable. No location was retained."),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2">
        <Switch
          label="Voice rest announcements"
          checked={prefs.voice}
          onChange={(voice) => void update({ voice })}
        />
        <Switch
          label="Haptic set cues"
          hint="Short ticks for a logged set and a finished rest. Works on Android Chrome and native wrappers. iOS Safari can't vibrate, so you'll see the visual cue instead."
          checked={prefs.haptics}
          onChange={(haptics) => void update({ haptics })}
        />
        <Switch
          label="Show form media at transitions"
          checked={prefs.autoMedia}
          onChange={(autoMedia) => void update({ autoMedia })}
        />
        <Switch
          label="Opt in to anonymous Live Pulse"
          checked={!!prefs.livePulse}
          onChange={(livePulse) => void update({ livePulse })}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Voice, vibration and wake lock work only where the browser exposes them. Live Pulse never
        sends a name, detailed session or location; realtime aggregate counts remain unavailable
        until the authenticated presence backend is configured.
      </p>
      <div className="border-t border-line pt-5">
        <p className="font-semibold">Workout music launcher</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Opens your playlist in its provider. VAYVOR does not claim embedded playback or controls.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[10rem_1fr_auto]">
          <Select
            aria-label="Music provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as "spotify" | "apple")}
          >
            <option value="spotify">Spotify</option>
            <option value="apple">Apple Music</option>
          </Select>
          <TextInput
            aria-label="Playlist URL"
            value={music}
            onChange={(event) => setMusic(event.target.value)}
            placeholder={
              provider === "spotify"
                ? "https://open.spotify.com/playlist/…"
                : "https://music.apple.com/…/playlist/…"
            }
          />
          <Button
            onClick={async () => {
              const valid = validateMusicUrl(music);
              if (!valid || valid.provider !== provider)
                return toast.error("Use a valid playlist URL for the selected provider.");
              await saveProfile({ trainingMusic: valid });
              toast.success("Playlist linked");
            }}
          >
            <VIcon name={provider === "spotify" ? "spotify" : "appleMusic"} size={16} />
            Link
          </Button>
        </div>
        {profile.trainingMusic && (
          <Button
            className="mt-2"
            size="sm"
            variant="ghost"
            onClick={async () => {
              await saveProfile({ trainingMusic: undefined });
              setMusic("");
              toast.success("Playlist unlinked");
            }}
          >
            Unlink playlist
          </Button>
        )}
      </div>
      <div className="border-t border-line pt-5">
        <p className="font-semibold">Gym locations · foreground only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Coordinates stay in your private local/sync data. VAYVOR checks only when you tap. Web
          apps cannot provide reliable background geofencing or auto-launch.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_11rem_auto]">
          <Field label="Name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Arrival radius">
            <NumberField
              label="Arrival radius"
              value={radius}
              onChange={(value) => setRadius(Math.max(50, Math.min(1000, value ?? 150)))}
              unit="m"
              step={25}
              decimals={0}
            />
          </Field>
          <Button className="self-end" onClick={addCurrent}>
            Use current location
          </Button>
        </div>
        <ul className="mt-3">
          {locations.items.map((gym) => (
            <li
              key={gym.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3"
            >
              <div>
                <p className="font-medium">{gym.name}</p>
                <p className="num text-xs text-muted-foreground">
                  {gym.latitude.toFixed(4)}, {gym.longitude.toFixed(4)} · {gym.radiusM} m
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  label={`${gym.name} enabled`}
                  checked={gym.enabled}
                  onChange={(enabled) => void put(COL.gymLocations, gym.id, { ...gym, enabled })}
                />
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(gym)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button className="mt-3" size="sm" variant="secondary" onClick={checkArrival}>
          Check where I am now
        </Button>
        {arrival && (
          <p className="mt-2 text-sm" aria-live="polite">
            {arrival}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete gym location?"
        body="The saved coordinates and radius will be removed from this device and sync data."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (deleteTarget) await remove(COL.gymLocations, deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
