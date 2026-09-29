// ETL one-off: migra el contenido valioso de prisma/dev.db (SQLite legacy)
// al Postgres de producción/dev.
//
// Uso local (repo root, Postgres local del compose dev):
//   node scripts/migrate-sqlite-dev.cjs prisma/dev.db
//
// Uso en prod (contenedor app, read-only rootfs — copiar vía stdin):
//   docker compose exec -T app sh -c 'cat > /tmp/dev.db' < ~/migracion/dev.db
//   docker compose exec -T app sh -c 'cat > /tmp/etl.cjs' < scripts/migrate-sqlite-dev.cjs
//   docker compose exec -T app sh -c 'NODE_PATH=/app/node_modules node /tmp/etl.cjs /tmp/dev.db'
//
// Idempotente y re-ejecutable: upserts por clave natural, sin duplicar.
// - Excluye: usuario.prueba, categoría sintética (su categoría no se crea;
//   su ÚNICA foto real sí se migra, reubicada en retrato-de-autor).
// - Repara textos mojibake (U+FFFD) y <p> literales heredados del dev.db.
// - Mueve public/uploads/prueba-sintetica/ -> retrato-de-autor/ (si existe).

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const lite = new DatabaseSync(process.argv[2] ?? '/tmp/dev.db', {
  readOnly: true,
});

const UPLOADS_ROOT = process.env.UPLOADS_ROOT ?? 'public/uploads';

// Se saltea por la parte local del email (el dominio real vive solo en
// .private-values.json; el repo trabaja con placeholders).
const SKIP_EMAIL_LOCALPARTS = new Set(['usuario.prueba']);
const emailLocalPart = (email) => String(email ?? '').split('@')[0].toLowerCase();

// Textos canónicos (el dev.db guardó U+FFFD + <p> literales; se restauran
// solo si el valor actual sigue dañado — nunca pisa correcciones manuales).
const CATEGORY_FIX = {
  'moda-editorial':
    'Producciones de alta costura con dirección de arte cuidada, luz natural y estética de revista.',
  'retrato-de-autor':
    'Retratos íntimos que exploran la personalidad, el silencio y la luz como elemento narrativo.',
};
const MOSAIC_FIX = {
  'Colección Otoño':
    'Una exploración visual de texturas y caída en la colección cápsula de temporada.',
  Backstage: 'Detrás de cámara: los momentos entre toma y toma.',
};

// Los títulos en dev.db también traen U+FFFD → matchear por clave normalizada
// (minúsculas, sin acentos, sin FFD) para poder reparar título y descripción.
const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .trim();
const MOSAIC_FIX_NORM = new Map(
  Object.entries(MOSAIC_FIX).map(([title, description]) => [
    norm(title),
    { title, description },
  ]),
);
// El FFD borró la letra base (ó->▯): 'Colecci▯n Oto▯o' -> 'coleccin otoo'
// vs 'coleccion otono'. Prefijo de 6 chars ('colecc'/'backst') es estable.
const lookupMosaicFix = (title) => {
  const n = norm(title);
  const exact = MOSAIC_FIX_NORM.get(n);
  if (exact) return exact;
  for (const v of MOSAIC_FIX_NORM.values()) {
    if (norm(v.title).slice(0, 6) === n.slice(0, 6)) return v;
  }
  return null;
};

const needsFix = (t) =>
  Boolean(t) && (t.includes('�') || /<\/?p>/i.test(t));
const stripTags = (t) => String(t ?? '').replace(/<\/?p>/gi, '').trim();

const toDate = (v) =>
  v === null || v === undefined
    ? null
    : new Date(typeof v === 'number' ? v : String(v));
const toBool = (v) => v === 1 || v === true;
const stamp = (v) => toDate(v) ?? new Date();
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const toInt = (v) => {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
};

async function migrateUsers() {
  let created = 0;
  for (const u of lite.prepare('SELECT * FROM "User"').all()) {
    if (SKIP_EMAIL_LOCALPARTS.has(emailLocalPart(u.email))) {
      console.info(`[etl] skip usuario de prueba: ${u.email}`);
      continue;
    }
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (exists) {
      console.info(`[etl] usuario ya existe: ${u.email}`);
      continue;
    }
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        emailVerified: toDate(u.emailVerified),
        image: u.image,
        createdAt: stamp(u.createdAt),
        updatedAt: stamp(u.updatedAt),
      },
    });
    created++;
    console.info(`[etl] usuario creado: ${u.email}`);
  }
  return created;
}

async function migrateCategories() {
  let touched = 0;
  for (const g of lite.prepare('SELECT * FROM "GalleryCategory"').all()) {
    if (g.slug === 'prueba-sintetica') {
      console.info(`[etl] skip categoría sintética: ${g.slug}`);
      continue;
    }
    await prisma.galleryCategory.upsert({
      where: { slug: g.slug },
      update: { name: g.name, coverImage: g.coverImage },
      create: {
        id: g.id,
        name: g.name,
        slug: g.slug,
        description: stripTags(g.description),
        coverImage: g.coverImage,
        createdAt: stamp(g.createdAt),
        updatedAt: stamp(g.updatedAt),
      },
    });
    const current = await prisma.galleryCategory.findUnique({
      where: { slug: g.slug },
    });
    if (current && needsFix(current.description)) {
      const fixed = CATEGORY_FIX[g.slug] ?? stripTags(g.description);
      if (!needsFix(fixed)) {
        await prisma.galleryCategory.update({
          where: { slug: g.slug },
          data: { description: fixed },
        });
        console.info(`[etl] texto reparado: categoría ${g.slug}`);
      }
    }
    touched++;
    console.info(`[etl] categoría ok: ${g.slug}`);
  }
  return touched;
}

async function migrateMosaics() {
  let created = 0;
  const devCats = new Map(
    lite
      .prepare('SELECT "id","slug" FROM "GalleryCategory"')
      .all()
      .map((g) => [g.id, g.slug]),
  );
  for (const m of lite.prepare('SELECT * FROM "GalleryMosaic"').all()) {
    const slug = devCats.get(m.categoryId);
    if (!slug || slug === 'prueba-sintetica') {
      console.info(`[etl] skip mosaico sintético: ${m.title}`);
      continue;
    }
    const fx = lookupMosaicFix(m.title);
    const title = fx?.title ?? m.title;
    const description = fx?.description ?? stripTags(m.description);
    const exists = await prisma.galleryMosaic.findUnique({
      where: { id: m.id },
    });
    if (exists) {
      if (fx && (needsFix(exists.description) || needsFix(exists.title))) {
        await prisma.galleryMosaic.update({
          where: { id: m.id },
          data: { title, description },
        });
        console.info(`[etl] texto reparado: mosaico ${title}`);
      } else {
        console.info(`[etl] mosaico ya existe: ${title}`);
      }
      continue;
    }
    const cat = await prisma.galleryCategory.findUnique({ where: { slug } });
    if (!cat) throw new Error(`categoría destino inexistente: ${slug}`);
    await prisma.galleryMosaic.create({
      data: {
        id: m.id,
        title,
        description,
        categoryId: cat.id,
        coverFileId: m.coverFileId,
        createdAt: stamp(m.createdAt),
        updatedAt: stamp(m.updatedAt),
      },
    });
    created++;
    console.info(`[etl] mosaico creado: ${title}`);
  }
  return created;
}

async function migrateBrands() {
  let touched = 0;
  for (const b of lite.prepare('SELECT * FROM "Brand"').all()) {
    await prisma.brand.upsert({
      where: { name: b.name },
      update: {
        website: b.website,
        order: b.order,
        visible: toBool(b.visible),
      },
      create: {
        id: b.id,
        name: b.name,
        website: b.website,
        order: b.order,
        visible: toBool(b.visible),
        createdAt: stamp(b.createdAt),
        updatedAt: stamp(b.updatedAt),
      },
    });
    touched++;
  }
  console.info(`[etl] marcas sincronizadas: ${touched} (visibilidad dev aplicada)`);
  return touched;
}

async function migrateServices() {
  let touched = 0;
  for (const s of lite.prepare('SELECT * FROM "Service"').all()) {
    const data = {
      title: s.title,
      description: s.description ?? '',
      priceLabel: s.priceLabel,
      priceNote: s.priceNote,
      durationLabel: s.durationLabel,
      features: String(s.features ?? '[]'),
      icon: s.icon,
      image: s.image,
      order: s.order,
      visible: toBool(s.visible),
    };
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: data,
      create: {
        ...data,
        id: s.id,
        slug: s.slug,
        createdAt: stamp(s.createdAt),
        updatedAt: stamp(s.updatedAt),
      },
    });
    touched++;
  }
  console.info(`[etl] servicios sincronizados: ${touched}`);
  return touched;
}

// Única foto real del dev.db (los 6 archivos en disco son la misma toma,
// 2 recompressiones): se elige la fila con EXIF (Canon EOS R5) y se ubica
// en un mosaico real de la categoría retrato-de-autor.
const PHOTO_MOSAIC_ID = 'cmttei7gi0002ovd70w95ye2k';

async function migratePhotos() {
  const cat = await prisma.galleryCategory.findUnique({
    where: { slug: 'retrato-de-autor' },
  });
  if (!cat) throw new Error('categoría retrato-de-autor inexistente');

  const oldDir = path.join(UPLOADS_ROOT, 'prueba-sintetica');
  const newDir = path.join(UPLOADS_ROOT, 'retrato-de-autor');
  if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
    fs.renameSync(oldDir, newDir);
    console.info(`[etl] carpeta renombrada: ${oldDir} -> ${newDir}`);
  }

  const rows = lite
    .prepare('SELECT * FROM "File" WHERE "mosaicId" = ? ORDER BY "order"')
    .all(PHOTO_MOSAIC_ID);
  if (rows.length === 0) {
    console.info('[etl] sin filas File en dev.db — nada que migrar');
    return 0;
  }
  const chosen = rows.find((r) => r.cameraModel) ?? rows[0];

  const oldPrefix = 'prueba-sintetica/';
  const newPrefix = 'retrato-de-autor/';
  const key = String(chosen.key).replace(
    new RegExp(`^${oldPrefix}`),
    newPrefix,
  );
  const url = `/uploads/${key}`;

  const abs = path.join(UPLOADS_ROOT, key);
  if (!fs.existsSync(abs)) {
    console.warn(`[etl] archivo ausente en disco, se omite foto: ${abs}`);
    return 0;
  }
  const md5 = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
  console.info(`[etl] foto elegida: ${key} (md5 ${md5.slice(0, 8)})`);

  const mosaic = await prisma.galleryMosaic.upsert({
    where: { id: PHOTO_MOSAIC_ID },
    update: {},
    create: {
      id: PHOTO_MOSAIC_ID,
      title: 'Sesión en terraza',
      description: 'Retrato al aire libre con luz natural, entre montañas.',
      categoryId: cat.id,
      createdAt: stamp(chosen.createdAt),
      updatedAt: stamp(chosen.updatedAt),
    },
  });

  const existing = await prisma.file.findUnique({ where: { key } });
  if (!existing) {
    await prisma.file.create({
      data: {
        id: chosen.id,
        url,
        key,
        type: chosen.type ?? 'IMAGE',
        status: 'READY',
        altText: chosen.altText,
        mosaicId: mosaic.id,
        createdAt: stamp(chosen.createdAt),
        order: chosen.order ?? 0,
        width: toInt(chosen.width),
        height: toInt(chosen.height),
        cameraMake: chosen.cameraMake,
        cameraModel: chosen.cameraModel,
        lensModel: chosen.lensModel,
        focalLength: toNum(chosen.focalLength),
        aperture: toNum(chosen.aperture),
        shutterSpeed: toNum(chosen.shutterSpeed),
        iso: toInt(chosen.iso),
        takenAt: toDate(chosen.takenAt),
      },
    });
    console.info('[etl] fila File creada (status READY, EXIF preservado)');
  } else {
    console.info('[etl] fila File ya existe');
  }

  // Portada = la foto real (el dev.db traía una stock de Unsplash).
  await prisma.galleryCategory.update({
    where: { slug: 'retrato-de-autor' },
    data: { coverImage: url },
  });
  console.info('[etl] portada de categoría asignada (coverImage)');
  return 1;
}

async function main() {
  const users = await migrateUsers();
  const cats = await migrateCategories();
  const mosaics = await migrateMosaics();
  const brands = await migrateBrands();
  const services = await migrateServices();
  const photos = await migratePhotos();
  console.info(
    `[etl] OK usuarios:${users} categorias:${cats} mosaicos:${mosaics} ` +
      `marcas:${brands} servicios:${services} fotos:${photos}`,
  );
}

main()
  .catch((err) => {
    console.error('[etl] ERROR:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
