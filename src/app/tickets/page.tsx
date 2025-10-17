
'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Filter, X, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import type { Ticket, TicketComment } from '@/lib/types';
import { addTicket, updateTicket, uploadFile, addTicketComment } from '@/lib/data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const initialFormState: Omit<Ticket, 'id' | 'createdAt' | 'userId' | 'userName' | 'userEmail' | 'tenantId' | 'comments' | 'status'> = {
  title: '',
  description: '',
  category: 'Fallo',
  priority: 'Baja',
  attachments: [],
};

const getStatusBadge = (status: Ticket['status']) => {
  switch (status) {
    case 'Abierto': return <Badge className="bg-blue-500">Abierto</Badge>;
    case 'En Progreso': return <Badge className="bg-yellow-500">En Progreso</Badge>;
    case 'Resuelto': return <Badge className="bg-green-500">Resuelto</Badge>;
    case 'Cerrado': return <Badge variant="secondary">Cerrado</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function TicketsPage() {
    const { user, tickets: allTickets, fetchAllData, tenantName } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const userTickets = useMemo(() => {
        if (!user) return [];
        return allTickets.filter(t => t.userId === user.id).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [allTickets, user]);
    
    const managedTickets = useMemo(() => {
        if (user?.role !== 'SuperAdmin') return [];
        return allTickets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [allTickets, user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !tenantName) {
            toast({ title: 'Error', description: 'No se pudo identificar al usuario o la empresa.', variant: 'destructive' });
            return;
        }

        try {
            const newTicket: Omit<Ticket, 'id'> = {
                ...initialFormState,
                ...formData,
                createdAt: new Date(),
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                tenantId: user.tenantId,
                status: 'Abierto',
                comments: [],
            };
            await addTicket(newTicket);
            toast({ title: 'Ticket Creado', description: 'Tu solicitud ha sido enviada al equipo de soporte.' });
            setIsFormOpen(false);
            setFormData(initialFormState);
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error al crear el ticket', variant: 'destructive' });
        }
    };
    
    const handleOpenDetails = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setIsDetailsOpen(true);
    }
    
    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, `tickets-soportes`);
            setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), downloadURL] }));
            toast({ title: 'Archivo adjuntado' });
        } catch (error) {
            toast({ title: 'Error al subir archivo', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const removeSoporte = (urlToRemove: string) => {
        setFormData(prev => ({ ...prev, attachments: (prev.attachments || []).filter(url => url !== urlToRemove) }));
    };

    return (
        <AppLayout pageTitle="Centro de Soporte y Tickets">
            <Tabs defaultValue={user?.role === 'SuperAdmin' ? "management" : "user"}>
                {user?.role === 'SuperAdmin' && (
                    <TabsList>
                        <TabsTrigger value="user">Mis Tickets</TabsTrigger>
                        <TabsTrigger value="management">Gestionar Tickets</TabsTrigger>
                    </TabsList>
                )}
                <TabsContent value="user">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Mis Tickets de Soporte</CardTitle>
                                    <CardDescription>Aquí puedes ver el historial y estado de tus solicitudes.</CardDescription>
                                </div>
                                 <Button size="sm" className="gap-1" onClick={() => setIsFormOpen(true)}>
                                    <PlusCircle className="h-4 w-4" />
                                    Crear Nuevo Ticket
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Título</TableHead><TableHead>Categoría</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {userTickets.map(ticket => (
                                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleOpenDetails(ticket)}>
                                            <TableCell>{format(ticket.createdAt, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{ticket.title}</TableCell>
                                            <TableCell>{ticket.category}</TableCell>
                                            <TableCell>{ticket.priority}</TableCell>
                                            <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                            <TableCell><Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenDetails(ticket); }}>Ver</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                 {user?.role === 'SuperAdmin' && (
                    <TabsContent value="management">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestión de Todos los Tickets</CardTitle>
                                <CardDescription>Vista de administrador para gestionar las solicitudes de todos los usuarios.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Usuario</TableHead><TableHead>Título</TableHead><TableHead>Categoría</TableHead><TableHead>Prioridad</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {managedTickets.map(ticket => (
                                            <TableRow key={ticket.id} className="cursor-pointer" onClick={() => handleOpenDetails(ticket)}>
                                                <TableCell>{ticket.tenantName || 'Global'}</TableCell>
                                                <TableCell>{ticket.userName}</TableCell>
                                                <TableCell>{ticket.title}</TableCell>
                                                <TableCell>{ticket.category}</TableCell>
                                                <TableCell>{ticket.priority}</TableCell>
                                                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                                <TableCell><Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenDetails(ticket); }}>Gestionar</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
            
            {/* Create Ticket Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Ticket de Soporte</DialogTitle>
                        <DialogDescription>Describe el fallo, ajuste o modificación que necesitas.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div><Label htmlFor="title">Título</Label><Input id="title" required value={formData.title} onChange={(e) => setFormData(p => ({...p, title: e.target.value}))}/></div>
                        <div><Label htmlFor="description">Descripción</Label><Textarea id="description" required value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))}/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Categoría</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v as any}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Fallo">Fallo</SelectItem><SelectItem value="Ajuste">Ajuste</SelectItem><SelectItem value="Modificación">Modificación</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select>
                            </div>
                            <div>
                                <Label htmlFor="priority">Prioridad</Label>
                                <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({...p, priority: v as any}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Baja">Baja</SelectItem><SelectItem value="Media">Media</SelectItem><SelectItem value="Alta">Alta</SelectItem></SelectContent></Select>
                            </div>
                        </div>
                        <div>
                            <Label>Adjuntar Archivos</Label>
                            <div className="flex items-center gap-2"><Input type="file" onChange={handleSoporteUpload} disabled={isUploading}/><>{isUploading && <Loader2 className="h-5 w-5 animate-spin"/>}</></div>
                             <div className="mt-2 space-y-2">
                                {(formData.attachments || []).map((url, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 border rounded-md text-sm">
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0">
                                            <Paperclip className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{decodeURIComponent(url.split('%2F').pop()?.split('?')[0] || '')}</span>
                                        </a>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSoporte(url)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button type="submit">Enviar Ticket</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Ticket Details/Management Dialog */}
            {selectedTicket && (
                <TicketDetailsDialog 
                    ticket={selectedTicket} 
                    isOpen={isDetailsOpen} 
                    onClose={() => setIsDetailsOpen(false)}
                    isSuperAdmin={user?.role === 'SuperAdmin'}
                    currentUser={user}
                />
            )}
        </AppLayout>
    );
}

// Separate component for details to manage its own state
function TicketDetailsDialog({ ticket, isOpen, onClose, isSuperAdmin, currentUser }: { ticket: Ticket, isOpen: boolean, onClose: () => void, isSuperAdmin: boolean, currentUser: any }) {
    const [currentStatus, setCurrentStatus] = useState(ticket.status);
    const [currentPriority, setCurrentPriority] = useState(ticket.priority);
    const [newComment, setNewComment] = useState("");
    const { toast } = useToast();
    const { fetchAllData } = useAuth();
    
    const handleUpdate = async () => {
        try {
            await updateTicket(ticket.id, { status: currentStatus, priority: currentPriority });
            toast({ title: 'Ticket actualizado' });
        } catch (error) {
            toast({ title: 'Error al actualizar', variant: 'destructive' });
        }
    };
    
    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;
        try {
            const comment: Omit<TicketComment, 'commentId'> = {
                userId: currentUser.id,
                userName: currentUser.name,
                createdAt: new Date(),
                text: newComment,
            };
            await addTicketComment(ticket.id, comment);
            setNewComment("");
            toast({ title: 'Comentario añadido' });
            fetchAllData(); // Refresh all data to get comments
        } catch (error) {
            toast({ title: 'Error al añadir comentario', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle del Ticket #{ticket.id.substring(0, 6)}</DialogTitle>
                    <DialogDescription>{ticket.title}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <DetailItem label="Usuario" value={ticket.userName} />
                        <DetailItem label="Email" value={ticket.userEmail} />
                        <DetailItem label="Fecha de Creación" value={format(ticket.createdAt, 'PPP p', { locale: es })} />
                    </div>
                     <div className="space-y-1">
                        <Label>Descripción</Label>
                        <p className="text-sm p-3 bg-muted/50 rounded-md whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                     {ticket.attachments && ticket.attachments.length > 0 && (
                        <div>
                            <Label>Archivos Adjuntos</Label>
                            <div className="space-y-2 mt-1">{ticket.attachments.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm p-2 border rounded-md hover:bg-muted/50"><Paperclip className="h-4 w-4"/><span>{decodeURIComponent(url.split('%2F').pop()?.split('?')[0] || '')}</span></a>)}</div>
                        </div>
                    )}
                    <Separator />

                    {/* Admin Management Section */}
                    {isSuperAdmin && (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <h3 className="font-semibold">Gestionar Ticket</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Estado</Label>
                                    <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Abierto">Abierto</SelectItem><SelectItem value="En Progreso">En Progreso</SelectItem><SelectItem value="Resuelto">Resuelto</SelectItem><SelectItem value="Cerrado">Cerrado</SelectItem></SelectContent></Select>
                                </div>
                                <div>
                                    <Label>Prioridad</Label>
                                    <Select value={currentPriority} onValueChange={(v) => setCurrentPriority(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Baja">Baja</SelectItem><SelectItem value="Media">Media</SelectItem><SelectItem value="Alta">Alta</SelectItem></SelectContent></Select>
                                </div>
                            </div>
                            <Button size="sm" onClick={handleUpdate}>Actualizar Estado/Prioridad</Button>
                        </div>
                    )}
                    
                    {/* Comments Section */}
                    <div className="space-y-4">
                         <h3 className="font-semibold">Comentarios</h3>
                         <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                             {ticket.comments?.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map(comment => (
                                <div key={comment.commentId} className="p-3 rounded-lg bg-muted/50">
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                        <span className="font-semibold">{comment.userName}</span>
                                        <span>{format(comment.createdAt, 'PPp', { locale: es })}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                                </div>
                             ))}
                             {ticket.comments?.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No hay comentarios aún.</p>}
                         </div>
                         <div className="space-y-2">
                             <Label htmlFor="new-comment">Añadir Comentario</Label>
                             <Textarea id="new-comment" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                             <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>Enviar Comentario</Button>
                         </div>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);
