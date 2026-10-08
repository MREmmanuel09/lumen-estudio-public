'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { serviceIcon } from './service-icons';
import { plainText, type Service } from '@/services/gallery';

export function ServicesGrid({ services }: { services: Service[] }) {
  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </motion.div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const Icon = serviceIcon(service.icon);
  return (
    <motion.article
      variants={fadeUp}
      className="group relative overflow-hidden border border-border bg-bg-elevated"
    >
      {/* Imagen con zoom en hover */}
      <div className="relative aspect-[5/3] overflow-hidden">
        {service.image ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-elegant group-hover:scale-110"
            style={{ backgroundImage: `url(${service.image})` }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-bg-elevated to-bg"
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-fg/30 bg-black/40 text-fg backdrop-blur-sm transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <h3 className="font-display text-2xl text-fg">{service.title}</h3>
        <p className="mt-3 text-sm text-fg-muted">
          {plainText(service.description)}
        </p>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <span className="font-detail text-xs uppercase tracking-widest text-accent">
            {service.priceLabel ?? 'A convenir'}
          </span>
          <Link
            href={`/servicios/${service.slug}`}
            className="font-detail text-xs uppercase tracking-widest text-fg-muted transition-colors group-hover:text-fg"
          >
            Ver más →
          </Link>
        </div>
      </div>

      {/* Línea inferior que crece en hover */}
      <div className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-all duration-500 ease-elegant group-hover:w-full" />
    </motion.article>
  );
}
