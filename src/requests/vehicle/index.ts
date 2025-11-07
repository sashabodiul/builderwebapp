import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { AssignVehiclePayload, Vehicle } from "./types.ts";

export const getVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  return await apiRequest<Vehicle[]>("GET", "/vehicle/");
};

export const assignVehicle = async (
  vehicleId: number,
  data: AssignVehiclePayload
): Promise<ApiResponse<Vehicle>> => {
  return await apiRequest<Vehicle>("POST", `/vehicle/${vehicleId}/assign`, {}, data);
};

