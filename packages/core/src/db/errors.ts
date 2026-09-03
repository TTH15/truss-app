/**
 * Supabase(PostgREST)のエラーを、画面で具体的に説明できる形に保つためのユーティリティ。
 *
 * これまで各 mutation は `new Error(error.message)` に潰していたため、
 * 「権限が無い」「制約違反」「関数が未適用」「通信断」がすべて同じ *失敗しました* になり、
 * 運営が自分の操作ミスなのかシステム側の問題なのか判断できなかった。
 * PostgREST が返す code / details / hint を落とさずに持ち回る。
 */

/** PostgREST / PostgreSQL のエラー詳細を保持する Error */
export class DbError extends Error {
  /** PostgreSQL の SQLSTATE（例: 23505 = 一意制約違反）または PostgREST の独自コード（例: PGRST202） */
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(message: string, meta: { code?: string | null; details?: string | null; hint?: string | null } = {}) {
    super(message);
    this.name = "DbError";
    this.code = meta.code ?? null;
    this.details = meta.details ?? null;
    this.hint = meta.hint ?? null;
  }

  /** ログ・トースト末尾に出す一行（例: `Only admins can transfer roles (P0001)`） */
  get debugLine(): string {
    return this.code ? `${this.message} (${this.code})` : this.message;
  }
}

export interface RawDbError {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

export function toDbErrorOrNull(error: RawDbError | null | undefined): DbError | null {
  if (!error) return null;
  return new DbError(error.message, error);
}

/**
 * 役職の変更・引き継ぎが失敗した理由。
 * 画面はこの値で文言を選ぶ（文言そのものは言語ごとに画面側が持つ）。
 */
export type RoleChangeFailureReason =
  /** ログインが切れている（JWT 期限切れ等） */
  | "not-signed-in"
  /** ログインはしているが運営権限として認識されていない */
  | "not-admin"
  /** その役職の現職本人ではない（引き継ぎは現職しか実行できない。migration 047） */
  | "not-role-holder"
  /** RLS などで DB 側から拒否された */
  | "forbidden"
  /** transfer_role が DB に無い（マイグレーション未適用） */
  | "function-missing"
  /** 同じ役職の保持者が他にも残っている（1人制約に衝突） */
  | "duplicate-holder"
  /** 役職の値が許可されていない */
  | "invalid-role"
  /** 通信できなかった */
  | "network"
  /** 上記のどれでもない */
  | "unknown";

function haystack(error: DbError | Error): string {
  const e = error as Partial<DbError>;
  return [error.message, e.details ?? "", e.hint ?? ""].join(" ").toLowerCase();
}

/**
 * Supabase のエラーから原因を推定する。
 * 判定材料は transfer_role / enforce_role_change_by_admin（migration 032・043）が投げる
 * メッセージと、PostgreSQL の SQLSTATE。
 */
export function classifyRoleChangeError(error: DbError | Error): RoleChangeFailureReason {
  const code = (error as Partial<DbError>).code ?? null;
  const text = haystack(error);

  // supabase-js は通信失敗も PostgrestError の形（code は空文字）で返す
  if (text.includes("failed to fetch") || text.includes("networkerror") || text.includes("network request failed")) {
    return "network";
  }

  switch (code) {
    case "PGRST202":
      return "function-missing";
    case "PGRST301":
    case "401":
      return "not-signed-in";
    case "42501":
      return "forbidden";
    case "23505":
      return "duplicate-holder";
    case "23514":
      return "invalid-role";
    default:
      break;
  }

  // RAISE EXCEPTION は SQLSTATE P0001 で来るため、本文で見分ける
  if (text.includes("only the current holder")) return "not-role-holder";
  if (text.includes("only admins")) return "not-admin";
  if (text.includes("jwt") && (text.includes("expired") || text.includes("invalid"))) return "not-signed-in";
  if (text.includes("could not find the function")) return "function-missing";
  if (text.includes("row-level security") || text.includes("permission denied")) return "forbidden";
  if (text.includes("duplicate key")) return "duplicate-holder";
  if (text.includes("supports president") || text.includes("predecessor new role") || text.includes("violates check constraint")) {
    return "invalid-role";
  }
  return "unknown";
}
