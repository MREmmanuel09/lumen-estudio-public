import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { Skeleton } from '@/components/ui/Skeleton';

/** P0 UX: skeleton de home con tokens de marca (hueso sutil, sin flash). */
export default function PublicLoading() {
  return (
    <Section spacing="lg">
      <Container>
        <Skeleton className="h-4 w-32 bg-accent/10" />
        <Skeleton className="mt-4 h-10 w-2/3 bg-accent/10" />
        <Skeleton className="mt-4 h-4 w-1/2 bg-accent/10" />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full bg-accent/10" />
          ))}
        </div>
      </Container>
    </Section>
  );
}
