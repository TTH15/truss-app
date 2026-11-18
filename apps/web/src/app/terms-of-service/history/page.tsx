import { renderPolicyHistory } from '../../../components/policy/PolicyHistory';
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  return renderPolicyHistory({ documentId: "terms-of-service", before });
}
