import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/org-search?q=<query>
// Proxies MS Graph /users search server-side so the access token is never
// exposed to the browser.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // If we have an MS Graph access token, use the real API
  if (session.accessToken) {
    try {
      const safe    = q.replace(/'/g, "''");
      const encoded = encodeURIComponent(safe);
      const url     = [
        `https://graph.microsoft.com/v1.0/users`,
        `?$filter=startsWith(displayName,'${encoded}') or startsWith(mail,'${encoded}')`,
        `&$select=id,displayName,mail,jobTitle,mobilePhone,businessPhones`,
        `&$top=8`,
      ].join("");

      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data.value ?? []);
      }
      // Fall through to Supabase profiles if Graph fails
    } catch {
      // Fall through
    }
  }

  // Fallback: search profiles in Supabase
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, phone")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(8);

  // Shape to OrgPerson format
  const people = (data ?? []).map((p) => ({
    id:             p.id,
    displayName:    p.name,
    mail:           p.email,
    jobTitle:       null,
    mobilePhone:    p.phone ?? null,
    businessPhones: [],
  }));

  return NextResponse.json(people);
}
