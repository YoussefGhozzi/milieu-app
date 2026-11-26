#!/bin/sh
# Au démarrage du conteneur : l'adresse de l'API (API_URL) remplace le repère laissé dans le build.
# Refuse de démarrer sans adresse valide (sinon l'app chercherait une API qui n'existe pas).
set -eu
case "${API_URL:-}" in
  https://*|http://*) ;;
  *) echo "API_URL manquante ou invalide (ex. https://api.milieu.tn)" >&2; exit 1 ;;
esac
url="${API_URL%/}"
files=$(grep -rl "https://__MILIEU_API_URL__" /usr/share/nginx/html || true)
for f in $files; do
  sed -i "s#https://__MILIEU_API_URL__#${url}#g" "$f"
done
echo "MILIEU (app client) : API ${url}"
