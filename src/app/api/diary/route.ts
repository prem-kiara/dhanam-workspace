import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CreateDiaryEntryPayload } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const tag    = searchParams.get("tag");
  const limit  = parseInt(searchParams.get("limit") ?? "50");

  let query = supabase
    .from("diary_entries")
    .select("*, author:profiles(id, name, initials, color, avatar_url, email, phone, created_at)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tag && tag !== "All") query = query.eq("tag", tag);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateDiaryEntryPayload = await req.json();
  if (!body.content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diary_entries")
    .insert({ ...body, author_id: session.user.id })
    .select("*, author:profiles(id, name, initials, color, avatar_url, email, phone, created_at)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
