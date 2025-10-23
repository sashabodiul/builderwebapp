import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Video, Upload, Check, ArrowRight, ArrowLeft, Hammer, Wrench } from 'lucide-react';

interface WorkCompletionProps {
  // onComplete: () => void;
  onBack: () => void;
  onTodoList: () => void;
  workerType: 'admin' | 'master' | 'worker';
  objectName: string;
}

const WorkCompletion: FC<WorkCompletionProps> = ({ onBack, onTodoList, workerType, objectName }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [toolsPhotos, setToolsPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const steps = [
    {
      id: 'work-photos',
      title: t('work.workPhotosStep'),
      description: t('work.uploadWorkPhotos'),
      icon: <Camera className="h-6 w-6" />,
      required: true
    },
    ...(workerType === 'admin' || workerType === 'master' ? [{
      id: 'tools-photos',
      title: t('work.toolsStep'),
      description: t('work.uploadToolsPhotos'),
      icon: <Hammer className="h-6 w-6" />,
      required: true
    }] : []),
    {
      id: 'video',
      title: t('work.videoStep'),
      description: t('work.recordVideo'),
      icon: <Video className="h-6 w-6" />,
      required: true
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handlePhotoUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      if (currentStepData.id === 'work-photos') {
        setWorkPhotos(prev => [...prev, ...newFiles]);
      } else if (currentStepData.id === 'tools-photos') {
        setToolsPhotos(prev => [...prev, ...newFiles]);
      }
    }
  };

  const handleVideoUpload = (file: File) => {
    setVideoFile(file);
    // Simulate video duration check
    setVideoDuration(35); // Mock duration
  };

  const canProceed = () => {
    if (currentStepData.id === 'work-photos') {
      return workPhotos.length > 0;
    } else if (currentStepData.id === 'tools-photos') {
      return toolsPhotos.length > 0;
    } else if (currentStepData.id === 'video') {
      return videoFile && videoDuration >= 30;
    }
    return false;
  };

  const handleNext = () => {
    if (isLastStep) {
      onTodoList();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // const handleFinish = () => {
  //   onComplete();
  // };

  const handleBack = () => {
    if (isFirstStep) {
      onBack();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
            {t('work.workCompleted')}
          </h1>
          <p className="text-theme-text-secondary mb-2">
            {t('work.currentObject')}: {objectName}
          </p>
          <div className="text-theme-accent font-medium">
            {t('work.step')} {currentStep + 1} {t('work.of')} {steps.length}: {currentStepData.title}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all cursor-pointer hover:scale-105 ${
                    getStepStatus(index) === 'completed' 
                      ? 'bg-theme-accent border-theme-accent text-white hover:bg-theme-accent-hover' 
                      : getStepStatus(index) === 'current'
                      ? 'border-theme-accent text-theme-accent bg-theme-accent/10 hover:bg-theme-accent/20'
                      : 'border-theme-border text-theme-text-muted hover:border-theme-accent/50'
                  }`}
                  title={`${t('work.step')} ${index + 1}: ${step.title}`}
                >
                  {getStepStatus(index) === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    getStepStatus(index) === 'completed' ? 'bg-theme-accent' : 'bg-theme-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-theme-accent">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-text-primary">
                {currentStepData.title}
              </h2>
              <p className="text-theme-text-secondary text-sm">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Step Content */}
          {currentStepData.id === 'work-photos' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-theme-border rounded-lg p-6 text-center">
                <Camera className="h-12 w-12 text-theme-text-muted mx-auto mb-4" />
                <p className="text-theme-text-secondary mb-4">
                  {t('work.selectPhotos')} або {t('work.takePhoto')}
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                  id="work-photos-input"
                />
                <label
                  htmlFor="work-photos-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-lg cursor-pointer hover:bg-theme-accent-hover transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {t('work.selectPhotos')}
                </label>
              </div>
              {workPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {workPhotos.map((file, index) => (
                    <div key={index} className="bg-theme-bg-tertiary rounded-lg p-2 text-center">
                      <div className="text-theme-accent text-sm font-medium">
                        {t('work.uploadComplete')}
                      </div>
                      <div className="text-theme-text-muted text-xs">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStepData.id === 'tools-photos' && (
            <div className="space-y-4">
              <div className="bg-theme-accent/10 border border-theme-accent rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-theme-accent font-medium">
                  <Wrench className="h-4 w-4" />
                  {t('work.required')}
                </div>
              </div>
              <div className="border-2 border-dashed border-theme-border rounded-lg p-6 text-center">
                <Hammer className="h-12 w-12 text-theme-text-muted mx-auto mb-4" />
                <p className="text-theme-text-secondary mb-4">
                  Розкладіть інструменти та сфотографуйте
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                  id="tools-photos-input"
                />
                <label
                  htmlFor="tools-photos-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-lg cursor-pointer hover:bg-theme-accent-hover transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {t('work.selectPhotos')}
                </label>
              </div>
              {toolsPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {toolsPhotos.map((file, index) => (
                    <div key={index} className="bg-theme-bg-tertiary rounded-lg p-2 text-center">
                      <div className="text-theme-accent text-sm font-medium">
                        {t('work.uploadComplete')}
                      </div>
                      <div className="text-theme-text-muted text-xs">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStepData.id === 'video' && (
            <div className="space-y-4">
              <div className="bg-theme-accent/10 border border-theme-accent rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-theme-accent font-medium">
                  <Video className="h-4 w-4" />
                  {t('work.minimumDuration')}
                </div>
              </div>
              <div className="border-2 border-dashed border-theme-border rounded-lg p-6 text-center">
                <Video className="h-12 w-12 text-theme-text-muted mx-auto mb-4" />
                <p className="text-theme-text-secondary mb-4">
                  Запишіть відео з описом виконаної роботи
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                  className="hidden"
                  id="video-input"
                />
                <label
                  htmlFor="video-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-lg cursor-pointer hover:bg-theme-accent-hover transition-colors"
                >
                  <Video className="h-4 w-4" />
                  {t('work.recordVideoButton')}
                </label>
              </div>
              {videoFile && (
                <div className="bg-theme-bg-tertiary rounded-lg p-4 text-center">
                  <div className="text-theme-accent text-sm font-medium mb-1">
                    {t('work.uploadComplete')}
                  </div>
                  <div className="text-theme-text-muted text-xs">
                    {videoFile.name}
                  </div>
                  <div className="text-theme-text-secondary text-xs mt-1">
                    Тривалість: {videoDuration}с
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 border border-theme-border text-theme-text-secondary rounded-lg hover:bg-theme-bg-hover transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {isFirstStep ? 'Назад' : 'Попередній'}
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              canProceed()
                ? 'bg-theme-accent text-white hover:bg-theme-accent-hover'
                : 'bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed'
            }`}
          >
            {t('work.nextStep')}
            {!isLastStep && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkCompletion;
