import { Check, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInstall } from "@/lib/pwa";
import { Button, Chip } from "./ui";

export function InstallSection() {
  const install = useInstall();
  const [busy, setBusy] = useState(false);

  if (install.standalone) {
    return (
      <div className="grid gap-2">
        <Chip tone="ok">
          <Check className="size-3.5" aria-hidden />
          Installed on this device
        </Chip>
        <p className="text-sm text-muted-foreground">
          VAYVOR opens in its own window and keeps the app shell available offline.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Add VAYVOR to this device for a full-screen app icon and quicker access. Your guest data
        still stays in this browser.
      </p>
      {install.canPrompt ? (
        <div>
          <Button
            variant="primary"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const outcome = await install.prompt();
                if (outcome === "dismissed")
                  toast("Installation cancelled. You can try again later.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download className="size-4" aria-hidden />
            Install VAYVOR
          </Button>
        </div>
      ) : install.ios ? (
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          <li>Open the browser's Share menu.</li>
          <li>Choose “Add to Home Screen”.</li>
          <li>Tap “Add”, then open VAYVOR from its new icon.</li>
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          If your browser supports app installation, open its menu and choose “Install app” or “Add
          to Home screen”.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {install.offlineReady
          ? "Offline shell ready on this device. Features that fetch live data still need a connection."
          : install.registered
            ? "Preparing offline access. Keep this page open for a moment."
            : "Offline access becomes ready after the first successful production load."}
      </p>
    </div>
  );
}
