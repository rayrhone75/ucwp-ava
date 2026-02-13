#!/bin/bash
# UCWP-AVA Deployment Script for Hostinger VPS
# Run as root on the VPS

set -e

echo "=== UCWP-AVA Setup ==="

# 1. Install Ollama
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh
systemctl enable ollama
systemctl start ollama

# 2. Pull LLM model
echo "Pulling llama3.1:8b model (this may take a while)..."
ollama pull llama3.1:8b

# 3. Setup Node.js via nvm
export NVM_DIR=/root/.nvm
source /root/.nvm/nvm.sh
nvm use 20

# 4. Clone/update repo
APP_DIR="/var/www/ucwp-ava"
if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository..."
    git clone https://github.com/yourusername/ucwp-ava.git "$APP_DIR"
else
    echo "Updating repository..."
    cd "$APP_DIR"
    git pull origin main
fi

cd "$APP_DIR"

# 5. Create .env.local
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_APP_URL=https://ava.uchooseweprint.com
OLLAMA_API_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
RATE_LIMIT_RPM=20
MAX_IMAGE_SIZE_MB=15
NEXT_PUBLIC_MAIN_SITE_URL=https://uchooseweprint.com
ALLOWED_EMBED_ORIGINS=https://uchooseweprint.com,https://www.uchooseweprint.com
ENABLE_VOICE_INPUT=true
ENABLE_PREFLIGHT=true
ENVEOF
    echo "Created .env.local — edit as needed"
fi

# 6. Install deps & build
echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

# 7. Start with PM2
echo "Starting with PM2..."
pm2 delete ucwp-ava 2>/dev/null || true
pm2 start npm --name ucwp-ava -- start
pm2 save

# 8. Setup Nginx
echo "Setting up Nginx..."
cp deploy/nginx-ava.conf /etc/nginx/sites-available/ava.uchooseweprint.com
ln -sf /etc/nginx/sites-available/ava.uchooseweprint.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 9. SSL
echo "Getting SSL certificate..."
certbot --nginx -d ava.uchooseweprint.com --non-interactive --agree-tos

echo ""
echo "=== Setup Complete ==="
echo "App running at: https://ava.uchooseweprint.com"
echo "PM2 process: ucwp-ava"
echo "Ollama model: llama3.1:8b"
echo ""
echo "To embed on main site, add this to the HTML:"
echo '<script src="https://ava.uchooseweprint.com/embed.js" defer></script>'
