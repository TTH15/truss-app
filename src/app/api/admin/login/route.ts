import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

type LoginBody = {
  email?: string;
  password?: string;
};

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  user?: { id?: string };
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

  // 1) Verify admin credentials against dedicated table.
  let adminAccount: any = null;
  try {
    const { data, error } = await adminClient
      .from("admin_accounts")
      .select("email,password_hash,display_name,is_active")
      .eq("email", email)
      .maybeSingle();
    adminAccount = data;
    if (error) throw error;
  } catch (e) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!adminAccount || !adminAccount.is_active) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordMatched = await bcrypt.compare(
    password,
    adminAccount.password_hash as string
  );
  if (!passwordMatched) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const createAuthTokens = async () => {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) return { ok: false as const, error: `Auth token failed: ${authRes.status}` };

    const authData = (await authRes.json()) as AuthTokenResponse;
    if (!authData.access_token || !authData.refresh_token) {
      return { ok: false as const, error: "Auth token response missing fields" };
    }

    // Token response might not include user.id. Resolve by email using admin API.
    let authUserId = authData.user?.id;
    if (!authUserId) {
      try {
        // supabase-js v2: auth.admin.getUserByEmail
        const res = await (adminClient.auth.admin as any).getUserByEmail(email);
        authUserId = res?.data?.user?.id ?? res?.data?.user?.uid ?? res?.data?.id;
      } catch {
        // fallback to listUsers (slower but reliable)
        const adminUsers = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = (adminUsers as any)?.data?.users?.find(
          (u: any) => (u?.email ?? "").toLowerCase() === email.toLowerCase()
        );
        authUserId = match?.id ?? match?.uid;
      }
    }

    if (!authUserId) return { ok: false as const, error: "Failed to resolve auth user id" };

    return {
      ok: true as const,
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token,
      authUserId,
    };
  };

  // 2) Try to obtain auth tokens first (fast path).
  let tokenAttempt = await createAuthTokens();
  if (!tokenAttempt.ok) {
    // 3) If auth user/password is not set up in Supabase yet, create or update it, then retry once.
    const adminUsersResponse = await adminClient.auth.admin
      .listUsers({ page: 1, perPage: 1000 })
      .catch(() => null);
    const users = (adminUsersResponse?.data?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const existing = users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
    );

    if (!existing) {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });

      if (createUserError) {
        return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
      }

      if (!createdUser.user?.id) {
        return NextResponse.json({ error: "Failed to resolve created auth user" }, { status: 500 });
      }
    } else {
      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });
      if (updateUserError) {
        return NextResponse.json({ error: "Failed to update auth user password" }, { status: 500 });
      }
    }

    const retry = await createAuthTokens();
    if (!retry.ok) {
      return NextResponse.json({ error: retry.error }, { status: 401 });
    }

    tokenAttempt = retry;
  }

  if (!tokenAttempt.ok) {
    return NextResponse.json({ error: "Auth token preparation failed" }, { status: 401 });
  }

  const accessToken = tokenAttempt.accessToken;
  const refreshToken = tokenAttempt.refreshToken;
  const authUserId = tokenAttempt.authUserId;

  // 4) Ensure `public.users` row exists for RLS.
  const displayName =
    (adminAccount.display_name as string | null | undefined) ?? "Admin";

  const upsertPayload = {
    auth_id: authUserId,
    email,
    name: displayName,
    nickname: displayName,
    furigana: displayName,
    birthday: null as string | null,
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
  };

  const { error: upsertUserError } = await adminClient
    .from("users")
    .upsert(upsertPayload, { onConflict: "auth_id" });

  if (upsertUserError) {
    return NextResponse.json({ error: "Failed to sync users row" }, { status: 500 });
  }

  // 5) Return user row for client-side `User` mapping.
  let dbUser: any = null;
  try {
    const { data, error } = await adminClient
      .from("users")
      .select(
        "id,email,name,nickname,furigana,birthday,languages,country,category,approved,is_admin,registration_step,email_verified,initial_registered,profile_completed,fee_paid"
      )
      .eq("auth_id", authUserId)
      .maybeSingle();
    dbUser = data;
    if (error) throw error;
  } catch (e) {
    return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
  }

  if (!dbUser || !dbUser.is_admin) {
    return NextResponse.json({ error: "Admin permission required" }, { status: 403 });
  }

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: dbUser,
  });
}

export async function GET() {
  // 誤ってブラウザで開かれた場合でも原因が分かるようにする
  return NextResponse.json({ error: "Use POST /api/admin/login" }, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

