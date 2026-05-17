# ════════════════════════════════════
# Dockerfile — HabitQuest Backend
# ════════════════════════════════════

# Базовий образ — Node.js LTS (Alpine = легкий, ~5MB)
FROM node:20-alpine

# Робоча директорія всередині контейнера
WORKDIR /app

# Копіюємо package.json окремо щоб використати кеш Docker
# (шар з npm install не перебудується якщо код змінився,
#  але package.json не змінився)
COPY package*.json ./

# Встановлюємо залежності (тільки production)
RUN npm install --omit=dev

# Копіюємо весь backend код
COPY . .

# Відкриваємо порт
EXPOSE 5000

# Команда запуску
CMD ["node", "server.js"]
