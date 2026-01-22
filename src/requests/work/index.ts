import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData, StartWorkOfficeData, EndWorkOfficeData } from './types';
import axios from 'axios';

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
  onLog?: (message: string) => void
): Promise<ApiResponse<WorkProcessEndOut>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  formData.append('status_object_finished', data.status_object_finished.toString());
  
  // Вычисляем общий размер файлов для определения timeout
  let totalSize = 0;
  
  if (data.report_video) {
    formData.append('report_video', data.report_video);
    totalSize += data.report_video.size;
  }
  
  if (data.done_work_photos && data.done_work_photos.length > 0) {
    data.done_work_photos.forEach((photo) => {
      formData.append('done_work_photos', photo);
      totalSize += photo.size;
    });
  }
  
  if (data.instrument_photos && data.instrument_photos.length > 0) {
    data.instrument_photos.forEach((photo) => {
      formData.append('instrument_photos', photo);
      totalSize += photo.size;
    });
  }

  // Вычисляем timeout на основе размера файлов
  // Для больших файлов (более 20MB) используем 5 минут
  // Для средних (10-20MB) - 3 минуты
  // Для маленьких - 2 минуты
  // Минимум 60 секунд на каждые 10MB
  const timeoutMs = totalSize > 20 * 1024 * 1024 
    ? 300000 // 5 минут для файлов > 20MB
    : totalSize > 10 * 1024 * 1024
    ? 180000 // 3 минуты для файлов 10-20MB
    : Math.max(120000, Math.ceil(totalSize / (10 * 1024 * 1024)) * 60000); // 2 минуты минимум или 60 сек на каждые 10MB

  try {
    const isAndroid = /android/i.test(navigator.userAgent);
    const finalTimeout = isAndroid && totalSize > 30 * 1024 * 1024 ? 600000 : timeoutMs; // 10 минут для Android с файлами > 30MB
    
    const requestUrl = `${botApiUrl}/api/v1/work/end`;
    onLog?.(`Начало запроса к ${requestUrl}`);
    onLog?.(`Timeout: ${finalTimeout}ms (${(finalTimeout / 1000).toFixed(0)} сек)`);
    onLog?.(`Размер данных: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
    onLog?.(`Android: ${isAndroid ? 'Да' : 'Нет'}`);
    
    console.log('[endWork] Starting request', {
      isAndroid,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      timeout: finalTimeout,
      url: requestUrl,
    });
    
    onLog?.(`Отправка FormData...`);
    
    // Создаем отдельный экземпляр axios для этого запроса
    // чтобы гарантировать правильную обработку FormData
    const axiosInstance = axios.create({
      timeout: finalTimeout,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    // Перехватываем запрос, чтобы гарантировать правильные заголовки
    axiosInstance.interceptors.request.use((config) => {
      // Для FormData НЕ устанавливаем Content-Type - браузер сам установит с boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
        // Логируем финальные заголовки для диагностики
        onLog?.(`Финальные заголовки запроса: ${JSON.stringify(Object.keys(config.headers || {}))}`);
        if (config.headers && 'Content-Type' in config.headers) {
          onLog?.(`⚠️ ВНИМАНИЕ: Content-Type все еще установлен: ${config.headers['Content-Type']}`);
        } else {
          onLog?.(`✓ Content-Type не установлен - браузер установит автоматически`);
        }
      }
      return config;
    });
    
    // Создаем заголовки без Content-Type для FormData
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': botApiToken,
    };
    
    onLog?.(`Заголовки запроса: Accept=${headers.Accept}, Authorization=***, Content-Type=автоматически (multipart/form-data с boundary)`);
    
    // Используем созданный экземпляр axios
    const response = await axiosInstance.post(requestUrl, formData, {
      headers,
      // Добавляем обработчик прогресса для всех случаев
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: percentCompleted,
          });
          console.log(`[endWork] Upload progress: ${percentCompleted}% (${(progressEvent.loaded / 1024 / 1024).toFixed(2)}MB / ${(progressEvent.total / 1024 / 1024).toFixed(2)}MB)`);
        }
      },
    });
    
    onLog?.(`✓ Запрос выполнен успешно`);
    onLog?.(`HTTP статус: ${response.status} ${response.statusText || ''}`);
    onLog?.(`Размер ответа: ${JSON.stringify(response.data).length} байт`);
    console.log('[endWork] Request successful', { status: response.status });
    return { data: response.data };
  } catch (error: any) {
    onLog?.(`✗ Ошибка запроса`);
    onLog?.(`Код ошибки: ${error?.code || 'неизвестно'}`);
    onLog?.(`Сообщение: ${error?.message || String(error)}`);
    if (error?.response) {
      onLog?.(`HTTP статус: ${error.response.status} ${error.response.statusText || ''}`);
      if (error.response.data) {
        onLog?.(`Данные ответа: ${JSON.stringify(error.response.data)}`);
      }
    }
    if (error?.request) {
      onLog?.(`Запрос был отправлен, но ответ не получен`);
    }
    
    console.error('[endWork] Request failed', {
      error: error?.message || error,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      responseData: error?.response?.data,
    });
    
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