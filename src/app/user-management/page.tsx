'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { getUsers, User, addUser, updateUser, navItems, getTenants, Tenant, getTenantById } from '@/lib/data';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

function getRoleBadge(role: User['role']) {
  switch (role) {
    case 'SuperAdmin':
      return <Badge className="bg-purple-600">Super Admin</Badge>;
    case 'Admin':
      return <Badge className="bg-red-500">Admin</Badge>;
    case 'HR':
      return <Badge className="bg-blue-500">HR</Badge>;
    case 'Medical':
      return <Badge className="bg-green-500">Medical</Badge>;
    case 'Management':
      return <Badge className="bg-gray-500">Management</Badge>;
  }
}

function getStatusBadge(status: User['status']) {
  return status === 'Active' ? (
    <Badge variant="default" className="bg-green-500">Active</Badge>
  ) : (
    <Badge variant="destructive">Inactive</Badge>
  );
}

const initialFormState: Omit<User, 'id' | 'photoURL'> = {
  name: '',
  email: '',
  password: '',
  role: 'HR',
  status: 'Active',
  accessibleModules: [],
  costCenters: [],
  tenantId: '',
};

export default function UserManagementPage() {
    const { tenantId, user: currentUser, costCenters } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<User, 'id' | 'photoURL'>>(initialFormState);
    const { toast } = useToast();

    const tenantMap = new Map(tenants.map(t => [t.id, t.name]));
    const [tenantForForm, setTenantForForm] = useState<Tenant | null>(null);


    const fetchPageData = async () => {
        if (!tenantId && currentUser?.role !== 'SuperAdmin') return;
        
        const userList = await getUsers();
        setUsers(userList);

        if (currentUser?.role === 'SuperAdmin') {
            const tenantList = await getTenants();
            setTenants(tenantList);
        } else if (tenantId) {
            const currentTenant = await getTenantById(tenantId);
            setTenantForForm(currentTenant);
        }
    }
    
    useEffect(() => {
        fetchPageData();
    }, [tenantId, currentUser]);
    
    useEffect(() => {
        if (currentUser?.role === 'SuperAdmin' && formData.tenantId) {
            const selected = tenants.find(t => t.id === formData.tenantId);
            setTenantForForm(selected || null);
        } else if (currentUser?.role === 'Admin' && tenantId) {
            const currentTenant = tenants.find(t => t.id === tenantId);
             if(!tenantForForm) { // only set if not already set
                getTenantById(tenantId).then(setTenantForForm);
            }
        }
    }, [formData.tenantId, tenants, currentUser, tenantId, tenantForForm]);


    const handleOpenForm = (user: User | null = null) => {
        if (user) {
            setEditingUserId(user.id);
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                accessibleModules: user.accessibleModules || [],
                costCenters: user.costCenters || [],
                tenantId: user.tenantId,
            });
             if (currentUser?.role === 'SuperAdmin') {
                const tenant = tenants.find(t => t.id === user.tenantId);
                setTenantForForm(tenant || null);
            }
        } else {
            setEditingUserId(null);
            setFormData({
                ...initialFormState,
                tenantId: currentUser?.role === 'SuperAdmin' ? '' : tenantId || '', 
            });
             if (currentUser?.role !== 'SuperAdmin' && tenantId) {
                getTenantById(tenantId).then(setTenantForForm);
            } else {
                setTenantForForm(null);
            }
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveTenantId = formData.tenantId || tenantId;

        if (!effectiveTenantId) {
            toast({ title: "Error", description: "Debe seleccionar una empresa para el usuario.", variant: 'destructive' });
            return;
        }

        try {
            if (editingUserId) {
                const { password, ...updateData } = formData;
                await updateUser(editingUserId, updateData);
                toast({ title: "Usuario actualizado" });
            } else {
                if (!formData.password) {
                  toast({ title: "Error", description: "Password is required for new users.", variant: "destructive"});
                  return;
                }
                await addUser({ ...formData, tenantId: effectiveTenantId! });
                toast({ title: "Usuario creado" });
            }
            fetchPageData();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving user:", error);
            toast({ title: "Error al guardar el usuario", description: "The email might already be in use.", variant: 'destructive' });
        }
    };
    
    const handleDeactivate = async (userToDeactivate: User) => {
        if (currentUser?.id === userToDeactivate.id) {
            toast({ title: "Error", description: "No puedes desactivarte a ti mismo.", variant: "destructive" });
            return;
        }
        try {
            await updateUser(userToDeactivate.id, { status: 'Inactive' });
            toast({ title: "Usuario Desactivado", description: `${userToDeactivate.name} ha sido marcado como inactivo.` });
            fetchPageData();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo desactivar el usuario.', variant: 'destructive' });
        }
    };

    const handleCheckboxChange = (collection: 'accessibleModules' | 'costCenters', value: string, isChecked: boolean) => {
        setFormData(prev => {
            const set = new Set(prev[collection]);
            if (isChecked) {
                set.add(value);
            } else {
                set.delete(value);
            }
            return { ...prev, [collection]: Array.from(set) };
        });
    };

  return (
    <AppLayout pageTitle="User Management">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System Users</CardTitle>
            <CardDescription>
              Manage user accounts, roles, and permissions.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                <PlusCircle className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUserId ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUserId ? 'Update user details and permissions.' : 'Create a new user account and assign a role.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))}/>
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} disabled={!!editingUserId}/>
                    </div>
                    {!editingUserId && (
                       <div>
                          <Label htmlFor="password">Password</Label>
                          <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData(p => ({...p, password: e.target.value}))} />
                      </div>
                    )}
                     <div>
                        <Label htmlFor="role">Role</Label>
                        <Select onValueChange={(v) => setFormData(p => ({...p, role: v as User['role']}))} value={formData.role}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {currentUser?.role === 'SuperAdmin' && <SelectItem value="SuperAdmin">Super Admin</SelectItem>}
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="Medical">Medical</SelectItem>
                                <SelectItem value="Management">Management</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="status">Status</Label>
                        <Select onValueChange={(v) => setFormData(p => ({...p, status: v as User['status']}))} value={formData.status}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {currentUser?.role === 'SuperAdmin' && (
                        <div>
                            <Label htmlFor="tenantId">Empresa (Inquilino)</Label>
                            <Select onValueChange={(v) => setFormData(p => ({...p, tenantId: v}))} value={formData.tenantId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
                                <SelectContent>
                                    {tenants.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Accessible Modules</Label>
                     <p className="text-xs text-muted-foreground">Módulos habilitados para la empresa seleccionada. Solo estos se pueden asignar.</p>
                    <div className="grid grid-cols-3 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
                        {(tenantForForm?.accessibleModules || []).map(moduleId => {
                            const navItem = navItems.find(item => item.id === moduleId);
                            if (!navItem) return null;
                            return (
                                <div key={navItem.id} className="flex items-center gap-2">
                                    <Checkbox 
                                        id={`module-${navItem.id}`} 
                                        checked={formData.accessibleModules.includes(navItem.id)} 
                                        onCheckedChange={(checked) => handleCheckboxChange('accessibleModules', navItem.id, !!checked)}
                                    />
                                    <Label htmlFor={`module-${navItem.id}`} className="font-normal cursor-pointer">{navItem.label}</Label>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                   <Separator />
                    { currentUser?.role !== 'SuperAdmin' && (
                       <div className="space-y-2">
                        <Label>Cost Centers</Label>
                         <p className="text-xs text-muted-foreground">Seleccione los centros de costo a los que este usuario tendrá acceso. Déjelo en blanco para dar acceso a todos.</p>
                        <div className="grid grid-cols-3 gap-2 p-4 border rounded-md">
                            {costCenters.map(center => (
                                 <div key={center.id} className="flex items-center gap-2">
                                    <Checkbox 
                                        id={`center-${center.id}`} 
                                        checked={formData.costCenters.includes(center.name)}
                                        onCheckedChange={(checked) => handleCheckboxChange('costCenters', center.name, !!checked)}
                                    />
                                    <Label htmlFor={`center-${center.id}`} className="font-normal">{center.name}</Label>
                                </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button type="submit">Save User</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {currentUser?.role === 'SuperAdmin' && <TableHead>Empresa</TableHead>}
                <TableHead>Cost Centers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  {currentUser?.role === 'SuperAdmin' && <TableCell>{tenantMap.get(user.tenantId) || 'N/A'}</TableCell>}
                  <TableCell>{user.costCenters?.join(', ') || 'All'}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenForm(user)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeactivate(user)}>Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
