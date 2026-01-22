import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { getApiBaseUrl } from "../lib/apiConfig";

// Use environment variable if set, otherwise use the configurable API URL
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // If env URL already contains /api/v1, don't add it again
    return envUrl.endsWith('/api/v1') ? envUrl : envUrl + "/api/v1";
  }
  return getApiBaseUrl() + "/api/v1";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000, // Увеличенный timeout по умолчанию для больших запросов (60 секунд)
});

// Update baseURL when environment changes
export const updateApiBaseUrl = () => {
  api.defaults.baseURL = getBaseUrl();
};

api.interceptors.request.use((config) => {
  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) {
    config.headers["Authorization"] = apiToken;
  }
  
  // Для FormData не устанавливаем Content-Type - браузер сам установит правильный заголовок с boundary
  // Это особенно важно для Android и больших файлов
  if (config.data instanceof FormData) {
    // Удаляем явно установленный Content-Type, если он есть
    delete config.headers['Content-Type'];
  }
  
  return config;
});

type ApiRequestOptions = AxiosRequestConfig;

const apiRequest = async <T>(
  method: Method,
  route: string,
  options: ApiRequestOptions = {},
  body: object | null = null
): Promise<{ data: T; error?: unknown; status?: number }> => {
  try {
    const config: ApiRequestOptions = { ...options };
    if (body) {
      config.data = body;
    }

    const response: AxiosResponse<T> = await api.request({
      method,
      url: route,
      ...config,
    });

    return { data: response.data };
  } catch (e: unknown) {
    const errorResponse = e as { response?: AxiosResponse<T> };
    return {
      data: (errorResponse.response?.data ?? {}) as T,
      error: e,
      status: errorResponse.response?.status,
    };
  }
};

export default apiRequest;