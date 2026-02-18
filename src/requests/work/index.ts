import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData, StartWorkOfficeData, EndWorkOfficeData } from './types';
import axios from 'axios';

// Константы для chunked upload
// Размер чанка 5MB - раньше работало, если не работает, проблема не в размере
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

// Загрузить один чанк с retry механизмом
async function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  fileId: string,
  fileName: string,
  fileType: 'video' | 'photo',
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void,
  retryCount: number = 0
): Promise<ChunkUploadResponse> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 секунды между попытками
  
  const formData = new FormData();
  formData.append('file_id', fileId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('total_chunks', totalChunks.toString());
  formData.append('file_name', fileName);
  formData.append('file_type', fileType);
  formData.append('chunk', chunk, `chunk_${chunkIndex}`);

  // Логируем размер чанка для диагностики
  const chunkSizeKB = (chunk.size / 1024).toFixed(2);
  const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isTelegram = /telegram/i.test(navigator.userAgent);
  const connectionInfo = (navigator as any).connection;
  
  console.log(`[uploadChunk] Uploading chunk ${chunkIndex + 1}/${totalChunks}, size: ${chunkSizeKB} KB (${chunkSizeMB} MB), file: ${fileName}`);
  console.log(`[uploadChunk] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}, Android: ${isAndroid}, Telegram: ${isTelegram}`);
  console.log(`[uploadChunk] Connection info:`, {
    effectiveType: connectionInfo?.effectiveType,
    downlink: connectionInfo?.downlink,
    rtt: connectionInfo?.rtt,
    saveData: connectionInfo?.saveData,
  });
  console.log(`[uploadChunk] User agent:`, navigator.userAgent);

  const uploadUrl = `${botApiUrl}/api/v1/upload/chunk`;
  
  // Используем axios с улучшенной обработкой ошибок и retry
  try {
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
        // НЕ устанавливаем Content-Type - браузер/axios сам установит правильный заголовок с boundary для FormData
      },
      timeout: 300000, // 5 минут на чанк
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // Включаем отслеживание прогресса
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          });
        }
      },
      // Валидируем статус - не выбрасываем ошибку для 4xx/5xx, обрабатываем вручную
      validateStatus: (status) => status < 600, // Принимаем все статусы для ручной обработки
    });
    
    console.log(`[uploadChunk] Response received: status=${response.status}, statusText=${response.statusText}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`[uploadChunk] Success! Response:`, response.data);
      return response.data;
    } else {
      // Обработка ошибок
      if (response.status === 413) {
        const chunkSizeKB = (chunk.size / 1024).toFixed(2);
        const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
        console.error(`[uploadChunk] 413 Error - Chunk size: ${chunkSizeKB} KB (${chunkSizeMB} MB), chunk index: ${chunkIndex}, file: ${fileName}`);
        console.error(`[uploadChunk] Response headers:`, response.headers);
        console.error(`[uploadChunk] Response data:`, response.data);
        throw {
          code: 'ERR_BAD_RESPONSE',
          message: `Chunk size too large (413). Chunk: ${chunkSizeKB} KB. Server or proxy rejected the request.`,
          response: { 
            status: response.status,
            statusText: response.statusText,
            chunkSize: chunk.size,
            chunkSizeKB: parseFloat(chunkSizeKB),
            chunkSizeMB: parseFloat(chunkSizeMB),
            responseHeaders: response.headers,
            responseData: response.data,
          },
        };
      } else {
        console.error(`[uploadChunk] HTTP Error ${response.status}:`, response.statusText);
        console.error(`[uploadChunk] Response data:`, response.data);
        throw {
          code: 'ERR_BAD_RESPONSE',
          message: `HTTP ${response.status}: ${response.statusText}`,
          response: { 
            status: response.status,
            statusText: response.statusText,
            responseData: response.data,
          },
        };
      }
    }
  } catch (error: any) {
    // Обработка сетевых ошибок и ошибок axios
    if (error.response) {
      // Ответ получен, но статус не 2xx
      const response = error.response;
      if (response.status === 413) {
        const chunkSizeKB = (chunk.size / 1024).toFixed(2);
        const chunkSizeMB = (chunk.size / (1024 * 1024)).toFixed(2);
        console.error(`[uploadChunk] 413 Error (from catch) - Chunk size: ${chunkSizeKB} KB (${chunkSizeMB} MB)`);
        throw {
          code: 'ERR_BAD_RESPONSE',
          message: `Chunk size too large (413). Chunk: ${chunkSizeKB} KB. Server or proxy rejected the request.`,
          response: { 
            status: response.status,
            statusText: response.statusText,
            chunkSize: chunk.size,
            chunkSizeKB: parseFloat(chunkSizeKB),
            chunkSizeMB: parseFloat(chunkSizeMB),
            responseData: response.data,
          },
        };
      }
      throw {
        code: 'ERR_BAD_RESPONSE',
        message: `HTTP ${response.status}: ${response.statusText}`,
        response: { 
          status: response.status,
          statusText: response.statusText,
          responseData: response.data,
        },
      };
    } else if (error.request) {
      // Запрос отправлен, но ответа нет (сетевая ошибка, CORS, таймаут)
      console.error(`[uploadChunk] Network error:`, error.message);
      console.error(`[uploadChunk] Error code:`, error.code);
      console.error(`[uploadChunk] Error details:`, {
        message: error.message,
        code: error.code,
        isAndroid,
        isTelegram,
        chunkSize: chunk.size,
        chunkSizeKB,
        chunkSizeMB,
        retryCount,
      });
      
      // Retry для сетевых ошибок
      if (retryCount < MAX_RETRIES && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
        console.log(`[uploadChunk] Retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return uploadChunk(chunk, chunkIndex, totalChunks, fileId, fileName, fileType, onProgress, retryCount + 1);
      }
      
      throw {
        code: error.code || 'ERR_NETWORK',
        message: error.message || 'Network Error',
        response: { status: 0 },
        error: error,
        retryCount,
        isAndroid,
        isTelegram,
      };
    } else {
      // Ошибка при настройке запроса
      console.error(`[uploadChunk] Request setup error:`, error.message);
      throw {
        code: 'ERR_REQUEST',
        message: error.message || 'Failed to setup request',
        response: { status: 0 },
        error: error,
      };
    }
  }
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
  data: EndWorkData
): Promise<ApiResponse<WorkProcessEndOut>> => {
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  formData.append('status_object_finished', data.status_object_finished.toString());

  const requestUrl = `${botApiUrl}/api/v1/work/end`;

  try {
    const response = await axios.post(requestUrl, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
      timeout: 30000,
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