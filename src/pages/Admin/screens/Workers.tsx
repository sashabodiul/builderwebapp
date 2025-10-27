import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import routes from '@/consts/pageRoutes';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { getWorkers, createWorker, updateWorker, deleteWorker } from '@/requests/worker';
import { WorkerOut, WorkerCreate, WorkerUpdate } from '@/requests/worker/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

const workerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  username: z.string().optional(),
  telegram_id: z.string().optional(),
  worker_type: z.enum(['student', 'master', 'sales_head', 'admin']),
  rate: z.string().min(1, 'Rate is required'),
  birthday: z.string().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

const Workers: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerOut | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<WorkerOut | null>(null);

  // Query
  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await getWorkers();
      if (response.error) {
        toastError('Failed to load workers');
        return [];
      }
      return response.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: WorkerCreate) => {
      const response = await createWorker(data);
      if (response.error) {
        throw new Error('Failed to create worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.workers.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WorkerUpdate }) => {
      const response = await updateWorker(id, data);
      if (response.error) {
        throw new Error('Failed to update worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingWorker(null);
    },
    onError: () => {
      toastError(t('admin.workers.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteWorker(id);
      if (response.error) {
        throw new Error('Failed to delete worker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toastSuccess(t('admin.workers.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingWorker(null);
    },
    onError: () => {
      toastError(t('admin.workers.deleteError'));
    },
  });

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      telegram_id: '',
      worker_type: 'student',
      rate: '',
      birthday: '',
    },
  });

  const handleCreate = (data: WorkerFormData) => {
    const workerData = {
      ...data,
      rate: parseFloat(data.rate),
      telegram_id: data.telegram_id ? parseInt(data.telegram_id) : null,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
    };
    createMutation.mutate(workerData);
  };

  const handleEdit = (data: WorkerFormData) => {
    if (!editingWorker) return;
    const workerData = {
      ...data,
      rate: parseFloat(data.rate),
      telegram_id: data.telegram_id ? parseInt(data.telegram_id) : undefined,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : undefined,
    };
    updateMutation.mutate({ id: editingWorker.id, data: workerData });
  };

  const handleDelete = () => {
    if (deletingWorker) {
      deleteMutation.mutate(deletingWorker.id);
    }
  };

  const openEditDialog = (worker: WorkerOut) => {
    setEditingWorker(worker);
    form.reset({
      first_name: worker.first_name || '',
      last_name: worker.last_name || '',
      email: worker.email || '',
      username: worker.username || '',
      telegram_id: worker.telegram_id?.toString() || '',
      worker_type: worker.worker_type || 'student',
      rate: worker.rate?.toString() || '',
      birthday: worker.birthday ? new Date(worker.birthday).toISOString().slice(0, 10) : '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (worker: WorkerOut) => {
    setDeletingWorker(worker);
    setIsDeleteDialogOpen(true);
  };

  const getWorkerTypeBadge = (type: string) => {
    const colors = {
      student: 'bg-blue-500',
      master: 'bg-green-500',
      sales_head: 'bg-purple-500',
      admin: 'bg-red-500',
    };
    return (
      <Badge className={`${colors[type as keyof typeof colors]} text-white`}>
        {t(`admin.workers.types.${type}`)}
      </Badge>
    );
  };

  const formatRate = (rate: number | null) => {
    if (!rate) return 'N/A';
    return `${rate.toFixed(2)} €`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-bg-primary p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg-primary p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={routes.ADMIN}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.workers.title')}</h1>
          </div>
        </div>

        {/* Workers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <div className="text-theme-text-secondary text-lg">
                  {t('admin.workers.noWorkers')}
                </div>
              </CardContent>
            </Card>
          ) : (
            workers.map((worker) => (
              <Card key={worker.id} className="hover:bg-theme-bg-hover transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
                    </CardTitle>
                    {getWorkerTypeBadge(worker.worker_type || 'student')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-theme-text-secondary">
                    {worker.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{worker.email}</span>
                      </div>
                    )}
                    
                    {worker.username && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>@{worker.username}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatRate(worker.rate)}</span>
                    </div>
                    
                    {worker.birthday && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(worker.birthday)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(worker)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(worker)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Worker Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.workers.createTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.workers.firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('admin.workers.firstNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.workers.lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('admin.workers.lastNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.email')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={t('admin.workers.emailPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.telegramUsername')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.workers.telegramUsernamePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telegram_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.telegramId')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder={t('admin.workers.telegramIdPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="worker_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">{t('admin.workers.types.student')}</SelectItem>
                          <SelectItem value="master">{t('admin.workers.types.master')}</SelectItem>
                          <SelectItem value="sales_head">{t('admin.workers.types.sales_head')}</SelectItem>
                          <SelectItem value="admin">{t('admin.workers.types.admin')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.rate')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder={t('admin.workers.ratePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.birthday')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? t('common.saving') : t('common.create')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Worker Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.workers.editTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.workers.firstName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('admin.workers.firstNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.workers.lastName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('admin.workers.lastNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.email')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={t('admin.workers.emailPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.telegramUsername')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.workers.telegramUsernamePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telegram_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.telegramId')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder={t('admin.workers.telegramIdPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="worker_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">{t('admin.workers.types.student')}</SelectItem>
                          <SelectItem value="master">{t('admin.workers.types.master')}</SelectItem>
                          <SelectItem value="sales_head">{t('admin.workers.types.sales_head')}</SelectItem>
                          <SelectItem value="admin">{t('admin.workers.types.admin')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.rate')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder={t('admin.workers.ratePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.workers.birthday')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={t('admin.workers.deleteTitle')}
          description={t('admin.workers.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />

        {/* Create Button */}
        <div className="mt-6">
          <Button
            onClick={() => {
              form.reset();
              setIsCreateDialogOpen(true);
            }}
            className="w-full"
          >
            {t('admin.workers.createTitle')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Workers;