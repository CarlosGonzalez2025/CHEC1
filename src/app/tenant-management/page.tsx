// src/app/tenant-management/page.tsx
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, SlidersHorizontal } from 'lucide-react';
import { Tenant, getTenants, addTenant, User, addUser, updateTenant, navItems } from '@/lib/data';
import { uploadFile } from '@/lib/data';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';


// ✅ MÓDULO OSTEOMUSCULAR AGREGADO A LOS MÓDULOS POR DEFECTO
const initialNewTenantState: Omit<Tenant, 'id' | 'createdAt'> = {
  name: '',
  status: 'Active',
  accessibleModules: ['dashboard', 'employees', 'absence-tracking', 'osteomuscular'], // ✅ Agregado 'osteomuscular'
  logoURL: null,
  nit: null,
};

const initialNewAdminState = {
    name: '',
    email: '',
    password: '',
};

export default function TenantManagementPage() {
  const { user, refreshTenantInfo, tenantId: currentTenantId } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [newTenantData, setNewTenantData] = useState(initialNewTenantState);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    
  // Clean up preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    }
  }, [logoPreviewUrl]);
    const [newAdminData, setNewAdminData] = useState(initialNewAdminState);
    const [tenantModules, setTenantModules] = useState<string[]>([]);
    const { toast } = useToast();

    const fetchTenants = async () => {
        if (user?.role === 'SuperAdmin') {
            getTenants().then(setTenants);
        }
    }

    useEffect(() => {
        fetchTenants();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
  if (selectedTenant) {
        // Update existing tenant
        const updateData: Partial<Omit<Tenant, 'id' | 'createdAt'>> = {
          name: newTenantData.name,
          status: newTenantData.status,
          accessibleModules: newTenantData.accessibleModules,
          nit: (newTenantData as any).nit || null,
        };
        await updateTenant(selectedTenant.id, updateData);
        // If new logo file uploaded, upload and update
        if (logoFile) {
          try {
            const logoURL = await uploadFile(logoFile, `tenant-logos/${selectedTenant.id}`);
            await updateTenant(selectedTenant.id, { logoURL });
          } catch (e) {
            console.error('Error uploading tenant logo', e);
          }
        }
        toast({ title: 'Empresa Actualizada', description: `La empresa '${newTenantData.name}' ha sido actualizada.` });
        // If the updated tenant is the one the current session belongs to, refresh tenant metadata
        if (currentTenantId && selectedTenant.id === currentTenantId) {
          try { await refreshTenantInfo(); } catch (e) { /* ignore */ }
        }
      } else {
        // Create flow
        // Step 1: Create the new tenant to get an ID
        const newTenantId = await addTenant(newTenantData);
        toast({ title: "Empresa Creada", description: `La empresa '${newTenantData.name}' ha sido registrada.` });

        // Step 2: Create the admin user for that new tenant
        const adminUserData: Omit<User, 'id'> = {
          name: newAdminData.name,
          email: newAdminData.email,
          password: newAdminData.password,
          role: 'Admin',
          status: 'Active',
          tenantId: newTenantId,
          accessibleModules: [], // Admin inherits modules from tenant, so this can be empty
          costCenters: [],
          photoURL: null,
        };
        await addUser(adminUserData);
        // If a logo file was provided, upload it and update tenant
        if (logoFile) {
          try {
            const logoURL = await uploadFile(logoFile, `tenant-logos/${newTenantId}`);
            await updateTenant(newTenantId, { logoURL });
          } catch (e) {
            console.error('Error uploading tenant logo', e);
            // non-fatal: tenant was created, admin created
          }
        }
        toast({ title: "Usuario Administrador Creado", description: `El usuario ${newAdminData.email} ha sido creado para ${newTenantData.name}.` });
        // If we created a tenant and the current user belongs to it (unlikely) refresh
        if (currentTenantId && newTenantId === currentTenantId) {
          try { await refreshTenantInfo(); } catch (e) { /* ignore */ }
        }
      }

            // Step 3: Reset form and refresh list
            setIsFormOpen(false);
            setSelectedTenant(null);
            setNewTenantData(initialNewTenantState);
            setNewAdminData(initialNewAdminState);
            fetchTenants();

        } catch (error) {
            console.error("Error creating tenant or admin:", error);
            toast({ title: "Error", description: "No se pudo crear la empresa o el usuario administrador.", variant: 'destructive' });
        }
    };
    
     const handleDeactivate = async (tenant: Tenant) => {
        try {
            await updateTenant(tenant.id, { status: 'Inactive' });
            toast({ title: "Empresa Desactivada", description: `La empresa '${tenant.name}' ha sido marcada como inactiva.` });
            fetchTenants();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo desactivar la empresa.', variant: 'destructive' });
        }
    };
    
    const handleActivate = async (tenant: Tenant) => {
        try {
            await updateTenant(tenant.id, { status: 'Active' });
            toast({ title: "Empresa Activada", description: `La empresa '${tenant.name}' ha sido marcada como activa.` });
            fetchTenants();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo activar la empresa.', variant: 'destructive' });
        }
    };

    const handleOpenModuleManager = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setTenantModules(tenant.accessibleModules || []);
        setIsModuleFormOpen(true);
    };
    
    const handleModuleChange = (moduleId: string, isChecked: boolean) => {
        setTenantModules(prev => {
            const newModules = new Set(prev);
            if(isChecked) {
                newModules.add(moduleId);
            } else {
                newModules.delete(moduleId);
            }
            return Array.from(newModules);
        });
    };

    const handleSaveModules = async () => {
        if (!selectedTenant) return;
        try {
            await updateTenant(selectedTenant.id, { accessibleModules: tenantModules });
            toast({ title: "Módulos Actualizados", description: `Se han actualizado los módulos para ${selectedTenant.name}.` });
            setIsModuleFormOpen(false);
            fetchTenants();
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron actualizar los módulos.", variant: 'destructive' });
        }
    };

    if (user?.role !== 'SuperAdmin') {
        return (
            <AppLayout pageTitle="Acceso Denegado">
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>Esta sección es solo para Super Administradores.</CardDescription>
                    </CardHeader>
                </Card>
            </AppLayout>
        );
    }

  return (
    <AppLayout pageTitle="Gestión de Empresas (Inquilinos)">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Todas las Empresas</CardTitle>
            <CardDescription>
              Gestionar todas las empresas (inquilinos) en la plataforma.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Añadir Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Añadir Nueva Empresa y Administrador</DialogTitle>
                <DialogDescription>
                  Crea una nueva empresa y su cuenta de administrador inicial.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave}>
                <div className="space-y-6 py-4">
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-medium mb-2">Datos de la Empresa</h3>
                        <div className="space-y-2">
                             <Label htmlFor="tenant-name">Nombre de la Empresa</Label>
                             <Input id="tenant-name" value={newTenantData.name} onChange={(e) => setNewTenantData({...newTenantData, name: e.target.value})} />
              <div className="mt-2">
             <Label htmlFor="tenant-nit">NIT</Label>
             <Input id="tenant-nit" value={(newTenantData as any).nit || ''} onChange={(e) => setNewTenantData({...newTenantData, nit: e.target.value})} />
              </div>
                        </div>
        <div className="space-y-2 mt-2">
        <Label htmlFor="tenant-logo">Logo de la Empresa (Opcional)</Label>
        <input id="tenant-logo" type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (!file) {
            setLogoFile(null);
            setLogoPreviewUrl(null);
            return;
          }
          // Validate type
          if (!file.type.startsWith('image/')) {
            toast({ title: 'Archivo inválido', description: 'Por favor selecciona una imagen.', variant: 'destructive' });
            e.currentTarget.value = '';
            return;
          }
          // Validate size <= 2MB
          const maxSize = 2 * 1024 * 1024;
          if (file.size > maxSize) {
            toast({ title: 'Archivo muy grande', description: 'El logo debe ser menor a 2MB.', variant: 'destructive' });
            e.currentTarget.value = '';
            return;
          }
          setLogoFile(file);
          const url = URL.createObjectURL(file);
          setLogoPreviewUrl(url);
        }} />
        {logoPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreviewUrl} alt="Preview Logo" className="mt-2 w-40 h-20 object-contain border rounded-md bg-white p-1" />
        ) : newTenantData.logoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={newTenantData.logoURL as string} alt="Current Logo" className="mt-2 w-40 h-20 object-contain border rounded-md bg-white p-1" />
        ) : null}
        </div>
                    </div>
                     <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-medium mb-2">Datos del Administrador</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="admin-name">Nombre Completo del Admin</Label>
                                <Input id="admin-name" value={newAdminData.name} onChange={(e) => setNewAdminData({...newAdminData, name: e.target.value})}/>
                            </div>
                             <div>
                                <Label htmlFor="admin-email">Email del Admin</Label>
                                <Input id="admin-email" type="email" value={newAdminData.email} onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}/>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="admin-password">Contraseña Inicial</Label>
                                <Input id="admin-password" type="password" value={newAdminData.password} onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}/>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar Empresa y Usuario</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Empresa</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Módulos Activos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{format(tenant.createdAt, 'PP')}</TableCell>
                  <TableCell>{tenant.accessibleModules?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === 'Active' ? 'default' : 'destructive'} className={tenant.status === 'Active' ? 'bg-green-500' : ''}>
                        {tenant.status || 'No definido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModuleManager(tenant)}>
                            <SlidersHorizontal className="mr-2 h-4 w-4"/>
                            Gestionar Módulos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                            setSelectedTenant(tenant);
                            setNewTenantData({ ...newTenantData, name: tenant.name, status: tenant.status, accessibleModules: tenant.accessibleModules || [], logoURL: tenant.logoURL || null });
                            setLogoFile(null);
                            setIsFormOpen(true);
                        }}>
                            Editar Empresa
                        </DropdownMenuItem>
                        {tenant.status === 'Active' ? (
                            <DropdownMenuItem onClick={() => handleDeactivate(tenant)}>Desactivar</DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => handleActivate(tenant)}>Activar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Module Management Dialog */}
      <Dialog open={isModuleFormOpen} onOpenChange={setIsModuleFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Gestionar Módulos para {selectedTenant?.name}</DialogTitle>
                <DialogDescription>
                    Seleccione los módulos que esta empresa podrá utilizar.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
                 {navItems
                    .filter(item => !['user-management', 'tenant-management', 'guide', 'profile'].includes(item.id))
                    .map(item => (
                        <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                            <Checkbox 
                                id={`module-${item.id}`} 
                                checked={tenantModules.includes(item.id)}
                                onCheckedChange={(checked) => handleModuleChange(item.id, !!checked)}
                            />
                            <Label htmlFor={`module-${item.id}`} className="flex-grow font-normal cursor-pointer">{item.label}</Label>
                        </div>
                 ))}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsModuleFormOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveModules}>Guardar Cambios</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}