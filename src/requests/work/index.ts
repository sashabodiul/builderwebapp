import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData, StartWorkOfficeData, EndWorkOfficeData } from './types';
import axios from 'axios';

const botApiUrl = 'https://bot-api.skybud.de';
const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';

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