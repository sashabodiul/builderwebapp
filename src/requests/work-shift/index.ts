import { ApiResponse } from '../shared/types';
import { WorkShiftOut, StartWorkShiftData, EndWorkShiftData } from './types';
import axios from 'axios';

const botApiUrl = 'https://bot-api.skybud.de';
const botApiToken = '8fd3b8c4b91e47f5a6e2d7c9f1a4b3d2';

/**
 * Получить активную смену работника
 * @param worker_id - ID работника
 * @returns WorkShiftOut или null, если смена не начата (404)
 */
export const getActiveWorkShift = async (worker_id: number): Promise<ApiResponse<WorkShiftOut | null>> => {
  try {
    const response = await axios.get(`${botApiUrl}/api/v1/work-shifts/active`, {
      params: { worker_id },
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });
    
    return {
      status: response.status,
      error: null,
      data: response.data,
    };
  } catch (error: any) {
    // 404 означает, что смена не начата - это нормально
    if (error?.response?.status === 404) {
      return {
        status: 404,
        error: null,
        data: null,
      };
    }
    
    return {
      data: null,
      error: error,
      status: error?.response?.status,
    };
  }
};

/**
 * Начать смену
 * @param data - Данные для начала смены
 * @returns WorkShiftOut
 */
export const startWorkShift = async (data: StartWorkShiftData): Promise<ApiResponse<WorkShiftOut>> => {
  try {
    const formData = new FormData();
    formData.append('worker_id', data.worker_id.toString());
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    const response = await axios.post(`${botApiUrl}/api/v1/work-shifts/start`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });

    return {
      status: response.status,
      error: null,
      data: response.data,
    };
  } catch (error: any) {
    return {
      data: {} as WorkShiftOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

/**
 * Завершить смену
 * @param data - Данные для завершения смены
 * @returns WorkShiftOut (с заполненными total_time, object_time, travel_time, summary_rate)
 */
export const endWorkShift = async (data: EndWorkShiftData): Promise<ApiResponse<WorkShiftOut>> => {
  try {
    const formData = new FormData();
    formData.append('worker_id', data.worker_id.toString());
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    const response = await axios.post(`${botApiUrl}/api/v1/work-shifts/end`, formData, {
      headers: {
        'Accept': 'application/json',
        'Authorization': botApiToken,
      },
    });

    return {
      status: response.status,
      error: null,
      data: response.data,
    };
  } catch (error: any) {
    return {
      data: {} as WorkShiftOut,
      error: error,
      status: error?.response?.status,
    };
  }
};

