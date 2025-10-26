import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// import { useSelector } from 'react-redux';
import WorkMain from './screens/WorkMain';
import WorkCompletion from './screens/WorkCompletion';
import TodoList from './screens/TodoList';
import { getFacilities, FacilityOut } from '@/requests';

type WorkScreen = 'main' | 'completion' | 'todo';

const Work: FC = () => {
  const { t } = useTranslation();
  // const user = useSelector((state: any) => state.data.user);
  const [currentScreen, setCurrentScreen] = useState<WorkScreen>('main');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [toolsPhotos, setToolsPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

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
    setCurrentScreen('completion');
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

  const handleTodoListComplete = async () => {
    // Очищаємо дані після завершення роботи
    setWorkPhotos([]);
    setToolsPhotos([]);
    setVideoFile(null);
    setCurrentScreen('main');
    setSelectedObject('');
  };

  const handleTodoListTransition = (photos: File[], tools: File[], video: File | null) => {
    setWorkPhotos(photos);
    setToolsPhotos(tools);
    setVideoFile(video);
    setCurrentScreen('todo');
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
    
    case 'todo':
      return (
        <TodoList
          onComplete={handleTodoListComplete}
          onBack={handleTodoListBack}
          workPhotos={workPhotos}
          toolsPhotos={toolsPhotos}
          videoFile={videoFile}
        />
      );
    
    default:
      return (
        <WorkMain
          onStartWork={handleStartWork}
          onStopWork={handleStopWork}
          selectedObject={selectedObject}
          onObjectSelect={handleObjectSelect}
        />
      );
  }
};

export default Work;