# ════════════════════════════════════
# Dockerfile — HabitQuest Backend
# ════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --ignore-scripts && npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
