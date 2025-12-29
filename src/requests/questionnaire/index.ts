import axios from 'axios';

const VEHICLE_TRACKER_API_BASE = 'https://vehicle-tracker.skybud.de/api/v1';

export interface QuestionnaireRequest {
  reason_type: 'WORK' | 'PERSONAL';
  reason: string;
  destination_description: string;
  destination_lat: number;
  destination_lng: number;
}

export interface QuestionnaireResponse {
  id: number;
  start_state_id: number;
  trip_id: number | null;
  reason_type: 'WORK' | 'PERSONAL';
  reason: string;
  destination_description: string;
  destination_lat: number;
  destination_lng: number;
  status: string;
  created_at: string;
  answered_at: string;
}

export const submitQuestionnaire = async (
  startStateId: number,
  data: QuestionnaireRequest
): Promise<QuestionnaireResponse> => {
  try {
    const response = await axios.post<QuestionnaireResponse>(
      `${VEHICLE_TRACKER_API_BASE}/questionnaire/${startStateId}`,
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

