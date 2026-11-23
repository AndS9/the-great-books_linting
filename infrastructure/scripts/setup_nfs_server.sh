#!/usr/bin/bash
NFS_DIR="/home/vagrant/pictures"
NFS_NETWORK="192.168.56.0/24"
USER="vagrant"

sudo apt install -y nfs-kernel-server
mkdir -p "${NFS_DIR}" && sudo chown -R ${USER}:${USER} "${NFS_DIR}"
echo "${NFS_DIR} ${NFS_NETWORK}(rw,sync,no_subtree_check)" | sudo tee -a /etc/exports && sudo exportfs -r