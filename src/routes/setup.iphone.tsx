import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/setup/iphone")({
  component: IphoneSetup,
});

const steps = [
  "Tap the Share button. It is the square with an arrow, in the bar at the bottom of the screen.",
  "Scroll the share sheet and tap Add to Home Screen.",
  "Tap Add. Fieldline now has an icon on your home screen.",
  "Leave Safari. Open Fieldline by tapping that new icon.",
  "Sign in, open Account, and tap Turn on alerts. When the phone asks, allow notifications.",
];

function IphoneSetup() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-8">
      <Link to="/" className="text-sm text-accent">
        Back to Fieldline
      </Link>
      <h1 className="mt-4 font-display text-4xl tracking-wide">How to set up iPhone</h1>
      <p className="mt-3 text-sm text-muted">
        Alerts only arrive when Fieldline is closed if you open it from the home screen icon and allow notifications.
      </p>
      <ol className="mt-6 space-y-4">
        <li className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <span className="font-display text-2xl leading-none text-accent">1</span>
          <p className="text-sm">
            Open this address in Safari. Do this from Safari itself, not from inside another app.
            {url && (
              <>
                {" "}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent">
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
      <a href="/?install=1&platform=ios" className="mt-6 block text-sm text-accent">
        Open the picture guide
      </a>
    </main>
  );
}
