// src/app/osteomuscular/page.tsx
'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { updatePveData, uploadFile } from '@/lib/data';
import type { PveRecord, PveData } from '@/lib/types';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Filter, MoreHorizontal, X, Paperclip, Trash2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const initialPveFormData: Partial<PveData> = {
    tipoCaso: '',
    tipoPatologia: '',
    nivelRiesgo: '',
    recomendacionesColaborador: '',
    seguimientoRecomendaciones: '',
    periodicidad: '',
    observaciones: '',
    soportes: [],
};

function formatDate(date: Date | null | string): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if(isNaN(d.getTime())) return 'N/A';
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('es-CO');
    } catch (e) {
        return 'N/A';
    }
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);

export default function OsteomuscularPvePage() {
    const { user, emos: allEmos, tenantId } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PveRecord | null>(null);
    const [formData, setFormData] = useState<Partial<PveData>>(initialPveFormData);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    // Filter states
    const [filterSearch, setFilterSearch] = useState('');
    const [filterCargo, setFilterCargo] = useState('');
    const [filterSede, setFilterSede] = useState('');
    const [filterNivelRiesgo, setFilterNivelRiesgo] = useState('');
    
    const filteredRecords = useMemo(() => {
        const userCostCenters = user?.costCenters || [];
        const canViewAll = userCostCenters.length === 0;

        return allEmos.filter(emo => {
            const searchLower = filterSearch.toLowerCase();
            const costCenterMatch = canViewAll || userCostCenters.includes(emo.sede);
            
            return (
                costCenterMatch &&
                emo.osteomuscularRecomendacion === 'X' &&
                (emo.nombreCompleto.toLowerCase().includes(searchLower) || emo.cedula.toLowerCase().includes(searchLower)) &&
                (filterCargo === '' || emo.cargo.toLowerCase().includes(filterCargo.toLowerCase())) &&
                (filterSede === '' || (emo.sede && emo.sede.toLowerCase().includes(filterSede.toLowerCase()))) &&
                (filterNivelRiesgo === '' || emo.nivelRiesgo === filterNivelRiesgo)
            );
        });
    }, [allEmos, filterSearch, filterCargo, filterSede, filterNivelRiesgo, user]);

    const clearFilters = () => {
        setFilterSearch('');
        setFilterCargo('');
        setFilterSede('');
        setFilterNivelRiesgo('');
    };
    
    const handleViewDetails = (record: PveRecord) => {
        setSelectedRecord(record);
        setIsDetailsOpen(true);
    };

    const handleOpenForm = (record: PveRecord) => {
        setSelectedRecord(record);
        setFormData({
            tipoCaso: record.tipoCaso || '',
            tipoPatologia: record.tipoPatologia || '',
            nivelRiesgo: record.nivelRiesgo || '',
            recomendacionesColaborador: record.recomendacionesColaborador || '',
            seguimientoRecomendaciones: record.seguimientoRecomendaciones || '',
            periodicidad: record.periodicidad || '',
            observaciones: record.observaciones || '',
            soportes: record.soportes || [],
        });
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecord || !tenantId) return;

        try {
            await updatePveData(selectedRecord.id, formData, tenantId);
            toast({ title: 'Registro PVE Actualizado', description: 'La información del programa de vigilancia ha sido guardada.' });
            setIsFormOpen(false);
            setSelectedRecord(null);
            // Consider if a full reload is needed or if state can be updated locally
            window.location.reload(); 
        } catch (error) {
            console.error("Error updating PVE data:", error);
            toast({ title: 'Error al Guardar', description: 'No se pudo actualizar el registro.', variant: 'destructive' });
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'pve-soportes/osteomuscular');
            setFormData(prev => ({ ...prev, soportes: [...(prev.soportes || []), downloadURL] }));
            toast({ title: 'Soporte cargado', description: 'El archivo se ha subido correctamente.' });
        } catch (error) {
            toast({ title: 'Error al subir', description: 'No se pudo cargar el archivo.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const removeSoporte = (urlToRemove: string) => {
        setFormData(prev => ({ ...prev, soportes: (prev.soportes || []).filter(url => url !== urlToRemove) }));
    };
    
    const pveCSVHeaders = [
        "employeeId", "cedula", "nombreCompleto", "cargo", "sede", "fechaExamen",
        "tipoCaso", "tipoPatologia", "nivelRiesgo", "periodicidad",
        "recomendacionesColaborador", "seguimientoRecomendaciones", "observaciones"
    ];

    const handleDownloadData = () => {
        if (filteredRecords.length === 0) {
            toast({ title: "No hay datos para exportar", description: "No hay registros en la tabla actual." });
            return;
        }

        const dataToExport = filteredRecords.map(record => {
            const recordData: { [key: string]: any } = {};
            pveCSVHeaders.forEach(header => {
                const value = record[header as keyof PveRecord];
                 if (value instanceof Date) {
                    recordData[header] = formatDate(value);
                } else {
                    recordData[header] = value || '';
                }
            });
            return recordData;
        });

        const csv = Papa.unparse(dataToExport, { delimiter: ";", header: true });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export_pve_osteomuscular.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout pageTitle="PVE Osteomuscular">
            <Card>
                <CardHeader>
                    <div className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>Gestión de PVE Osteomuscular</CardTitle>
                            <CardDescription>
                                Seguimiento de empleados incluidos en el programa de vigilancia osteomuscular.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadData}>
                                <Download className="h-4 w-4" />
                                Descargar Datos
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Collapsible className="space-y-4 mb-4">
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                <Filter className="h-4 w-4"/>
                                Filtrar Registros
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><Label htmlFor="filter-search">Nombre o Cédula</Label><Input id="filter-search" placeholder="Buscar..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} /></div>
                                    <div><Label htmlFor="filter-cargo">Cargo</Label><Input id="filter-cargo" placeholder="Filtrar por cargo..." value={filterCargo} onChange={(e) => setFilterCargo(e.target.value)} /></div>
                                    <div><Label htmlFor="filter-sede">Sede/Centro de Costo</Label><Input id="filter-sede" placeholder="Filtrar por sede..." value={filterSede} onChange={(e) => setFilterSede(e.target.value)} /></div>
                                    <div>
                                        <Label htmlFor="filter-nivel-riesgo">Nivel de Riesgo</Label>
                                        <Select value={filterNivelRiesgo} onValueChange={setFilterNivelRiesgo}>
                                            <SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="BAJO">BAJO</SelectItem>
                                                <SelectItem value="MEDIO">MEDIO</SelectItem>
                                                <SelectItem value="ALTO">ALTO</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                                        <X className="h-4 w-4" />
                                        Limpiar Filtros
                                    </Button>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    
                    <div className="border rounded-lg mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Identificación</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Fecha Examen</TableHead>
                                    <TableHead>Tipo de Caso</TableHead>
                                    <TableHead>Nivel de Riesgo</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.length > 0 ? filteredRecords.map(record => (
                                    <TableRow key={record.id} onClick={() => handleViewDetails(record)} className="cursor-pointer">
                                        <TableCell>{record.nombreCompleto}</TableCell>
                                        <TableCell>{record.cedula}</TableCell>
                                        <TableCell>{record.cargo}</TableCell>
                                        <TableCell>{formatDate(record.fechaExamen)}</TableCell>
                                        <TableCell>{record.tipoCaso || 'N/A'}</TableCell>
                                        <TableCell>{record.nivelRiesgo || 'N/A'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                  <MoreHorizontal className="h-4 w-4" />
                                                  <span className="sr-only">Toggle menu</span>
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleViewDetails(record)}>Ver Detalles</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenForm(record)}>Gestionar Seguimiento</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">No hay empleados en este programa.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedRecord && 
                    <PveDetailsDialog 
                        record={selectedRecord} 
                        onClose={() => setIsDetailsOpen(false)} 
                        onEdit={() => {
                            setIsDetailsOpen(false);
                            handleOpenForm(selectedRecord);
                        }}
                    />
                }
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Gestionar Seguimiento PVE Osteomuscular</DialogTitle>
                        {selectedRecord && <DialogDescription>Empleado: {selectedRecord.nombreCompleto}</DialogDescription>}
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><Label>Nombre Completo</Label><Input readOnly value={selectedRecord?.nombreCompleto || ''} /></div>
                            <div><Label>Identificación</Label><Input readOnly value={selectedRecord?.cedula || ''} /></div>
                            <div><Label>Cargo</Label><Input readOnly value={selectedRecord?.cargo || ''} /></div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 gap-4">
                             <div><Label htmlFor="tipoCaso">Tipo de Caso</Label><Input id="tipoCaso" value={formData.tipoCaso} onChange={handleInputChange} /></div>
                             <div><Label htmlFor="tipoPatologia">Tipo de Patología</Label><Input id="tipoPatologia" value={formData.tipoPatologia} onChange={handleInputChange} /></div>
                             <div>
                                <Label htmlFor="nivelRiesgo">Nivel del Riesgo</Label>
                                <Select onValueChange={(v) => handleSelectChange('nivelRiesgo', v)} value={formData.nivelRiesgo}>
                                    <SelectTrigger><SelectValue placeholder="Seleccione nivel"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BAJO">BAJO</SelectItem>
                                        <SelectItem value="MEDIO">MEDIO</SelectItem>
                                        <SelectItem value="ALTO">ALTO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div><Label htmlFor="periodicidad">Periodicidad</Label><Input id="periodicidad" value={formData.periodicidad} onChange={handleInputChange} /></div>
                             <div className="col-span-2"><Label htmlFor="recomendacionesColaborador">Recomendaciones</Label><Textarea id="recomendacionesColaborador" value={formData.recomendacionesColaborador} onChange={handleInputChange} /></div>
                             <div className="col-span-2"><Label htmlFor="seguimientoRecomendaciones">Seguimiento</Label><Textarea id="seguimientoRecomendaciones" value={formData.seguimientoRecomendaciones} onChange={handleInputChange} /></div>
                            <div className="col-span-2"><Label htmlFor="observaciones">Observaciones</Label><Textarea id="observaciones" value={formData.observaciones} onChange={handleInputChange} /></div>
                            <div className="col-span-2">
                                <Label>Soportes</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" onChange={handleSoporteUpload} disabled={isUploading} className="flex-grow"/>
                                    {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                                </div>
                                <div className="mt-2 space-y-2">
                                    {(formData.soportes || []).map((url, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Paperclip className="h-4 w-4" />Soporte {index + 1}</a>
                                            <Button variant="ghost" size="icon" onClick={() => removeSoporte(url)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-0 -mx-6 px-6">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar Seguimiento</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

const PveDetailsDialog = ({ record, onClose, onEdit }: { record: PveRecord, onClose: () => void, onEdit: () => void }) => {
    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Detalle de Seguimiento PVE</DialogTitle>
                <DialogDescription>Información del registro PVE para {record.nombreCompleto}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="space-y-4"><h3 className="font-semibold text-lg border-b pb-2">Información del Empleado</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Nombre Completo" value={record.nombreCompleto} />
                        <DetailItem label="Identificación" value={record.cedula} />
                        <DetailItem label="Cargo" value={record.cargo} />
                        <DetailItem label="Sede/Centro de Costo" value={record.sede} />
                    </div>
                </div>
                <Separator />
                <div className="space-y-4"><h3 className="font-semibold text-lg border-b pb-2">Datos del Seguimiento</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Tipo de Caso" value={record.tipoCaso} />
                        <DetailItem label="Tipo de Patología" value={record.tipoPatologia} />
                        <DetailItem label="Nivel del Riesgo" value={record.nivelRiesgo} />
                        <DetailItem label="Periodicidad" value={record.periodicidad} />
                        <div className="col-span-2"><DetailItem label="Recomendaciones" value={<p className="whitespace-pre-wrap">{record.recomendacionesColaborador}</p>} /></div>
                        <div className="col-span-2"><DetailItem label="Seguimiento" value={<p className="whitespace-pre-wrap">{record.seguimientoRecomendaciones}</p>} /></div>
                        <div className="col-span-2"><DetailItem label="Observaciones" value={<p className="whitespace-pre-wrap">{record.observaciones}</p>} /></div>
                        <div className="col-span-2">
                            <h4 className="text-sm font-semibold">Soportes</h4>
                            {(record.soportes && record.soportes.length > 0) ? (
                                <div className="flex flex-col gap-2 mt-1">
                                    {record.soportes.map((url, index) => (
                                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 border rounded-md"><Paperclip className="h-4 w-4" />Soporte {index + 1}</a>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground">No hay soportes adjuntos.</p>}
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
                <Button type="button" onClick={onEdit}>Editar</Button>
            </DialogFooter>
        </DialogContent>
    )
}
