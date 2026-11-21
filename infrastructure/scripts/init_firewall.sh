echo "Налаштування базового фаєрволу..."
sudo ufw disable
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent

sudo iptables -F
sudo iptables -X

sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP