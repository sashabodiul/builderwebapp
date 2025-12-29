#!/bin/bash

# Скрипт для проверки логов nginx и приложения
# Запускать на сервере

DOMAIN="web-app.skybud.de"

echo "=== Логи для ${DOMAIN} ==="
echo ""

echo "1. Последние ошибки nginx для ${DOMAIN}:"
echo "---"
sudo grep "${DOMAIN}" /var/log/nginx/error.log 2>/dev/null | tail -10 || echo "Ошибок не найдено"
echo "---"
echo ""

echo "2. Последние записи access.log для ${DOMAIN}:"
echo "---"
sudo grep "${DOMAIN}" /var/log/nginx/access.log 2>/dev/null | tail -10 || echo "Записей не найдено"
echo "---"
echo ""

echo "3. Логи Docker контейнера:"
echo "---"
docker compose logs --tail=20 skybud-webapp 2>/dev/null || echo "Контейнер не запущен или логи недоступны"
echo "---"
echo ""

echo "4. Проверка доступности приложения на порту 3001:"
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001 | grep -q "200\|301\|302"; then
    echo "   ✓ Приложение отвечает на порту 3001"
    echo "   Ответ:"
    curl -s -I http://127.0.0.1:3001 | head -5
else
    echo "   ✗ Приложение НЕ отвечает на порту 3001"
    echo "   Проверьте: docker compose ps"
fi
echo ""

echo "=== Мониторинг в реальном времени ==="
echo ""
echo "Для просмотра ошибок nginx в реальном времени:"
echo "  sudo tail -f /var/log/nginx/error.log | grep ${DOMAIN}"
echo ""
echo "Для просмотра всех запросов nginx:"
echo "  sudo tail -f /var/log/nginx/access.log | grep ${DOMAIN}"
echo ""
echo "Для просмотра логов приложения:"
echo "  docker compose logs -f skybud-webapp"

