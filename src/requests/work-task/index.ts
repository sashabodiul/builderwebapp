import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { WorkTaskOut, WorkTaskCreate, WorkTaskUpdate, WorkTaskQueryParams } from "./types.ts";

export const getWorkTasks = async (params?: WorkTaskQueryParams): Promise<ApiResponse<WorkTaskOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.facility_id) queryParams.append('facility_id', params.facility_id.toString());
  if (params?.facility_type_id) queryParams.append('facility_type_id', params.facility_type_id.toString());
  if (params?.worker_id) queryParams.append('worker_id', params.worker_id.toString());
  if (params?.finished !== undefined && params.finished !== null) queryParams.append('finished', params.finished.toString());
  
  const url = queryParams.toString() ? `/work_task/?${queryParams.toString()}` : '/work_task/';
  return await apiRequest<WorkTaskOut[]>("GET", url);
};

export const getWorkTask = async (task_id: number): Promise<ApiResponse<WorkTaskOut>> => {
  return await apiRequest<WorkTaskOut>("GET", `/work_task/${task_id}`);
};

export const createWorkTask = async (data: WorkTaskCreate): Promise<ApiResponse<WorkTaskOut>> => {
  const formData = new FormData();
  
  formData.append('text', data.text);
  if (data.facility_id) formData.append('facility_id', data.facility_id.toString());
  if (data.facility_type_id) formData.append('facility_type_id', data.facility_type_id.toString());
  if (data.finished !== undefined) formData.append('finished', data.finished.toString());
  if (data.worker_id) formData.append('worker_id', data.worker_id.toString());
  if (data.expires_at) formData.append('expires_at', data.expires_at);
  if (data.send_notification !== undefined) formData.append('send_notification', data.send_notification.toString());
  if (data.photo) formData.append('photo', data.photo);

  return await apiRequest<WorkTaskOut>("POST", "/work_task/", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
};

export const updateWorkTask = async (task_id: number, data: WorkTaskUpdate): Promise<ApiResponse<WorkTaskOut>> => {
  const formData = new FormData();
  
  if (data.facility_id !== undefined) formData.append('facility_id', data.facility_id?.toString() || '');
  if (data.text !== undefined) formData.append('text', data.text || '');
  if (data.finished !== undefined) formData.append('finished', data.finished?.toString() || '');
  if (data.worker_id !== undefined) formData.append('worker_id', data.worker_id?.toString() || '');
  if (data.expires_at !== undefined) formData.append('expires_at', data.expires_at || '');
  if (data.photo) formData.append('photo', data.photo);

  return await apiRequest<WorkTaskOut>("PUT", `/work_task/${task_id}`, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
};

export const deleteWorkTask = async (task_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/work_task/${task_id}`);
};
