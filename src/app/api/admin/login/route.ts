import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Verify admin credentials from dedicated table.
  const { data: adminAccount, error: adminAccountError } = await adminClient
    .from("admin_accounts")
    .select("email,password_hash,display_name,is_active")
    .eq("email", email)
    .single();

  if (adminAccountError || !adminAccount || !adminAccount.is_active) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordMatched = await bcrypt.compare(password, adminAccount.password_hash as string);
  if (!passwordMatched) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // 2) Ensure a Supabase Auth user exists and is login-capable with this credential.
  const { data: usersData, error: listUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listUsersError) {
    return NextResponse.json({ error: "Failed to inspect auth users" }, { status: 500 });
  }

  const existingAuthUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  let authUserId = existingAuthUser?.id;

  if (existingAuthUser) {
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (updateAuthError) {
      return NextResponse.json({ error: "Failed to sync auth user" }, { status: 500 });
    }
  } else {
    const { data: createdAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });
    if (createAuthError || !createdAuthUser.user?.id) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
    }
    authUserId = createdAuthUser.user.id;
  }

  if (!authUserId) {
    return NextResponse.json({ error: "Failed to resolve auth user" }, { status: 500 });
  }

  // 3) Ensure users row exists for RLS checks.
  const displayName = (adminAccount.display_name as string) || "Admin";
  const { error: upsertUserError } = await adminClient.from("users").upsert(
    {
      auth_id: authUserId,
      email,
      name: displayName,
      nickname: displayName,
      furigana: displayName,
      birthday: null,
      languages: ["日本語", "English"],
      country: "Japan",
      category: "japanese",
      approved: true,
      is_admin: true,
      registration_step: "fully_active",
      email_verified: true,
      initial_registered: true,
      profile_completed: true,
      fee_paid: true,
    },
    { onConflict: "auth_id" }
  );
  if (upsertUserError) {
    return NextResponse.json({ error: "Failed to sync users row" }, { status: 500 });
  }

  // 4) Create normal auth tokens for the browser client.
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!authRes.ok) {
    return NextResponse.json({ error: "Failed to create auth token" }, { status: 500 });
  }

  const authData = (await authRes.json()) as {
    access_token: string;
    refresh_token: string;
  };

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

