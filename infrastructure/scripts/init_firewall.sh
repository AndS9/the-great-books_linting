#!/usr/bin/env bash
set -euo pipefail

echo "Налаштування базового фаєрволу..."
sudo ufw disable

sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent

sudo iptables -F
sudo iptables -X

sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p icmp --icmp-type echo-request -s 192.168.56.0/24 -j ACCEPT
#Rule to allow nfs sharing in the local network
sudo iptables -A INPUT -p tcp -s 192.168.56.0/24 --dport 2049 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP