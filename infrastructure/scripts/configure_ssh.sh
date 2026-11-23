sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<'EOF'
PermitRootLogin no

PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no

PubkeyAuthentication yes

MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2

X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
EOF

if [ -n "${SSH_PUB_KEY:-}" ]; then
  id -u deploy &>/dev/null || useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-deploy-user
  chmod 440 /etc/sudoers.d/99-deploy-user

  SSH_DIR="/home/deploy/.ssh"
  AUTH_KEYS="$SSH_DIR/authorized_keys"

  mkdir -p "$SSH_DIR"
  touch "$AUTH_KEYS"

  grep -qxF "$SSH_PUB_KEY" "$AUTH_KEYS" || echo "$SSH_PUB_KEY" >> "$AUTH_KEYS"

  chmod 700 "$SSH_DIR"
  chmod 600 "$AUTH_KEYS"
  chown -R deploy:deploy "$SSH_DIR"
  echo "SSH key from .env applied to user 'deploy'."
else
  echo "WARNING: SSH_PUB_KEY is not set in .env"
fi

echo "Перезапуск SSH застосування налаштувань..."
systemctl reload ssh || systemctl restart ssh
