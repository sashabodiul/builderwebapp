import { ApiResponse } from "../shared/types.ts";
import { 
  AssignVehiclePayload, 
  Vehicle, 
  VehicleReservationRequestCreate,
  VehicleReservationRequestOut,
  VehicleReservationRequestApprove,
  VehicleReservationRequestReject,
  VehicleReservationRequestUpdate,
  WorkerVehicleReservationResponse,
  VehicleReservationStatusEnum
} from "./types.ts";
import axios from "axios";

export const getVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  // This endpoint should use bot-api, not api-crm
  const botApiUrl = 'https://bot-api.skybud.de';
  // bot-api uses a static token, not JWT
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.get(`${botApiUrl}/api/v1/vehicle/`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: [] as Vehicle[],
      error: error,
      status: error?.response?.status,
    };
  }
};

export const assignVehicle = async (
  vehicleId: number,
  data: AssignVehiclePayload
): Promise<ApiResponse<Vehicle>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/${vehicleId}/assign`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as Vehicle,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const unassignVehicle = async (
  vehicleId: number
): Promise<ApiResponse<Vehicle>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/${vehicleId}/unassign`, {}, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as Vehicle,
      error: error,
      status: error?.response?.status,
    };
  }
};

// Vehicle Reservation Requests
export const createVehicleReservationRequest = async (
  data: VehicleReservationRequestCreate
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  // Ensure status is not included in payload
  const payload: any = {
    vehicle_id: data.vehicle_id,
    worker_id: data.worker_id,
  };
  
  // Add dates if provided
  if (data.date_from) {
    payload.date_from = data.date_from;
  }
  if (data.date_to) {
    payload.date_to = data.date_to;
  }
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/requests`, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const getVehicleReservationRequests = async (
  params?: {
    status?: VehicleReservationStatusEnum;
    worker_id?: number;
    limit?: number;
    offset?: number;
  }
): Promise<ApiResponse<VehicleReservationRequestOut[]>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.worker_id) queryParams.append('worker_id', params.worker_id.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  try {
    const url = queryParams.toString() 
      ? `${botApiUrl}/api/v1/vehicle/requests?${queryParams.toString()}`
      : `${botApiUrl}/api/v1/vehicle/requests`;
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: [] as VehicleReservationRequestOut[],
      error: error,
      status: error?.response?.status,
    };
  }
};

export const approveVehicleReservationRequest = async (
  requestId: number,
  data: VehicleReservationRequestApprove
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/requests/${requestId}/approve`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const getVehicleReservationRequest = async (
  requestId: number
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.get(`${botApiUrl}/api/v1/vehicle/requests/${requestId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const cancelVehicleReservationRequest = async (
  requestId: number
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/requests/${requestId}/cancel`, {}, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const rejectVehicleReservationRequest = async (
  requestId: number,
  data: VehicleReservationRequestReject
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.post(`${botApiUrl}/api/v1/vehicle/requests/${requestId}/reject`, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const updateVehicleReservationRequest = async (
  requestId: number,
  data: VehicleReservationRequestUpdate
): Promise<ApiResponse<VehicleReservationRequestOut>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  // Ensure status is not included in payload
  const payload: any = {};
  if (data.worker_id !== undefined) {
    payload.worker_id = data.worker_id;
  }
  if (data.vehicle_id !== undefined) {
    payload.vehicle_id = data.vehicle_id;
  }
  if (data.date_from !== undefined) {
    payload.date_from = data.date_from;
  }
  if (data.date_to !== undefined) {
    payload.date_to = data.date_to;
  }
  
  try {
    const response = await axios.put(`${botApiUrl}/api/v1/vehicle/requests/${requestId}`, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {} as VehicleReservationRequestOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const deleteVehicleReservationRequest = async (
  requestId: number
): Promise<ApiResponse<void>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    await axios.delete(`${botApiUrl}/api/v1/vehicle/requests/${requestId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: undefined };
  } catch (error: any) {
    return {
      data: undefined,
      error: error,
      status: error?.response?.status,
    };
  }
};

export const getWorkerReservedVehicle = async (
  workerId: number
): Promise<ApiResponse<WorkerVehicleReservationResponse>> => {
  const botApiUrl = 'https://bot-api.skybud.de';
  const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';
  
  try {
    const response = await axios.get(`${botApiUrl}/api/v1/vehicle/worker/${workerId}/reserved`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      data: {
        has_reservation: false,
        reservation: null,
        vehicle: null,
      } as WorkerVehicleReservationResponse,
      error: error,
      status: error?.response?.status,
    };
  }
};

