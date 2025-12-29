import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { submitStopReason } from '@/requests/stop-reason';
import { toastSuccess, toastError } from '@/lib/toasts';

const stopReasonSchema = z.object({
  reason: z.enum(['REST', 'PERSONAL'], {
    required_error: 'Выберите причину остановки',
  }),
});

type StopReasonFormData = z.infer<typeof stopReasonSchema>;

const StopReasonPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tripId = searchParams.get('trip_id');
  const stopStateId = searchParams.get('stop_state_id');

  const form = useForm<StopReasonFormData>({
    resolver: zodResolver(stopReasonSchema),
    defaultValues: {
      reason: undefined,
    },
  });

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  useEffect(() => {
    if (!tripId || !stopStateId) {
      toastError('Отсутствуют обязательные параметры: trip_id и stop_state_id');
    }
  }, [tripId, stopStateId]);

  const onSubmit = async (data: StopReasonFormData) => {
    if (!tripId || !stopStateId) {
      toastError('Отсутствуют обязательные параметры');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitStopReason({
        reason: data.reason,
        trip_id: parseInt(tripId),
        stop_state_id: parseInt(stopStateId),
      });
      toastSuccess('Причина остановки сохранена');
      
      // Закрываем WebApp после успешной отправки
      if (window.Telegram && window.Telegram.WebApp) {
        setTimeout(() => {
          window.Telegram.WebApp.close();
        }, 1500);
      }
    } catch (error: any) {
      toastError(error.message || 'Ошибка отправки данных');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tripId || !stopStateId) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
          <p className="text-muted-foreground">
            Отсутствуют обязательные параметры: trip_id и stop_state_id
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Причина остановки</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Причина остановки */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Причина остановки *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите причину остановки" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="REST">Отдых</SelectItem>
                      <SelectItem value="PERSONAL">Личные дела</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Кнопка отправки */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default StopReasonPage;

