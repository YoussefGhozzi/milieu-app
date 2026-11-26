# MILIEU, app client (web) : export Expo servi par nginx.
# Une seule image pour tous les environnements : l'adresse de l'API est donnée au démarrage (variable API_URL),
# pas au build (voir docker/40-api-url.sh).
#   docker build --secret id=npm_token,env=NPM_TOKEN -t milieu-app-web .
#   docker run -p 8080:80 -e API_URL=https://api.milieu.tn milieu-app-web

# Build sur la machine qui construit (fichiers statiques, identiques pour toutes les architectures) ;
# seule l'image nginx finale existe en amd64 et arm64 (serveurs ARM, ex. Oracle Cloud gratuit).
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=npm_token,env=NPM_TOKEN npm ci --no-audit --no-fund
COPY . .
# Valeur repère remplacée au démarrage du conteneur par la vraie adresse de l'API.
ENV EXPO_PUBLIC_DATA_SOURCE=api EXPO_PUBLIC_API_URL=https://__MILIEU_API_URL__
RUN npx expo export --platform web --output-dir dist \
  && grep -rlq "__MILIEU_API_URL__" dist || (echo "Repère d'adresse API absent du build" && exit 1)

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-api-url.sh /docker-entrypoint.d/40-api-url.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-api-url.sh
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
