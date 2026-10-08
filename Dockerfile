# LUMEN Estudio — Dockerfile multi-stage
# Stage 1: build con todas las deps
# Stage 2: imagen final mínima con standalone output
#
# Base Debian slim (NO alpine): Prisma 5 descarga el motor
# debian-openssl-3.0, compatible con libssl3 del sistema.
# En alpine el motor musl exige libssl.so.1.1 (inexistente) y la app
# arranca pero falla todo acceso a BD. No volver a alpine sin subir Prisma.

# ---- Build stage ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copiar package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar el resto del código
COPY . .

# public/ va gitignoreado casi entero (uploads + author.jpg), en un clon
# limpio el dir puede no existir y romper el COPY del runner. Crearlo aquí.
RUN mkdir -p ./public

# Generar cliente Prisma
RUN npx prisma generate

# Build de Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Production stage ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# HOME en tmpfs: el contenedor es read-only y npx/npm necesitan cache escribible
# (db push / db:seed se ejecutan con exec dentro del contenedor).
ENV HOME=/tmp

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Copiar standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI + tsx + resto de deps: db push y db:seed corren con exec
# dentro de este contenedor (npx prisma / npm run db:seed). Sin esto npx
# intenta descargar de internet y tsx no existe.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma cliente
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Volumen para uploads (montado desde docker-compose)
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/auth/session || exit 1

CMD ["node", "server.js"]
