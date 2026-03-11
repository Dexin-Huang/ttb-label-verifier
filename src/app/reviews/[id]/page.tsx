import { ReviewDetailPage } from '@/components/app/review-detail-page';

export default async function ReviewDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewDetailPage reviewId={id} />;
}
