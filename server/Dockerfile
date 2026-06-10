# Backend — API REST (Node + Express)
FROM node:20-alpine

WORKDIR /app

# Instala solo dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Código de la aplicación
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
