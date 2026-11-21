#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/web"

if [ ! -f /tmp/.env ]; then
  echo "ERROR: /tmp/.env not found!" >&2
  exit 1
fi

set -a
if [ -f /tmp/.env ]; then
    set -a
    source <(tr -d '\r' < /tmp/.env)
    set +a
else
    echo "Помилка: /tmp/.env не знайдено!" >&2
    exit 1
fi
set +a

: "${DB_HOST:?DB_HOST is required in .env}"
: "${DB_PORT:?DB_PORT is required in .env}"
: "${DB_NAME:?DB_NAME is required in .env}"
: "${DB_USER:?DB_USER is required in .env}"
: "${DB_PASS:?DB_PASS is required in .env}"
: "${SECRET_KEY:?SECRET_KEY is required in .env}"

echo "Встановлення залежностей системи..."
apt-get install -y python3 python3-pip python3-venv libpq-dev nginx curl

echo "Перенесення файлів бекенду..."
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}"
cp -r /tmp/web/. "${APP_DIR}/"
rm -rf /tmp/web

echo "Налаштування віртуального середовища..."
python3 -m venv "${APP_DIR}/venv"
"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install -r "${APP_DIR}/requirements.txt"
"${APP_DIR}/venv/bin/pip" install gunicorn

echo "Налаштування .env..."
mv /tmp/.env "${APP_DIR}/.env"
echo "" >> "${APP_DIR}/.env"
echo "DATABASE_URI=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}" >> "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"

echo "Запуск міграцій..."
cd "${APP_DIR}"
export FLASK_APP=run.py

if [ "$(hostname)" = "app1" ]; then
    echo "Очікування доступності бази даних ${DB_HOST}:${DB_PORT}..."
    until "${APP_DIR}/venv/bin/python" -c "import socket; s = socket.socket(); s.connect(('${DB_HOST}', int('${DB_PORT}'))); s.close()" 2>/dev/null; do
        sleep 1
    done

    echo "Запуск міграцій та наповнення БД на app1..."
    "${APP_DIR}/venv/bin/flask" db upgrade
    "${APP_DIR}/venv/bin/flask" seed-db
else
    echo "Пропуск міграцій для $(hostname) (виконуються тільки на app1)."
fi

echo "Запуск сервісу бекенду..."
cat <<EOF > /etc/systemd/system/web.service
[Unit]
Description=Flask Backend
After=network.target

[Service]
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now web
systemctl restart web

echo "Конфігурування reverse proxy..."
cat > "/etc/nginx/sites-available/app" <<'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

EOF
ln -sfn "/etc/nginx/sites-available/app" \
    "/etc/nginx/sites-enabled/app"

rm -f /etc/nginx/sites-enabled/default

nginx -t

systemctl enable nginx
systemctl restart nginx

echo "Налаштування фаєрволу для додатку..."

sudo iptables -A INPUT -p tcp -s 192.168.56.10 --dport 80 -j ACCEPT
sudo netfilter-persistent save