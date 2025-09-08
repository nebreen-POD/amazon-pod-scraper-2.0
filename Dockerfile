FROM apify/actor-node-playwright-chrome:20

WORKDIR /usr/src/app
COPY . ./

RUN npm ci --omit=dev || npm install --omit=dev
RUN npx playwright install --with-deps chromium

CMD ["node", "main.js"]
