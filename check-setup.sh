#!/bin/bash

# Скрипт для диагностики настройки web-app.skybud.de
# Запускать на сервере

DOMAIN="web-app.skybud.de"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"

echo "=== Диагностика настройки ${DOMAIN} ==="
echo ""

# Проверка конфигурации nginx
echo "1. Проверка конфигурации nginx:"
if [ -f "${NGINX_CONF}" ]; then
    echo "   ✓ Файл конфигурации существует: ${NGINX_CONF}"
else
    echo "   ✗ Файл конфигурации НЕ существует: ${NGINX_CONF}"
    echo "   → Запустите: sudo ./setup-nginx.sh"
fi

if [ -L "${NGINX_ENABLED}" ] || [ -f "${NGINX_ENABLED}" ]; then
    echo "   ✓ Симлинк/файл в sites-enabled существует: ${NGINX_ENABLED}"
    if [ -L "${NGINX_ENABLED}" ]; then
        echo "   → Ссылается на: $(readlink -f ${NGINX_ENABLED})"
    fi
else
    echo "   ✗ Симлинк в sites-enabled НЕ существует: ${NGINX_ENABLED}"
    echo "   → Создайте: sudo ln -s ${NGINX_CONF} ${NGINX_ENABLED}"
fi

echo ""
echo "2. Проверка активных конфигураций nginx:"
if command -v nginx &> /dev/null; then
    echo "   Активные конфигурации в sites-enabled:"
    ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -E "\.conf$|web-app" || echo "   (не найдено)"
    
    echo ""
    echo "   Проверка синтаксиса nginx:"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✓ Синтаксис nginx корректен"
    else
        echo "   ✗ Ошибки в конфигурации nginx:"
        sudo nginx -t
    fi
else
    echo "   ✗ nginx не установлен"
fi

echo ""
echo "3. Проверка Docker контейнера:"
if docker ps | grep -q "skybud-webapp"; then
    echo "   ✓ Контейнер skybud-webapp запущен"
    docker ps | grep skybud-webapp
else
    echo "   ✗ Контейнер skybud-webapp НЕ запущен"
    echo "   → Запустите: docker compose up -d"
fi

echo ""
echo "4. Проверка порта 3001:"
if netstat -tuln 2>/dev/null | grep -q ":3001" || ss -tuln 2>/dev/null | grep -q ":3001"; then
    echo "   ✓ Порт 3001 слушается"
    netstat -tuln 2>/dev/null | grep ":3001" || ss -tuln 2>/dev/null | grep ":3001"
else
    echo "   ✗ Порт 3001 НЕ слушается"
    echo "   → Проверьте, что приложение запущено: docker compose ps"
fi

echo ""
echo "5. Проверка SSL сертификата:"
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "   ✓ SSL сертификат существует"
    echo "   → Сертификат: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
else
    echo "   ✗ SSL сертификат НЕ найден"
    echo "   → Получите сертификат: sudo certbot --nginx -d ${DOMAIN}"
fi

echo ""
echo "6. Проверка конфигурации домена в nginx:"
if [ -f "${NGINX_CONF}" ]; then
    echo "   Содержимое конфигурации:"
    echo "   ---"
    cat "${NGINX_CONF}" | head -20
    echo "   ---"
fi

echo ""
echo "7. Проверка логов nginx для домена:"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "   Последние ошибки для ${DOMAIN}:"
    sudo grep "${DOMAIN}" /var/log/nginx/error.log 2>/dev/null | tail -5 || echo "   (ошибок не найдено)"
    echo ""
    echo "   Последние записи access.log для ${DOMAIN}:"
    sudo grep "${DOMAIN}" /var/log/nginx/access.log 2>/dev/null | tail -5 || echo "   (записей не найдено)"
else
    echo "   ✗ Файл логов не найден"
fi

echo ""
echo "=== Рекомендации ==="
echo ""
if [ ! -f "${NGINX_CONF}" ]; then
    echo "1. Запустите скрипт настройки: sudo ./setup-nginx.sh"
elif [ ! -L "${NGINX_ENABLED}" ] && [ ! -f "${NGINX_ENABLED}" ]; then
    echo "1. Создайте симлинк: sudo ln -s ${NGINX_CONF} ${NGINX_ENABLED}"
    echo "2. Перезагрузите nginx: sudo systemctl reload nginx"
elif ! docker ps | grep -q "skybud-webapp"; then
    echo "1. Запустите приложение: docker compose up -d"
else
    echo "Если все проверки пройдены, но сайт не работает:"
    echo "1. Проверьте логи nginx для домена: sudo grep '${DOMAIN}' /var/log/nginx/error.log"
    echo "2. Проверьте логи приложения: docker compose logs skybud-webapp"
    echo "3. Проверьте доступность приложения: curl http://127.0.0.1:3001"
    echo "4. Убедитесь, что домен указывает на правильный IP: dig ${DOMAIN}"
    echo ""
    echo "Для мониторинга логов в реальном времени:"
    echo "  sudo tail -f /var/log/nginx/error.log | grep ${DOMAIN}"
fi

