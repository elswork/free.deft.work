# --- Etapa de Construcción ---
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Construye la aplicación React
RUN npm run build

# --- Etapa de Servido ---
FROM nginx:alpine

# Copia la configuración de Nginx (opcional, si necesitas una configuración personalizada)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos construidos desde la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Expone el puerto por defecto de Nginx
EXPOSE 8033

# Comando para iniciar Nginx (por defecto en la imagen)
CMD ["nginx", "-g", "daemon off;"]
