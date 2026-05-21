# ════════════════════════════════════
# Dockerfile — HabitQuest Backend
# ════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
