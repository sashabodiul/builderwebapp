import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { endWork } from '../../../requests/work';
import { EndWorkData } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';

interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed' | 'not-completed';
  isCustom: boolean;
}

interface TodoListProps {
  onComplete: () => void;
  onBack: () => void;
  workPhotos?: File[];
  toolsPhotos?: File[];
  videoFile?: File | null;
}

const TodoList: FC<TodoListProps> = ({ onComplete, onBack, workPhotos = [], toolsPhotos = [], videoFile = null }) => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [newTaskText, setNewTaskText] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      text: 'Перевірити якість виконаної роботи',
      status: 'pending',
      isCustom: false
    },
    {
      id: '2',
      text: 'Прибрати робоче місце',
      status: 'pending',
      isCustom: false
    },
    {
      id: '3',
      text: 'Перевірити інструменти на наявність',
      status: 'pending',
      isCustom: false
    },
    {
      id: '4',
      text: 'Заповнити звіт про виконану роботу',
      status: 'pending',
      isCustom: false
    },
    {
      id: '5',
      text: 'Повідомити керівника про завершення',
      status: 'pending',
      isCustom: false
    }
  ]);

  const handleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'completed' } : task
    ));
  };

  const handleTaskNotComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'not-completed' } : task
    ));
  };

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText.trim(),
        status: 'pending',
        isCustom: true
      };
      setTasks(prev => [...prev, newTask]);
      setNewTaskText('');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const notCompletedTasks = tasks.filter(task => task.status === 'not-completed').length;
  const markedTasks = tasks.filter(task => task.status !== 'pending').length;
  const totalTasks = tasks.length;
  const allTasksMarked = markedTasks === totalTasks;

  const handleCompleteWork = async () => {
    if (!user?.id) return;

    setIsCompleting(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        });
      });

      const endWorkData: EndWorkData = {
        worker_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        status_object_finished: true,
        done_work_photos: workPhotos.length > 0 ? workPhotos : undefined,
        instrument_photos: toolsPhotos.length > 0 ? toolsPhotos : undefined,
        report_video: videoFile || undefined,
      };

      const response = await endWork(endWorkData);
      
      if (response.error) {
        console.error('Failed to end work:', response);
        toastError(t('work.endWorkError'));
        setIsCompleting(false);
        return;
      }

      toastSuccess(t('work.workEnded'));
      onComplete();
    } catch (error) {
      console.error('Error ending work:', error);
      if (error instanceof GeolocationPositionError) {
        const errorMessage = error.code === 1 
          ? t('work.geolocationDenied')
          : error.code === 2 
          ? t('work.geolocationUnavailable')
          : t('work.geolocationTimeout');
        toastError(errorMessage);
      } else {
        toastError(t('work.endWorkError'));
      }
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
            {t('work.todoList')}
          </h1>
          <p className="text-theme-text-secondary mb-2">
            {t('work.todoDescription')}
          </p>
          <div className="text-theme-accent font-medium">
            {t('work.step')} 3 {t('work.of')} 3: {t('work.todoList')}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.workPhotosStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.toolsStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-theme-accent text-sm font-medium">{t('work.todoList')}</span>
            </div>
          </div>
        </div>

        <div className="bg-theme-bg-card border border-theme-border rounded-lg p-4 mb-6">
          <div className="text-theme-text-primary font-semibold">
            {t('work.progress')}: {markedTasks}/{totalTasks}
          </div>
          <div className="w-full bg-theme-bg-tertiary rounded-full h-2 mt-2">
            <div 
              className="bg-theme-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(markedTasks / totalTasks) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-theme-text-secondary mt-2">
            <span>✅ {completedTasks} {t('work.completed')}</span>
            <span>❌ {notCompletedTasks} {t('work.notCompleted')}</span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  task.status === 'completed'
                    ? 'bg-theme-accent/10 border-theme-accent'
                    : task.status === 'not-completed'
                    ? 'bg-theme-error/10 border-theme-error'
                    : 'bg-theme-bg-tertiary border-theme-border hover:border-theme-accent/50'
                }`}
              >
                {/* Task action buttons */}
                <div className="flex items-center gap-2">
                  {/* Complete button */}
                  <button
                    onClick={() => handleTaskComplete(task.id)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                      task.status === 'completed'
                        ? 'bg-theme-accent border-theme-accent text-white'
                        : 'border-theme-border text-theme-text-muted hover:border-theme-accent hover:bg-theme-accent/10'
                    }`}
                    title={t('work.complete')}
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  {/* Not complete button */}
                  <button
                    onClick={() => handleTaskNotComplete(task.id)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                      task.status === 'not-completed'
                        ? 'bg-theme-error border-theme-error text-white'
                        : 'border-theme-border text-theme-text-muted hover:border-theme-error hover:bg-theme-error/10'
                    }`}
                    title={t('work.notComplete')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Task text */}
                <div className="flex-1">
                  <span className={`text-lg ${
                    task.status === 'completed' 
                      ? 'line-through text-theme-text-muted' 
                      : task.status === 'not-completed'
                      ? 'text-theme-error'
                      : 'text-theme-text-primary'
                  }`}>
                    {task.text}
                  </span>
                  {task.isCustom && (
                    <span className="ml-2 text-xs text-theme-accent bg-theme-accent/20 px-2 py-1 rounded">
                      {t('work.custom')}
                    </span>
                  )}
                </div>

                {/* Delete button for custom tasks */}
                {task.isCustom && (
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-theme-error hover:text-theme-error/80 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new task */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('work.addNewTask')}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('work.taskPlaceholder')}
              className="flex-1 px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                newTaskText.trim()
                  ? 'bg-theme-accent text-white hover:bg-theme-accent-hover'
                  : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4" />
              {t('work.add')}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-bg-hover transition-colors"
          >
            {t('work.back')}
          </button>
          
          <button
            onClick={handleCompleteWork}
            disabled={!allTasksMarked || isCompleting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              allTasksMarked && !isCompleting
                ? 'bg-theme-accent text-white hover:bg-theme-accent-hover'
                : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            }`}
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('work.completingWork')}
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                {t('work.completeAll')}
              </>
            )}
          </button>
        </div>

        {/* Completion message */}
        {allTasksMarked && (
          <div className="mt-6 bg-theme-accent/10 border border-theme-accent rounded-lg p-4 text-center">
            <div className="text-theme-accent font-semibold text-lg">
              {t('work.allTasksMarked')}
            </div>
            <div className="text-theme-text-secondary text-sm mt-1">
              {t('work.readyToFinish')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;