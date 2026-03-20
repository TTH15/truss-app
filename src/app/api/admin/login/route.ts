import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as LoginBody;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Supabase env is not configured" }, { status: 500 });
  }

  // 1) Auth credentials on server side.
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!authRes.ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const authData = (await authRes.json()) as {
    access_token: string;
    refresh_token: string;
    user?: { id: string };
  };

  const authUserId = authData.user?.id;
  if (!authUserId) {
    return NextResponse.json({ error: "Failed to resolve auth user" }, { status: 401 });
  }

  // 2) Check admin permission on server side.
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: dbUser, error: userError } = await adminClient
    .from("users")
    .select(
      "id,email,name,nickname,furigana,birthday,languages,country,category,approved,is_admin,registration_step,email_verified,initial_registered,profile_completed,fee_paid"
    )
    .eq("auth_id", authUserId)
    .single();

  if (userError || !dbUser || !dbUser.is_admin) {
    return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
  }

  return NextResponse.json({
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token,
    user: dbUser,
  });
}

