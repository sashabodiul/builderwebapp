export type Vehicle = {
  id: number;
  license_plate: string | null;
  model: string | null;
  external_id: number | null;
  owner_id: number | null;
};

export type AssignVehiclePayload = {
  owner_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
};

