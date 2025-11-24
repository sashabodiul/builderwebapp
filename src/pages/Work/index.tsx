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
    window.Telegram.WebApp.BackButton.hide();
  }, []);

  // Завантаження об'єктів з API
  useEffect(() => {
    const fetchFacilities = async () => {
      const response = await getFacilities();

      if (response.error) {
        console.error('Failed to fetch facilities:', response);
        return;
      }

      setFacilities(response.data);
    };

    fetchFacilities();
  }, []);

  const handleStartWork = (objectId: string) => {
    setSelectedObject(objectId);
    setCurrentScreen('main');
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObject(objectId);
  };

  const handleStopWork = () => {
    const workerType: string | undefined = user?.worker_type;
    const canUploadMedia = workerType === 'master' || workerType === 'admin';

    if (canUploadMedia) {
      setCurrentScreen('completion');
    } else {
      // skip media steps for other roles
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