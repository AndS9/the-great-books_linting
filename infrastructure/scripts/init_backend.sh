#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/backend"
DB_HOST="192.168.56.4"
DB_PORT="5432"
DB_NAME="books"
DB_USER="username"
DB_PASS="password"
SECRET_KEY="prod-secret-key-change-me"

echo "Встановлення залежностей системи..."
apt-get update -y
apt-get install -y python3 python3-pip python3-venv libpq-dev

echo "Перенесення файлів бекенду..."
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}"
cp -r /tmp/backend/. "${APP_DIR}/"
rm -rf /tmp/backend

echo "Налаштування віртуального середовища..."
python3 -m venv "${APP_DIR}/venv"
"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install -r "${APP_DIR}/requirements.txt"
"${APP_DIR}/venv/bin/pip" install gunicorn

echo "Створення .env..."
cat <<EOF > "${APP_DIR}/.env"
SECRET_KEY=${SECRET_KEY}
DATABASE_URI=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
EOF

echo "Запуск міграцій..."
cd "${APP_DIR}"
export FLASK_APP=run.py
if [ ! -d "${APP_DIR}/migrations" ]; then
    "${APP_DIR}/venv/bin/flask" db init
    "${APP_DIR}/venv/bin/flask" db migrate -m "Initial migration"
fi
"${APP_DIR}/venv/bin/flask" db upgrade

echo "Запуск сервісу бекенду..."
cat <<EOF > /etc/systemd/system/backend.service
[Unit]
Description=Flask Backend
After=network.target

[Service]
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/gunicorn -w 2 -b 0.0.0.0:5000 run:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now backend
systemctl restart backend