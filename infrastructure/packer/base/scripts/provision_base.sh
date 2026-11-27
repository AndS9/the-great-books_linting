#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y curl gnupg ca-certificates iptables iptables-persistent

mkdir -p /usr/share/keyrings
curl -fsSL https://apt.releases.hashicorp.com/gpg \
  | gpg --batch --yes --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/hashicorp.list

apt-get update -y
apt-get install -y consul

mkdir -p /etc/consul.d /var/lib/consul
chown -R consul:consul /etc/consul.d /var/lib/consul