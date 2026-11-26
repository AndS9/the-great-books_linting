#!/bin/bash
set -euo pipefail

echo "Встановлення залежностей для Consul Client..."
apt-get update -y
apt-get install -y curl gnupg

curl -fsSL https://apt.releases.hashicorp.com/gpg \
  | gpg --batch --yes --dearmor \
      -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/hashicorp.list

apt-get update -y
apt-get install -y consul

NODE_IP="$(hostname -I | tr ' ' '\n' | grep '^192\.168\.56\.' | head -n1)"
NODE_NAME="$(hostname)-client"

sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8301 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p udp --dport 8301 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

mkdir -p /etc/consul.d /var/lib/consul
rm -f /etc/consul.d/*.json /etc/consul.d/*.hcl

cat > /etc/consul.d/consul.hcl <<EOF
datacenter = "tournament-app-dc"
data_dir   = "/var/lib/consul"
log_level  = "INFO"

node_name = "${NODE_NAME}"
server    = false

bind_addr      = "${NODE_IP}"
advertise_addr = "${NODE_IP}"
client_addr    = "127.0.0.1"

retry_join = ["192.168.56.5"]

dns_config {
  enable_truncate = true
  only_passing    = true
}
EOF

case "$(hostname)" in
  app1|app2)
    cat > /etc/consul.d/service-web.json <<EOF
{
  "service": {
    "name": "the-great-books-web",
    "id": "the-great-books-web-$(hostname)",
    "tags": ["$(hostname)", "vagrant"],
    "address": "${NODE_IP}",
    "port": 80,
    "check": {
      "http": "http://${NODE_IP}:80/api/health",
      "interval": "10s",
      "timeout": "2s",
      "deregister_critical_service_after": "1m"
    }
  }
}
EOF
    ;;
  db)
    cat > /etc/consul.d/service-db.json <<EOF
{
  "service": {
    "name": "postgres",
    "id": "postgres-db",
    "tags": ["database", "postgresql"],
    "address": "${NODE_IP}",
    "port": 5432,
    "check": {
      "tcp": "${NODE_IP}:5432",
      "interval": "10s",
      "timeout": "2s",
      "deregister_critical_service_after": "1m"
    }
  }
}
EOF
    ;;
  lb)
    cat > /etc/consul.d/service-nfs.json <<EOF
{
  "service": {
    "name": "nfs-server",
    "id": "nfs-server",
    "tags": ["file-server", "nfs"],
    "address": "${NODE_IP}",
    "port": 2049,
    "check": {
      "tcp": "${NODE_IP}:2049",
      "interval": "10s",
      "timeout": "2s",
      "deregister_critical_service_after": "1m"
    }
  }
}
EOF
    ;;
esac

chown -R consul:consul /etc/consul.d /var/lib/consul

mkdir -p /etc/systemd/system/consul.service.d
cat > /etc/systemd/system/consul.service.d/override.conf <<EOF
[Service]
Type=exec
EOF

systemctl daemon-reload
systemctl enable consul
systemctl restart consul

echo "Consul client successfully configured on $(hostname) (${NODE_IP})!"

