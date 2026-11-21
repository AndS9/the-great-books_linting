# The Great Books

## Project Structure:

- `backend/` - Flask REST API application
- `frontend/` - HTML, CSS and JS interface
- `infrastructure/` - Vagrant configuration, Consul, and VM setup scripts

# SETUP GUIDE

## Prerequisites:

- VirtualBox: https://www.virtualbox.org/wiki/Downloads
- Vagrant: https://developer.hashicorp.com/vagrant/install

### Environment Setup
Before starting the infrastructure or running the app locally, create a `.env` file in the root directory from the template:
```
cp .env.example .env
```

## Create VMs:

```jsx
vagrant up
```

from directory where <u>*the **Vagrantfile***</u> is (`infrastructure/`)

## Connect via SSH:

1. Standard Vagrant SSH (simplest way):

```jsx
vagrant ssh <vm_name>
```

Example:

```jsx
vagrant ssh app1
vagrant ssh DB
```

2. With path to vagrant private key:

```jsx
ssh  -i  path_to_vagrant_private_key  vagrant@ip
```

Windows example:

```jsx
ssh -i C:\Users\admin\.vagrant.d\insecure_private_key vagrant@192.168.56.2
```

3. Copy vagrant private key to .ssh folder:

```jsx
cp path_to_vagrant.d/insecure_private_key ~/.ssh/id_rsa
```

```jsx
ssh vagrant@ip
```

# Vagrant VMs

## VMs specifications:

OS: Ubuntu 22.04 LTS

user: vagrant

### app:

512MB, 1 cpu

ip: 192.168.56.2, 192.168.56.3

### LB:

512MB, 1 cpu

ip: 192.168.56.10

### DB:

2048MB, 2 cpu (or 1 cpu on Windows if Hyper-V/WHPX is enabled)

ip: 192.168.56.4

### Consul:

512MB, 1 cpu

ip: 192.168.56.5

# Database Structure

### *After changing the model run this (from /web/ folder):* 

```bash
flask db migrate -m "[message]" # to save the changes in the migration folder
flask db upgrade # to apply the changes to the database
```

### users

- id - int, primary key
- username - varchar(50), not null, unique
- password - varchar(255), not null (encrypted password)
- role_id - int, not null (foreign key for role)
- house_id - int (foreign key for house)

#### **roles**

- id - int, primary key
- role_name - varchar(50), unique, not null

#### **houses**

- id - int, primary key
- name - varchar(50), not null, unique
- motto - varchar(100)
- lord_id - int, not null (foreign key for user)

#### **stats**

- user_id - int, primary key (foreign key for user)
- strength - int
- defense - int
- endurance - int

#### **sessions**

- id - varchar(128), primary key
- user_id - int, not null (foreign key for user)
- expires_at - timestamp, not null
- created_at - timestamp
- ip_address - varchar(15)

# Endpoints

### Health

- `GET /api/health` - check backend status

### General

- `GET /api/roles` - get all roles
- `GET /api/houses` - get all houses

### Authentication

- `POST /api/auth/register` - register new user
  - body (JSON): `username`, `password`, `role_id`, `house_id`
- `POST /api/auth/login` - login and receive session token
  - body (JSON): `username`, `password`
- `POST /api/auth/logout` - logout
  - header: `Authorization: Bearer <token>`

### User & Houses (Authorized)

- `GET /api/me` - get current user profile and stats
  - header: `Authorization: Bearer <token>`
- `GET /api/houses/<id>/members` - get members of current user's house
  - header: `Authorization: Bearer <token>`
