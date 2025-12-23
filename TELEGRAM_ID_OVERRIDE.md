# Переопределение Telegram ID для тестирования

## Включение переопределения

Откройте консоль браузера (F12) и выполните:

```javascript
enableTelegramOverride(6315604689)
```

Страница перезагрузится автоматически.

## Отключение переопределения

```javascript
disableTelegramOverride()
```

Страница перезагрузится автоматически.

## Проверка текущего значения

```javascript
getTelegramOverride()
```

## Альтернативный способ (через localStorage)

Если функции не работают, можно использовать напрямую:

```javascript
localStorage.setItem('override_telegram_id', '6315604689');
location.reload();
```

Для отключения:
```javascript
localStorage.removeItem('override_telegram_id');
location.reload();
```

## Где используется

Переопределение работает в:
- `useInitialFetching` - для проверки авторизации
- `RegisterForm` - для регистрации

## Приоритет

1. `localStorage.getItem('override_telegram_id')` (если установлен и не 'disabled')
2. `VITE_DEBUG` режим (если включен)
3. Реальный Telegram WebApp ID

