import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, MapPin, Users, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import routes from '@/consts/pageRoutes';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { getFacilities, createFacility, updateFacility, deleteFacility } from '@/requests/facility';
import { getFacilityTypes } from '@/requests/facility-type';
import { FacilityOut, FacilityCreate, FacilityUpdate } from '@/requests/facility/types';
import { toastError, toastSuccess } from '@/lib/toasts';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';

const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  facility_type_id: z.string().min(1, 'Facility type is required'),
  group_id: z.string().optional(),
  invite_link: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  status_active: z.boolean(),
});

type FacilityFormData = z.infer<typeof facilitySchema>;

const Facilities: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<FacilityOut | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<FacilityOut | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  // Queries
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
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

  const { data: facilityTypes = [] } = useQuery({
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
    mutationFn: async (data: FacilityCreate) => {
      const response = await createFacility(data);
      if (response.error) {
        throw new Error('Failed to create facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.createSuccess'));
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toastError(t('admin.facilities.createError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FacilityUpdate }) => {
      const response = await updateFacility(id, data);
      if (response.error) {
        throw new Error('Failed to update facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.updateSuccess'));
      setIsEditDialogOpen(false);
      setEditingFacility(null);
    },
    onError: () => {
      toastError(t('admin.facilities.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteFacility(id);
      if (response.error) {
        throw new Error('Failed to delete facility');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toastSuccess(t('admin.facilities.deleteSuccess'));
      setIsDeleteDialogOpen(false);
      setDeletingFacility(null);
    },
    onError: () => {
      toastError(t('admin.facilities.deleteError'));
    },
  });

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      facility_type_id: '',
      group_id: '',
      invite_link: '',
      latitude: '',
      longitude: '',
      status_active: true,
    },
  });

  const handleCreate = (data: FacilityFormData) => {
    const facilityData: FacilityCreate = {
      name: data.name,
      facility_type_id: parseInt(data.facility_type_id),
      group_id: data.group_id ? parseInt(data.group_id) : null,
      invite_link: data.invite_link || null,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      status_active: data.status_active,
    };
    createMutation.mutate(facilityData);
  };

  const handleEdit = (data: FacilityFormData) => {
    if (!editingFacility) return;
    const facilityData: FacilityUpdate = {
      name: data.name,
      facility_type_id: parseInt(data.facility_type_id),
      group_id: data.group_id ? parseInt(data.group_id) : undefined,
      invite_link: data.invite_link || undefined,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      status_active: data.status_active,
    };
    updateMutation.mutate({ id: editingFacility.id, data: facilityData });
  };

  const handleDelete = () => {
    if (deletingFacility) {
      deleteMutation.mutate(deletingFacility.id);
    }
  };

  const openEditDialog = (facility: FacilityOut) => {
    setEditingFacility(facility);
    form.reset({
      name: facility.name || '',
      facility_type_id: facility.facility_type_id?.toString() || '',
      group_id: facility.group_id?.toString() || '',
      invite_link: facility.invite_link || '',
      latitude: facility.latitude?.toString() || '',
      longitude: facility.longitude?.toString() || '',
      status_active: facility.status_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (facility: FacilityOut) => {
    setDeletingFacility(facility);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (statusActive: boolean | null) => {
    return statusActive ? (
      <Badge className="bg-green-500 text-white">{t('admin.facilities.statusOptions.active')}</Badge>
    ) : (
      <Badge className="bg-gray-500 text-white">{t('admin.facilities.statusOptions.inactive')}</Badge>
    );
  };

  const getFacilityTypeName = (typeId: number | null) => {
    if (!typeId) return 'Unknown Type';
    const type = facilityTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const filteredFacilities = facilities.filter(facility => {
    if (typeFilter === 'all') return true;
    return facility.facility_type_id?.toString() === typeFilter;
  });

  if (facilitiesLoading) {
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
            <h1 className="text-3xl font-bold text-theme-text-primary">{t('admin.facilities.title')}</h1>
          </div>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="type-filter">{t('admin.facilities.filterByType')}</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.facilities.allTypes')}</SelectItem>
                  {facilityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Facilities List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacilities.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <div className="text-theme-text-secondary text-lg">
                  {t('admin.facilities.noFacilities')}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredFacilities.map((facility) => (
              <Card key={facility.id} className="hover:bg-theme-bg-hover transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                        {getStatusBadge(facility.status_active)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-theme-text-secondary">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{getFacilityTypeName(facility.facility_type_id)}</span>
                    </div>
                    
                    {facility.group_id && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{t('admin.facilities.groupId')}: {facility.group_id}</span>
                      </div>
                    )}
                    
                    {facility.invite_link && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        <a 
                          href={facility.invite_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 truncate"
                        >
                          {t('admin.facilities.inviteLink')}
                        </a>
                      </div>
                    )}
                    
                    {(facility.latitude && facility.longitude) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(facility)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(facility)}
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

        {/* Create Facility Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.facilities.createTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilities.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facility_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.facilities.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilityTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
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
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.groupId')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder={t('admin.facilities.groupIdPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invite_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.inviteLink')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilities.inviteLinkPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.facilities.latitude')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" placeholder="0.0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.facilities.longitude')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" placeholder="0.0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.status')}</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value ? 'true' : 'false'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">{t('admin.facilities.statusOptions.active')}</SelectItem>
                          <SelectItem value="false">{t('admin.facilities.statusOptions.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
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

        {/* Edit Facility Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('admin.facilities.editTitle')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilities.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facility_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.type')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admin.facilities.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilityTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
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
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.groupId')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder={t('admin.facilities.groupIdPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invite_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.inviteLink')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('admin.facilities.inviteLinkPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.facilities.latitude')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" placeholder="0.0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.facilities.longitude')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" placeholder="0.0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.facilities.status')}</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value ? 'true' : 'false'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">{t('admin.facilities.statusOptions.active')}</SelectItem>
                          <SelectItem value="false">{t('admin.facilities.statusOptions.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
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
          title={t('admin.facilities.deleteTitle')}
          description={t('admin.facilities.deleteDescription')}
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
            {t('admin.facilities.createTitle')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Facilities;