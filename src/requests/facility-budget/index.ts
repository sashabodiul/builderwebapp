import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { FacilityBudgetOut, FacilityBudgetCreate, FacilityBudgetUpdate } from "./types.ts";

export const getFacilityBudgets = async (facility_id?: number | null): Promise<ApiResponse<FacilityBudgetOut[]>> => {
  const params = new URLSearchParams();
  if (facility_id !== undefined) {
    params.append('facility_id', facility_id === null ? '' : String(facility_id));
  }
  const url = params.toString() ? `/facility_budget/?${params.toString()}` : '/facility_budget/';
  return await apiRequest<FacilityBudgetOut[]>("GET", url);
};

export const getFacilityBudget = async (budget_id: number): Promise<ApiResponse<FacilityBudgetOut>> => {
  return await apiRequest<FacilityBudgetOut>("GET", `/facility_budget/${budget_id}`);
};

export const createFacilityBudget = async (data: FacilityBudgetCreate): Promise<ApiResponse<FacilityBudgetOut>> => {
  return await apiRequest<FacilityBudgetOut>("POST", "/facility_budget/", {}, data);
};

export const updateFacilityBudget = async (budget_id: number, data: FacilityBudgetUpdate): Promise<ApiResponse<FacilityBudgetOut>> => {
  return await apiRequest<FacilityBudgetOut>("PUT", `/facility_budget/${budget_id}`, {}, data);
};

export const deleteFacilityBudget = async (budget_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/facility_budget/${budget_id}`);
};


