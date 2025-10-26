export type WorkProcessStartOut = {
  id: number;
  worker_id: number;
  facility_id: number | null;
  start_time: string; // ISO date string
  start_latitude: number;
  start_longitude: number;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type WorkProcessEndOut = {
  id: number;
  worker_id: number;
  facility_id: number | null;
  start_time: string; // ISO date string
  start_latitude: number;
  start_longitude: number;
  end_time: string; // ISO date string
  end_latitude: number;
  end_longitude: number;
  status_object_finished: boolean;
  report_video: string | null;
  done_work_photos: string | null;
  instrument_photos: string | null;
  lunch_time: number | null; // in seconds
  overtime_time: number | null; // in seconds
  work_time: number | null; // in seconds
  summary_rate: number | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
};

export type WorkProcess = WorkProcessStartOut | WorkProcessEndOut;

export type StartWorkData = {
  worker_id: number;
  facility_id?: number | null;
  latitude: number;
  longitude: number;
};

export type EndWorkData = {
  worker_id: number;
  latitude: number;
  longitude: number;
  status_object_finished: boolean;
  report_video?: File | null;
  done_work_photos?: File[] | null;
  instrument_photos?: File[] | null;
};

export type WorkProcessQueryParams = {
  limit?: number;
  offset?: number;
  worker_id?: number | null;
  facility_id?: number | null;
  facility_type_id?: number | null;
};
