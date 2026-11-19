#!/usr/bin/env bash
set -euo pipefail

WEB_DIR="/var/www/frontend"
BACKEND_LB_URL="http://192.168.56.10/api"

echo "Встановлення Nginx..."
apt-get update -y
apt-get install -y nginx

echo "Перенесення файлів фронтенду..."
rm -rf "${WEB_DIR}"
mkdir -p "${WEB_DIR}"
cp -r /tmp/frontend/. "${WEB_DIR}/"
rm -rf /tmp/frontend

echo "Налаштування адреси бекенду в app.js..."
sed -i "s|http://localhost:5000/api|${BACKEND_LB_URL}|g" "${WEB_DIR}/app.js"
chown -R www-data:www-data "${WEB_DIR}"

echo "Налаштування віртуального хоста Nginx..."
cat <<EOF > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root ${WEB_DIR};
    index index.html;

    server_name _;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "Запуск сервісу Nginx..."
nginx -t
systemctl enable nginx
systemctl restart nginx