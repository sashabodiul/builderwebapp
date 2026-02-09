import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData, StartWorkOfficeData, EndWorkOfficeData } from './types';
import axios from 'axios';

// Константы для chunked upload
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
const CHUNK_CONCURRENCY = 3;
const botApiUrl = 'https://bot-api.skybud.de';
const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';

// Типы для chunked upload
type ChunkUploadResponse = {
  file_id: string;
  chunk_index: number;
  total_chunks: number;
  uploaded: boolean;
  uploaded_chunks?: number;
  is_complete?: boolean;
};

type FileUploadResponse = {
  file_id: string;
  file_type: 'video' | 'photo';
  original_filename: string;
};

// Разбить файл на чанки
function splitFileIntoChunks(file: File): Blob[] {
  const chunks: Blob[] = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }
  
  return chunks;
}

// Загрузить один чанк
async function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileId: string,
  fileName: string,
  fileType: 'video' | 'photo',
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void
): Promise<ChunkUploadResponse> {
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('total_chunks', totalChunks.toString());
  formData.append('file_name', fileName);
  formData.append('file_type', fileType);
  formData.append('chunk', chunk, `chunk_${chunkIndex}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${botApiUrl}/api/v1/upload/chunk`, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', botApiToken);
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded * 100) / event.total),
        });
      }
    });
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject({
              code: 'ERR_BAD_RESPONSE',
              message: 'Failed to parse chunk upload response',
              response: { status: xhr.status },
            });
          }
        } else {
          reject({
            code: 'ERR_BAD_RESPONSE',
            message: `HTTP ${xhr.status}`,
            response: { status: xhr.status },
          });
        }
      }
    };
    
    xhr.onerror = () => {
      reject({
        code: 'ERR_NETWORK',
        message: 'Network Error',
        response: { status: xhr.status || 0 },
      });
    };
    
    xhr.timeout = 300000; // 5 минут на чанк
    xhr.ontimeout = () => {
      reject({
        code: 'ECONNABORTED',
        message: 'Chunk upload timeout',
        response: { status: 408 },
      });
    };
    
    xhr.send(formData);
  });
}

// Загрузить весь файл через chunked upload
async function uploadFileInChunks(
  file: File,
  fileType: 'video' | 'photo',
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void,
  options?: { parallel?: boolean; concurrency?: number }
): Promise<FileUploadResponse> {
  // Генерируем уникальный file_id
  const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Разбиваем файл на чанки
  const chunks = splitFileIntoChunks(file);
  const totalChunks = chunks.length;
  const useParallel = options?.parallel === true;
  
  if (!useParallel) {
    // Загружаем чанки последовательно
    for (let i = 0; i < chunks.length; i++) {
      const chunkProgress = (progressEvent: { loaded: number; total: number; percent: number }) => {
        if (onProgress) {
          // Общий прогресс = (загруженные чанки + прогресс текущего чанка) / общее количество чанков
          const totalLoaded = (i * CHUNK_SIZE) + progressEvent.loaded;
          const totalSize = file.size;
          onProgress({
            loaded: totalLoaded,
            total: totalSize,
            percent: Math.round((totalLoaded * 100) / totalSize),
          });
        }
      };
      
      await uploadChunk(chunks[i], i, totalChunks, fileId, file.name, fileType, chunkProgress);
    }
  } else {
    const perChunkLoaded = new Array(totalChunks).fill(0);
    const totalSize = file.size;
    const queue = Array.from({ length: totalChunks }, (_, i) => i);
    let firstError: any = null;
    
    const updateProgress = (index: number, progressEvent: { loaded: number; total: number; percent: number }) => {
      perChunkLoaded[index] = progressEvent.loaded;
      if (onProgress) {
        const totalLoaded = perChunkLoaded.reduce((sum, val) => sum + val, 0);
        onProgress({
          loaded: totalLoaded,
          total: totalSize,
          percent: Math.round((totalLoaded * 100) / totalSize),
        });
      }
    };
    
    const worker = async () => {
      while (queue.length > 0 && !firstError) {
        const index = queue.shift();
        if (index === undefined) return;
        try {
          await uploadChunk(
            chunks[index],
            index,
            totalChunks,
            fileId,
            file.name,
            fileType,
            (progressEvent) => updateProgress(index, progressEvent)
          );
        } catch (error) {
          firstError = error;
        }
      }
    };
    
    const concurrency = Math.min(options?.concurrency || CHUNK_CONCURRENCY, totalChunks);
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    if (firstError) {
      throw firstError;
    }
  }
  
  return {
    file_id: fileId,
    file_type: fileType,
    original_filename: file.name,
  };
}

export const startWork = async (data: StartWorkData): Promise<ApiResponse<WorkProcessStartOut>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const formData = new URLSearchParams();
  formData.append('worker_id', data.worker_id.toString());
  if (data.facility_id !== undefined && data.facility_id !== null) {
    formData.append('facility_id', data.facility_id.toString());
  }
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());

  try {
    const response = await axios.post(`${botApiUrl}/api/v1/work/start`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkProcessStartOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const endWork = async (
  data: EndWorkData,
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void,
  options?: {
    parallelChunks?: boolean;
    onFileProgress?: (progress: {
      category: 'work' | 'tools' | 'video';
      index: number;
      name: string;
      percent: number;
    }) => void;
    onPhaseChange?: (phase: 'uploading' | 'finalizing' | 'done') => void;
  }
): Promise<ApiResponse<WorkProcessEndOut>> => {
  // Определяем общий размер файлов для решения: использовать chunked upload или обычную загрузку
  const totalSize = 
    (data.report_video?.size || 0) +
    (data.done_work_photos?.reduce((sum, f) => sum + f.size, 0) || 0) +
    (data.instrument_photos?.reduce((sum, f) => sum + f.size, 0) || 0);
  
  const USE_CHUNKED_UPLOAD = totalSize > 10 * 1024 * 1024; // Используем chunked upload для файлов > 10MB
  
  let uploadedFileIds: {
    report_video_id?: string;
    done_work_photos_ids?: string[];
    instrument_photos_ids?: string[];
  } = {};
  
  if (options?.onPhaseChange) {
    options.onPhaseChange('uploading');
  }
  
  // Если файлы большие, используем chunked upload
  if (USE_CHUNKED_UPLOAD) {
    // Загружаем видео
    if (data.report_video) {
      const videoProgress = (progress: { loaded: number; total: number; percent: number }) => {
        if (onProgress) {
          // Прогресс видео = 30% от общего прогресса
          const videoPercent = (progress.percent * 0.3);
          onProgress({
            loaded: progress.loaded,
            total: totalSize,
            percent: Math.round(videoPercent),
          });
        }
        if (options?.onFileProgress) {
          options.onFileProgress({
            category: 'video',
            index: 0,
            name: data.report_video?.name || 'video',
            percent: progress.percent,
          });
        }
      };
      const result = await uploadFileInChunks(data.report_video, 'video', videoProgress, {
        parallel: options?.parallelChunks,
      });
      uploadedFileIds.report_video_id = result.file_id;
    }
    
    // Загружаем фото работ
    if (data.done_work_photos && data.done_work_photos.length > 0) {
      uploadedFileIds.done_work_photos_ids = [];
      const photoCount = data.done_work_photos.length;
      const photoProgressWeight = 0.35; // 35% от общего прогресса
      
      for (let i = 0; i < data.done_work_photos.length; i++) {
        const photo = data.done_work_photos[i];
        const photoProgress = (progress: { loaded: number; total: number; percent: number }) => {
          if (onProgress) {
            // Прогресс текущего фото + уже загруженные фото
            const currentPhotoPercent = (progress.percent / photoCount) * photoProgressWeight;
            const alreadyUploadedPercent = (i / photoCount) * photoProgressWeight * 100;
            onProgress({
              loaded: progress.loaded + (i * photo.size),
              total: totalSize,
              percent: Math.round(30 + alreadyUploadedPercent + currentPhotoPercent),
            });
          }
          if (options?.onFileProgress) {
            options.onFileProgress({
              category: 'work',
              index: i,
              name: photo.name,
              percent: progress.percent,
            });
          }
        };
        const result = await uploadFileInChunks(photo, 'photo', photoProgress, {
          parallel: options?.parallelChunks,
        });
        uploadedFileIds.done_work_photos_ids.push(result.file_id);
      }
    }
    
    // Загружаем фото инструментов
    if (data.instrument_photos && data.instrument_photos.length > 0) {
      uploadedFileIds.instrument_photos_ids = [];
      const photoCount = data.instrument_photos.length;
      const photoProgressWeight = 0.35; // 35% от общего прогресса
      const startPercent = 65; // Начинаем с 65% (30% видео + 35% фото работ)
      
      for (let i = 0; i < data.instrument_photos.length; i++) {
        const photo = data.instrument_photos[i];
        const photoProgress = (progress: { loaded: number; total: number; percent: number }) => {
          if (onProgress) {
            const currentPhotoPercent = (progress.percent / photoCount) * photoProgressWeight;
            const alreadyUploadedPercent = (i / photoCount) * photoProgressWeight * 100;
            onProgress({
              loaded: progress.loaded + (i * photo.size),
              total: totalSize,
              percent: Math.round(startPercent + alreadyUploadedPercent + currentPhotoPercent),
            });
          }
          if (options?.onFileProgress) {
            options.onFileProgress({
              category: 'tools',
              index: i,
              name: photo.name,
              percent: progress.percent,
            });
          }
        };
        const result = await uploadFileInChunks(photo, 'photo', photoProgress, {
          parallel: options?.parallelChunks,
        });
        uploadedFileIds.instrument_photos_ids.push(result.file_id);
      }
    }
  }
  
  if (USE_CHUNKED_UPLOAD && options?.onPhaseChange) {
    options.onPhaseChange('finalizing');
  }
  
  // Отправляем финальный запрос на завершение работы
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  formData.append('status_object_finished', data.status_object_finished.toString());
  
  if (USE_CHUNKED_UPLOAD) {
    // Используем file_id вместо файлов
    if (uploadedFileIds.report_video_id) {
      formData.append('report_video_id', uploadedFileIds.report_video_id);
    }
    if (uploadedFileIds.done_work_photos_ids && uploadedFileIds.done_work_photos_ids.length > 0) {
      uploadedFileIds.done_work_photos_ids.forEach((fileId) => {
        formData.append('done_work_photos_ids', fileId);
      });
    }
    if (uploadedFileIds.instrument_photos_ids && uploadedFileIds.instrument_photos_ids.length > 0) {
      uploadedFileIds.instrument_photos_ids.forEach((fileId) => {
        formData.append('instrument_photos_ids', fileId);
      });
    }
  } else {
    // Обычная загрузка для маленьких файлов
    if (data.report_video) {
      formData.append('report_video', data.report_video, data.report_video.name);
    }
    if (data.done_work_photos && data.done_work_photos.length > 0) {
      data.done_work_photos.forEach((photo) => {
        formData.append('done_work_photos', photo, photo.name);
      });
    }
    if (data.instrument_photos && data.instrument_photos.length > 0) {
      data.instrument_photos.forEach((photo) => {
        formData.append('instrument_photos', photo, photo.name);
      });
    }
  }

  const requestUrl = `${botApiUrl}/api/v1/work/end`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', requestUrl, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', botApiToken);
    
    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        if (USE_CHUNKED_UPLOAD) {
          // Для финального запроса показываем 95-100%
          const finalPercent = 95 + Math.round((event.loaded * 5) / event.total);
          onProgress({
            loaded: totalSize + event.loaded,
            total: totalSize + event.total,
            percent: finalPercent,
          });
        } else {
          // Для обычной загрузки показываем 0-100%
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      });
    }
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 0) {
          reject({
            code: 'ERR_NETWORK',
            message: 'Request blocked or network error (status 0)',
            response: { status: 0 },
          });
          return;
        }
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            if (onProgress) {
              onProgress({ loaded: totalSize, total: totalSize, percent: 100 });
            }
            if (options?.onPhaseChange) {
              options.onPhaseChange('done');
            }
            
            // Проверяем, есть ли содержимое в ответе
            const responseText = xhr.responseText?.trim() || '';
            if (!responseText) {
              // Пустой ответ - это может быть валидный случай для некоторых эндпоинтов
              // Но для endWork мы ожидаем данные, поэтому это ошибка
              reject({
                code: 'ERR_BAD_RESPONSE',
                message: 'Empty response from server',
                response: { 
                  status: xhr.status, 
                  statusText: xhr.statusText,
                  data: null,
                  responseText: '',
                },
              });
              return;
            }
            
            // Пытаемся распарсить JSON
            const parsedData = JSON.parse(responseText);
            resolve({ data: parsedData });
          } catch (parseError: any) {
            // Ошибка парсинга JSON
            const responseText = xhr.responseText || '';
            reject({
              code: 'ERR_BAD_RESPONSE',
              message: `Failed to parse response: ${parseError?.message || 'Invalid JSON'}`,
              response: { 
                status: xhr.status, 
                statusText: xhr.statusText,
                data: responseText.substring(0, 500), // Ограничиваем размер для логирования
                responseLength: responseText.length,
              },
            });
          }
        } else {
          // HTTP ошибка (не 2xx)
          let errorData;
          const responseText = xhr.responseText || '';
          
          try {
            if (responseText.trim()) {
              errorData = JSON.parse(responseText);
            } else {
              errorData = { 
                detail: xhr.statusText || `HTTP ${xhr.status}`,
                message: `Server returned status ${xhr.status}`,
              };
            }
          } catch {
            // Если не удалось распарсить, используем текст ответа как есть
            errorData = { 
              detail: xhr.statusText || `HTTP ${xhr.status}`,
              rawResponse: responseText.substring(0, 500), // Ограничиваем размер
              responseLength: responseText.length,
            };
          }
          
          reject({
            code: 'ERR_BAD_RESPONSE',
            message: `HTTP ${xhr.status}: ${errorData?.detail || errorData?.message || xhr.statusText || 'Unknown error'}`,
            response: { 
              status: xhr.status, 
              statusText: xhr.statusText,
              data: errorData,
            },
          });
        }
      }
    };
    
    xhr.onerror = () => {
      reject({
        code: 'ERR_NETWORK',
        message: 'Network Error',
        response: { status: xhr.status || 0 },
      });
    };
    
    xhr.ontimeout = () => {
      reject({
        code: 'ECONNABORTED',
        message: 'Request timeout',
        response: { status: 408 },
      });
    };
    
    xhr.timeout = 600000;
    
    try {
      xhr.send(formData);
    } catch (error: any) {
      reject({
        code: 'ERR_SEND',
        message: error?.message || 'Failed to send request',
        response: { status: 0 },
      });
    }
  });
};

export const getWorkProcesses = async (params?: {
  limit?: number;
  offset?: number;
  worker_id?: number | null;
  facility_id?: number | null;
  facility_type_id?: number | null;
}): Promise<ApiResponse<(WorkProcessStartOut | WorkProcessEndOut)[]>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
  
  // Use bot-api worker id (numeric id from bot-api response)
  if (params?.worker_id !== undefined && params.worker_id !== null) {
    // Get bot-api worker id from localStorage (numeric id from bot-api)
    const botApiWorkerId = localStorage.getItem('botApiWorkerId');
    if (botApiWorkerId) {
      queryParams.append('worker_id', botApiWorkerId);
    } else {
      // If bot-api id not available, try to use crm_id as fallback
      // But ideally bot-api id should be set after registration/login
      queryParams.append('worker_id', params.worker_id.toString());
    }
  }
  
  if (params?.facility_id !== undefined && params.facility_id !== null) queryParams.append('facility_id', params.facility_id.toString());
  if (params?.facility_type_id !== undefined && params.facility_type_id !== null) queryParams.append('facility_type_id', params.facility_type_id.toString());
  
  const url = queryParams.toString() ? `/api/v1/work/?${queryParams.toString()}` : '/api/v1/work/';
  
  try {
    const response = await axios.get(`${botApiUrl}${url}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: [] as (WorkProcessStartOut | WorkProcessEndOut)[],
      error: error,
      status: error?.response?.status,
    };
  }
};

export const startWorkOffice = async (data: StartWorkOfficeData): Promise<ApiResponse<WorkProcessStartOut>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const formData = new URLSearchParams();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());

  try {
    const response = await axios.post(`${botApiUrl}/api/v1/work/start-office`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkProcessStartOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const endWorkOffice = async (data: EndWorkOfficeData): Promise<ApiResponse<WorkProcessEndOut>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());

  try {
    const response = await axios.post(`${botApiUrl}/api/v1/work/end-office`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
        // Не устанавливаем Content-Type явно для FormData - браузер сам установит правильный заголовок с boundary
      },
      timeout: 30000, // Timeout для офисных работников
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkProcessEndOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const getActiveWorkProcess = async (worker_id: number): Promise<ApiResponse<WorkProcessStartOut | null>> => {
  const response = await getWorkProcesses({ 
    worker_id, 
    limit: 1, 
    offset: 0 
  });
  
  if (response.error) {
    return {
      ...response,
      data: null
    };
  }
  
  // Шукаємо активний процес (тільки WorkProcessStartOut, без end_time)
  const activeProcess = response.data?.find(process => 
    'start_time' in process && !('end_time' in process)
  ) as WorkProcessStartOut | undefined;
  
  return {
    status: response.status,
    error: null,
    data: activeProcess || null
  };
};