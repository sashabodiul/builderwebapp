import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import routes from '@/consts/pageRoutes';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

import { getWorkTasks, createWorkTask, updateWorkTask, deleteWorkTask } from '@/requests/work-task';
import { getFacilities } from '@/requests/facility';
import { getWorkers } from '@/requests/worker';
import { WorkTaskOut, WorkTaskCreate, WorkTaskUpdate } from '@/requests/work-task/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

const taskSchema = z.object({
  text: z.string().min(1, 'Description is required'),
  facility_id: z.string().min(1, 'Facility is required'),
  worker_id: z.string().optional(),
  expires_at: z.string().optional(),
  photo: z.any().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTaskOut | null>(null);
  const [deletingTask, setDeletingTask] = useState<WorkTaskOut | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    worker: 'all',
    facility: 'all',
  });

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['work-tasks'],
    queryFn: async () => {
      const response = await getWorkTasks();
      if (response.error) {
        toastError('Failed to load tasks');
        return [];
      }
      return response.data;
    },
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await getFacilities();
      if (response.error) {
        toastError('Failed to load facilities');
        return [];
      }
      return response.data;
    },
  });

  const { data: workers = [] } = useQuery({
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
    mutationFn: async (data: WorkTaskCreate) => {
      const response = await createWorkTask(data);
      if (response.error) {
        throw new Error('Failed to create task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.tasks.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WorkTaskUpdate }) => {
      const response = await updateWorkTask(id, data);
      if (response.error) {
        throw new Error('Failed to update task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingTask(null);
    },
    onError: () => {
      toastError(t('admin.tasks.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteWorkTask(id);
      if (response.error) {
        throw new Error('Failed to delete task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingTask(null);
    },
    onError: () => {
      toastError(t('admin.tasks.deleteError'));
    },
  });

  const toggleFinishedMutation = useMutation({
    mutationFn: async (task: WorkTaskOut) => {
      const response = await updateWorkTask(task.id, {
        finished: !task.finished,
      });
      if (response.error) {
        throw new Error('Failed to update task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-tasks'] });
      toastSuccess(t('admin.tasks.updateSuccess'));
    },
    onError: () => {
      toastError(t('admin.tasks.updateError'));
    },
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      text: '',
      facility_id: '',
      worker_id: 'unassigned',
      expires_at: '',
      photo: undefined,
    },
  });

  const handleCreate = (data: TaskFormData) => {
    const taskData: WorkTaskCreate = {
      text: data.text,
      facility_id: parseInt(data.facility_id),
      worker_id: data.worker_id && data.worker_id !== 'unassigned' ? parseInt(data.worker_id) : null,
      expires_at: data.expires_at || null,
      photo: data.photo || null,
    };
    createMutation.mutate(taskData);
  };

  const handleEdit = (data: TaskFormData) => {
    if (!editingTask) return;

    const taskData: WorkTaskUpdate = {
      text: data.text,
      facility_id: parseInt(data.facility_id),
      worker_id: data.worker_id && data.worker_id !== 'unassigned' ? parseInt(data.worker_id) : null,
      expires_at: data.expires_at || null,
      photo: data.photo || null,
    };
    updateMutation.mutate({ id: editingTask.id, data: taskData });
  };

  const handleDelete = () => {
    if (deletingTask) {
      deleteMutation.mutate(deletingTask.id);
    }
  };

  const handleToggleFinished = (task: WorkTaskOut) => {
    toggleFinishedMutation.mutate(task);
  };

  const openEditDialog = (task: WorkTaskOut) => {
    setEditingTask(task);
    form.reset({
      text: task.text || '',
      facility_id: task.facility_id?.toString() || '',
      worker_id: task.worker_id?.toString() || 'unassigned',
      expires_at: task.expires_at ? new Date(task.expires_at).toISOString().slice(0, 16) : '',
      photo: undefined,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (task: WorkTaskOut) => {
    setDeletingTask(task);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (task: WorkTaskOut) => {
    if (task.finished) {
      return <Badge className="bg-green-500 text-white">{t('admin.tasks.statusOptions.finished')}</Badge>;
    }
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      return <Badge className="bg-red-500 text-white">{t('admin.tasks.statusOptions.overdue')}</Badge>;
    }
    return <Badge className="bg-blue-500 text-white">{t('admin.tasks.statusOptions.pending')}</Badge>;
  };

  const getStatusIcon = (task: WorkTaskOut) => {
    if (task.finished) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const filteredTasks = tasks.filter((task) => {
    if (filters.status !== 'all') {
      if (filters.status === 'finished' && !task.finished) return false;
      if (filters.status === 'pending' && task.finished) return false;
      if (filters.status === 'overdue' && (!task.expires_at || new Date(task.expires_at) >= new Date())) return false;
    }
    if (filters.worker !== 'all' && task.worker_id?.toString() !== filters.worker) return false;
    if (filters.facility !== 'all' && task.facility_id?.toString() !== filters.facility) return false;
    return true;
  });

  const getFacilityName = (facilityId: number) => {
    const facility = facilities.find(f => f.id === facilityId);
    return facility?.name || 'Unknown Facility';
  };

  const getWorkerName = (workerId?: number | null) => {
    if (!workerId) return 'Unassigned';
    const worker = workers.find(w => w.id === workerId);
    return worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker' : 'Unknown Worker';
  };

  if (tasksLoading) {
    return (
      <div className="min-h-screen bg-theme-bg-primary p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-theme-text-secondary text-lg">{t('common.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page min-h-screen bg-theme-bg-primary p-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={routes.ADMIN}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.tasks.title')}</h1>
          </div>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button
            onClick={() => {
              form.reset();
              setIsCreateDialogOpen(true);
            }}
            className="w-full"
          >
            {t('admin.tasks.createTitle')}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter">{t('admin.tasks.filters.status')}</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.tasks.filters.all')}</SelectItem>
                    <SelectItem value="pending">{t('admin.tasks.filters.pending')}</SelectItem>
                    <SelectItem value="finished">{t('admin.tasks.filters.finished')}</SelectItem>
                    <SelectItem value="overdue">{t('admin.tasks.filters.overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="worker-filter">{t('admin.tasks.filters.worker')}</Label>
                <Select
                  value={filters.worker}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, worker: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.tasks.filters.all')}</SelectItem>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id.toString()}>
                        {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="facility-filter">{t('admin.tasks.filters.facility')}</Label>
                <Select
                  value={filters.facility}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, facility: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.tasks.filters.all')}</SelectItem>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-theme-text-secondary text-lg">
                  {t('admin.tasks.noTasks')}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="hover:bg-theme-bg-hover transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(task)}
                        <span className="font-medium text-theme-text-primary">
                          {task.text}
                        </span>
                        {getStatusBadge(task)}
                      </div>
                      
                      <div className="text-sm text-theme-text-secondary space-y-1">
                        <div>{t('admin.tasks.facility')}: {getFacilityName(task.facility_id || 0)}</div>
                        <div>{t('admin.tasks.worker')}: {getWorkerName(task.worker_id)}</div>
                        {task.expires_at && (
                          <div>
                            {t('admin.tasks.expiresAt')}: {new Date(task.expires_at).toLocaleDateString()}
                          </div>
                        )}
                        {task.photo_url && (
                          <div className="mt-2">
                            <img
                              src={task.photo_url}
                              alt="Task photo"
                              className="w-20 h-20 object-cover rounded"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleFinished(task)}
                        disabled={toggleFinishedMutation.isPending}
                      >
                        {task.finished ? t('admin.tasks.markPending') : t('admin.tasks.markFinished')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(task)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Task Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.tasks.createTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('admin.tasks.descriptionPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facility_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.facility')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.tasks.selectFacility')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilities.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="worker_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.worker')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.tasks.selectWorker')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">{t('admin.tasks.unassigned')}</SelectItem>
                          {workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id.toString()}>
                              {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.expiresAt')}</FormLabel>
                      <FormControl>
                        <DateInput
                          type="datetime-local"
                          {...field}
                          placeholder={t('admin.tasks.expiresAtPlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.photo')}</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files?.[0])}
                          {...field}
                        />
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

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.tasks.editTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('admin.tasks.descriptionPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facility_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.facility')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.tasks.selectFacility')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilities.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="worker_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.worker')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.tasks.selectWorker')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">{t('admin.tasks.unassigned')}</SelectItem>
                          {workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id.toString()}>
                              {`${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Unknown Worker'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.expiresAt')}</FormLabel>
                      <FormControl>
                        <DateInput
                          type="datetime-local"
                          {...field}
                          placeholder={t('admin.tasks.expiresAtPlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photo"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>{t('admin.tasks.photo')}</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files?.[0])}
                          {...field}
                        />
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
          title={t('admin.tasks.deleteTitle')}
          description={t('admin.tasks.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />

      </div>
    </div>
  );
};

export default Tasks;