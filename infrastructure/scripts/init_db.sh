#!/usr/bin/env bash
set -euo pipefail
cd /tmp

DB_NAME="books"
DB_USER="username"
DB_PASS="password"
ALLOWED_IPS=("192.168.56.2/32" "192.168.56.3/32")

echo "Встановлення PostgreSQL..."
apt-get update -y
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

for ip in "${ALLOWED_IPS[@]}"; do # allowed IPs processing through loop so when we create new app replicas we can just add their IPs to the list and run this script again
  HBA_RULE="host    all             all             ${ip}         scram-sha-256"
  grep -qxF "$HBA_RULE" "$HBA_CONF" || echo "$HBA_RULE" >> "$HBA_CONF"
done

echo "Перезапуск PostgreSQL..." # restarting for applying settings changes
systemctl restart postgresql


