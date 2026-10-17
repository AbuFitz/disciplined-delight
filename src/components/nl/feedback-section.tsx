import { Download, MessageSquareWarning } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Select, Switch, TextArea, TextInput } from "./ui";
import { useSyncStatus } from "@/data/sync-status";
import {
  FEEDBACK_CATEGORIES,
  feedbackReference,
  safeDiagnostics,
  validateFeedback,
  type FeedbackCategory,
  type FeedbackPayload,
} from "@/domain/feedback";

const labels: Record<FeedbackCategory, string> = {
  bug: "Bug",
  exercise_media: "Exercise, content or media correction",
  accessibility: "Accessibility",
  account_sync: "Account or sync",
  feature: "Feature idea",
};
const DRAFT_KEY = "vayvor:feedback-draft:v1";

export function FeedbackSection() {
  const sync = useSyncStatus();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [diagnostics, setDiagnostics] = useState(false);
  const [embedShot, setEmbedShot] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const diagnosticPreview = useMemo(
    () =>
      safeDiagnostics({
        appVersion: import.meta.env.VITE_APP_VERSION ?? "development",
        route: typeof location === "undefined" ? "/settings" : location.pathname,
        platform: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
        online: typeof navigator === "undefined" ? true : navigator.onLine,
        syncMode: sync.mode,
        errorIds: sync.detail?.match(/[A-Z][A-Z0-9_-]{2,63}/g) ?? [],
      }),
    [sync],
  );

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as {
        category?: FeedbackCategory;
        description?: string;
        email?: string;
      } | null;
      if (draft) {
        if (draft.category && FEEDBACK_CATEGORIES.includes(draft.category))
          setCategory(draft.category);
        setDescription(draft.description ?? "");
        setEmail(draft.email ?? "");
      }
    } catch {
      /* Corrupt drafts are ignored. */
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ category, description, email }));
      } catch {
        /* Storage can be unavailable. */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [category, description, email]);

  const readShot = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  const exportReport = async () => {
    const base = {
      category,
      description: description.trim(),
      contactEmail: email.trim() || undefined,
      screenshot: screenshot
        ? { name: screenshot.name, type: screenshot.type, size: screenshot.size }
        : undefined,
      diagnostics: diagnostics ? diagnosticPreview : undefined,
    };
    const errors = validateFeedback(base);
    if (errors.length) return toast.error(errors[0]);
    const ref = feedbackReference();
    let screenshotData: string | undefined;
    if (screenshot && embedShot) {
      if (screenshot.size > 2 * 1024 * 1024)
        return toast.error(
          "Embedded screenshots must be under 2 MB. Attach it separately instead.",
        );
      try {
        screenshotData = await readShot(screenshot);
      } catch {
        return toast.error("Couldn't read that image. Attach it separately instead.");
      }
    }
    const payload: FeedbackPayload = {
      ...base,
      screenshotData,
      reference: ref,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${ref}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReference(ref);
    localStorage.removeItem(DRAFT_KEY);
    setDescription("");
    setScreenshot(null);
  };

  return (
    <div id="feedback" className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        There is no support backend connected in this build. Your draft saves on this device as you
        type, even offline. Exporting creates a file you can attach when contacting the product
        owner. Nothing is sent from VAYVOR, and screenshots or diagnostics are only included if you
        tick them.
      </p>
      <Field label="Category">
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
        >
          {FEEDBACK_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {labels[item]}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="What happened?"
        hint="Include what you expected, what happened and how to reproduce it."
      >
        <TextArea
          className="min-h-32"
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Contact email (optional)">
        <TextInput
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field
        label="Screenshot (optional)"
        hint="Image only, up to 10 MB. The export records its filename; attach the image separately."
      >
        <TextInput
          type="file"
          accept="image/*"
          onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
        />
      </Field>
      {screenshot && (
        <Switch
          label="Embed this screenshot in the file"
          hint="Off unless you choose it. Otherwise the file records only its name and you attach the image yourself."
          checked={embedShot}
          onChange={setEmbedShot}
        />
      )}
      <Switch
        label="Include privacy-safe diagnostics in the file"
        hint="Off unless you choose it. App build, route (without query text), platform, online state, sync status and safe error IDs only. Preview before exporting."
        checked={diagnostics}
        onChange={setDiagnostics}
      />
      {diagnostics && (
        <details className="rounded-2xl border border-line p-4 text-xs">
          <summary className="cursor-pointer font-semibold">Preview diagnostics</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(diagnosticPreview, null, 2)}
          </pre>
        </details>
      )}
      <Button variant="primary" onClick={() => void exportReport()}>
        <Download className="size-4" /> Export feedback report
      </Button>
      {reference && (
        <div role="status" className="rounded-2xl bg-ok/10 p-4 text-sm">
          <p className="font-semibold">Report prepared · {reference}</p>
          <p className="mt-1 text-muted-foreground">
            Keep this reference with the exported file. No response is guaranteed until a support
            channel is connected.
          </p>
        </div>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
        Never include passwords, access tokens, journal or prayer entries, health details, or
        private workout notes.
      </p>
    </div>
  );
}
