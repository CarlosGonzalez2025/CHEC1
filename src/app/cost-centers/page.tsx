// src/app/cost-centers/page.tsx
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
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { CostCenter } from '@/lib/types';
import { addCostCenter, updateCostCenter, deleteCostCenter } from '@/lib/data';

export default function CostCentersPage() {
    const { user, costCenters, tenantId, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<CostCenter | null>(null);
    const { toast } = useToast();

    if (user?.role !== 'Admin' && user?.role !== 'SuperAdmin') {
        return (
            <AppLayout pageTitle="Acceso Denegado">
                <Card>
                    <CardHeader>
                        <CardTitle>Acceso Denegado</CardTitle>
                        <CardDescription>Esta sección solo está disponible para administradores.</CardDescription>
                    </CardHeader>
                </Card>
            </AppLayout>
        );
    }
    
    const handleOpenForm = (costCenter: CostCenter | null = null) => {
        if (costCenter) {
            setEditingId(costCenter.id);
            setName(costCenter.name);
        } else {
            setEditingId(null);
            setName('');
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !tenantId) {
            toast({ title: 'Error', description: 'El nombre del centro de trabajo no puede estar vacío.', variant: 'destructive' });
            return;
        }

        try {
            if (editingId) {
                await updateCostCenter(editingId, { name }, tenantId);
                toast({ title: 'Centro de Trabajo Actualizado' });
            } else {
                await addCostCenter({ name }, tenantId);
                toast({ title: 'Centro de Trabajo Creado' });
            }
            setIsFormOpen(false);
            fetchAllData(); // Refresh data globally
        } catch (error) {
            console.error("Error saving cost center:", error);
            toast({ title: 'Error al Guardar', variant: 'destructive' });
        }
    };

    const openDeleteConfirm = (costCenter: CostCenter) => {
        setItemToDelete(costCenter);
        setIsAlertOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete || !tenantId) return;

        try {
            await deleteCostCenter(itemToDelete.id, tenantId);
            toast({ title: "Centro de Trabajo Eliminado" });
            setIsAlertOpen(false);
            setItemToDelete(null);
            fetchAllData();
        } catch (error) {
            console.error("Error deleting cost center:", error);
            toast({ title: 'Error al eliminar', variant: 'destructive' });
            setIsAlertOpen(false);
        }
    };


  return (
    <AppLayout pageTitle="Gestión de Centros de Trabajo">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Todos los Centros de Trabajo</CardTitle>
            <CardDescription>
              Añada, edite o elimine los centros de trabajo para su empresa.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
            <PlusCircle className="h-4 w-4" />
            Añadir Centro de Trabajo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-4/5">Nombre del Centro de Trabajo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {costCenters.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        No hay centros de trabajo definidos.
                    </TableCell>
                    </TableRow>
                ) : (
                    costCenters.map((center) => (
                    <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.name}</TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(center)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteConfirm(center)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog for Add/Edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar Centro de Trabajo' : 'Añadir Nuevo Centro de Trabajo'}</DialogTitle>
                    <DialogDescription>
                    {editingId ? 'Cambie el nombre del centro de trabajo.' : 'Ingrese el nombre para el nuevo centro de trabajo.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        Nombre
                    </Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="col-span-3"
                        required
                    />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el centro de trabajo "{itemToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
