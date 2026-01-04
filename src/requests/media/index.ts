import axios from 'axios';
import { getApiBaseUrl } from '../../lib/apiConfig';

export type MediaItem = {
  id: number;
  filename: string;
  s3_path: string;
  content_type: string;
  kind: string;
  created_at: string;
  object_id: number;
  uploaded_by?: number;
  is_liked?: boolean;
  total_likes?: number;
};

export type MediaResponse = {
  items: MediaItem[];
  total: number;
};

// Конвертация S3 URL в публичный HTTP URL
export const convertS3Url = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('s3://')) {
    const S3_PUBLIC_BASE = 'https://eu2.contabostorage.com/98b79ab87f924c309a1865b38fe9f4d2:';
    return url.replace('s3://', S3_PUBLIC_BASE);
  }
  return url;
};

export const fetchMediaByObjectId = async (
  objectId: number,
  limit: number = 50,
  offset: number = 0
): Promise<MediaResponse> => {
  const queryParams = new URLSearchParams();
  queryParams.append('object_id', objectId.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (offset) queryParams.append('offset', offset.toString());
  
  // Всегда используем api-crm для медиа, независимо от VITE_API_URL
  const baseUrl = getApiBaseUrl(); // Возвращает https://api-crm.skybud.de по умолчанию
  const url = `${baseUrl}/api/v1/media?${queryParams.toString()}`;
  
  try {
    const apiToken = import.meta.env.VITE_API_TOKEN;
    const response = await axios.get<MediaResponse>(url, {
      headers: {
        'Accept': 'application/json',
        ...(apiToken && { 'Authorization': apiToken }),
      },
    });
    return response.data || { items: [], total: 0 };
  } catch (error: any) {
    console.error('Failed to fetch media:', error);
    throw new Error(error?.response?.data?.detail || 'Failed to fetch media');
  }
};

export type LikeResponse = {
  media_id: number;
  worker_id: number;
  is_liked: boolean;
  action: 'liked' | 'unliked';
  total_likes: number;
};

export type LikedMediaResponse = {
  items: MediaItem[];
  total: number;
  limit: number;
  offset: number;
  worker_id: number;
};

// Поставить/убрать лайк
export const toggleMediaLike = async (
  mediaId: number,
  workerId: number
): Promise<LikeResponse> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/media/${mediaId}/like?worker_id=${workerId}`;
  
  try {
    const apiToken = import.meta.env.VITE_API_TOKEN;
    const response = await axios.post<LikeResponse>(url, {}, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(apiToken && { 'Authorization': apiToken }),
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to toggle like:', error);
    throw new Error(error?.response?.data?.detail || 'Failed to toggle like');
  }
};

// Получить все лайкнутые медиа работника
export const getLikedMedia = async (
  workerId: number,
  limit: number = 50,
  offset: number = 0
): Promise<LikedMediaResponse> => {
  const queryParams = new URLSearchParams();
  queryParams.append('worker_id', workerId.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (offset) queryParams.append('offset', offset.toString());
  
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/media/liked?${queryParams.toString()}`;
  
  try {
    const apiToken = import.meta.env.VITE_API_TOKEN;
    const response = await axios.get<LikedMediaResponse>(url, {
      headers: {
        'Accept': 'application/json',
        ...(apiToken && { 'Authorization': apiToken }),
      },
    });
    return response.data || { items: [], total: 0, limit, offset, worker_id: workerId };
  } catch (error: any) {
    console.error('Failed to fetch liked media:', error);
    throw new Error(error?.response?.data?.detail || 'Failed to fetch liked media');
  }
};

