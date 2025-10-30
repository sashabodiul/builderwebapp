import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Play, Square, MapPin, Calendar, MessageCircle } from 'lucide-react';
import { getFacilities } from '../../../requests/facility';
import { FacilityOut } from '../../../requests/facility/types';
import { startWork, getActiveWorkProcess } from '../../../requests/work';
import { WorkProcessStartOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import TodoList from './TodoList';

interface WorkMainProps {
  onStartWork: (objectId: string) => void;
  onStopWork: () => void;
  selectedObject: string;
  onObjectSelect: (objectId: string) => void;
}

const WorkMain: FC<WorkMainProps> = ({ onStartWork, onStopWork, selectedObject, onObjectSelect }) => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setActiveWorkProcess] = useState<WorkProcessStartOut | null>(null);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const isRestricted = (user?.worker_type === 'student') || !user?.rate;

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

  const handleTelegramGroup = () => {
    const selectedFacility = facilities.find(facility => facility.id.toString() === selectedObject);
    const telegramGroupUrl = selectedFacility?.invite_link || 'https://t.me/skybud_workers';
    window.open(telegramGroupUrl, '_blank');
  };


  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-theme-text-primary mb-2">{t('work.title')}</h1>
          <div className="flex items-center gap-2 text-theme-text-secondary text-lg">
            <Calendar className="h-5 w-5" />
            <span>{t('work.today')}: {formatToday()}</span>
          </div>
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
