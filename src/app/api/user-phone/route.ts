import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/user-phone?email=<email>
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ phone: null });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_phones")
    .select("phone")
    .eq("email", email)
    .single();

  return NextResponse.json({ phone: data?.phone ?? null });
}

// POST /api/user-phone  { email, phone }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, phone } = await req.json();
  if (!email || !phone) {
    return NextResponse.json({ error: "email and phone required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_phones")
    .upsert({ email, phone, updated_at: new Date().toISOString() }, { onConflict: "email" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
