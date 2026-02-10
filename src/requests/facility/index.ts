import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { FacilityOut, FacilityCreate, FacilityUpdate, FacilityQueryParams } from "./types.ts";
import axios from "axios";

export type { FacilityOut, FacilityCreate, FacilityUpdate, FacilityQueryParams };

export const getFacilities = async (params?: FacilityQueryParams): Promise<ApiResponse<FacilityOut[]>> => {
  // This endpoint should use bot-api, not api-crm
  // bot-api uses static token, not JWT
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.facility_type) queryParams.append('facility_type', params.facility_type.toString());
  
  const url = queryParams.toString() ? `/api/v1/facility/?${queryParams.toString()}` : '/api/v1/facility/';
  const fullUrl = `${botApiUrl}${url}`;
  
  console.log('[getFacilities] Requesting from bot-api:', fullUrl);
  
  try {
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
      timeout: 15000, // 15 seconds timeout
    });
    
    console.log('[getFacilities] Success, received', response.data?.length || 0, 'facilities');
    return { data: response.data };
  } catch (error: any) {
    console.error('[getFacilities] Error:', {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      url: fullUrl,
      isAndroid: /android/i.test(navigator.userAgent),
    });
    
    return {
      data: [] as FacilityOut[],
      error: error,
      status: error?.response?.status,
    };
  }
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
