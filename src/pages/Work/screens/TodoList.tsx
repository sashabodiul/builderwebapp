import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { endWork, endWorkOffice } from '../../../requests/work';
import { logger } from '../../../lib/logger';
import { WorkProcessEndOut } from '../../../requests/work/types';
import { toastError, toastSuccess } from '../../../lib/toasts';
import { ErrorDetails } from '@/components/ui/ErrorDetails';
import { createWorkTask, getWorkTasks, bulkUpdateWorkTasks, updateWorkTask } from '../../../requests/work-task';
import { createComment } from '../../../requests/comment';
import ImageViewer from '@/components/ui/ImageViewer';
import { WorkTaskOut } from '../../../requests/work-task/types';

interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed' | 'not-completed';
  isCustom: boolean;
  photo_url?: string | null;
}

interface TodoListProps {
  onComplete?: (workData: WorkProcessEndOut) => void;
  onBack?: () => void;
  workPhotos?: File[];
  toolsPhotos?: File[];
  videoFile?: File | null;
  facilityId?: number | null;
  facilityTypeId?: number | null;
  embedded?: boolean;
  hideBack?: boolean;
}

const TodoList: FC<TodoListProps> = ({ onComplete, onBack, workPhotos = [], toolsPhotos = [], videoFile = null, facilityId = null, facilityTypeId = null, embedded = false, hideBack = false }) => {
  const { t } = useTranslation();
  const user = useSelector((state: any) => state.data.user);
  const [newTaskText, setNewTaskText] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [workComment, setWorkComment] = useState('');
  const [isObjectCompleted, setIsObjectCompleted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    details?: any;
  } | null>(null);

  const allowedWorkerTypes = ['admin', 'coder', 'worker', 'master', 'foreman', 'engineer', 'assistant'];
  const canSelectObjectsAndVehicles = user?.worker_type && allowedWorkerTypes.includes(user.worker_type);

  const queryParams = useMemo(() => {
    if (canSelectObjectsAndVehicles) {
      // Для работников с объектами - фильтрация по facility_id и facility_type_id
      return {
        facility_id: facilityId,
        facility_type_id: facilityTypeId,
        finished: null as boolean | null,
      };
    } else {
      // Для офисных работников - фильтрация по worker_id
      return {
        worker_id: user?.id || null,
        finished: null as boolean | null,
      };
    }
  }, [canSelectObjectsAndVehicles, facilityId, facilityTypeId, user?.id]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await getWorkTasks(queryParams);
        if (response.error) return;
        const fetched = (response.data || []) as WorkTaskOut[];
        const mapped: Task[] = fetched.map((t) => ({
          id: String(t.id),
          text: t.text || '',
          status: t.finished ? 'completed' : 'pending',
          isCustom: false,
          photo_url: t.photo_url || null,
        }));
        setTasks(mapped);
      } catch {
        // silent
      }
    };
    loadTasks();
  }, [queryParams]);

  const handleTaskComplete = async (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'completed' } : task
    ));
    if (embedded) {
      const numericId = Number(taskId);
      if (!isNaN(numericId)) {
        try { await updateWorkTask(numericId, { finished: true }); } catch {}
      }
    }
  };

  const handleTaskNotComplete = async (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'not-completed' } : task
    ));
    if (embedded) {
      const numericId = Number(taskId);
      if (!isNaN(numericId)) {
        try { await updateWorkTask(numericId, { finished: false }); } catch {}
      }
    }
  };

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      const text = newTaskText.trim();
      if (embedded) {
        try {
          const res = await createWorkTask({
            text,
            facility_id: canSelectObjectsAndVehicles ? (facilityId ?? undefined) : undefined,
            facility_type_id: canSelectObjectsAndVehicles ? (facilityTypeId ?? undefined) : undefined,
            worker_id: user?.id,
          });
          if (!res.error && res.data) {
            const created: Task = {
              id: String(res.data.id),
              text: res.data.text || text,
              status: res.data.finished ? 'completed' : 'pending',
              isCustom: false,
              photo_url: res.data.photo_url || null,
            };
            setTasks(prev => [created, ...prev]);
            setNewTaskText('');
            return;
          }
        } catch {}
      }
      const newTask: Task = {
        id: Date.now().toString(),
        text,
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
    if (embedded) return; // embedded mode doesn't finish work
    if (!user?.id) return;

    logger.info('handleCompleteWork called', {
      user: { id: user.id, worker_type: user.worker_type },
      canSelectObjectsAndVehicles,
      facilityId,
      facilityTypeId,
      tasksCount: tasks.length,
      workPhotosCount: workPhotos.length,
      toolsPhotosCount: toolsPhotos.length,
      hasVideo: !!videoFile,
      isObjectCompleted,
    });

    setIsCompleting(true);

    try {
      // update server tasks in bulk and create custom tasks one-by-one
      const existingTasks = tasks.filter(t => !t.isCustom);
      const customTasks = tasks.filter(t => t.isCustom);

      logger.debug('Updating tasks', {
        existingTasksCount: existingTasks.length,
        customTasksCount: customTasks.length,
      });

      if (existingTasks.length > 0) {
        const bulkPayload = {
          tasks: existingTasks.map(t => ({ id: Number(t.id), finished: t.status === 'completed' }))
        };
        logger.debug('Bulk updating tasks', bulkPayload);
        await bulkUpdateWorkTasks(bulkPayload);
      }

      for (const ct of customTasks) {
        if (ct.text.trim().length === 0) continue;
        logger.debug('Creating custom task', { text: ct.text.trim(), status: ct.status });
        await createWorkTask({
          text: ct.text.trim(),
          facility_id: canSelectObjectsAndVehicles ? (facilityId ?? undefined) : undefined,
          facility_type_id: canSelectObjectsAndVehicles ? (facilityTypeId ?? undefined) : undefined,
          worker_id: user.id,
          finished: ct.status === 'completed',
        });
      }

      // Получаем геолокацию
      // На Android может быть проблема с повторным запросом геолокации с высоким приоритетом
      // Используем те же параметры, что и при начале работы, для консистентности
      const isAndroid = /android/i.test(navigator.userAgent);
      const geolocationOptions = {
        enableHighAccuracy: canSelectObjectsAndVehicles,
        timeout: 30000, // Увеличено с 15000 до 30000 для Android совместимости
        maximumAge: 60000
      };

      logger.debug('Requesting geolocation for work completion', {
        ...geolocationOptions,
        canSelectObjectsAndVehicles,
        isAndroid,
        userAgent: navigator.userAgent,
      });
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const startTime = Date.now();
        let retryAttempt = 0;
        
        const tryGetPosition = (useHighAccuracy: boolean) => {
          const currentOptions = {
            ...geolocationOptions,
            enableHighAccuracy: useHighAccuracy,
          };
          
          const successCallback = (pos: GeolocationPosition) => {
            const elapsed = Date.now() - startTime;
            logger.info('Geolocation obtained for work completion', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
              isAndroid,
            });
            resolve(pos);
          };
          
          const errorCallback = (error: GeolocationPositionError) => {
            const elapsed = Date.now() - startTime;
            logger.error('Geolocation error when completing work', {
              code: error.code,
              message: error.message,
              elapsedMs: elapsed,
              attempt: retryAttempt + 1,
              usedHighAccuracy: useHighAccuracy,
              isAndroid,
              errorCode1: 'PERMISSION_DENIED',
              errorCode2: 'POSITION_UNAVAILABLE',
              errorCode3: 'TIMEOUT'
            });
            
            // На Android, если первая попытка с высоким приоритетом не удалась, пробуем с низким
            if (isAndroid && retryAttempt === 0 && useHighAccuracy && error.code !== 1) {
              retryAttempt++;
              logger.debug('Retrying geolocation with lower accuracy on Android', {
                attempt: retryAttempt + 1,
              });
              setTimeout(() => {
                tryGetPosition(false);
              }, 500); // Небольшая задержка перед повторной попыткой
            } else {
              reject(error);
            }
          };
          
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, currentOptions);
        };
        
        // Начинаем с запрошенной точности
        tryGetPosition(canSelectObjectsAndVehicles);
      });
      
      logger.debug('Geolocation obtained, continuing with work completion');

      let response;
      let requestData;
      
      if (canSelectObjectsAndVehicles) {
        // Для admin, coder, worker, master - обычный эндпоинт с facility_id и instrument_photos
        requestData = {
          worker_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status_object_finished: isObjectCompleted,
          done_work_photos: workPhotos.length > 0 ? workPhotos : undefined,
          instrument_photos: toolsPhotos.length > 0 ? toolsPhotos : undefined,
          report_video: videoFile || undefined,
        };
        logger.info('Ending facility work', {
          ...requestData,
          workPhotosCount: workPhotos.length,
          toolsPhotosCount: toolsPhotos.length,
          hasVideo: !!videoFile,
        });
        response = await endWork(requestData);
      } else {
        // Для остальных - офисный эндпоинт без facility_id, instrument_photos, фото и видео
        requestData = {
          worker_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        logger.info('Ending office work', requestData);
        response = await endWorkOffice(requestData);
      }
      
      logger.debug('Work end API response received', {
        hasError: !!response.error,
        hasData: !!response.data,
        status: response.status,
        error: response.error,
      });

      if (response.error) {
        const errorData = response.error as any;
        const isAndroid = /android/i.test(navigator.userAgent);
        
        // Детальное логирование ошибки для диагностики
        const errorDetails = {
          requestData: {
            ...requestData,
            // Не логируем сами файлы, только их размеры
            workPhotosCount: workPhotos.length,
            toolsPhotosCount: toolsPhotos.length,
            hasVideo: !!videoFile,
            videoSize: videoFile ? videoFile.size : 0,
            totalPhotosSize: [...workPhotos, ...toolsPhotos].reduce((sum, file) => sum + file.size, 0),
          },
          response: {
            error: response.error,
            status: response.status,
            message: errorData?.message,
            code: errorData?.code,
            responseData: errorData?.response?.data,
            responseStatus: errorData?.response?.status,
            responseStatusText: errorData?.response?.statusText,
          },
          environment: {
            isAndroid,
            userAgent: navigator.userAgent,
            connectionType: (navigator as any).connection?.effectiveType,
          },
        };
        
        logger.error('Failed to end work', errorDetails);
        console.error('Failed to end work:', errorDetails);
        
        // Более информативное сообщение об ошибке
        let errorMessage = t('work.endWorkError');
        if (errorData?.response?.status === 413) {
          errorMessage = 'Файлы слишком большие. Попробуйте уменьшить размер фотографий или видео.';
        } else if (errorData?.response?.status === 408 || errorData?.code === 'ECONNABORTED') {
          errorMessage = 'Превышено время ожидания. Проверьте интернет-соединение и попробуйте снова.';
        } else if (errorData?.response?.status >= 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже.';
        } else if (errorData?.response?.status === 400) {
          errorMessage = 'Неверный запрос. Проверьте данные и попробуйте снова.';
        } else if (errorData?.response?.status === 401 || errorData?.response?.status === 403) {
          errorMessage = 'Ошибка авторизации. Перезайдите в приложение.';
        }
        
        // Сохраняем детали ошибки для отображения в UI
        setErrorDetails({
          title: 'Ошибка завершения работы',
          message: errorMessage,
          details: {
            status: errorData?.response?.status || response.status,
            statusText: errorData?.response?.statusText,
            code: errorData?.code,
            responseData: errorData?.response?.data,
            requestData: {
              worker_id: requestData.worker_id,
              latitude: requestData.latitude,
              longitude: requestData.longitude,
              status_object_finished: requestData.status_object_finished,
              workPhotosCount: workPhotos.length,
              toolsPhotosCount: toolsPhotos.length,
              hasVideo: !!videoFile,
              videoSize: videoFile ? videoFile.size : 0,
              totalPhotosSize: [...workPhotos, ...toolsPhotos].reduce((sum, file) => sum + file.size, 0),
            },
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
              connectionType: (navigator as any).connection?.effectiveType,
            },
          },
        });
        
        toastError(errorMessage);
        setIsCompleting(false);
        return;
      }

      logger.info('Work completed successfully', {
        workProcessId: response.data?.id,
      });

      // optional comment after getting process id
      try {
        const text = workComment.trim();
        if (text.length > 0) {
          logger.debug('Adding work comment', { workProcessId: response.data.id, commentLength: text.length });
          await createComment({ worker_process_id: response.data.id, text });
        }
      } catch (error) {
        logger.warn('Failed to add work comment', { error });
      }

      toastSuccess(t('work.workEnded'));
      onComplete && onComplete(response.data);
    } catch (error) {
      logger.error('Exception when completing work', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      console.error('Error ending work:', error);
      
      let errorMessage = t('work.endWorkError');
      let errorTitle = 'Ошибка завершения работы';
      
      if (error instanceof GeolocationPositionError) {
        errorTitle = 'Ошибка геолокации';
        errorMessage = error.code === 1 
          ? 'Доступ к геолокации запрещен. Разрешите доступ в настройках устройства.'
          : error.code === 2 
          ? 'Геолокация недоступна. Проверьте настройки GPS.'
          : 'Превышено время ожидания геолокации. Попробуйте снова.';
        
        setErrorDetails({
          title: errorTitle,
          message: errorMessage,
          details: {
            code: error.code,
            message: error.message,
            errorCode1: 'PERMISSION_DENIED',
            errorCode2: 'POSITION_UNAVAILABLE',
            errorCode3: 'TIMEOUT',
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
            },
          },
        });
      } else {
        const errorData = error as any;
        setErrorDetails({
          title: errorTitle,
          message: errorMessage,
          details: {
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
            } : String(error),
            code: errorData?.code,
            environment: {
              isAndroid: /android/i.test(navigator.userAgent),
              userAgent: navigator.userAgent,
            },
          },
        });
      }
      
      toastError(errorMessage);
      setIsCompleting(false);
    }
  };

  return (
    <div className={`bg-theme-bg-primary p-6 overflow-x-hidden ${embedded ? '' : 'min-h-screen page'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Error Details */}
        {errorDetails && (
          <ErrorDetails
            title={errorDetails.title}
            message={errorDetails.message}
            details={errorDetails.details}
            onClose={() => setErrorDetails(null)}
          />
        )}
        
        {/* Header */}
        {!embedded && (
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
        )}

        {/* Progress Steps */}
        {!embedded && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 max-[350px]:gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.workPhotosStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent max-[400px]:hidden"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-theme-text-secondary text-sm">{t('work.toolsStep')}</span>
            </div>
            <div className="w-8 h-0.5 bg-theme-accent max-[400px]:hidden"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-theme-accent rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <span className="text-theme-accent text-sm font-medium">{t('work.todoList')}</span>
            </div>
          </div>
        </div>
        )}

        {!embedded && (
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
        )}

        {/* Tasks List */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all w-full ${
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
                    <span className={`text-lg break-words leading-snug ${
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

                {/* Task photos */}
                {!task.isCustom && task.photo_url && (
                  <ImageViewer images={[task.photo_url]} thumbnailClassName="w-28 h-28 object-cover rounded border border-theme-border" containerClassName="grid grid-cols-4 gap-2" />
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
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('work.taskPlaceholder')}
              className="flex-1 w-full px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 w-full sm:w-auto ${
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

        {/* Work comment */}
        {!embedded && (
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">{t('work.commentsAboutWork')}</h3>
          <textarea
            className="w-full min-h-24 px-4 py-3 bg-theme-bg-tertiary border border-theme-border rounded-lg text-theme-text-primary placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
            placeholder={t('work.commentPlaceholder')}
            value={workComment}
            onChange={(e) => setWorkComment(e.target.value)}
          />
        </div>
        )}

        {/* Object Completion Checkbox - только для работников с объектами */}
        {!embedded && canSelectObjectsAndVehicles && (
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="object-completed"
              checked={isObjectCompleted}
              onChange={(e) => setIsObjectCompleted(e.target.checked)}
              className="w-5 h-5 text-theme-accent bg-theme-bg-primary border-theme-border rounded focus:ring-theme-accent focus:ring-2"
            />
            <label htmlFor="object-completed" className="text-theme-text-primary font-medium cursor-pointer">
              {t('work.objectCompletedCheckbox')}
            </label>
          </div>
        </div>
        )}

        {/* Navigation */}
        {!embedded && (
        <div className={`flex flex-col sm:flex-row ${hideBack ? 'justify-end' : 'justify-between'} gap-3`}>
          {!hideBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-bg-hover transition-colors w-full sm:w-auto"
            >
              {t('work.back')}
            </button>
          )}
          
          <button
            onClick={handleCompleteWork}
            disabled={!allTasksMarked || isCompleting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto ${
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
                {t('work.finishWork')}
              </>
            )}
          </button>
        </div>
        )}

        {/* Completion message */}
        {!embedded && allTasksMarked && (
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