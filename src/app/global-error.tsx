"use client";

/*
 * The last resort: an error thrown in the root layout itself, where no other
 * boundary exists yet. It has to render its own <html> and <body>, and cannot
 * use anything from the app's component tree because the tree is what failed.
 *
 * Deliberately styleless beyond inline CSS — a global error that depends on a
 * stylesheet loading is a global error that renders as unstyled text.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          textAlign: "center",
          background: "#fafafe",
          color: "#0f1030",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 320 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cheeku AI couldn&apos;t start</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6b6c8a", marginTop: 8 }}>
            Something went wrong loading the app. Your records are safe and untouched.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              height: 48,
              width: "100%",
              borderRadius: 999,
              border: 0,
              background: "#4a2ade",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
