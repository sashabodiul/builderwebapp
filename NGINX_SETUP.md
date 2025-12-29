# Настройка Nginx и SSL для web-app.skybud.de

## Предварительные требования

1. A-запись для домена `web-app.skybud.de` должна указывать на IP вашего сервера (уже настроено на dynadot)
2. Порты 80 и 443 должны быть открыты в файрволе
3. На сервере установлены: nginx, certbot, docker, docker-compose
4. Nginx уже настроен для других доменов (например, api-crm.skybud.de)

## Установка

### 1. Запустите приложение в Docker

```bash
cd ~/builderwebapp
docker compose up -d
```

Приложение будет доступно на `http://127.0.0.1:3001` (только локально, для nginx)

### 2. Настройте nginx и получите SSL сертификат

Запустите скрипт настройки от root:

```bash
sudo ./setup-nginx.sh
```

Скрипт:
- Скопирует конфигурацию nginx в `/etc/nginx/sites-available/`
- Создаст симлинк в `/etc/nginx/sites-enabled/`
- Проверит конфигурацию nginx
- Получит SSL сертификат через certbot
- Настроит автоматическое перенаправление HTTP → HTTPS

### 3. Проверьте работу

После успешного выполнения скрипта ваш сайт должен быть доступен по адресу:
- **HTTPS**: https://web-app.skybud.de
- HTTP запросы автоматически перенаправляются на HTTPS

## Управление

### Запуск/остановка приложения

```bash
# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart
```

### Просмотр логов

```bash
# Логи приложения
docker compose logs -f skybud-webapp

# Логи nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Управление nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка конфигурации
sudo systemctl reload nginx

# Перезапуск nginx
sudo systemctl restart nginx

# Статус nginx
sudo systemctl status nginx
```

### Обновление SSL сертификата

Certbot автоматически обновляет сертификаты через systemd timer. Для ручного обновления:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

Проверка автоматического обновления:
```bash
sudo systemctl status certbot.timer
```

## Структура файлов

- `nginx/web-app.skybud.de.conf` - конфигурация nginx для домена
- `setup-nginx.sh` - скрипт автоматической настройки nginx и certbot
- `docker-compose.yml` - конфигурация Docker (только приложение, без nginx)

## Конфигурация на сервере

После выполнения скрипта на сервере будут созданы:
- `/etc/nginx/sites-available/web-app.skybud.de.conf` - конфигурация nginx
- `/etc/nginx/sites-enabled/web-app.skybud.de.conf` - симлинк на конфигурацию
- `/etc/letsencrypt/live/web-app.skybud.de/` - SSL сертификаты

## Примечания

- Приложение работает в Docker на порту 3001 (localhost)
- Nginx проксирует запросы с `web-app.skybud.de` на `127.0.0.1:3001`
- Certbot автоматически обновляет сертификаты через systemd
- Все HTTP запросы автоматически перенаправляются на HTTPS
- Конфигурация совместима с существующими настройками nginx для других доменов

