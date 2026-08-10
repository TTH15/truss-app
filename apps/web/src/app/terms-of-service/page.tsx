import type { Metadata } from "next";
import { PolicyPage } from "../../components/policy/PolicyDocument";
import { fetchSiteDocumentContent } from "../../lib/site-documents";

export const metadata: Metadata = {
  title: "利用規約 | Truss公式アプリ",
  description: "神戸大学留学生支援サークル Truss の利用規約です。",
};

export default async function TermsOfServicePage() {
  // 正本は DB（運営画面から改定可能）。無ければアプリ内蔵の既定文面
  const content = await fetchSiteDocumentContent("terms-of-service");
  return (
    <PolicyPage
      title="利用規約"
      intro="本規約は、Truss公式アプリの利用条件を定めるものです。"
      content={content}
    />
  );
}
