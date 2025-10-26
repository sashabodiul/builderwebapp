import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { FacilityTypeOut, FacilityTypeCreate, FacilityTypeUpdate } from "./types.ts";
import { PaginationParams } from "../shared/types.ts";

export const getFacilityTypes = async (params?: PaginationParams): Promise<ApiResponse<FacilityTypeOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const url = queryParams.toString() ? `/facility_type/?${queryParams.toString()}` : '/facility_type/';
  return await apiRequest<FacilityTypeOut[]>("GET", url);
};

export const getFacilityType = async (facility_type_id: number): Promise<ApiResponse<FacilityTypeOut>> => {
  return await apiRequest<FacilityTypeOut>("GET", `/facility_type/${facility_type_id}`);
};

export const createFacilityType = async (data: FacilityTypeCreate): Promise<ApiResponse<FacilityTypeOut>> => {
  return await apiRequest<FacilityTypeOut>("POST", "/facility_type/", {}, data);
};

export const updateFacilityType = async (facility_type_id: number, data: FacilityTypeUpdate): Promise<ApiResponse<FacilityTypeOut>> => {
  return await apiRequest<FacilityTypeOut>("PUT", `/facility_type/${facility_type_id}`, {}, data);
};

export const deleteFacilityType = async (facility_type_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/facility_type/${facility_type_id}`);
};
