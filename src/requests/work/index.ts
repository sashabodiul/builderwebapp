import { apiRequest } from '../index';
import { ApiResponse } from '../shared/types';
import { WorkProcessStartOut, WorkProcessEndOut, StartWorkData, EndWorkData } from './types';

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
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
  if (params?.worker_id !== undefined && params.worker_id !== null) queryParams.append('worker_id', params.worker_id.toString());
  if (params?.facility_id !== undefined && params.facility_id !== null) queryParams.append('facility_id', params.facility_id.toString());
  if (params?.facility_type_id !== undefined && params.facility_type_id !== null) queryParams.append('facility_type_id', params.facility_type_id.toString());
  
  const url = queryParams.toString() ? `/work/?${queryParams.toString()}` : '/work';
  return await apiRequest<(WorkProcessStartOut | WorkProcessEndOut)[]>("GET", url);
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