import type { Metadata } from "next";
import { PolicyPage } from "../../components/policy/PolicyDocument";
import { fetchSiteDocument } from "../../lib/site-documents";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Truss公式アプリ",
  description: "神戸大学留学生支援サークル Truss のプライバシーポリシーです。",
};

export default async function PrivacyPolicyPage() {
  // 正本は DB（運営画面から改定可能）。無ければアプリ内蔵の既定文面
  const { content, updatedAt } = await fetchSiteDocument("privacy-policy");
  return (
    <PolicyPage
      title="プライバシーポリシー"
      intro="本ポリシーは、本サービス利用に伴う個人情報の取扱いについて定めるものです。"
      content={content}
      updatedAt={updatedAt}
    />
  );
}
