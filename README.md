
# SETUP GUIDE


## Installing vagrant:

https://developer.hashicorp.com/vagrant/install

## Create VMs:

```jsx
vagrant up
```

from directory where <u>*the **Vagrantfile***</u> is

## Connect via SSH:

1. WIth path to vagrant private key

```jsx
ssh  -i  path_to_vagrant_private_key  vagrant@ip
```

Windows example:

```jsx
ssh -i C:\Users\admin\.vagrant.d\insecure_private_key vagrant@192.168.56.2
```

1. Copy vagrant private key to .ssh folder

```jsx
cp path_to_vagrant.d/insecure_private_key ~/.ssh/id_rsa
```

```jsx
ssh vagrant@ip
```
    
# Database Structure

### users

- id - int
- username - varchar(50), not null
- password - varchar(100), not null (encrypted password)
- role_id - int, not null (foreign key for role)
- house_id - int,  (foreign key for house)

#### **roles**

- id - int
- role_name - varchar(50), unique, not null

#### **houses**

- id
- name - varchar(50), not null, unique
- motto - varchar(100)
- lord_id - int, not null (foreign key for user)

#### **stats**

- user_id - int (foreign key for user)
- strength - int
- defense - int
- endurance - int

#### **sessions**

- id - varchar(128)
- user_id - int, (foreign key for user)
- expires_at - timestamp
- created_at - timestamp
- ip_address - varchar(15)

# Vagrant VMs

## VMs specifications:

OS: Ubuntu 22.04 LTS

user: vagrant

### app:

512MB, 1 cpu

ip: 192.168.56.2, 192.168.56.3

### LB:

512MB, 1 cpu

ip: 192.168.56.1

### DB:

2048MB, 2 cpu

ip: 192.168.56.4

### Consul:

512MB, 1 cpu

ip: 192.168.56.5

# Endpoints

