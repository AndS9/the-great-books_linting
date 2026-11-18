#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y curl gnupg

curl -fsSL https://apt.releases.hashicorp.com/gpg \
  | gpg --batch --yes --dearmor \
      -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" \
  > /etc/apt/sources.list.d/hashicorp.list

apt-get update
apt-get install -y consul

mkdir -p /etc/consul.d /opt/consul
cp /tmp/consul.hcl /etc/consul.d/consul.hcl
chown -R consul:consul /etc/consul.d /opt/consul

# for some reason consul is constantly in activating state, not ideal override is to change Type to exec instead
# of notify for now, as we don't need consul to do anything yet
mkdir -p /etc/systemd/system/consul.service.d

cat > /etc/systemd/system/consul.service.d/override.conf <<EOF
[Service]
Type=exec
EOF
systemctl daemon-reload
systemctl enable consul
systemctl restart consul
