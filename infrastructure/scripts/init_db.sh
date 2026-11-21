#!/usr/bin/env bash
set -euo pipefail
cd /tmp

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
rm -f /tmp/.env

: "${DB_NAME:?DB_NAME is required in .env}"
: "${DB_USER:?DB_USER is required in .env}"
: "${DB_PASS:?DB_PASS is required in .env}"

ALLOWED_IPS=("192.168.56.2/32" "192.168.56.3/32")

echo "Встановлення PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

echo "Запуск PostgreSQL..."
systemctl enable --now postgresql

echo "Створення користувача..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

echo "Створення бази даних..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

echo "Налаштування прав..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

PG_CONF=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW config_file;")
HBA_CONF=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW hba_file;")

sed -i "s/^#*listen_addresses\s*=.*/listen_addresses = '*'/" "$PG_CONF"

for ip in "${ALLOWED_IPS[@]}"; do
  HBA_RULE="host    all             all             ${ip}         scram-sha-256"
  grep -qxF "$HBA_RULE" "$HBA_CONF" || echo "$HBA_RULE" >> "$HBA_CONF"
  sudo iptables -A INPUT -p tcp --dport 5432 -s ${ip} -j ACCEPT
done

echo "Перезапуск PostgreSQL..."
systemctl restart postgresql

sudo netfilter-persistent save