import apiRequest from "../config.ts";
import { ApiResponse } from "../shared/types.ts";
import { CommentOut, CommentCreate, CommentUpdate, CommentQueryParams } from "./types.ts";

export const getComments = async (params?: CommentQueryParams): Promise<ApiResponse<CommentOut[]>> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.worker_process_id) queryParams.append('worker_process_id', params.worker_process_id.toString());
  
  const url = queryParams.toString() ? `/comment/?${queryParams.toString()}` : '/comment/';
  return await apiRequest<CommentOut[]>("GET", url);
};

export const getComment = async (comment_id: number): Promise<ApiResponse<CommentOut>> => {
  return await apiRequest<CommentOut>("GET", `/comment/${comment_id}`);
};

export const createComment = async (data: CommentCreate): Promise<ApiResponse<CommentOut>> => {
  return await apiRequest<CommentOut>("POST", "/comment/", {}, data);
};

export const updateComment = async (comment_id: number, data: CommentUpdate): Promise<ApiResponse<CommentOut>> => {
  return await apiRequest<CommentOut>("PUT", `/comment/${comment_id}`, {}, data);
};

export const deleteComment = async (comment_id: number): Promise<ApiResponse<void>> => {
  return await apiRequest<void>("DELETE", `/comment/${comment_id}`);
};
