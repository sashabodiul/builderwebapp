import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import WorkMain from './screens/WorkMain';
import WorkCompletion from './screens/WorkCompletion';
import TodoList from './screens/TodoList';
import { getFacilities } from '../../requests/facility';
import { FacilityOut } from '../../requests/facility/types';

type WorkScreen = 'main' | 'completion' | 'todo';

const Work: FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [currentScreen, setCurrentScreen] = useState<WorkScreen>('main');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [workerType] = useState<'admin' | 'master' | 'worker'>('worker'); // Mock worker type

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
  //   // Here you would typically send data to the server
  //   alert(t('work.workSuccessfullyCompleted'));
  // };

  const handleTodoListComplete = () => {
    setCurrentScreen('main');
    setSelectedObject('');
    // Here you would typically send data to the server
    alert(t('work.allTasksCompletedMessage'));
  };

  const getSelectedObjectName = () => {
    const facility = facilities.find(facility => facility.id.toString() === selectedObject);
    return facility?.name || t('work.unnamedObject');
  };

  switch (currentScreen) {
    case 'completion':
      return (
        <WorkCompletion
          // onComplete={handleWorkComplete}
          onBack={handleCompletionBack}
          onTodoList={() => setCurrentScreen('todo')}
          workerType={workerType}
          objectName={getSelectedObjectName()}
        />
      );
    
    case 'todo':
      return (
        <TodoList
          onComplete={handleTodoListComplete}
          onBack={handleTodoListBack}
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