# Опросник (Questionnaire) — что должен принимать бэкенд

## Эндпоинт

**POST** `https://vehicle-tracker.skybud.de/api/v1/questionnaire/{start_state_id}`

(Либо ваш текущий базовый URL опросника: `{VEHICLE_TRACKER_API_BASE}/questionnaire/{start_state_id}`.)

## Тело запроса (JSON)

Фронтенд отправляет те же поля, что и раньше, плюс два новых для рабочей поездки «на объект»:

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `reason_type` | `"WORK"` \| `"PERSONAL"` | да | Тип поездки |
| `work_type` | `string` | при `reason_type === "WORK"` | Подтип рабочей поездки: `"Домой"`, `"На объект"`, `"Мойка"`, `"Заправка"`, `"Сервис"`, `"За запчастями"` |
| `facility_id` | `number` | при `work_type === "На объект"` | ID объекта из **bot-api** (список объектов: `GET /api/v1/facility/`) |
| `reason` | string | да | Причина поездки |
| `destination_description` | string | да | Описание места назначения |
| `destination_lat` | number | да | Широта |
| `destination_lng` | number | да | Долгота |

## Пример тела

**Рабочая поездка «Домой»:**

```json
{
  "reason_type": "WORK",
  "work_type": "Домой",
  "reason": "Конец смены",
  "destination_description": "Дом",
  "destination_lat": 50.4501,
  "destination_lng": 30.5234
}
```

**Рабочая поездка «На объект» (с объектом):**

```json
{
  "reason_type": "WORK",
  "work_type": "На объект",
  "facility_id": 10,
  "reason": "Монтаж на объекте",
  "destination_description": "Электрика Gormannstraße 22",
  "destination_lat": 52.52,
  "destination_lng": 13.40
}
```

**Рабочая поездка (например, Мойка/Заправка/Сервис/За запчастями)** — без `facility_id`:

```json
{
  "reason_type": "WORK",
  "work_type": "Заправка",
  "reason": "Заправка авто",
  "destination_description": "АЗС на ул. Главной",
  "destination_lat": 50.45,
  "destination_lng": 30.52
}
```

**Личная поездка** (без `work_type` и `facility_id`):

```json
{
  "reason_type": "PERSONAL",
  "reason": "Личные дела",
  "destination_description": "Магазин",
  "destination_lat": 50.45,
  "destination_lng": 30.52
}
```

## Откуда берётся `facility_id`

- Список объектов фронтенд получает из **bot-api**:  
  **GET** `https://bot-api.skybud.de/api/v1/facility/?limit=100&offset=0`  
  с заголовком авторизации (например `Authorization: <token>`).
- В ответе — массив объектов с полями `id`, `name`, `facility_type_id` и др.
- В запрос опросника уходит выбранный `id` объекта как `facility_id`.

## Рекомендации для бэкенда

1. Принимать в одном и том же эндпоинте **POST** `.../questionnaire/{start_state_id}`:
   - `work_type` — опционально, только при `reason_type === "WORK"`.
   - `facility_id` — опционально; при `work_type === "На объект"` считать его обязательным и проверять, что объект существует (например, сверка с bot-api или своей БД).
2. Сохранять `work_type` и `facility_id` в той же сущности, что и остальные поля опросника (например, в записи «ответ на опросник» или в поездке), чтобы дальше использовать для отчётов и логики (например, привязка поездки к объекту).
