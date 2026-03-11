import { BackLink, PageShell, PlaceholderCard } from './chrome';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageShell className="app-stage max-w-3xl space-y-10">
      <BackLink href="/">Back</BackLink>
      <PlaceholderCard title={title} description={description} />
    </PageShell>
  );
}
