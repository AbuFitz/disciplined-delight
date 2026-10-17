import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Chip, ConfirmDialog, Segmented, Sheet, Switch } from "./ui";
import { SYNC_LABEL, useSyncStatus } from "@/data/sync-status";
import {
  applyBackup,
  backupFilename,
  buildBackup,
  downloadText,
  eraseCollections,
  ERASE_GROUPS,
  previewBackup,
  undoErase,
} from "@/data/backup";
import { listRecords, outboxCount } from "@/data/db";
import { LEGACY_KEYS } from "@/data/legacy";
import { parseBackup, type Backup, type ImportMode, type ImportPreview } from "@/domain/backup";

export function DataSection() {
  const sync = useSyncStatus();
  const file = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [safety, setSafety] = useState(true);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string | null>(null);
  const [erase, setErase] = useState<keyof typeof ERASE_GROUPS | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB used`);
    });
    void outboxCount().then(setPending);
  }, []);
  useEffect(() => {
    if (backup) void previewBackup(backup, mode).then(setPreview);
  }, [backup, mode]);

  const exportNow = async () => {
    downloadText(backupFilename(), JSON.stringify(await buildBackup(), null, 2));
    toast.success("Backup downloaded. Keep it somewhere safe.");
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const res = parseBackup(await f.text());
    if (!res.ok) return void toast.error(res.error);
    setBackup(res.backup);
  };

  const apply = async () => {
    if (!backup) return;
    if (safety)
      downloadText(
        `vayvor-before-import-${Date.now()}.json`,
        JSON.stringify(await buildBackup(), null, 2),
      );
    const r = await applyBackup(backup, mode);
    toast.success(
      `Imported ${r.written} records${r.skipped ? `, kept ${r.skipped} you already had` : ""}`,
    );
    setBackup(null);
  };

  const legacyRaw = async () => {
    const recs = await listRecords<{ key: string; raw: string }>("legacyRaw");
    if (recs.length === 0) return void toast("No original-app data was found on this device.");
    downloadText(
      `vayvor-original-app-data.json`,
      JSON.stringify(
        Object.fromEntries(recs.map((r) => [r.data.key, JSON.parse(r.data.raw)])),
        null,
        2,
      ),
    );
  };

  return (
    <>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            tone={sync.mode === "attention" ? "warn" : sync.mode === "synced" ? "ok" : "neutral"}
          >
            {SYNC_LABEL[sync.mode]}
          </Chip>
          <span className="text-sm text-muted-foreground">
            {sync.mode === "local"
              ? "Everything is saved in this browser only. It is not a backup."
              : sync.detail}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Browser storage can be cleared or evicted. Export a backup file regularly.{" "}
          {usage ? `${usage}. ` : ""}
          {pending > 0 ? `${pending} changes are queued for sync.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportNow}>
            Export backup
          </Button>
          <Button variant="secondary" onClick={() => file.current?.click()}>
            Import backup…
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Choose a backup file"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Backups include your programme, meals, ingredients, prices, settings, schedule and all
          logs. Photos aren't supported yet, so none are included.
        </p>

        <div className="border-t border-line pt-4">
          <p className="font-medium">Keep this device's storage</p>
          <p className="text-sm text-muted-foreground">
            {persisted === null
              ? "Your browser doesn't report storage protection."
              : persisted
                ? "Protected: the browser won't clear this data automatically."
                : "Not protected yet. The browser may clear it if space runs low."}
          </p>
          {persisted === false && (
            <Button
              className="mt-2 min-h-11"
              variant="secondary"
              size="sm"
              onClick={async () => {
                const ok = await navigator.storage.persist();
                setPersisted(ok);
                toast(ok ? "Storage protected" : "The browser declined. Export backups instead.");
              }}
            >
              Ask the browser to protect it
            </Button>
          )}
        </div>

        <div className="border-t border-line pt-4">
          <p className="font-medium">Original app data</p>
          <p className="text-sm text-muted-foreground">
            Your original data was copied in without changing it, and the original browser entries (
            {Object.values(LEGACY_KEYS).join(", ")}) are left in place.
          </p>
          <Button className="mt-2 min-h-11" variant="secondary" size="sm" onClick={legacyRaw}>
            Download original data
          </Button>
        </div>

        <div className="border-t border-line pt-4">
          <p className="font-medium">Erase by area</p>
          <p className="text-sm text-muted-foreground">
            Removes records from view. You can undo straight afterwards.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(ERASE_GROUPS) as (keyof typeof ERASE_GROUPS)[]).map((k) => (
              <Button
                key={k}
                className="min-h-11"
                variant="danger"
                size="sm"
                onClick={() => setErase(k)}
              >
                {ERASE_GROUPS[k].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Sheet
        open={!!backup}
        onOpenChange={(o) => !o && setBackup(null)}
        title="Import backup"
        description={
          backup ? `Exported ${new Date(backup.exportedAt).toLocaleString("en-GB")}` : ""
        }
        footer={
          <Button variant="primary" size="lg" className="w-full" onClick={apply}>
            {mode === "merge" ? "Merge into this device" : "Replace this device's data"}
          </Button>
        }
      >
        <div className="grid gap-4 pb-3">
          <Segmented
            label="Import mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "merge", label: "Merge" },
              { value: "replace", label: "Replace" },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {mode === "merge"
              ? "Adds records you don't have. Anything you already have is kept as it is, even if the backup differs."
              : "Replaces the areas in the backup with the backup's versions. Anything you changed since is lost."}
          </p>
          {preview && (
            <>
              <p className="tnum">
                {preview.totals.incoming} records: <strong>{preview.totals.added}</strong> new,{" "}
                {preview.totals.identical} identical, <strong>{preview.totals.conflicting}</strong>{" "}
                differ from yours.
              </p>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-sm">By area</summary>
                <ul className="text-sm tnum">
                  {preview.perCollection.map((p) => (
                    <li
                      key={p.collection}
                      className="flex justify-between border-t border-line py-1.5"
                    >
                      <span>{p.collection}</span>
                      <span>
                        {p.added} new · {p.conflicting} differ
                        {p.replaced ? ` · ${p.replaced} replaced` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          <Switch
            label="Download a copy of my current data first"
            checked={safety}
            onChange={setSafety}
          />
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!erase}
        onOpenChange={(o) => !o && setErase(null)}
        title={`Erase ${erase ? ERASE_GROUPS[erase].label.toLowerCase() : ""}?`}
        body="They disappear from the app. You'll get an Undo for a few seconds. Export a backup first if you might want them later."
        confirmLabel="Erase"
        onConfirm={async () => {
          const g = ERASE_GROUPS[erase!];
          setErase(null);
          const removed = await eraseCollections(g.cols);
          toast(`${removed.length} records erased`, {
            duration: 10000,
            action: {
              label: "Undo",
              onClick: () => {
                void undoErase(removed).then(() => toast.success("Restored"));
              },
            },
          });
        }}
      />
    </>
  );
}
