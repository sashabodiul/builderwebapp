#!/bin/bash

# Скрипт для настройки nginx и certbot для web-app.skybud.de
# Запускать на сервере от root

set -e

DOMAIN="web-app.skybud.de"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Настройка nginx и SSL для ${DOMAIN} ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "Ошибка: скрипт должен быть запущен от root"
    exit 1
fi

# 1. Создаем временную конфигурацию nginx (только HTTP, без SSL)
echo "1. Создание временной конфигурации nginx (HTTP only)..."
cat > "${NGINX_CONF}" <<EOF
server {
    server_name ${DOMAIN};
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    listen 80;
}
EOF

# 2. Создаем симлинк
echo "2. Создание симлинка в sites-enabled..."
if [ -L "${NGINX_ENABLED}" ]; then
    echo "   Симлинк уже существует, удаляем старый..."
    rm "${NGINX_ENABLED}"
fi
ln -s "${NGINX_CONF}" "${NGINX_ENABLED}"

# 3. Проверяем конфигурацию nginx
echo "3. Проверка конфигурации nginx..."
nginx -t

# 4. Перезагружаем nginx (без SSL пока)
echo "4. Перезагрузка nginx..."
systemctl reload nginx

# 5. Получаем SSL сертификат (certbot автоматически обновит конфигурацию)
echo "5. Получение SSL сертификата от Let's Encrypt..."
read -p "Введите email для Let's Encrypt: " email

certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "${email}" --redirect

# 6. Финальная проверка и перезагрузка
echo "6. Финальная проверка конфигурации..."
nginx -t
systemctl reload nginx

echo ""
echo "=== Готово! ==="
echo "Сайт доступен по адресу: https://${DOMAIN}"
echo ""
echo "Для проверки статуса nginx: systemctl status nginx"
echo "Для просмотра логов: tail -f /var/log/nginx/error.log"

