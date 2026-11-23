#!/usr/bin/env bash
set -euo pipefail

echo "Очищення та блокування стандартного користувача vagrant..."

rm -f /etc/sudoers.d/vagrant

rm -rf /home/vagrant/.ssh

passwd -l vagrant || true

nohup bash -c "sleep 3 && pkill -u vagrant || true && userdel -r vagrant || true" >/dev/null 2>&1 &

echo "Користувач vagrant успішно заблокований і відправлений на видалення."
