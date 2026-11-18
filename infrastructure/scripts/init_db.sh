#!/usr/bin/env bash
set -euo pipefail
cd /tmp

DB_NAME="books"
DB_USER="username"
DB_PASS="password"

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

