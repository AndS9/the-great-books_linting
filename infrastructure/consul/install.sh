#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y curl gnupg

sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8300 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8301 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p udp --dport 8301 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8302 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p udp --dport 8302 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8500 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p tcp --dport 8600 -j ACCEPT
sudo iptables -A INPUT -s 192.168.56.0/24 -p udp --dport 8600 -j ACCEPT
sudo netfilter-persistent save

curl -fsSL https://apt.releases.hashicorp.com/gpg \
  | gpg --batch --yes --dearmor \
      -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/hashicorp.list

apt-get update
apt-get install -y consul

mkdir -p /etc/consul.d /var/lib/consul
cp /tmp/consul.hcl /etc/consul.d/consul.hcl
chown -R consul:consul /etc/consul.d /var/lib/consul

mkdir -p /etc/systemd/system/consul.service.d

cat > /etc/systemd/system/consul.service.d/override.conf <<EOF
[Service]
Type=exec
EOF
systemctl daemon-reload
systemctl enable consul
systemctl restart consul
