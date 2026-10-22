import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { installHomeScreen } from "@/lib/push-client";

export const Route = createFileRoute("/setup/android")({
  component: AndroidSetup,
});

const steps = [
  "Tap the three-dot menu in the top corner.",
  "Tap Install app. On some phones it says Add to Home screen.",
  "Confirm. Fieldline now has an icon on your home screen.",
  "Leave the browser tab. Open Fieldline by tapping that new icon.",
  "Sign in, open Account, and tap Turn on alerts. When the phone asks, allow notifications.",
];

function AndroidSetup() {
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-8">
      <Link to="/" className="text-sm text-accent">
        Back to Fieldline
      </Link>
      <h1 className="mt-4 font-display text-4xl tracking-wide">How to set up Android</h1>
      <p className="mt-3 text-sm text-muted">
        Alerts only arrive when Fieldline is closed if you open it from the home screen icon and allow notifications.
      </p>
      <ol className="mt-6 space-y-4">
        <li className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <span className="font-display text-2xl leading-none text-accent">1</span>
          <p className="text-sm">
            Open this address in Chrome.
            {url && (
              <>
                {" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent"
                  onClick={(event) => {
                    if (!/Android/i.test(navigator.userAgent)) return;
                    event.preventDefault();
                    const parsed = new URL(url);
                    const intent = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
                    window.open(intent, "_blank", "noopener,noreferrer");
                  }}
                >
                  CLICK HERE TO OPEN
                </a>
              </>
            )}
          </p>
        </li>
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <span className="font-display text-2xl leading-none text-accent">{index + 2}</span>
            <p className="text-sm">{step}</p>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        className="mt-6"
        onClick={() => {
          void installHomeScreen().then((added) => {
            setNote(
              added
                ? "Installed. Open Fieldline from the new icon, then tap Turn on alerts."
                : "If no install window opened, use the Chrome menu and tap Install app.",
            );
          });
        }}
      >
        Add to home screen
      </Button>
      {note && <p className="mt-3 text-sm text-muted">{note}</p>}
    </main>
  );
}
