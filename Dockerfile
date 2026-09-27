FROM node:24-alpine AS build

WORKDIR /app

# Même version de npm que ton environnement local
RUN npm install -g npm@11.6.2

COPY package.json package-lock.json ./

RUN npm --version
RUN npm ci

COPY . .

RUN npm run build -- --configuration production

FROM nginx:alpine

COPY --from=build /app/dist/jappo-frontend/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]