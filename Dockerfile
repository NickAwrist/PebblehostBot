FROM node:21.6.1
LABEL authors="Nick"

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/bot.js"]