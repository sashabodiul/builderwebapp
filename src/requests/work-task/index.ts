import { ApiResponse } from "../shared/types.ts";
import { WorkTaskOut, WorkTaskCreate, WorkTaskUpdate, WorkTaskQueryParams, WorkTaskBulkUpdate, WorkTaskBulkUpdateResponse } from "./types.ts";
import axios from "axios";

// This endpoint should use bot-api, not api-crm
// bot-api uses static token, not JWT
const botApiUrl = 'https://bot-api.skybud.de';
const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';

export const getWorkTasks = async (params?: WorkTaskQueryParams): Promise<ApiResponse<WorkTaskOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.facility_id !== undefined && params.facility_id !== null) queryParams.append('facility_id', params.facility_id.toString());
  if (params?.facility_type_id !== undefined && params.facility_type_id !== null) queryParams.append('facility_type_id', params.facility_type_id.toString());
  if (params?.worker_id !== undefined && params.worker_id !== null) queryParams.append('worker_id', params.worker_id.toString());
  if (params?.finished !== undefined && params.finished !== null) queryParams.append('finished', params.finished.toString());
  
  const url = queryParams.toString() ? `/api/v1/work_task/?${queryParams.toString()}` : '/api/v1/work_task/';
  const fullUrl = `${botApiUrl}${url}`;
  
  console.log('[getWorkTasks] Requesting from bot-api:', fullUrl);
  console.log('[getWorkTasks] Full token:', botApiToken);
  console.log('[getWorkTasks] Params:', params);
  console.log('[getWorkTasks] User agent:', navigator.userAgent);
  console.log('[getWorkTasks] Is Telegram WebApp:', typeof window !== 'undefined' && (window as any).Telegram?.WebApp !== undefined);
  
  // Создаем новый экземпляр axios без interceptor'ов, чтобы избежать перехвата
  // Устанавливаем заголовки через defaults для гарантии, что они будут установлены
  const axiosInstance = axios.create({
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'Authorization': botApiToken, // Токен без префикса Bearer, как в curl
    },
  });
  
  // Добавляем interceptor для логирования реальных заголовков запроса
  axiosInstance.interceptors.request.use((config) => {
    const authHeader = config.headers?.Authorization || config.headers?.authorization;
    const authValue = authHeader ? (typeof authHeader === 'string' ? authHeader : String(authHeader)) : 'NOT SET';
    const authPreview = authValue !== 'NOT SET' && authValue.length > 15 ? authValue.slice(0, 15) + '...' : authValue;
    console.log('[getWorkTasks] Request interceptor - actual headers being sent:', {
      Accept: config.headers?.Accept || config.headers?.accept,
      Authorization: authPreview,
      AuthorizationType: typeof authHeader,
      allHeaders: Object.keys(config.headers || {}),
    });
    return config;
  });
  
  const defaultAuth = axiosInstance.defaults.headers.common['Authorization'];
  const defaultAuthStr = defaultAuth ? (typeof defaultAuth === 'string' ? defaultAuth : String(defaultAuth)) : 'NOT SET';
  const defaultAuthPreview = defaultAuthStr !== 'NOT SET' && defaultAuthStr.length > 15 ? defaultAuthStr.slice(0, 15) + '...' : defaultAuthStr;
  console.log('[getWorkTasks] Request headers (from defaults):', {
    Accept: axiosInstance.defaults.headers.common['Accept'],
    Authorization: defaultAuthPreview,
  });
  
  try {
    // Также устанавливаем заголовки явно в запросе для гарантии
    const response = await axiosInstance.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    
    console.log('[getWorkTasks] Success! Status:', response.status);
    console.log('[getWorkTasks] Received', response.data?.length || 0, 'tasks');
    console.log('[getWorkTasks] Response data:', response.data);
    return { data: response.data };
  } catch (error: any) {
    console.error('[getWorkTasks] Error details:', {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      url: fullUrl,
      requestUrl: error?.config?.url,
      sentHeaders: {
        Authorization: error?.config?.headers?.Authorization || 'NOT SET',
        Accept: error?.config?.headers?.Accept || 'NOT SET',
      },
      responseData: error?.response?.data,
      responseHeaders: error?.response?.headers,
    });
    
    return {
      data: [] as WorkTaskOut[],
      error: error,
      status: error?.response?.status,
    };
  }
};

export const getWorkTask = async (task_id: number): Promise<ApiResponse<WorkTaskOut>> => {
  const fullUrl = `${botApiUrl}/api/v1/work_task/${task_id}`;
  
  try {
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
      timeout: 15000,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkTaskOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const createWorkTask = async (data: WorkTaskCreate): Promise<ApiResponse<WorkTaskOut>> => {
  const formData = new FormData();
  
  formData.append('text', data.text);
  if (data.facility_id) formData.append('facility_id', data.facility_id.toString());
  if (data.facility_type_id) formData.append('facility_type_id', data.facility_type_id.toString());
  if (data.finished !== undefined) formData.append('finished', data.finished.toString());
  if (data.worker_id) formData.append('worker_id', data.worker_id.toString());
  if (data.expires_at) formData.append('expires_at', data.expires_at);
  formData.append('send_notification', 'true');
  if (data.photo) formData.append('photo', data.photo);

  const fullUrl = `${botApiUrl}/api/v1/work_task/`;
  
  try {
    const response = await axios.post(fullUrl, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      timeout: 30000,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkTaskOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const updateWorkTask = async (task_id: number, data: WorkTaskUpdate): Promise<ApiResponse<WorkTaskOut>> => {
  const formData = new FormData();
  
  if (data.facility_id !== undefined) formData.append('facility_id', data.facility_id?.toString() || '');
  if (data.text !== undefined) formData.append('text', data.text || '');
  if (data.finished !== undefined) formData.append('finished', data.finished?.toString() || '');
  if (data.worker_id !== undefined) formData.append('worker_id', data.worker_id?.toString() || '');
  if (data.expires_at !== undefined) formData.append('expires_at', data.expires_at || '');
  if (data.photo) formData.append('photo', data.photo);

  const fullUrl = `${botApiUrl}/api/v1/work_task/${task_id}`;
  
  try {
    const response = await axios.put(fullUrl, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      timeout: 30000,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkTaskOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const deleteWorkTask = async (task_id: number): Promise<ApiResponse<void>> => {
  const fullUrl = `${botApiUrl}/api/v1/work_task/${task_id}`;
  
  try {
    await axios.delete(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
      timeout: 15000,
    });
    return { data: undefined as void };
  } catch (error: any) {
    return {
      data: undefined as void,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const bulkUpdateWorkTasks = async (data: WorkTaskBulkUpdate): Promise<ApiResponse<WorkTaskBulkUpdateResponse>> => {
  const fullUrl = `${botApiUrl}/api/v1/work_task/bulk-update`;
  
  try {
    const response = await axios.patch(fullUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
      timeout: 15000,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as WorkTaskBulkUpdateResponse,
      error: error,
      status: error?.response?.status,
    };
  }
};
