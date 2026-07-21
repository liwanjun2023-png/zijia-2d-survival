FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY index.html styles.css sideview.js game.js server.mjs ./

ENV NODE_ENV=production
ENV PORT=8767

EXPOSE 8767

CMD ["node", "server.mjs"]
