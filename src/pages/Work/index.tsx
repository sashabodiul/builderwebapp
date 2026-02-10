import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import WorkMain from './screens/WorkMain';
import WorkCompletion from './screens/WorkCompletion';
import TodoList from './screens/TodoList';
import WorkSummary from './screens/WorkSummary';
import WorkHistory from './screens/WorkHistory';
import { getFacilities, FacilityOut, WorkProcessEndOut } from '@/requests';

type WorkScreen = 'main' | 'completion' | 'todo' | 'summary' | 'history';

const Work: FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [currentScreen, setCurrentScreen] = useState<WorkScreen>('main');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [toolsPhotos, setToolsPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [workSummaryData, setWorkSummaryData] = useState<WorkProcessEndOut | null>(null);

  // Приховуємо кнопку назад для головного екрану Work
  useEffect(() => {
    if (!window.Telegram?.WebApp?.BackButton) {
      return;
    }

    const webApp = window.Telegram.WebApp;
    const version = webApp.version || '6.0';
    const isVersion6 = version.startsWith('6.');

    // BackButton не поддерживается в версии 6.0
    if (isVersion6) {
      return;
    }

    try {
      webApp.BackButton.hide();
    } catch (error) {
      // Игнорируем ошибки
    }
  }, []);

  // Определяем, может ли работник выбирать объекты
  const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master', 'foreman', 'engineer', 'assistant'];
  const canSelectObjectsAndVehicles = user?.worker_type && allowedWorkerTypes.includes(user.worker_type);

  // Завантаження об'єктів з API (только для работников, которые могут выбирать объекты)
  useEffect(() => {
    if (!canSelectObjectsAndVehicles) {
      return;
    }

    const fetchFacilities = async () => {
      try {
        // Объекты загружаются из bot-api со статическим токеном, не нужно ждать JWT токен
        console.log('[Work] Fetching facilities from bot-api...');
        const response = await getFacilities();

        if (response.error) {
          console.error('[Work] Failed to fetch facilities:', response);
          // Retry один раз через 2 секунды
          setTimeout(() => {
            getFacilities().then(retryResponse => {
              if (!retryResponse.error) {
                setFacilities(retryResponse.data);
              }
            });
          }, 2000);
          return;
        }

        console.log('[Work] Facilities loaded:', response.data?.length || 0);
        setFacilities(response.data || []);
      } catch (error) {
        console.error('[Work] Error fetching facilities:', error);
        // Retry через 2 секунды
        setTimeout(() => {
          getFacilities().then(retryResponse => {
            if (!retryResponse.error) {
              setFacilities(retryResponse.data || []);
            }
          });
        }, 2000);
      }
    };

    fetchFacilities();
  }, [canSelectObjectsAndVehicles]);

  const handleStartWork = (objectId: string) => {
    setSelectedObject(objectId);
    setCurrentScreen('main');
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObject(objectId);
  };

  const handleStopWork = () => {
    const workerType: string | undefined = user?.worker_type;
    const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master'];
    const canSelectObjectsAndVehicles = workerType && allowedWorkerTypes.includes(workerType);
    const canUploadMedia = workerType === 'master' || workerType === 'admin';

    if (canSelectObjectsAndVehicles && canUploadMedia) {
      // Для admin, coder, worker, master с правами на медиа - показываем экран completion
      setCurrentScreen('completion');
    } else {
      // Для остальных - пропускаем экран completion (без фото инструментов)
      setWorkPhotos([]);
      setToolsPhotos([]);
      setVideoFile(null);
      setCurrentScreen('todo');
    }
  };

  const handleCompletionBack = () => {
    setCurrentScreen('main');
  };

  const handleTodoListBack = () => {
    setCurrentScreen('completion');
  };

  // const handleWorkComplete = () => {
  //   setCurrentScreen('main');
  //   setSelectedObject('');
  //   // Робота завершена через API в WorkCompletion
  // };

  const handleTodoListComplete = async (workData: WorkProcessEndOut) => {
    // Зберігаємо дані завершення роботи
    setWorkSummaryData(workData);
    setCurrentScreen('summary');
  };

  const handleSummaryComplete = () => {
    // Очищаємо дані після перегляду підсумків
    setWorkPhotos([]);
    setToolsPhotos([]);
    setVideoFile(null);
    setWorkSummaryData(null);
    setCurrentScreen('main');
    setSelectedObject('');
  };

  const handleTodoListTransition = (photos: File[], tools: File[], video: File | null) => {
    setWorkPhotos(photos);
    setToolsPhotos(tools);
    setVideoFile(video);
    setCurrentScreen('todo');
  };

  const handleShowHistory = () => {
    setCurrentScreen('history');
  };

  const handleHistoryBack = () => {
    setCurrentScreen('main');
  };

  const getSelectedObjectName = () => {
    if (!canSelectObjectsAndVehicles) {
      // Для офисных работников
      return `${t('work.workPlace')}: ${t('work.office')}`;
    }
    const facility = facilities.find(facility => facility.id.toString() === selectedObject);
    return facility?.name || t('work.unnamedObject');
  };

  switch (currentScreen) {
    case 'completion':
      return (
        <WorkCompletion
          onBack={handleCompletionBack}
          onTodoList={handleTodoListTransition}
          objectName={getSelectedObjectName()}
        />
      );

    case 'todo': {
      const workerType: string | undefined = user?.worker_type;
      const canUploadMedia = workerType === 'master' || workerType === 'admin';
      return (
        <TodoList
          onComplete={handleTodoListComplete}
          onBack={handleTodoListBack}
          workPhotos={workPhotos}
          toolsPhotos={toolsPhotos}
          videoFile={videoFile}
          facilityId={selectedObject ? Number(selectedObject) : null}
          facilityTypeId={facilities.find(f => f.id.toString() === selectedObject)?.facility_type_id ?? null}
          hideBack={!canUploadMedia}
        />
      );
    }

    case 'summary':
      return workSummaryData ? (
        <WorkSummary
          workData={workSummaryData}
          onComplete={handleSummaryComplete}
        />
      ) : null;

    case 'history':
      return (
        <WorkHistory onBack={handleHistoryBack} />
      );

    default:
      return (
        <WorkMain
          onStartWork={handleStartWork}
          onStopWork={handleStopWork}
          selectedObject={selectedObject}
          onObjectSelect={handleObjectSelect}
          onShowHistory={handleShowHistory}
        />
      );
  }
};

export default Work;