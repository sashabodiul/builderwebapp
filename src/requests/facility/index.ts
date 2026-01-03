import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { FacilityOut, FacilityCreate, FacilityUpdate, FacilityQueryParams } from "./types.ts";

export type { FacilityOut, FacilityCreate, FacilityUpdate, FacilityQueryParams };

export const getFacilities = async (params?: FacilityQueryParams): Promise<ApiResponse<FacilityOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.facility_type) queryParams.append('facility_type', params.facility_type.toString());
  
  const url = queryParams.toString() ? `/facility/?${queryParams.toString()}` : '/facility/';
  return await apiRequest<FacilityOut[]>("GET", url);
};

export const getFacility = async (facility_id: number): Promise<ApiResponse<FacilityOut>> => {
  return await apiRequest<FacilityOut>("GET", `/facility/${facility_id}`);
};

export const createFacility = async (data: FacilityCreate): Promise<ApiResponse<FacilityOut>> => {
  return await apiRequest<FacilityOut>("POST", "/facility/", {}, data);
};

export const updateFacility = async (facility_id: number, data: FacilityUpdate): Promise<ApiResponse<FacilityOut>> => {
  return await apiRequest<FacilityOut>("PUT", `/facility/${facility_id}`, {}, data);
};

export const deleteFacility = async (facility_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/facility/${facility_id}`);
};
