import { renderPolicyHistory } from '../../../../components/policy/PolicyHistory';
export default async function RevisionPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  return renderPolicyHistory({ documentId: "terms-of-service", revisionId });
}
