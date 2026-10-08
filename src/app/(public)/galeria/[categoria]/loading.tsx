import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';

/** P0 UX: skeleton de categoría (header 60vh + mosaicos). */
export default function CategoryLoading() {
  return (
    <>
      <section className="flex min-h-[60vh] items-end bg-black pb-16 pt-32">
        <Container className="w-full">
          <Skeleton className="h-4 w-28 bg-accent/10" />
          <Skeleton className="mt-3 h-12 w-1/2 bg-accent/10" />
          <Skeleton className="mt-4 h-4 w-2/3 bg-accent/10" />
        </Container>
      </section>
      <section className="bg-bg py-section">
        <Container>
          <Skeleton className="h-8 w-1/3 bg-accent/10" />
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full bg-accent/10" />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
