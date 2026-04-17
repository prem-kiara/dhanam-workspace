// Base email wrapper — Dhanam branded

interface BaseEmailProps {
  children: React.ReactNode;
  title:    string;
}

export function BaseEmail({ children, title }: BaseEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f8fafc", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", padding: "24px 32px" }}>
          <span style={{ color: "white", fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" }}>
            Dhanam <span style={{ fontWeight: 300, opacity: 0.85 }}>Workspace</span>
          </span>
        </div>

        {/* Content */}
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "32px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "24px", color: "#94a3b8", fontSize: "12px", lineHeight: "1.6" }}>
            <p>Dhanam Investment and Finance Private Limited</p>
            <p>Coimbatore, Tamil Nadu, India</p>
            <p style={{ marginTop: "8px" }}>
              You&apos;re receiving this because you are a member of Dhanam Workspace.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

// CTA Button
export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display:         "inline-block",
        backgroundColor: "#7c3aed",
        color:           "white",
        padding:         "12px 24px",
        borderRadius:    "10px",
        textDecoration:  "none",
        fontWeight:      "600",
        fontSize:        "14px",
        marginTop:       "20px",
      }}
    >
      {children}
    </a>
  );
}

// Helper text
export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.6", margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: "#1e293b", fontSize: "20px", fontWeight: "700", margin: "0 0 16px" }}>
      {children}
    </h2>
  );
}

export function TaskInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderLeft: "3px solid #7c3aed", paddingLeft: "12px", margin: "8px 0" }}>
      <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600" }}>{label}</span>
      <div style={{ fontSize: "14px", color: "#334155", fontWeight: "500", marginTop: "2px" }}>{value}</div>
    </div>
  );
}
