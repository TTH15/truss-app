import { redirect } from "next/navigation";

// 旧 URL。プロフィール登録フォームは /profile-setup へ移動した（2026-08-10）。
// 「自分のプロフィール」を期待して開いた人向けにダッシュボードへ送る
export default function LegacyProfileRedirect() {
  redirect("/dashboard");
}
