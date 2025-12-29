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
});

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

  const form = useForm<QuestionnaireFormData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      reason_type: undefined,
      reason: '',
      destination_description: '',
      destination_lat: 50.4501,
      destination_lng: 30.5234,
    },
  });

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
      toastError('Не указан ID стартового состояния');
      return;
    }

    const startStateIdNum = parseInt(start_state_id);
    if (isNaN(startStateIdNum)) {
      toastError('Некорректный ID стартового состояния');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitQuestionnaire(startStateIdNum, {
        ...data,
        reason_type: data.reason_type as 'WORK' | 'PERSONAL',
      });
      toastSuccess('Спасибо! Информация сохранена');
      form.reset();
    } catch (error: any) {
      toastError(error.message || 'Ошибка отправки данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  const position: [number, number] = [destinationLat || 50.4501, destinationLng || 30.5234];

  if (!start_state_id) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
          <p className="text-muted-foreground">
            Не указан ID стартового состояния в URL
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
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold mb-2">Опросник при старте поездки</h1>
            <p className="text-sm text-muted-foreground">Заполните информацию о поездке</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
            {/* Тип поездки */}
            <FormField
              control={form.control}
              name="reason_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Тип поездки *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Выберите тип поездки" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WORK" className="text-base py-3">Рабочая</SelectItem>
                      <SelectItem value="PERSONAL" className="text-base py-3">Личная</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Причина поездки */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Причина поездки *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Например: Доставка строительных материалов"
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
                  <FormLabel className="text-base font-semibold">Описание места назначения *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Например: Стройплощадка на ул. Главной, д. 10"
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
              <Label className="text-base font-semibold">Координаты места назначения *</Label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMap(!showMap)}
                  className="flex-1 h-11 text-base"
                >
                  {showMap ? 'Скрыть карту' : 'Показать карту'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCurrentLocation}
                  className="h-11 text-base whitespace-nowrap"
                >
                  📍 Моё местоположение
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
                      <FormLabel className="text-sm font-medium">Широта</FormLabel>
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
                      <FormLabel className="text-sm font-medium">Долгота</FormLabel>
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
                💡 Кликните на карте или перетащите маркер для выбора точки назначения
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
                    Отправка...
                  </span>
                ) : (
                  '✓ Отправить'
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

