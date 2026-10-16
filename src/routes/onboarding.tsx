import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/nl/auth-ui";
import { Button, Field, Select, Switch, TextInput } from "@/components/nl/ui";
import { ProfileApiError, profileApi, setReadyProfile } from "@/data/account-profile";
import { saveProfile } from "@/data/actions";
import { useAuth } from "@/lib/auth";
import { checkUsername } from "@/domain/username";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

type Pillar = "body" | "mind" | "soul";
const PILLARS: { id: Pillar; title: string; text: string }[] = [
  { id: "body", title: "Body", text: "Training, food and physical progress." },
  { id: "mind", title: "Mind", text: "Focus, reading and reflection." },
  { id: "soul", title: "Soul", text: "Faith routines and personal reflection." },
];

function timezones(): string[] {
  const sup = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
    .supportedValuesOf;
  const list = sup ? sup("timeZone") : ["Europe/London", "UTC"];
  return list.includes("UTC") ? list : ["UTC", ...list];
}

function OnboardingPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [tz, setTz] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
  );
  const [pillars, setPillars] = useState<Pillar[]>(["body"]);
  const [faith, setFaith] = useState(false);
  const [avail, setAvail] = useState<"idle" | "checking" | "free" | "taken" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zones = useMemo(timezones, []);

  const syntax = checkUsername(username);

  // Availability is a convenience only. The database constraint decides if two people race.
  useEffect(() => {
    if (!username || !syntax.ok) {
      setAvail("idle");
      return;
    }
    setAvail("checking");
    const t = setTimeout(async () => {
      try {
        setAvail((await profileApi.available(username)) ? "free" : "taken");
      } catch {
        setAvail("error");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username, syntax.ok]);

  const toggle = (p: Pillar) =>
    setPillars((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const usernameMsg = username
    ? !syntax.ok
      ? syntax.reason
      : avail === "taken"
        ? "That handle is taken."
        : avail === "error"
          ? "Couldn't check right now. You can still try."
          : undefined
    : undefined;
  const canSave =
    syntax.ok && avail !== "taken" && name.trim().length > 0 && pillars.length > 0 && !busy;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const p = await profileApi.create(username.trim(), name.trim(), tz);
      setReadyProfile(user.id, p);
      const soulOn = pillars.includes("soul") && faith;
      await saveProfile({
        name: name.trim(),
        username: p.username,
        timezone: tz,
        pillars,
        faithRoutines: soulOn,
      });
      toast.success(`Welcome, ${name.trim()}`);
      nav({ to: "/", replace: true });
    } catch (err) {
      const code = err instanceof ProfileApiError ? err.code : "other";
      if (code === "username_taken") {
        setAvail("taken");
        setError("Someone just took that handle. Try another.");
      } else if (code === "profile_exists") nav({ to: "/", replace: true });
      else setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Make it yours"
      intro="Pick a handle friends can find you by. Your email is never shown. You can change everything later and start training right away."
    >
      <form className="grid gap-5" onSubmit={save} noValidate>
        <Field
          label="Handle"
          htmlFor="ob-user"
          hint="3–20 letters, numbers or underscores."
          error={usernameMsg}
        >
          <TextInput
            id="ob-user"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        {avail === "free" && syntax.ok && (
          <p role="status" className="-mt-3 text-sm text-ok">
            @{username} is available.
          </p>
        )}
        <Field label="Display name" htmlFor="ob-name">
          <TextInput
            id="ob-name"
            autoComplete="given-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Timezone"
          hint="Used for your day, prayer times and reminders."
          htmlFor="ob-tz"
        >
          <Select id="ob-tz" value={tz} onChange={(e) => setTz(e.target.value)}>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">What would you like to work on?</legend>
          <p className="mb-2 text-xs text-muted-foreground">
            Choose any. You can add or hide these later.
          </p>
          <div className="grid gap-2">
            {PILLARS.map((p) => {
              const on = pillars.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={on}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-left",
                    on ? "border-primary bg-primary/10" : "border-input",
                  )}
                >
                  <span>
                    <span className="block font-medium">{p.title}</span>
                    <span className="block text-sm text-muted-foreground">{p.text}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-xs",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {on ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {pillars.includes("soul") && (
          <Switch
            label="Include Muslim faith routines"
            hint="Prayer times, reminders and a private prayer log. Off means personal reflection only."
            checked={faith}
            onChange={setFaith}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" busy={busy} disabled={!canSave}>
          Continue
        </Button>
        <p className="text-xs text-muted-foreground">
          Training, food and prayer records stay private unless you choose to share something.
        </p>
      </form>
    </AuthLayout>
  );
}
