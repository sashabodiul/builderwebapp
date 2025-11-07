import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Play, Square, MapPin, Calendar, MessageCircle, ListChecks, Car, Unlock, Loader2 } from 'lucide-react';
import { getFacilities } from '../../../requests/facility';
import { FacilityOut } from '../../../requests/facility/types';
import { startWork, getActiveWorkProcess } from '../../../requests/work';
import { WorkProcessStartOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import TodoList from './TodoList';
import { Button } from '@/components/ui/button';
import { getVehicles, assignVehicle } from '../../../requests/vehicle';
import { Vehicle } from '../../../requests/vehicle/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [isVehicleActionLoading, setIsVehicleActionLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const isRestricted = !user?.rate || user?.worker_type == null;
  const availableVehicles = useMemo(
    () => vehicles.filter(vehicle => vehicle.owner_id == null),
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

      setFacilities(response.data);
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
      setVehicles(vehiclesList);

      const ownedVehicle = vehiclesList.find(vehicle => vehicle.owner_id === user.id) || null;
      setReservedVehicle(ownedVehicle);

      if (ownedVehicle) {
        setSelectedVehicleId(ownedVehicle.id);
      } else {
        const firstAvailable = vehiclesList.find(vehicle => vehicle.owner_id == null);
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

  const handleOpenVehicleModal = () => {
    if (isVehicleActionLoading) return;
    setIsVehicleModalOpen(true);
    if (!reservedVehicle && availableVehicles.length > 0) {
      setSelectedVehicleId(availableVehicles[0].id);
    }
    fetchVehicles();
  };

  const handleReserveVehicle = async () => {
    if (!selectedVehicleId) {
      toastError(t('work.vehicle.selectVehicleFirst'));
      return;
    }

    setIsVehicleActionLoading(true);
    try {
      const response = await assignVehicle(selectedVehicleId, {
        owner_id: user?.id ?? null,
      });

      if (response.error) {
        console.error('Failed to reserve vehicle:', response);
        toastError(t('work.vehicle.actionError'));
        return;
      }

      toastSuccess(t('work.vehicle.reserveSuccess'));
      setIsVehicleModalOpen(false);
      await fetchVehicles();
    } catch (error) {
      console.error('Error reserving vehicle:', error);
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
      const response = await assignVehicle(reservedVehicle.id, {
        owner_id: null,
      });

      if (response.error) {
        console.error('Failed to release vehicle:', response);
        toastError(t('work.vehicle.actionError'));
        return;
      }

      toastSuccess(t('work.vehicle.releaseSuccess'));
      await fetchVehicles();
    } catch (error) {
      console.error('Error releasing vehicle:', error);
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
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary">
                  {reservedVehicle ? t('work.vehicle.alreadyReservedTitle') : t('work.vehicle.sectionTitle')}
                </h2>
                <p className="text-theme-text-secondary text-lg mt-2">
                  {reservedVehicle ? t('work.vehicle.alreadyReservedSubtitle') : t('work.vehicle.sectionSubtitle')}
                </p>
              </div>
              {isVehiclesLoading ? (
                <div className="flex justify-center items-center py-6 text-lg text-theme-text-secondary">
                  {t('common.loading')}
                </div>
              ) : reservedVehicle ? (
                <>
                  <div className="bg-theme-accent/15 border border-theme-accent rounded-xl p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Car className="h-8 w-8 text-theme-accent" />
                      <span className="text-2xl font-semibold text-theme-text-primary">
                        {reservedVehicle.model || t('work.vehicle.unknownModel')}
                      </span>
                    </div>
                    <span className="text-lg text-theme-text-secondary">
                      {reservedVehicle.license_plate
                        ? t('work.vehicle.licensePlate', { plate: reservedVehicle.license_plate })
                        : t('work.vehicle.noLicensePlate')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <Button
                      variant="destructive"
                      size="lg"
                      className="text-lg font-semibold px-6 py-4 h-auto"
                      onClick={handleReleaseVehicle}
                      disabled={isVehicleActionLoading}
                    >
                      {isVehicleActionLoading ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          {t('work.vehicle.releaseLoading')}
                        </>
                      ) : (
                        <>
                          <Unlock className="h-6 w-6" />
                          {t('work.vehicle.releaseButton')}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-theme-bg-tertiary border border-theme-border rounded-xl p-5 flex items-center gap-3">
                    <Car className="h-8 w-8 text-theme-accent flex-shrink-0" />
                    <span className="text-xl text-theme-text-primary font-semibold">
                      {availableVehicles.length > 0
                        ? t('work.vehicle.availableCount', { count: availableVehicles.length })
                        : t('work.vehicle.noAvailable')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <Button
                      size="lg"
                      className="text-lg font-semibold px-6 py-4 h-auto"
                      onClick={handleOpenVehicleModal}
                      disabled={availableVehicles.length === 0}
                    >
                      <Car className="h-6 w-6" />
                      {t('work.vehicle.reserveButton')}
                    </Button>
                  </div>
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

      <Dialog
        open={isVehicleModalOpen}
        onOpenChange={(open) => {
          setIsVehicleModalOpen(open);
          if (!open) {
            setSelectedVehicleId(reservedVehicle ? reservedVehicle.id : null);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-theme-bg-card border border-theme-border text-theme-text-primary">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-theme-text-primary">
              {t('work.vehicle.modalTitle')}
            </DialogTitle>
            <DialogDescription className="text-lg text-theme-text-secondary">
              {t('work.vehicle.modalDescription')}
            </DialogDescription>
          </DialogHeader>
          {isVehiclesLoading ? (
            <div className="flex justify-center items-center py-6 text-lg text-theme-text-secondary">
              {t('common.loading')}
            </div>
          ) : availableVehicles.length === 0 ? (
            <div className="text-theme-text-secondary text-lg">
              {t('work.vehicle.noAvailable')}
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar">
              {availableVehicles.map((vehicle) => (
                <button
                  type="button"
                  key={vehicle.id}
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  className={`w-full text-left p-5 border-2 rounded-xl transition-all ${selectedVehicleId === vehicle.id
                    ? 'border-theme-accent bg-theme-accent/10 shadow-lg'
                    : 'border-theme-border hover:border-theme-accent/40'
                    }`}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-semibold text-theme-text-primary">
                      {vehicle.model || t('work.vehicle.unknownModel')}
                    </span>
                    <span className="text-lg text-theme-text-secondary">
                      {vehicle.license_plate
                        ? t('work.vehicle.licensePlate', { plate: vehicle.license_plate })
                        : t('work.vehicle.noLicensePlate')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="ghost"
              size="lg"
              className="text-lg font-semibold px-6 py-4 h-auto"
              onClick={() => {
                setIsVehicleModalOpen(false);
                setSelectedVehicleId(reservedVehicle ? reservedVehicle.id : null);
              }}
            >
              {t('work.cancel')}
            </Button>
            <Button
              size="lg"
              className="text-lg font-semibold px-6 py-4 h-auto"
              onClick={handleReserveVehicle}
              disabled={!selectedVehicleId || isVehicleActionLoading}
            >
              {isVehicleActionLoading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {t('work.vehicle.reserveLoading')}
                </>
              ) : (
                <>
                  <Car className="h-6 w-6" />
                  {t('work.vehicle.reserveAction')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkMain;
