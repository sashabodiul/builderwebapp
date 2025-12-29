import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitQuestionnaire } from '@/requests/questionnaire';
import { toastSuccess, toastError } from '@/lib/toasts';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Фикс для иконок маркеров в Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const questionnaireSchema = z.object({
  reason_type: z.string().refine(
    (val) => val === 'WORK' || val === 'PERSONAL',
    { message: 'Выберите тип поездки' }
  ),
  work_type: z.string().optional(),
  reason: z.string().min(1, 'Причина поездки обязательна для заполнения'),
  destination_description: z.string().min(1, 'Описание места назначения обязательно'),
  destination_lat: z
    .number()
    .min(-90, 'Широта должна быть от -90 до 90')
    .max(90, 'Широта должна быть от -90 до 90'),
  destination_lng: z
    .number()
    .min(-180, 'Долгота должна быть от -180 до 180')
    .max(180, 'Долгота должна быть от -180 до 180'),
}).refine(
  (data) => {
    if (data.reason_type === 'WORK') {
      return data.work_type && (data.work_type === 'Мойка' || data.work_type === 'Заправка' || data.work_type === 'Сервис' || data.work_type === 'За запчастями');
    }
    return true;
  },
  {
    message: 'Выберите тип рабочей поездки',
    path: ['work_type'],
  }
);

type QuestionnaireFormData = z.infer<typeof questionnaireSchema>;

// Компонент для обработки кликов по карте
const MapClickHandler: React.FC<{
  onLocationChange: (lat: number, lng: number) => void;
}> = ({ onLocationChange }) => {
  useMapEvents({
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });
  return null;
};

// Компонент для перетаскиваемого маркера
const DraggableMarker: React.FC<{
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}> = ({ position, onDragEnd }) => {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      eventHandlers={eventHandlers}
      position={position}
      draggable
      ref={markerRef}
    />
  );
};

const QuestionnairePage: React.FC = () => {
  const { start_state_id } = useParams<{ start_state_id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const { t } = useTranslation();

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      reason_type: undefined,
      work_type: undefined,
      reason: '',
      destination_description: '',
      destination_lat: 50.4501,
      destination_lng: 30.5234,
    },
  });

  const reasonType = form.watch('reason_type');

  const destinationLat = form.watch('destination_lat');
  const destinationLng = form.watch('destination_lng');

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const handleLocationChange = (lat: number, lng: number) => {
    form.setValue('destination_lat', lat, { shouldValidate: true });
    form.setValue('destination_lng', lng, { shouldValidate: true });
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          handleLocationChange(lat, lng);
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
          toastError('Не удалось получить текущее местоположение');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toastError('Геолокация не поддерживается вашим браузером');
    }
  };

  const onSubmit = async (data: QuestionnaireFormData) => {
    if (!start_state_id) {
      toastError(t('questionnaire.errorNoStartStateId'));
      return;
    }

    const startStateIdNum = parseInt(start_state_id);
    if (isNaN(startStateIdNum)) {
      toastError(t('questionnaire.errorInvalidStartStateId'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Формируем данные для отправки
      const submitData: any = {
        reason_type: data.reason_type as 'WORK' | 'PERSONAL',
        reason: data.reason,
        destination_description: data.destination_description,
        destination_lat: data.destination_lat,
        destination_lng: data.destination_lng,
      };
      
      // Добавляем work_type только если это рабочая поездка
      if (data.reason_type === 'WORK' && data.work_type) {
        submitData.work_type = data.work_type;
      }
      
      await submitQuestionnaire(startStateIdNum, submitData);
      toastSuccess(t('questionnaire.success'));
      form.reset();
    } catch (error: any) {
      toastError(error.message || t('questionnaire.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const position: [number, number] = [destinationLat || 50.4501, destinationLng || 30.5234];

  if (!start_state_id) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('common.error', 'Ошибка')}</h1>
          <p className="text-muted-foreground">
            {t('questionnaire.errorNoStartStateIdInUrl')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Safe area для Telegram кнопок сверху */}
      <div className="pb-4 px-4 md:px-6" style={{ paddingTop: '16rem', marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold mb-2">{t('questionnaire.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('questionnaire.subtitle')}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
            {/* Тип поездки */}
            <FormField
              control={form.control}
              name="reason_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.tripType')} *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Сбрасываем work_type при смене типа поездки
                      if (value !== 'WORK') {
                        form.setValue('work_type', undefined);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder={t('questionnaire.tripTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WORK" className="text-base py-3">{t('questionnaire.work')}</SelectItem>
                      <SelectItem value="PERSONAL" className="text-base py-3">{t('questionnaire.personal')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Тип рабочей поездки (показывается только для рабочей) */}
            {reasonType === 'WORK' && (
              <FormField
                control={form.control}
                name="work_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">{t('questionnaire.workType')} *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder={t('questionnaire.workTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Мойка" className="text-base py-3">{t('questionnaire.wash')}</SelectItem>
                        <SelectItem value="Заправка" className="text-base py-3">{t('questionnaire.fuel')}</SelectItem>
                        <SelectItem value="Сервис" className="text-base py-3">{t('questionnaire.service')}</SelectItem>
                        <SelectItem value="За запчастями" className="text-base py-3">{t('questionnaire.parts')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Причина поездки */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.reason')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('questionnaire.reasonPlaceholder')}
                      className="min-h-[100px] text-base resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Описание места назначения */}
            <FormField
              control={form.control}
              name="destination_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">{t('questionnaire.destinationDescription')} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('questionnaire.destinationDescriptionPlaceholder')}
                      className="min-h-[100px] text-base resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Координаты места назначения */}
            <div className="space-y-3 md:space-y-4">
              <Label className="text-base font-semibold">{t('questionnaire.coordinates')} *</Label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMap(!showMap)}
                  className="flex-1 h-11 text-base"
                >
                  {showMap ? t('questionnaire.hideMap') : t('questionnaire.showMap')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCurrentLocation}
                  className="h-11 text-base whitespace-nowrap"
                >
                  📍 {t('questionnaire.currentLocation')}
                </Button>
              </div>

              {showMap && (
                <div className="mb-3 border-2 border-border rounded-lg overflow-hidden shadow-sm" style={{ height: '250px' }}>
                  <MapContainer
                    center={position}
                    zoom={destinationLat && destinationLng ? 15 : 13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onLocationChange={handleLocationChange} />
                    {destinationLat && destinationLng && (
                      <DraggableMarker
                        position={[destinationLat, destinationLng]}
                        onDragEnd={handleLocationChange}
                      />
                    )}
                  </MapContainer>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <FormField
                  control={form.control}
                  name="destination_lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('questionnaire.latitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="50.4501"
                          className="h-11 text-base"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination_lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">{t('questionnaire.longitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="30.5234"
                          className="h-11 text-base"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                💡 {t('questionnaire.mapHint')}
              </p>
            </div>

            {/* Кнопка отправки */}
            <div className="pt-2 pb-safe" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold shadow-lg"
                size="lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('questionnaire.submitting')}
                  </span>
                ) : (
                  `✓ ${t('questionnaire.submit')}`
                )}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </div>
    </div>
  );
};

export default QuestionnairePage;

