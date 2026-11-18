import { renderPolicyHistory } from '../../../../components/policy/PolicyHistory';
export default async function RevisionPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  return renderPolicyHistory({ documentId: "privacy-policy", revisionId });
}
