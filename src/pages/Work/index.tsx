import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WorkMain from './screens/WorkMain';
import WorkCompletion from './screens/WorkCompletion';
import TodoList from './screens/TodoList';

type WorkScreen = 'main' | 'completion' | 'todo';

const Work: FC = () => {
  const { t } = useTranslation();
  const [currentScreen, setCurrentScreen] = useState<WorkScreen>('main');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [workerType] = useState<'admin' | 'master' | 'worker'>('worker'); // Mock worker type

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
    // Mock objects data - in real app this would come from props or context
    const objects = [
      { id: '1', name: 'ЖК "Сонячний" - Буд. 1', address: 'вул. Центральна, 15' },
      { id: '2', name: 'Офісний центр "Бізнес Плаза"', address: 'пр. Перемоги, 42' },
      { id: '3', name: 'Торговий центр "МегаМолл"', address: 'вул. Шопінгова, 8' },
      { id: '4', name: 'ЖК "Зелений Парк" - Буд. 3', address: 'вул. Паркова, 25' },
      { id: '5', name: 'Складський комплекс "Логістик"', address: 'вул. Промислова, 100' }
    ];
    return objects.find(obj => obj.id === selectedObject)?.name || '';
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