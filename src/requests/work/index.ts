import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { 
  WorkProcess, 
  WorkProcessStartOut, 
  WorkProcessEndOut, 
  StartWorkData, 
  EndWorkData, 
  WorkProcessQueryParams 
} from "./types.ts";

export const getWorkProcesses = async (params?: WorkProcessQueryParams): Promise<ApiResponse<WorkProcess[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.worker_id) queryParams.append('worker_id', params.worker_id.toString());
  if (params?.facility_id) queryParams.append('facility_id', params.facility_id.toString());
  if (params?.facility_type_id) queryParams.append('facility_type_id', params.facility_type_id.toString());
  
  const url = queryParams.toString() ? `/work/?${queryParams.toString()}` : '/work/';
  return await apiRequest<WorkProcess[]>("GET", url);
};

export const startWork = async (data: StartWorkData): Promise<ApiResponse<WorkProcessStartOut>> => {
  const formData = new URLSearchParams();
  formData.append('worker_id', data.worker_id.toString());
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  if (data.facility_id) formData.append('facility_id', data.facility_id.toString());

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
  
  if (data.report_video) formData.append('report_video', data.report_video);
  if (data.done_work_photos) {
    data.done_work_photos.forEach(photo => formData.append('done_work_photos', photo));
  }
  if (data.instrument_photos) {
    data.instrument_photos.forEach(photo => formData.append('instrument_photos', photo));
  }

  return await apiRequest<WorkProcessEndOut>("POST", "/work/end", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
};
