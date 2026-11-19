#!/usr/bin/env bash

set -euo pipefail

apt-get update
apt-get install -y nginx curl

#Load balancer and proxy pass configuration
cat > /etc/nginx/sites-available/the-great-books <<'EOF'
upstream the_great_books {
    server 192.168.56.2:5000 max_fails=3 fail_timeout=10s;
    server 192.168.56.3:5000 max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://the_great_books;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
EOF

#Create soft link to share same data
ln -sf /etc/nginx/sites-available/the-great-books /etc/nginx/sites-enabled/the-great-books

rm -f /etc/nginx/sites-enabled/default

#check nginx config
nginx -t

systemctl enable nginx
systemctl restart nginx
