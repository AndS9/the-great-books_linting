#!/usr/bin/bash
NFS_SERVER="192.168.56.10"
LOCAL_DIR="/opt/web/app/static/pictures"
REMOTE_DIR="/home/deploy/pictures"
USER="deploy"

sudo apt install -y nfs-common 
sudo mkdir -p "${LOCAL_DIR}" && sudo chown -R ${USER}:${USER} "${LOCAL_DIR}"
mount -t nfs "${NFS_SERVER}:${REMOTE_DIR}" "${LOCAL_DIR}"

#Adding to fstab to mount on boot
echo "${NFS_SERVER}:${REMOTE_DIR} ${LOCAL_DIR} nfs  defaults,_netdev  0  0" | sudo tee -a /etc/fstab