import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import routes from '@/consts/pageRoutes';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import { getFacilityTypes, createFacilityType, updateFacilityType, deleteFacilityType } from '@/requests/facility-type';
import { FacilityTypeOut, FacilityTypeCreate, FacilityTypeUpdate } from '@/requests/facility-type/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

const facilityTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type FacilityTypeFormData = z.infer<typeof facilityTypeSchema>;

const FacilityTypes: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<FacilityTypeOut | null>(null);
  const [deletingType, setDeletingType] = useState<FacilityTypeOut | null>(null);

  // Query
  const { data: facilityTypes = [], isLoading } = useQuery({
    queryKey: ['facility-types'],
    queryFn: async () => {
      const response = await getFacilityTypes();
      if (response.error) {
        toastError('Failed to load facility types');
        return [];
      }
      return response.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: FacilityTypeCreate) => {
      const response = await createFacilityType(data);
      if (response.error) {
        throw new Error('Failed to create facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FacilityTypeUpdate }) => {
      const response = await updateFacilityType(id, data);
      if (response.error) {
        throw new Error('Failed to update facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingType(null);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteFacilityType(id);
      if (response.error) {
        throw new Error('Failed to delete facility type');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      toastSuccess(t('admin.facilityTypes.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingType(null);
    },
    onError: () => {
      toastError(t('admin.facilityTypes.deleteError'));
    },
  });

  const form = useForm<FacilityTypeFormData>({
    resolver: zodResolver(facilityTypeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleCreate = (data: FacilityTypeFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: FacilityTypeFormData) => {
    if (!editingType) return;
    updateMutation.mutate({ id: editingType.id, data });
  };

  const handleDelete = () => {
    if (deletingType) {
      deleteMutation.mutate(deletingType.id);
    }
  };

  const openEditDialog = (type: FacilityTypeOut) => {
    setEditingType(type);
    form.reset({
      name: type.name || '',
      description: type.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (type: FacilityTypeOut) => {
    setDeletingType(type);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.facilityTypes.title')}</h1>
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
            {t('admin.facilityTypes.createTitle')}
          </Button>
        </div>

        {/* Facility Types List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilityTypes.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <div className="text-theme-text-secondary text-lg">
                  {t('admin.facilityTypes.noTypes')}
                </div>
              </CardContent>
            </Card>
          ) : (
            facilityTypes.map((type) => (
              <Card key={type.id} className="hover:bg-theme-bg-hover transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-theme-text-secondary text-sm mb-4">
                    {type.description || t('admin.facilityTypes.noDescription')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(type)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(type)}
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

        {/* Create Facility Type Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.facilityTypes.createTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilityTypes.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilityTypes.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilityTypes.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('admin.facilityTypes.descriptionPlaceholder')} />
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

        {/* Edit Facility Type Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.facilityTypes.editTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilityTypes.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilityTypes.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilityTypes.description')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('admin.facilityTypes.descriptionPlaceholder')} />
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
          title={t('admin.facilityTypes.deleteTitle')}
          description={t('admin.facilityTypes.deleteDescription')}
          isLoading={deleteMutation.isPending}
        />

      </div>
    </div>
  );
};

export default FacilityTypes;