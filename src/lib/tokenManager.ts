/**
 * Token Manager for CRM API
 * Handles token validation and regeneration
 * Uses default user info@skybud.de for CRM API requests
 */

import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';
import { loginWorker } from '../requests/worker';
import { WorkerLoginData } from '../requests/worker/types';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
// Note: We don't store password for security reasons

// Default CRM API user credentials
const DEFAULT_CRM_USER = {
  email: 'info@skybud.de',
  password: 'ChangeMe123!',
};

/**
 * Get current auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Save tokens to localStorage
 */
export const saveTokens = (accessToken: string, refreshToken?: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

/**
 * Clear tokens from localStorage
 */
export const clearTokens = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Note: We don't store password, so nothing to clear
};

/**
 * Check if token is valid by making a test request to CRM API
 * Uses a lightweight endpoint to validate token
 */
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const baseUrl = getApiBaseUrl();
    // Try to use a lightweight endpoint - if /worker/me doesn't exist, try /worker/ with limit=1
    // This is just to check if token is valid, not to get actual data
    // Try different token formats - some APIs expect Bearer prefix, some don't
    let authHeader = token;
    if (!token.startsWith('Bearer ')) {
      // Try with Bearer prefix
      authHeader = `Bearer ${token}`;
    }
    
    console.log('[TokenManager] Validating token, baseUrl:', baseUrl);
    const response = await axios.get(`${baseUrl}/api/v1/worker/?limit=1`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 seconds timeout for validation
      validateStatus: (status) => status < 500, // Don't throw on 401/403
    });
    
    console.log('[TokenManager] Token validation response status:', response.status);
    
    // Token is valid if status is 200-299
    // 401/403 means token is invalid
    if (response.status === 401 || response.status === 403) {
      console.warn('[TokenManager] Token validation failed: 401/403');
      // Try without Bearer prefix if we used it
      if (authHeader.startsWith('Bearer ')) {
        console.log('[TokenManager] Retrying without Bearer prefix');
        const retryResponse = await axios.get(`${baseUrl}/api/v1/worker/?limit=1`, {
          headers: {
            'Authorization': token,
            'Accept': 'application/json',
          },
          timeout: 5000,
          validateStatus: (status) => status < 500,
        });
        return retryResponse.status >= 200 && retryResponse.status < 300;
      }
      return false;
    }
    return response.status >= 200 && response.status < 300;
  } catch (error: any) {
    console.error('[TokenManager] Token validation error:', error);
    // Check if it's an auth error
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('[TokenManager] Token validation failed: auth error');
      return false;
    }
    // Network errors or timeouts - assume token might be valid but connection failed
    // We'll let the actual request fail if token is really invalid
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      console.warn('[TokenManager] Token validation: network error, assuming valid');
      return true; // Assume valid if we can't check
    }
    return false;
  }
};

/**
 * Regenerate token using refresh token
 */
export const regenerateTokenWithRefresh = async (refreshToken: string): Promise<string | null> => {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await axios.post(
      `${baseUrl}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (response.data?.access_token) {
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;
      
      saveTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    }
    
    return null;
  } catch (error: any) {
    console.error('Failed to refresh token:', error);
    return null;
  }
};

/**
 * Regenerate token using login credentials
 */
export const regenerateTokenWithLogin = async (email: string, password: string): Promise<string | null> => {
  try {
    // Get telegram user info if available
    let telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (import.meta.env.VITE_DEBUG) {
      telegramUser = {
        id: 1359929127,
        username: 'testuser',
        language_code: 'en',
      };
    }

    const loginData: WorkerLoginData = {
      email,
      password,
      telegram_id: telegramUser?.id || undefined,
      username: telegramUser?.username || undefined,
      language_code: window.navigator.language || undefined,
    };

    const response = await loginWorker(loginData);
    
    if (response?.error) {
      console.error('Login failed during token regeneration:', response.error);
      return null;
    }
    
    // Login endpoint might return token directly or we need to get it from response
    // Check if response has access_token
    const responseData = response.data as any;
    if (responseData?.access_token) {
      const accessToken = responseData.access_token;
      const refreshToken = responseData.refresh_token;
      saveTokens(accessToken, refreshToken);
      return accessToken;
    }
    
    // If login was successful but no token in response, try to get token from headers or make another request
    // For now, return null and let the user login again
    return null;
  } catch (error: any) {
    console.error('Failed to regenerate token with login:', error);
    return null;
  }
};

/**
 * Get token for default CRM API user (info@skybud.de)
 * This is used for all CRM API requests
 */
export const getDefaultCrmToken = async (): Promise<string | null> => {
  try {
    const baseUrl = getApiBaseUrl();
    console.log('[TokenManager] Getting default CRM token from:', baseUrl);
    
    // Try to login with default CRM user credentials
    const formData = new URLSearchParams();
    formData.append('email', DEFAULT_CRM_USER.email);
    formData.append('password', DEFAULT_CRM_USER.password);
    
    const response = await axios.post(
      `${baseUrl}/api/v1/worker/login`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('[TokenManager] Login response status:', response.status);
    console.log('[TokenManager] Login response data keys:', Object.keys(response.data || {}));
    
    // Check if response contains token
    const responseData = response.data;
    if (responseData?.access_token) {
      console.log('[TokenManager] Token found in response.data.access_token');
      return responseData.access_token;
    }
    
    // Check for token in different possible fields
    if (responseData?.token) {
      console.log('[TokenManager] Token found in response.data.token');
      return responseData.token;
    }
    
    // If token is in headers or different format, try to extract it
    const authHeader = response.headers['authorization'] || response.headers['Authorization'];
    if (authHeader) {
      console.log('[TokenManager] Token found in headers');
      // Remove 'Bearer ' prefix if present
      return authHeader.replace(/^Bearer\s+/i, '');
    }
    
    console.warn('[TokenManager] No token found in response');
    console.warn('[TokenManager] Response data:', JSON.stringify(responseData, null, 2));
    return null;
  } catch (error: any) {
    console.error('[TokenManager] Failed to get default CRM token:', error);
    console.error('[TokenManager] Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
    });
    return null;
  }
};

/**
 * Regenerate token - tries refresh token first, then default CRM user
 * For CRM API, we use default user info@skybud.de
 */
export const regenerateToken = async (): Promise<string | null> => {
  // Try refresh token first (if user has their own token)
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    const newToken = await regenerateTokenWithRefresh(refreshToken);
    if (newToken) {
      return newToken;
    }
  }
  
  // For CRM API, use default user credentials
  const defaultToken = await getDefaultCrmToken();
  if (defaultToken) {
    // Save default token (but don't save refresh token for default user)
    saveTokens(defaultToken);
    return defaultToken;
  }
  
  // If all else fails, return null
  return null;
};

/**
 * Ensure token is valid, regenerate if needed
 * For CRM API, uses default user info@skybud.de
 * Returns valid token or null if regeneration failed
 */
export const ensureValidToken = async (): Promise<string | null> => {
  let token = getAuthToken();
  
  if (!token) {
    // No token, try to get default CRM token
    console.log('No token found, getting default CRM token...');
    token = await getDefaultCrmToken();
    if (token) {
      saveTokens(token);
    } else {
      return null;
    }
  }
  
  // Check if token is valid
  const isValid = await validateToken(token);
  
  if (!isValid) {
    // Token is invalid, try to regenerate with default user
    console.log('Token is invalid, regenerating with default CRM user...');
    token = await getDefaultCrmToken();
    
    if (!token) {
      // Regeneration failed, clear tokens
      clearTokens();
      return null;
    }
    
    // Save new token
    saveTokens(token);
    
    // Validate new token
    const newTokenIsValid = await validateToken(token);
    if (!newTokenIsValid) {
      clearTokens();
      return null;
    }
  }
  
  return token;
};

