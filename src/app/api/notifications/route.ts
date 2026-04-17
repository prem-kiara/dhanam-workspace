import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${session.user.id},recipient_email.eq.${session.user.email}`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const supabase = createAdminClient();

  if (id) {
    // Mark single notification read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .or(`user_id.eq.${session.user.id},recipient_email.eq.${session.user.email}`);
    return NextResponse.json({ ok: true });
  }

  // markAllRead
  const body = await req.json().catch(() => ({}));
  if (body.markAllRead) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .or(`user_id.eq.${session.user.id},recipient_email.eq.${session.user.email}`)
      .eq("read", false);
    return NextResponse.json({ ok: true });
  }

  // Legacy: ids array
  const { ids } = body;
  let query = supabase
    .from("notifications")
    .update({ read: true })
    .or(`user_id.eq.${session.user.id},recipient_email.eq.${session.user.email}`);
  if (Array.isArray(ids)) query = query.in("id", ids);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
