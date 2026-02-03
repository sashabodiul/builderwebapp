# Инструкция для бэкенда: Chunked Upload

## Обзор

Фронтенд разбивает большие файлы (видео и фото) на чанки по 5MB и загружает их последовательно через специальный эндпоинт. После загрузки всех чанков, файлы собираются на бэкенде и используются в финальном запросе завершения работы.

## Эндпоинт для загрузки чанков

### POST `/api/v1/upload/chunk`

**Описание:** Загружает один чанк файла. Бэкенд должен собирать чанки и возвращать `file_id` после загрузки последнего чанка.

**Заголовки:**
```
Accept: application/json
Authorization: 8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2
Content-Type: multipart/form-data (устанавливается автоматически)
```

**Параметры (FormData):**
- `file_id` (string, required) - Уникальный идентификатор файла (генерируется на фронтенде)
- `chunk_index` (int, required) - Индекс текущего чанка (начинается с 0)
- `total_chunks` (int, required) - Общее количество чанков для этого файла
- `file_name` (string, required) - Оригинальное имя файла
- `file_type` (string, required) - Тип файла: `"video"` или `"photo"`
- `chunk` (file, required) - Бинарные данные чанка (Blob)

**Пример запроса:**
```python
@router.post("/upload/chunk")
async def upload_chunk(
    file_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    file_name: str = Form(...),
    file_type: str = Form(...),
    chunk: UploadFile = File(...),
):
    # Логика сохранения чанка
    # ...
```

**Логика работы:**

1. **Первый чанк (chunk_index = 0):**
   - Создать временный файл или запись в БД для `file_id`
   - Сохранить чанк
   - Вернуть ответ с информацией о прогрессе

2. **Последующие чанки (chunk_index > 0):**
   - Найти существующий файл по `file_id`
   - Добавить чанк к существующему файлу
   - Проверить, все ли чанки загружены

3. **Последний чанк (chunk_index + 1 == total_chunks):**
   - Объединить все чанки в один файл
   - Сохранить финальный файл (в хранилище или БД)
   - Вернуть `file_id` для использования в финальном запросе

**Ответ (JSON):**
```json
{
  "file_id": "string",
  "chunk_index": 0,
  "total_chunks": 5,
  "uploaded": true
}
```

**Ошибки:**
- `400` - Неверные параметры
- `404` - Файл с таким `file_id` не найден (для chunk_index > 0)
- `500` - Ошибка сервера

## Поддержка параллельной загрузки чанков

Чтобы фронтенд мог отправлять чанки **параллельно** (несколько запросов одновременно), бэкенд должен принимать чанки **в любом порядке** и собирать файл по `chunk_index`.

### Требования к эндпоинту `/api/v1/upload/chunk`

1. **Идемпотентность:**
   - Если чанк с тем же `file_id` + `chunk_index` уже сохранен, вернуть успех без ошибки.

2. **Хранение чанков по индексу:**
   - Сохранять каждый чанк в отдельный файл:  
     `tmp/{file_id}/{chunk_index}.part`
   - Или хранить в БД/Redis с ключом `{file_id}:{chunk_index}`.

3. **Атомарность и блокировки:**
   - Операции записи одного чанка должны быть атомарными.
   - Для финальной сборки использовать lock на `file_id`, чтобы избежать гонок.

4. **Проверка целостности:**
   - Валидация `chunk_index` (0..total_chunks-1).
   - `total_chunks` должен совпадать для всех чанков одного `file_id`.
   - Опционально: поддержка `chunk_size` и `chunk_hash` для доп. проверки.

5. **Определение готовности к сборке:**
   - После каждого успешного чанка проверять, что количество сохраненных чанков == `total_chunks`.
   - Если да — запускать сборку (можно синхронно или в фоне).

6. **Сборка в правильном порядке:**
   - Чтение файлов в порядке `chunk_index` (0..total_chunks-1).
   - Сборка в единый файл с последующей загрузкой в хранилище.

7. **Очистка:**
   - Удалять `tmp/{file_id}` после успешной сборки.
   - TTL для незавершенных загрузок (например, 24 часа).

### Рекомендуемые ответы

```json
{
  "file_id": "string",
  "chunk_index": 2,
  "total_chunks": 10,
  "uploaded": true,
  "is_complete": false
}
```

После сборки:

```json
{
  "file_id": "string",
  "chunk_index": 9,
  "total_chunks": 10,
  "uploaded": true,
  "is_complete": true
}
```

### Пример схемы хранения

```
tmp/
  {file_id}/
    0.part
    1.part
    ...
    9.part
```

### Важные замечания

- Параллельная отправка требует, чтобы эндпоинт **не ожидал последовательные индексы**.
- Если текущая реализация проверяет последовательность (0,1,2...), эту проверку нужно удалить или заменить на проверку диапазона + количество сохраненных чанков.

## Модификация эндпоинта `/api/v1/work/end`

Эндпоинт должен поддерживать два режима работы:

### Режим 1: Прямая загрузка файлов (для маленьких файлов < 10MB)

**Параметры (как сейчас):**
- `worker_id` (int)
- `latitude` (float)
- `longitude` (float)
- `status_object_finished` (bool)
- `report_video` (UploadFile, optional)
- `done_work_photos` (List[UploadFile], optional)
- `instrument_photos` (List[UploadFile], optional)

### Режим 2: Использование file_id (для больших файлов > 10MB)

**Параметры:**
- `worker_id` (int)
- `latitude` (float)
- `longitude` (float)
- `status_object_finished` (bool)
- `report_video_id` (string, optional) - ID загруженного через chunked upload видео
- `done_work_photos_ids` (List[string], optional) - Список ID загруженных фото работ
- `instrument_photos_ids` (List[string], optional) - Список ID загруженных фото инструментов

**Логика:**
```python
@router.post("/end")
async def end_work(
    worker_id: int = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    status_object_finished: bool = Form(...),
    # Прямая загрузка (для маленьких файлов)
    report_video: Optional[UploadFile] = File(None),
    done_work_photos: Optional[List[UploadFile]] = File([]),
    instrument_photos: Optional[List[UploadFile]] = File([]),
    # Chunked upload (для больших файлов)
    report_video_id: Optional[str] = Form(None),
    done_work_photos_ids: Optional[List[str]] = Form([]),
    instrument_photos_ids: Optional[List[str]] = Form([]),
):
    # Если есть file_id, использовать их
    if report_video_id:
        # Получить файл по file_id из хранилища
        video_file = get_file_by_id(report_video_id)
        # Использовать video_file вместо report_video
    elif report_video:
        # Использовать напрямую загруженный файл
        video_file = report_video
    
    # Аналогично для фото
    # ...
```

## Рекомендации по реализации

1. **Хранение чанков:**
   - Использовать временное хранилище (например, Redis или временные файлы)
   - Очищать незавершенные загрузки через 24 часа

2. **Объединение чанков:**
   - После получения последнего чанка объединить все чанки в один файл
   - Сохранить финальный файл в постоянное хранилище (S3, локальная файловая система и т.д.)

3. **Валидация:**
   - Проверять, что `chunk_index` идет последовательно (0, 1, 2, ...)
   - Проверять, что `total_chunks` одинаковый для всех чанков одного файла
   - Проверять размер каждого чанка (максимум 5MB + небольшой запас)

4. **Безопасность:**
   - Проверять авторизацию через `Authorization` заголовок
   - Валидировать `file_type` (только "video" или "photo")
   - Ограничить максимальный размер файла (например, 500MB)

5. **Очистка:**
   - Удалять временные файлы после успешной загрузки
   - Удалять незавершенные загрузки через определенное время (TTL)

## Пример структуры данных для хранения чанков

```python
# Временная структура для хранения информации о загрузке
class ChunkUpload:
    file_id: str
    file_name: str
    file_type: str  # "video" or "photo"
    total_chunks: int
    uploaded_chunks: Dict[int, bytes]  # chunk_index -> chunk_data
    created_at: datetime
    last_chunk_at: datetime
```

## Пример полного цикла

1. Фронтенд отправляет чанк 0/5 → Бэкенд сохраняет чанк 0
2. Фронтенд отправляет чанк 1/5 → Бэкенд сохраняет чанк 1
3. Фронтенд отправляет чанк 2/5 → Бэкенд сохраняет чанк 2
4. Фронтенд отправляет чанк 3/5 → Бэкенд сохраняет чанк 3
5. Фронтенд отправляет чанк 4/5 → Бэкенд объединяет все чанки, сохраняет финальный файл, возвращает `file_id`
6. Фронтенд отправляет `/work/end` с `report_video_id=file_id` → Бэкенд использует сохраненный файл

---

## Инструкция для фронтенда: параллельная загрузка чанков

База: `https://bot-api.skybud.de/api/v1`

### Эндпоинт
- `POST /upload/chunk`
  - Body (Form):
    - `file_id` — UUID/строка, общий ID файла для всех чанков
    - `chunk_index` — индекс чанка (0..total_chunks-1)
    - `total_chunks` — общее количество чанков
    - `file_name` — исходное имя файла
    - `file_type` — `video` или `photo`
    - `chunk` — бинарные данные чанка
    - `chunk_size?` — размер чанка (опционально)
    - `chunk_hash?` — SHA256 хеш чанка (опционально)

### Как подключить
1. Сгенерировать `file_id` (например, `uuidv4()`).
2. Разбить файл на чанки.
3. Отправлять чанки **параллельно** в любом порядке на `/upload/chunk`.
4. После каждого ответа проверять `is_complete`.
5. Когда `is_complete=true`, `file_id` готов для использования в других эндпоинтах (например, передать `report_video_id`).

### Ответ
```json
{
  "file_id": "string",
  "chunk_index": 2,
  "total_chunks": 10,
  "uploaded_chunks": 7,
  "uploaded": true,
  "is_complete": false
}
```

После сборки:
```json
{
  "file_id": "string",
  "chunk_index": 9,
  "total_chunks": 10,
  "uploaded_chunks": 10,
  "uploaded": true,
  "is_complete": true
}
```

### Важные правила
- Чанки можно отправлять **в любом порядке**.
- Повторная отправка того же чанка (`file_id` + `chunk_index`) считается успешной.
- `total_chunks` должен совпадать во всех запросах с одним `file_id`.

