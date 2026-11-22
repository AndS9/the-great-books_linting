# The Great Books

## Project Structure:

- `web/` - Flask REST API application and static files
- `infrastructure/` - Vagrant configuration, Consul, and VM setup scripts

# SETUP GUIDE

## Prerequisites:

- VirtualBox: https://www.virtualbox.org/wiki/Downloads
- Vagrant: https://developer.hashicorp.com/vagrant/install

### Environment Setup
Before starting the infrastructure or running the app locally, create a `.env` file in the root directory from the template:
```shell
cp .env.example .env
```

## Create VMs:

```shell
vagrant up
```

from directory where <u>*the **Vagrantfile***</u> is (`infrastructure/`)

## Accessing the Web Application:

Once all VMs are provisioned and running, access the web application through the Nginx Load Balancer:

- **Browser (Local Host)**: [http://localhost:8080](http://localhost:8080) (forwarded from the `LB` VM's port `80`)
- **Direct LB IP**: `http://192.168.56.10` (accessible from host or internal private network)

## Connect via SSH:

1. Standard Vagrant SSH (simplest way):

```shell
vagrant ssh <vm_name>
```

Example:

```shell
vagrant ssh app1
vagrant ssh DB
```

2. With secure key (if you want to use your own SSH client):

Add your own SSH key to .env file before deploying the VM or add it via `vagrant ssh` command after the VM is up.:

```shell
sudo echo '[your_new_key]' >> ~/.ssh/authorized_keys # only if logged in as vagrant user
```

Then connect to the VM using the following command`

```shell
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
- photo_url - varchar(255)
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

#### **stats** - *(knight stats and gossip)*

- user_id - int, primary key (foreign key for user)
- strength - int
- defense - int
- endurance - int
- key - varchar(64)
- next_key - datetime
- gossip_target_id - int (foreign key for user)

#### **sessions**

- id - varchar(128), primary key
- user_id - int, not null (foreign key for user)
- expires_at - timestamp, not null
- created_at - timestamp
- ip_address - varchar(15)

# Web Interface (UI Pages)

The application provides a server-rendered web interface with authentication guards:

- `GET /login` - Login and registration form (public)
- `GET /` or `GET /houses` - Main dashboard showing houses, mottos, and lords
- `GET /knights` - Knights list (visible combat stats depends on house membership / gossip)
- `GET /lords` - Lords view and house administration
- `GET /profile` - User profile, current stats, and Knight gossip key generation

---

# Authentication & Sessions

- Authentication is managed via a session cookie: `token=<session_token>` (`HttpOnly`, `SameSite=Lax`, expires in 24 hours).
- Public endpoints (`/api/auth/register`, `/api/auth/login`, `/api/health`, `/api/roles`, `/api/houses`) do not require authentication.
- All protected `/api/*` endpoints require a valid `token` cookie or return `401 Unauthorized`.
- Access-restricted endpoints validate roles/ownership and return `403 Forbidden` if permissions are insufficient.

---

# Endpoints

### Health

- `GET /api/health` - check backend status (returns `{"status": "ok", "service": "the-great-books-web"}`)

### General (Public)

- `GET /api/roles` - get all roles (`noble`, `knight`, `commonfolk`)
- `GET /api/houses` - get all houses with their names and mottos

### Authentication

- `POST /api/auth/register` - register a new user and start a session
  - Body (JSON): `username` (string, required), `password` (string, required), `role_id` (int, required), `house_id` (int, optional)
  - Success (201): sets `token` cookie and returns user info
- `POST /api/auth/login` - authenticate user and start a session
  - Body (JSON): `username` (string, required), `password` (string, required)
  - Success (200): sets `token` cookie and returns user info
- `POST /api/auth/logout` - invalidate session and clear cookie
  - Header/Cookie: `token=<token>`
  - Success (200): clears `token` cookie

### User & Houses (Authorized)

- `GET /api/me` - get current authenticated user profile, stats, and gossip status
  - Cookie: `token=<token>`
- `POST /api/me/gossip-key` - generate or refresh the daily gossip key (knights only, once every 24h)
  - Cookie: `token=<token>`
  - Returns `403` if not a knight, `429` if 24 hours have not passed since last generation
- `GET /api/knights` - get all knights
  - Cookie: `token=<token>`
  - Note: Combat stats (`strength`, `defense`, `endurance`) are revealed only for self, knights from the same house, or knights revealed via gossip
- `POST /api/gossip` - reveal hidden combat stats of a knight from another house using a gossip key
  - Cookie: `token=<token>`
  - Body (JSON): `key` (string, required - current user's gossip key), `target_id` (int, required - ID of target knight)
  - Returns `403` if key is invalid, `429` if key was already used today, `400` if target belongs to own house
- `GET /api/houses/<house_id>/members` - get all members of the user's house with their stats
  - Cookie: `token=<token>`
  - Returns `403` if user is not a member of the requested house
- `PUT/PATCH /api/houses/<house_id>` - update house name and/or motto
  - Cookie: `token=<token>`
  - Body (JSON): `name` (string, optional, max 50 chars), `motto` (string, optional, max 100 chars)
  - Returns `403` if user is not a noble or lord of this house, `409` if name is already taken