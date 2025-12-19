import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { 
  WorkerOut, 
  WorkerCreate, 
  WorkerUpdate, 
  WorkerLoginData,
  WorkerRegisterData, 
  WorkerPayrollOut, 
  WorkerPayrollParams 
} from "./types.ts";
import { PaginationParams } from "../shared/types.ts";

export const getWorkers = async (params?: PaginationParams): Promise<ApiResponse<WorkerOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const url = queryParams.toString() ? `/worker/?${queryParams.toString()}` : '/worker/';
  return await apiRequest<WorkerOut[]>("GET", url);
};

export const getWorker = async (worker_id: number): Promise<ApiResponse<WorkerOut>> => {
  return await apiRequest<WorkerOut>("GET", `/worker/${worker_id}`);
};

export const getWorkerByTelegramId = async (telegram_id: number): Promise<ApiResponse<WorkerOut>> => {
  return await apiRequest<WorkerOut>("GET", `/worker/telegram/${telegram_id}`);
};

export const createWorker = async (data: WorkerCreate): Promise<ApiResponse<WorkerOut>> => {
  return await apiRequest<WorkerOut>("POST", "/worker/", {}, data);
};

export const updateWorker = async (worker_id: number, data: WorkerUpdate, approve?: boolean): Promise<ApiResponse<WorkerOut>> => {
  const url = approve ? `/worker/${worker_id}?approve=true` : `/worker/${worker_id}`;
  return await apiRequest<WorkerOut>("PUT", url, {}, data);
};

export const deleteWorker = async (worker_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/worker/${worker_id}`);
};

export const getWorkerPayroll = async (
  worker_id: number, 
  params?: WorkerPayrollParams
): Promise<ApiResponse<WorkerPayrollOut>> => {
  const queryParams = new URLSearchParams();
  if (params?.include_penalties !== undefined) queryParams.append('include_penalties', params.include_penalties.toString());
  if (params?.include_prepayments !== undefined) queryParams.append('include_prepayments', params.include_prepayments.toString());
  if (params?.include_awards !== undefined) queryParams.append('include_awards', params.include_awards.toString());
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.date_to) queryParams.append('date_to', params.date_to);
  
  const url = queryParams.toString() ? `/worker/${worker_id}/payroll?${queryParams.toString()}` : `/worker/${worker_id}/payroll`;
  return await apiRequest<WorkerPayrollOut>("GET", url);
};

export const loginWorker = async (data: WorkerLoginData): Promise<ApiResponse<WorkerOut>> => {
  const formData = new URLSearchParams();
  formData.append('email', data.email);
  formData.append('password', data.password);
  if (data.telegram_id) formData.append('telegram_id', data.telegram_id.toString());
  if (data.username) formData.append('username', data.username.toString());
  if (data.language_code) formData.append('language_code', data.language_code.toString());

  return await apiRequest<WorkerOut>("POST", "/worker/login", {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, formData);
};

export const registerWorker = async (data: WorkerRegisterData): Promise<ApiResponse<WorkerOut>> => {
  const formData = new FormData();
  
  // Required fields
  formData.append('email', data.email);
  formData.append('password', data.password);
  formData.append('first_name', data.first_name);
  formData.append('last_name', data.last_name);
  
  // Optional fields
  if (data.telegram_id !== undefined && data.telegram_id !== null) {
    formData.append('telegram_id', data.telegram_id.toString());
  }
  if (data.username) formData.append('username', data.username);
  if (data.lang_code) formData.append('lang_code', data.lang_code);
  if (data.worker_type) formData.append('worker_type', data.worker_type);
  if (data.rate !== undefined && data.rate !== null) {
    formData.append('rate', data.rate.toString());
  }
  if (data.phone_number) formData.append('phone_number', data.phone_number);
  if (data.emergency_relative_phone) formData.append('emergency_relative_phone', data.emergency_relative_phone);
  if (data.emergency_relative_name) formData.append('emergency_relative_name', data.emergency_relative_name);
  if (data.home_address) formData.append('home_address', data.home_address);
  if (data.bank_details) formData.append('bank_details', data.bank_details);
  if (data.birth_date) formData.append('birth_date', data.birth_date);
  
  // Measurements
  if (data.height_cm !== undefined && data.height_cm !== null) {
    formData.append('height_cm', data.height_cm.toString());
  }
  if (data.top_waist_cm !== undefined && data.top_waist_cm !== null) {
    formData.append('top_waist_cm', data.top_waist_cm.toString());
  }
  if (data.chest_cm !== undefined && data.chest_cm !== null) {
    formData.append('chest_cm', data.chest_cm.toString());
  }
  if (data.pants_waist_cm !== undefined && data.pants_waist_cm !== null) {
    formData.append('pants_waist_cm', data.pants_waist_cm.toString());
  }
  if (data.hips_cm !== undefined && data.hips_cm !== null) {
    formData.append('hips_cm', data.hips_cm.toString());
  }
  if (data.inseam_cm !== undefined && data.inseam_cm !== null) {
    formData.append('inseam_cm', data.inseam_cm.toString());
  }
  if (data.head_circumference_cm !== undefined && data.head_circumference_cm !== null) {
    formData.append('head_circumference_cm', data.head_circumference_cm.toString());
  }
  if (data.foot_size !== undefined && data.foot_size !== null) {
    formData.append('foot_size', data.foot_size.toString());
  }
  
  // Legacy single photos (for backward compatibility)
  if (data.passport_photo) {
    formData.append('passport_photo', data.passport_photo);
  }
  if (data.driver_license_photo) {
    formData.append('driver_license_photo', data.driver_license_photo);
  }
  
  // Multiple photos
  if (data.passport_photos) {
    data.passport_photos.forEach((photo) => {
      formData.append('passport_photos', photo);
    });
  }
  if (data.driver_license_photos) {
    data.driver_license_photos.forEach((photo) => {
      formData.append('driver_license_photos', photo);
    });
  }

  return await apiRequest<WorkerOut>("POST", "/registration/register", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
};
