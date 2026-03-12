import { BatchDetailPage } from '@/components/app/batch-detail-page';

export default async function BatchDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BatchDetailPage batchId={id} />;
}
