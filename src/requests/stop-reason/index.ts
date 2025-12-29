import axios from 'axios';

const VEHICLE_TRACKER_API_BASE = 'https://vehicle-tracker.skybud.de/api/v1';

export interface StopReasonRequest {
  reason: 'REST' | 'PERSONAL' | 'BREAKDOWN';
  stop_state_id: number;
  trip_id: number;
}

export interface StopReasonResponse {
  id: number;
  trip_id: number;
  reason: 'REST' | 'PERSONAL' | 'BREAKDOWN';
  ts: string;
  gps_lat: number;
  gps_lng: number;
}

export const submitStopReason = async (
  data: StopReasonRequest
): Promise<StopReasonResponse> => {
  try {
    const response = await axios.post<StopReasonResponse>(
      `${VEHICLE_TRACKER_API_BASE}/stop-reason`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        error.response.data?.detail || error.response.data?.message || 'Ошибка отправки данных'
      );
    }
    throw new Error('Ошибка сети. Проверьте подключение к интернету.');
  }
};

