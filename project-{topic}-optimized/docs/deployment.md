```markdown
# Scrapineer Deployment Guide

This document outlines the steps to deploy the Scrapineer application to a production environment. It assumes a Linux-based server (e.g., AWS EC2, DigitalOcean Droplet) and leverages Docker and Docker Compose for ease of deployment.

## Table of Contents

1.  [Deployment Strategy Overview](#1-deployment-strategy-overview)
2.  [Prerequisites](#2-prerequisites)
3.  [Server Setup](#3-server-setup)
4.  [Application Deployment (Docker Compose)](#4-application-deployment-docker-compose)
    *   [Step 1: SSH into your Server](#step-1-ssh-into-your-server)
    *   [Step 2: Clone the Repository](#step-2-clone-the-repository)
    *   [Step 3: Prepare Environment Variables](#step-3-prepare-environment-variables)
    *   [Step 4: Build and Deploy](#step-4-build-and-deploy)
5.  [Post-Deployment Checks](#5-post-deployment-checks)
6.  [Updating the Application](#6-updating-the-application)
7.  [Scaling and High Availability (Advanced)](#7-scaling-and-high-availability-advanced)
8.  [Security Best Practices](#8-security-best-practices)
9.  [Troubleshooting](#9-troubleshooting)

## 1. Deployment Strategy Overview

The recommended deployment strategy for Scrapineer is using Docker and Docker Compose. This provides:
*   **Containerization:** Isolates the application and its dependencies.
*   **Portability:** The same setup works across different environments.
*   **Reproducibility:** Ensures consistent deployments.
*   **Ease of Management:** Simple commands for starting, stopping, and updating the application stack (application + database).

For a single server deployment, Docker Compose is sufficient. For high availability and larger scale, Kubernetes or similar orchestration tools would be considered (see [Scaling and High Availability](#7-scaling-and-high-availability-advanced)).

## 2. Prerequisites

*   **Production Server:** A Linux server (e.g., Ubuntu, CentOS) with sufficient CPU, RAM, and disk space.
*   **SSH Access:** With a user having `sudo` privileges.
*   **Domain Name (Optional but Recommended):** Configured with DNS records pointing to your server's IP address.
*   **Docker & Docker Compose:** Installed on your production server.
*   **Git:** Installed on your production server.
*   **Java 17 JDK & Maven:** Only needed if you plan to build the JAR directly on the server (not recommended). Preferably, build the Docker image locally or via CI/CD and push to a registry.
*   **Docker Hub Account / Private Registry:** For storing your application's Docker image if using CI/CD.

## 3. Server Setup

1.  **Update System:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```
2.  **Install Docker:**
    Follow the official Docker installation guide for your Linux distribution.
    For Ubuntu:
    ```bash
    sudo apt-get update
    sudo apt-get install ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```
3.  **Add User to Docker Group (Optional but Recommended):**
    Allows running Docker commands without `sudo`. You'll need to log out and back in for this to take effect.
    ```bash
    sudo usermod -aG docker ${USER}
    ```
4.  **Install Git:**
    ```bash
    sudo apt install git -y
    ```
5.  **Firewall Configuration (UFW - Ubuntu):**
    Allow SSH, HTTP (80), and HTTPS (443) traffic. If you expose PostgreSQL or pgAdmin, restrict access to trusted IPs only.
    ```bash
    sudo ufw allow ssh
    sudo ufw allow http
    sudo ufw allow https
    # If exposing pgAdmin locally, allow port 5050 from specific IP
    # sudo ufw allow from YOUR_IP to any port 5050
    sudo ufw enable
    ```

## 4. Application Deployment (Docker Compose)

### Step 1: SSH into your Server

```bash
ssh your_user@your_server_ip_or_domain
```

### Step 2: Clone the Repository

Clone your Scrapineer repository to a suitable directory, e.g., `/opt/scrapineer`.

```bash
sudo mkdir -p /opt/scrapineer
sudo chown -R ${USER}:${USER} /opt/scrapineer # Give ownership to your user
cd /opt/scrapineer
git clone https://github.com/your-username/scrapineer.git . # Clone into current directory
```

### Step 3: Prepare Environment Variables

Production environments should use environment variables for sensitive data and dynamic configurations.

Create an `.env` file in the root of your project directory (`/opt/scrapineer/.env`).
**Example `.env` file content:**

```dotenv
# .env (for production environment)

# --- Application Configuration ---
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080 # Default for Spring Boot

# JWT Secret (MUST be strong and unique, e.g., generated by `openssl rand -base64 32`)
JWT_SECRET=your_very_secure_and_long_jwt_secret_key_that_is_at_least_32_characters_long_and_random

# --- Database Configuration ---
POSTGRES_DB=scrapineer_db
POSTGRES_USER=scrapineer_user # Change this to a strong, unique username
POSTGRES_PASSWORD=your_strong_database_password # Change this to a strong, random password
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/${POSTGRES_DB} #