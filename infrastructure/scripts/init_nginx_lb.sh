#!/usr/bin/env bash

set -euo pipefail

WEB_DIR="/var/www/frontend"
SOURCE_DIR="/tmp/frontend"
SITE_NAME="the-great-books"

apt-get update
apt-get install -y nginx curl


if [[ ! -f "${SOURCE_DIR}/index.html" ]]; then
    exit 1
fi

mkdir -p "${WEB_DIR}"
cp -a "${SOURCE_DIR}/." "${WEB_DIR}/"
sed -i "s|http://localhost:5000/api|/api|g" "${WEB_DIR}/app.js"
chown -R www-data:www-data "${WEB_DIR}"

cat > "/etc/nginx/sites-available/${SITE_NAME}" <<'EOF'
upstream the_great_books {
    server 192.168.56.2:5000 max_fails=3 fail_timeout=10s;
    server 192.168.56.3:5000 max_fails=3 fail_timeout=10s;
}

server {
    listen 80 default_server;
    server_name _;

    root /var/www/frontend;
    index index.html;

    location /api/ {
        proxy_pass http://the_great_books;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sfn "/etc/nginx/sites-available/${SITE_NAME}" \
    "/etc/nginx/sites-enabled/${SITE_NAME}"

rm -f /etc/nginx/sites-enabled/default

nginx -t

systemctl enable nginx
systemctl restart nginx

echo "Nginx ready!"
