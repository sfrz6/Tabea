"use client";

/**
 * The last line of defence, used when the root layout itself fails. It carries
 * no translations because the provider above it is what failed, so the wording
 * is deliberately minimal and brand neutral.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f6f7f8",
          color: "#14181c",
          margin: 0,
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.125rem", margin: "0 0 0.5rem" }}>Tabea</h1>
          <p style={{ fontSize: "0.875rem", color: "#5a646e", margin: "0 0 1.25rem" }}>
            The application could not start. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#11625a",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
