// Plain HTML string helpers — no React, no react-dom/server

export function baseEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);padding:24px 32px;">
    <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
      Dhanam <span style="font-weight:300;opacity:0.85;">Workspace</span>
    </span>
  </div>
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      ${bodyHtml}
    </div>
    <div style="text-align:center;margin-top:24px;color:#94a3b8;font-size:12px;line-height:1.6;">
      <p>Dhanam Investment and Finance Private Limited</p>
      <p>Coimbatore, Tamil Nadu, India</p>
      <p style="margin-top:8px;">You're receiving this because you are a member of Dhanam Workspace.</p>
    </div>
  </div>
</body>
</html>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">${esc(label)}</a>`;
}

export function heading(text: string): string {
  return `<h2 style="color:#1e293b;font-size:20px;font-weight:700;margin:0 0 16px;">${esc(text)}</h2>`;
}

export function para(text: string): string {
  return `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px;">${esc(text)}</p>`;
}

export function taskInfo(label: string, value: string): string {
  return `<div style="border-left:3px solid #7c3aed;padding-left:12px;margin:8px 0;">
    <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${esc(label)}</span>
    <div style="font-size:14px;color:#334155;font-weight:500;margin-top:2px;">${esc(value)}</div>
  </div>`;
}

/** Escape HTML entities to prevent injection */
export function esc(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
