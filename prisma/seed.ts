// Seed script — crea admin inicial + marcas del Marquee (ocultas).
// Ejecutar con: npm run db:seed (o automáticamente vía prisma migrate).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'ChangeMe!Now2026';
const ADMIN_NAME = 'Administrador';

// Marcas iniciales: se crean OCULTAS para que la sección
// "Han confiado en nosotros" no se muestre hasta activarlas en /admin/marcas.
const INITIAL_BRANDS = [
  'VOGUE LATAM',
  "HARPER'S BAZAAR",
  'NIKE',
  'ADIDAS',
  'GOOGLE',
  'NETFLIX',
  'PUMA',
  'UNIQLO',
  'SAMSUNG',
  'H&M',
  "L'ORÉAL",
  'VOGUE',
  'ELLE',
];

async function seedBrands() {
  const count = await db.brand.count();
  if (count > 0) {
    console.info(`[seed] Ya hay ${count} marca(s). Saltando seed de marcas.`);
    return;
  }
  await db.brand.createMany({
    data: INITIAL_BRANDS.map((name, i) => ({ name, order: i, visible: false })),
  });
  console.info(`[seed] ${INITIAL_BRANDS.length} marcas creadas (ocultas).`);
}

// Servicios iniciales: réplica del contenido hardcodeado previo, VISIBLES
// (la home ya los muestra hoy; ocultarlos rompería el sitio).
const INITIAL_SERVICES: Array<{
  title: string;
  slug: string;
  description: string;
  priceLabel: string;
  priceNote?: string;
  durationLabel?: string;
  features: string[];
  icon: string;
  image: string;
}> = [
  {
    title: 'Bodas & Eventos',
    slug: 'bodas-eventos',
    description:
      'Cobertura completa de tu día especial. Álbum de autor, entrega digital y atención personal.',
    priceLabel: 'Desde Q 8,500',
    priceNote: 'por jornada',
    durationLabel: 'Cobertura de hasta 10 horas',
    features: ['Álbum de autor', 'Entrega digital en alta resolución', 'Atención personalizada', 'Sesión pre-boda incluida'],
    icon: 'Heart',
    image:
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Moda Editorial',
    slug: 'moda-editorial',
    description:
      'Producción de moda con dirección de arte. Lookbook, editorial de revista o campaña de marca.',
    priceLabel: 'Desde Q 4,200',
    priceNote: 'por producción',
    durationLabel: 'Jornada de estudio o locación',
    features: ['Dirección de arte', 'Lookbook y editorial', 'Campañas de marca', 'Equipo de estilismo'],
    icon: 'Shirt',
    image:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Retrato de Autor',
    slug: 'retrato-de-autor',
    description:
      'Sesión personalizada en estudio o exteriores. Dirección de posing y estilismo opcional.',
    priceLabel: 'Desde Q 1,800',
    priceNote: 'por sesión',
    durationLabel: 'Sesión de 2 horas',
    features: ['Estudio o exteriores', 'Dirección de posing', 'Estilismo opcional', '10 fotos finales retocadas'],
    icon: 'User',
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Producto & E-commerce',
    slug: 'producto-ecommerce',
    description:
      'Fotografía de producto en estudio con fondo blanco, lifestyle o 360°. Entrega en 48h.',
    priceLabel: 'Desde Q 120 / pieza',
    durationLabel: 'Entrega en 48h',
    features: ['Fondo blanco o lifestyle', 'Foto 360° disponible', 'Optimizado para tiendas online'],
    icon: 'Package',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Corporativo',
    slug: 'corporativo',
    description:
      'Retratos ejecutivos, fotos de equipo, oficinas y eventos corporativos. Disponibilidad in-house.',
    priceLabel: 'Desde Q 2,500',
    priceNote: 'por jornada',
    durationLabel: 'Disponibilidad in-house',
    features: ['Retratos ejecutivos', 'Fotos de equipo', 'Cobertura de eventos', 'Banco de imagen corporativo'],
    icon: 'Building2',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&auto=format&fit=crop',
  },
  {
    title: 'Proyectos Personalizados',
    slug: 'proyectos-personalizados',
    description:
      'Series documentales, books de artista, colaboraciones. Diseñamos juntos el alcance y la narrativa.',
    priceLabel: 'A convenir',
    features: ['Series documentales', 'Books de artista', 'Colaboraciones', 'Narrativa a medida'],
    icon: 'Camera',
    image:
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&q=80&auto=format&fit=crop',
  },
];

async function seedServices() {
  const count = await db.service.count();
  if (count > 0) {
    console.info(`[seed] Ya hay ${count} servicio(s). Saltando seed de servicios.`);
    return;
  }
  await db.service.createMany({
    data: INITIAL_SERVICES.map((s, i) => ({
      ...s,
      features: JSON.stringify(s.features),
      order: i,
      visible: true,
    })),
  });
  console.info(`[seed] ${INITIAL_SERVICES.length} servicios creados (visibles).`);
}

async function main() {
  console.info('[seed] Verificando admin inicial...');

  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.info(`[seed] Admin ya existe (${existing.email}). Saltando.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await db.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'ADMIN',
        emailVerified: new Date(), // Admin pre-verificado
      },
    });

    console.info(`[seed] Admin creado:`);
    console.info(`  Email:    ${admin.email}`);
    console.info(`  Password: ${ADMIN_PASSWORD}`);
    console.info(`  ⚠️  Cambiar este password en el primer login.`);
  }

  await seedBrands();
  await seedServices();
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
