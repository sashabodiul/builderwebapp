import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Play, Square, MapPin, Calendar, MessageCircle, ListChecks, Car, Unlock, Loader2, Clock, X, AlertCircle } from 'lucide-react';
import { getFacilities } from '../../../requests/facility';
import { FacilityOut } from '../../../requests/facility/types';
import { startWork, getActiveWorkProcess } from '../../../requests/work';
import { WorkProcessStartOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import TodoList from './TodoList';
import { Button } from '@/components/ui/button';
import { getVehicles, unassignVehicle, createVehicleReservationRequest, getWorkerReservedVehicle, getVehicleReservationRequests, cancelVehicleReservationRequest } from '../../../requests/vehicle';
import { Vehicle, VehicleReservationRequestOut } from '../../../requests/vehicle/types';
import type { RootState } from '@/store/config';

interface WorkMainProps {
  onStartWork: (objectId: string) => void;
  onStopWork: () => void;
  selectedObject: string;
  onObjectSelect: (objectId: string) => void;
  onShowHistory: () => void;
}

const WorkMain: FC<WorkMainProps> = ({ onStartWork, onStopWork, selectedObject, onObjectSelect, onShowHistory }) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.data.user);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setActiveWorkProcess] = useState<WorkProcessStartOut | null>(null);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservedVehicle, setReservedVehicle] = useState<Vehicle | null>(null);
  const [reservationRequest, setReservationRequest] = useState<VehicleReservationRequestOut | null>(null);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [isVehicleActionLoading, setIsVehicleActionLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const isRestricted = !user?.rate || user?.worker_type == null;
  const availableVehicles = useMemo(
    () => vehicles.filter(vehicle => (vehicle.owner_id == null || vehicle.owner_id === 0) && vehicle.external_id != null),
    [vehicles]
  );

  useEffect(() => {
    const fetchFacilities = async () => {
      const response = await getFacilities();

      if (response.error) {
        console.error('Failed to fetch facilities:', response);
        toastError(t('work.loadError'));
        setIsLoading(false);
        return;
      }

      // Ensure data is an array
      const facilitiesData = Array.isArray(response.data) ? response.data : [];
      setFacilities(facilitiesData);
      setIsLoading(false);
    };

    fetchFacilities();
  }, [t]);

  const fetchVehicles = useCallback(async () => {
    if (!user?.id || isRestricted) {
      setVehicles([]);
      setReservedVehicle(null);
      setSelectedVehicleId(null);
      setIsVehiclesLoading(false);
      return;
    }

    setIsVehiclesLoading(true);
    try {
      const response = await getVehicles();

      if (response.error) {
        console.error('Failed to fetch vehicles:', response);
        toastError(t('work.vehicle.loadError'));
        return;
      }

      const vehiclesList = response.data ?? [];
      
      // Check worker's reservation status
      // Only check if we don't already have a reservation request in state (to avoid overwriting just-created requests)
      if (user?.id && !reservationRequest) {
        // Use the simplified endpoint that returns reservation status for the worker
        const reservationResponse = await getWorkerReservedVehicle(user.id);
        if (reservationResponse.data) {
          if (reservationResponse.data.has_reservation && reservationResponse.data.reservation?.status === 'approved') {
            setReservedVehicle(reservationResponse.data.vehicle);
            setReservationRequest(reservationResponse.data.reservation);
          } else if (reservationResponse.data.reservation) {
            // Has pending/rejected/cancelled request
            setReservationRequest(reservationResponse.data.reservation);
            setReservedVehicle(null);
          } else {
            // Check for pending requests using worker_id filter
            try {
              const pendingRequestsResponse = await getVehicleReservationRequests({ 
                worker_id: user.id,
                status: 'pending',
                limit: 1,
                offset: 0
              });
              if (pendingRequestsResponse.data && pendingRequestsResponse.data.length > 0) {
                setReservationRequest(pendingRequestsResponse.data[0]);
                setReservedVehicle(null);
              } else {
                setReservedVehicle(null);
                setReservationRequest(null);
              }
            } catch (error) {
              console.error('Error checking pending requests:', error);
              setReservedVehicle(null);
              setReservationRequest(null);
            }
          }
        } else {
          setReservedVehicle(null);
          setReservationRequest(null);
        }
      }

      const visibleVehicles = vehiclesList.filter(
        vehicle => !(vehicle.external_id === null && vehicle.owner_id !== null && vehicle.owner_id !== 0)
      );
      setVehicles(visibleVehicles);

      if (reservedVehicle) {
        setSelectedVehicleId(reservedVehicle.id);
      } else {
        const firstAvailable = visibleVehicles.find(vehicle => vehicle.owner_id == null || vehicle.owner_id === 0);
        setSelectedVehicleId(firstAvailable ? firstAvailable.id : null);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toastError(t('work.vehicle.loadError'));
    } finally {
      setIsVehiclesLoading(false);
    }
  }, [user?.id, isRestricted, t]);

  useEffect(() => {
    const checkActiveWork = async () => {
      if (!user?.id) return;

      const response = await getActiveWorkProcess(user.id);

      if (response.error) {
        console.error('Failed to check active work:', response);
        return;
      }

      if (response.data) {
        setActiveWorkProcess(response.data);
        setIsWorking(true);
        onStartWork(response.data.facility_id?.toString() || '');
      }
    };

    checkActiveWork();
  }, [user?.id, onStartWork]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const formatToday = () => {
    const today = new Date();
    return today.toLocaleDateString('uk-UA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStartWork = async () => {
    if (!selectedObject) {
      toastError(t('work.selectObjectFirst'));
      return;
    }

    setIsStartingWork(true);

    try {
      toastSuccess(t('work.requestingGeolocation'));

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const startWorkData = {
        worker_id: user?.id || 0,
        facility_id: parseInt(selectedObject),
        latitude,
        longitude
      };

      const response = await startWork(startWorkData);

      if (response.error) {
        console.error('Failed to start work:', response);
        toastError(t('work.startWorkError'));
        setIsStartingWork(false);
        return;
      }

      setActiveWorkProcess(response.data);
      setIsWorking(true);
      onStartWork(selectedObject);
      toastSuccess(t('work.workStarted'));
    } catch (error) {
      console.error('Error starting work:', error);
      if (error instanceof GeolocationPositionError) {
        const errorMessage = error.code === 1
          ? t('work.geolocationDenied')
          : error.code === 2
            ? t('work.geolocationUnavailable')
            : t('work.geolocationTimeout');
        toastError(errorMessage);
      } else {
        toastError(t('work.startWorkError'));
      }
    } finally {
      setIsStartingWork(false);
    }
  };

  const handleStopWork = () => {
    onStopWork();
  };


  const handleSelectVehicle = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleReserveVehicle = async () => {
    if (!selectedVehicleId || !user?.id) {
      toastError(t('work.vehicle.selectVehicleFirst'));
      return;
    }

    // Validate that at least one date is selected
    if (!dateFrom && !dateTo) {
      toastError(t('work.vehicle.selectDateFirst', 'Пожалуйста, выберите дату бронирования'));
      return;
    }

    // All users create reservation requests, not direct assign
    setIsVehicleActionLoading(true);
    try {
      const payload: any = {
        vehicle_id: selectedVehicleId,
        worker_id: user.id,
      };
      
      // Add dates if provided
      if (dateFrom) {
        payload.date_from = dateFrom;
      }
      if (dateTo) {
        payload.date_to = dateTo;
      }
      
      const response = await createVehicleReservationRequest(payload);

      if (response.error) {
        console.error('Failed to create reservation request:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      // Update reservation request state immediately
      if (response.data) {
        setReservationRequest(response.data);
        setReservedVehicle(null);
      }

      toastSuccess(t('work.vehicle.requestSent', 'Запрос на бронирование авто успешно отправлен'));
      setSelectedVehicleId(null);
      setDateFrom('');
      setDateTo('');
      
      // Refresh vehicles list, but preserve the reservation request we just created
      const createdRequest = response.data;
      
      // Don't call fetchVehicles immediately - it might overwrite the state
      // Instead, just refresh the vehicles list without checking reservation status
      try {
        const vehiclesResponse = await getVehicles();
        if (!vehiclesResponse.error && vehiclesResponse.data) {
          const vehiclesList = vehiclesResponse.data;
          const visibleVehicles = vehiclesList.filter(
            vehicle => !(vehicle.external_id === null && vehicle.owner_id !== null && vehicle.owner_id !== 0)
          );
          setVehicles(visibleVehicles);
        }
      } catch (error) {
        console.error('Error refreshing vehicles:', error);
      }
      
      // Ensure reservation request is set
      if (createdRequest) {
        setReservationRequest(createdRequest);
        setReservedVehicle(null);
      }
    } catch (error) {
      console.error('Error creating reservation request:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleReleaseVehicle = async () => {
    if (!reservedVehicle) {
      return;
    }

    setIsVehicleActionLoading(true);
    try {
      const response = await unassignVehicle(reservedVehicle.id);

      if (response.error) {
        console.error('Failed to release vehicle:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      toastSuccess(t('work.vehicle.releaseSuccess'));
      setReservedVehicle(null);
      setReservationRequest(null);
      await fetchVehicles();
    } catch (error) {
      console.error('Error releasing vehicle:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!reservationRequest || reservationRequest.status !== 'pending') {
      return;
    }

    setIsVehicleActionLoading(true);
    try {
      const response = await cancelVehicleReservationRequest(reservationRequest.id);

      if (response.error) {
        console.error('Failed to cancel request:', response);
        const errorMsg = (response.error as any)?.response?.data?.detail || t('work.vehicle.actionError');
        toastError(errorMsg);
        return;
      }

      toastSuccess(t('work.vehicle.requestCancelled', 'Запрос отменен'));
      setReservationRequest(null);
      await fetchVehicles();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toastError(t('work.vehicle.actionError'));
    } finally {
      setIsVehicleActionLoading(false);
    }
  };

  const handleTelegramGroup = () => {
    const selectedFacility = facilities.find(facility => facility.id.toString() === selectedObject);
    const telegramGroupUrl = selectedFacility?.invite_link || 'https://t.me/skybud_workers';
    window.open(telegramGroupUrl, '_blank');
  };


  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-theme-text-primary">{t('work.title')}</h1>
            <div className="flex items-center gap-2 text-theme-text-secondary text-lg">
              <Calendar className="h-5 w-5" />
              <span>{t('work.today')}: {formatToday()}</span>
            </div>
          </div>
          <Button
            variant="default"
            size="lg"
            className="w-full md:w-auto text-lg font-semibold gap-3 px-6 py-4"
            onClick={onShowHistory}
          >
            <ListChecks className="h-6 w-6" />
            {t('work.history.viewButton')}
          </Button>
        </div>

        {!isWorking && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-theme-text-primary mb-4">{t('work.selectObject')}</h2>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-theme-text-secondary text-lg">{t('work.noObjects')}</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {facilities.map((facility) => (
                  <div
                    key={facility.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedObject === facility.id.toString()
                      ? 'border-theme-accent bg-theme-accent/10'
                      : 'border-theme-border hover:border-theme-accent/50'
                      }`}
                    onClick={() => onObjectSelect(facility.id.toString())}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-theme-accent mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-theme-text-primary mb-1">
                          {facility.name || t('work.unnamedObject')}
                        </h3>
                        {facility.latitude && facility.longitude && (
                          <p className="text-theme-text-secondary">
                            {facility.latitude.toFixed(6)}, {facility.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                      {selectedObject === facility.id.toString() && (
                        <div className="w-4 h-4 bg-theme-accent rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isRestricted && (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 mb-4">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold text-theme-text-primary">
                  {reservedVehicle && reservationRequest?.status === 'approved' 
                    ? t('work.vehicle.alreadyReservedTitle') 
                    : reservationRequest?.status === 'pending'
                    ? t('work.vehicle.requestPendingTitle', 'Запрос на бронирование')
                    : t('work.vehicle.sectionTitle')}
                </h2>
              </div>
              {isVehiclesLoading ? (
                <div className="flex justify-center items-center py-4 text-sm text-theme-text-secondary">
                  {t('common.loading')}
                </div>
              ) : reservedVehicle && reservationRequest?.status === 'approved' ? (
                <>
                  <div className="bg-theme-accent/15 border border-theme-accent rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Car className="h-5 w-5 text-theme-text-primary flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-base font-semibold text-theme-text-primary truncate">
                          {reservedVehicle.model || t('work.vehicle.unknownModel')}
                        </span>
                        <span className="text-sm text-theme-text-secondary truncate">
                          {reservedVehicle.license_plate
                            ? t('work.vehicle.licensePlate', { plate: reservedVehicle.license_plate })
                            : t('work.vehicle.noLicensePlate')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-sm font-semibold py-2.5 h-auto"
                    onClick={handleReleaseVehicle}
                    disabled={isVehicleActionLoading}
                  >
                    {isVehicleActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2">{t('work.vehicle.releaseLoading')}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        <span className="ml-2">{t('work.vehicle.releaseButton')}</span>
                      </>
                    )}
                  </Button>
                </>
              ) : reservationRequest ? (
                <>
                  <div className="border border-theme-border rounded-lg p-4 bg-theme-bg-card">
                    <div className="flex flex-col gap-3">
                      {/* Vehicle Info */}
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                          reservationRequest.status === 'pending'
                            ? 'bg-amber-200 border-2 border-amber-400'
                            : reservationRequest.status === 'rejected'
                            ? 'bg-rose-200 border-2 border-rose-400'
                            : 'bg-theme-accent/20 border-2 border-theme-accent/30'
                        }`}>
                          <Car className="h-6 w-6 text-theme-text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold text-theme-text-primary mb-1">
                            {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.model || t('work.vehicle.unknownModel')}
                          </div>
                          {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.license_plate && (
                            <div className="text-sm text-theme-text-secondary font-medium">
                              {vehicles.find(v => v.id === reservationRequest.vehicle_id)?.license_plate}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${
                          reservationRequest.status === 'pending'
                            ? 'bg-amber-200 text-amber-900 border border-amber-400'
                            : reservationRequest.status === 'rejected'
                            ? 'bg-rose-200 text-rose-900 border border-rose-400'
                            : 'bg-slate-200 text-slate-900 border border-slate-400'
                        }`}>
                          {reservationRequest.status === 'pending' && (
                            <>
                              <Clock className="h-4 w-4 text-amber-900" />
                              {t('work.vehicle.awaitingApproval', 'Ожидается подтверждение')}
                            </>
                          )}
                          {reservationRequest.status === 'rejected' && (
                            <>
                              <X className="h-4 w-4 text-rose-900" />
                              {t('work.vehicle.requestRejected', 'Запрос отклонен')}
                            </>
                          )}
                          {reservationRequest.status === 'cancelled' && (
                            <>
                              <AlertCircle className="h-4 w-4 text-slate-900" />
                              {t('work.vehicle.requestCancelled', 'Запрос отменен')}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Dates Info */}
                      {(reservationRequest.date_from || reservationRequest.date_to) && (
                        <div className="text-sm text-theme-text-secondary space-y-1">
                          {reservationRequest.date_from && (
                            <div>
                              <span className="font-medium text-theme-text-primary">{t('work.vehicle.dateFrom', 'Дата с')}:</span>{' '}
                              {new Date(reservationRequest.date_from).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          {reservationRequest.date_to && (
                            <div>
                              <span className="font-medium text-theme-text-primary">{t('work.vehicle.dateTo', 'Дата по')}:</span>{' '}
                              {new Date(reservationRequest.date_to).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {reservationRequest.status === 'rejected' && reservationRequest.rejection_reason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                          <div className="text-sm font-semibold text-rose-900 mb-1">
                            {t('work.vehicle.rejectionReason', 'Причина отклонения')}:
                          </div>
                          <div className="text-sm text-rose-800">
                            {reservationRequest.rejection_reason}
                          </div>
                        </div>
                      )}

                      {/* Date Info */}
                      <div className="text-sm text-theme-text-secondary">
                        <span className="font-medium text-theme-text-primary">{t('work.vehicle.requestCreatedAt', 'Запрос создан')}:</span>{' '}
                        {new Date(reservationRequest.created_at).toLocaleString('ru-RU')}
                      </div>

                      {/* Cancel Button */}
                      {reservationRequest.status === 'pending' && (
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-sm font-semibold px-4 py-2 border-rose-400 text-rose-700 bg-rose-50"
                            onClick={handleCancelRequest}
                            disabled={isVehicleActionLoading}
                          >
                            {isVehicleActionLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t('common.processing', 'Обработка...')}
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                {t('work.vehicle.cancelRequest', 'Отменить запрос')}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {availableVehicles.length > 0 ? (
                    <>
                      <div className="bg-theme-bg-tertiary border border-theme-border rounded-lg p-2.5 flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-theme-text-primary flex-shrink-0" />
                        <span className="text-xs font-semibold text-theme-text-primary">
                          {t('work.vehicle.availableCount', { count: availableVehicles.length })}
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                        {availableVehicles.map((vehicle) => {
                          const isSelected = selectedVehicleId === vehicle.id;
                          return (
                            <button
                              key={vehicle.id}
                              type="button"
                              onClick={() => handleSelectVehicle(vehicle.id)}
                              className={`relative group w-full text-left bg-gradient-to-r from-theme-bg-secondary to-theme-bg-tertiary border-2 rounded-xl p-3.5 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md ${
                                isSelected
                                  ? 'border-theme-accent bg-theme-accent/10 shadow-lg shadow-theme-accent/20'
                                  : 'border-theme-border hover:border-theme-accent/40'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-theme-accent border-theme-accent'
                                    : 'bg-theme-accent/20 border-theme-accent/30'
                                }`}>
                                  <Car className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-theme-text-primary'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-bold text-theme-text-primary truncate mb-0.5">
                                    {vehicle.model || t('work.vehicle.unknownModel')}
                                  </div>
                                  <div className="text-xs font-medium text-theme-text-secondary">
                                    {vehicle.license_plate || t('work.vehicle.noLicensePlate')}
                                  </div>
                                </div>
                                <div className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-md ${
                                  isSelected
                                    ? 'text-white bg-theme-accent'
                                    : 'text-theme-accent bg-theme-accent/10'
                                }`}>
                                  {isSelected ? t('work.vehicle.selected', 'Выбрано') : t('work.vehicle.available', 'Доступно')}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-theme-accent rounded-full animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Date Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-theme-text-primary flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('work.vehicle.dateFrom', 'Дата с')}
                          </span>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:ring-2 focus:ring-theme-accent focus:border-transparent"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-theme-text-primary flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('work.vehicle.dateTo', 'Дата по')}
                          </span>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:ring-2 focus:ring-theme-accent focus:border-transparent"
                            min={dateFrom || new Date().toISOString().split('T')[0]}
                          />
                        </label>
                      </div>
                      
                      <Button
                        size="sm"
                        className={`w-full text-sm font-bold py-3 h-auto shadow-lg mt-3 transition-all ${
                          selectedVehicleId && (dateFrom || dateTo)
                            ? 'bg-theme-accent hover:bg-theme-accent/90 text-white'
                            : 'bg-theme-bg-tertiary text-theme-text-muted border border-theme-border'
                        }`}
                        onClick={handleReserveVehicle}
                        disabled={!selectedVehicleId || !(dateFrom || dateTo) || isVehicleActionLoading}
                      >
                        {isVehicleActionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">{t('work.vehicle.reserveLoading', 'Бронирование...')}</span>
                          </>
                        ) : (
                          <>
                            <Car className="h-4 w-4" />
                            <span className="ml-2">
                              {!selectedVehicleId
                                ? t('work.vehicle.selectVehicleFirst', 'Выберите авто')
                                : !(dateFrom || dateTo)
                                ? t('work.vehicle.selectDateFirst', 'Выберите дату')
                                : t('work.vehicle.createRequest', 'Подать запрос')
                              }
                            </span>
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="text-sm text-theme-text-muted">
                        {t('work.vehicle.noAvailable')}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!isWorking ? (
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
            <div className="text-center">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
                  {t('work.readyToStart')}
                </h2>
                {isRestricted ? (
                  <p className="text-theme-text-secondary text-lg font-medium">Wait for admin approvement</p>
                ) : (
                  <>
                    <button
                      onClick={handleStartWork}
                      disabled={!selectedObject || isStartingWork}
                      className={`px-8 py-4 rounded-xl text-xl font-bold transition-all flex items-center gap-3 mx-auto ${selectedObject && !isStartingWork
                        ? 'bg-theme-accent hover:bg-theme-accent-hover text-white shadow-lg hover:shadow-xl'
                        : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
                        }`}
                    >
                      {isStartingWork ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          {t('work.startingWork')}
                        </>
                      ) : (
                        <>
                          <Play className="h-6 w-6" />
                          {t('work.startWork')}
                        </>
                      )}
                    </button>
                    {!selectedObject && (
                      <p className="text-theme-text-muted mt-3">
                        {t('work.selectObjectFirst')}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-theme-bg-card border border-theme-border rounded-xl text-center p-6">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-4">
                  {t('work.working')}
                </h2>
                <div className="bg-theme-accent/20 border border-theme-accent rounded-xl p-4 mb-6">
                  <p className="text-theme-text-primary font-medium">
                    {t('work.currentObject')}: {facilities.find(facility => facility.id.toString() === selectedObject)?.name || t('work.unnamedObject')}
                  </p>
                </div>
                <button
                  onClick={handleStopWork}
                  className="px-8 py-4 rounded-xl text-xl font-bold bg-theme-error hover:bg-theme-error/80 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-3 mx-auto"
                >
                  <Square className="h-6 w-6" />
                  {t('work.stopWork')}
                </button>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleTelegramGroup}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {t('work.joinTelegramGroup')}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-theme-bg-card mt-6 border border-theme-border text-center rounded-xl p-6">
              <div className="text-xl font-semibold text-theme-text-primary mb-3">{t('work.todoList')}</div>
              <TodoList
                embedded
                workPhotos={[]}
                toolsPhotos={[]}
                videoFile={null}
                facilityId={selectedObject ? Number(selectedObject) : null}
                facilityTypeId={facilities.find(f => f.id.toString() === selectedObject)?.facility_type_id ?? null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkMain;
