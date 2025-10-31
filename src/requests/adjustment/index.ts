import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { 
  AdjustmentOut, 
  AdjustmentCreate, 
  AdjustmentQueryParams, 
  AdjustmentListResponse 
} from "./types.ts";

// get adjustments with filtering
export const getAdjustments = async (params: AdjustmentQueryParams): Promise<ApiResponse<AdjustmentListResponse>> => {
  const queryParams = new URLSearchParams();
  queryParams.append('worker_id', params.worker_id.toString());
  queryParams.append('adjustment_type', params.adjustment_type);
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  
  const url = `/adjustment/?${queryParams.toString()}`;
  return await apiRequest<AdjustmentListResponse>("GET", url);
};

// create adjustment
export const createAdjustment = async (data: AdjustmentCreate): Promise<ApiResponse<AdjustmentOut>> => {
  const formData = new FormData();
  
  formData.append('worker_id', data.worker_id.toString());
  formData.append('adjustment_type', data.adjustment_type);
  formData.append('amount', data.amount.toString());
  formData.append('reason', data.reason);
  formData.append('send_notification', 'true');
  if (data.photo) formData.append('photo', data.photo);

  return await apiRequest<AdjustmentOut>("POST", "/adjustment/", {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }, formData);
};

// delete adjustment
export const deleteAdjustment = async (adjustment_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/adjustment/${adjustment_id}`);
};
