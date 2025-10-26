import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api/v1",
});

api.interceptors.request.use((config) => {
  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) {
    config.headers["Authorization"] = apiToken;
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