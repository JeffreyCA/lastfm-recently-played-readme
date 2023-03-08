FROM node:18-alpine as builder

WORKDIR /build

COPY . .

RUN npm ci && \
  npm run build

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/.next .next
COPY --from=builder /build/package.json .
COPY --from=builder /build/package-lock.json .

ENV NODE_ENV production

RUN npm ci

ENV PORT 80
ENV BASE_URL http://localhost
EXPOSE 80

CMD ["npm", "start"]