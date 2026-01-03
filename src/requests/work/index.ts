import { apiRequest } from '../index';
import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData, StartWorkOfficeData, EndWorkOfficeData } from './types';
import axios from 'axios';

export const startWork = async (data: StartWorkData): Promise<ApiResponse<WorkProcessStartOut>> => {
  const formData = new URLSearchParams();
  formData.append('worker_id', data.worker_id.toString());
  if (data.facility_id !== undefined && data.facility_id !== null) {
    formData.append('facility_id', data.facility_id.toString());
  }
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());

  return await apiRequest<WorkProcessStartOut>("POST", "/work/start", {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, formData);
};

export const endWork = async (data: EndWorkData): Promise<ApiResponse<WorkProcessEndOut>> => {
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  formData.append('status_object_finished', data.status_object_finished.toString());
  
  if (data.report_video) {
    formData.append('report_video', data.report_video);
  }
  
  if (data.done_work_photos && data.done_work_photos.length > 0) {
    data.done_work_photos.forEach((photo) => {
      formData.append('done_work_photos', photo);
    });
  }
  
  if (data.instrument_photos && data.instrument_photos.length > 0) {
    data.instrument_photos.forEach((photo) => {
      formData.append('instrument_photos', photo);
    });
  }

  return await apiRequest<WorkProcessEndOut>("POST", "/work/end", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
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
  const formData = new URLSearchParams();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());

  return await apiRequest<WorkProcessStartOut>("POST", "/work/start-office", {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, formData);
};

export const endWorkOffice = async (data: EndWorkOfficeData): Promise<ApiResponse<WorkProcessEndOut>> => {
  const formData = new FormData();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  
  if (data.report_video) {
    formData.append('report_video', data.report_video);
  }
  
  if (data.done_work_photos && data.done_work_photos.length > 0) {
    data.done_work_photos.forEach((photo) => {
      formData.append('done_work_photos', photo);
    });
  }

  return await apiRequest<WorkProcessEndOut>("POST", "/work/end-office", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
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