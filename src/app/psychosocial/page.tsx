'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { updatePveData, addVitalEvent, updateVitalEvent, uploadFile, addGerenciaReport, updateGerenciaReport, addSstReport, updateSstReport, addRhReport, updateRhReport, addCclReport, updateCclReport } from '@/lib/data';
import type { PveRecord, PveData, VitalEvent, GerenciaReport, SstReport, RhReport, CclReport } from '@/lib/types';
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
import { MoreHorizontal, Download, Filter, X, PlusCircle, Paperclip, Loader2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cie10Codes } from '@/lib/cie10-data';
import { Combobox } from '@/components/ui/combobox';


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

function dateToInputFormat(date: Date | null | string): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    } catch (e) { return ''; }
}


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

const initialVitalEventState: Omit<VitalEvent, 'id' | 'tenantId'> = {
  employeeId: '',
  nombreCompleto: '',
  identificacion: '',
  fechaEvento: null,
  tipoEvento: '',
  descripcion: '',
  seguimiento: '',
  estado: 'Abierto',
  soportes: [],
};

const initialGerenciaReportState: Omit<GerenciaReport, 'id' | 'tenantId'> = {
    fecha: new Date(),
    mes: '',
    identificacion: '',
    fechaAccidente: null,
    totalDiasIncapacidad: 0,
    horasHombreTrabajado: 0,
    indiceSeveridad: 0,
    codigoCie10: '',
    descripcionAl: '',
    riesgoGenerador: '',
    parteCuerpoAfectada: '',
    tipoLesion: '',
    sitio: '',
    condicionInsegura: '',
    actoInseguro: '',
    factoresBasicosLaborales: '',
    factoresBasicosPersonales: '',
};

const initialSstReportState: Omit<SstReport, 'id' | 'tenantId'> = {
    fecha: new Date(),
    mes: '',
    identificacion: '',
    origen: '',
    dias: 0,
    fechaInicioReal: null,
    fechaFinReal: null,
    codigoCie10: '',
};

const initialRhReportState: Omit<RhReport, 'id' | 'tenantId'> = {
    fecha: new Date(),
    mes: '',
    identificacion: '',
    motivoRetiro: '',
};

const initialCclReportState: Omit<CclReport, 'id' | 'tenantId'> = {
    fecha: new Date(),
    fechaReporte: null,
    identificacion: '',
    nModalidades: 0,
    nombreModalidades: '',
    estadoProceso: '',
    diagnosticoEnfermedad: '',
    entidadEmiteDiagnostico: '',
    recomendacionesPve: '',
};


export default function PsychosocialPage() {
    const { employees, emos, vitalEvents, gerenciaReports, sstReports, rhReports, cclReports, tenantId, loading } = useAuth();
    const [pveIsFormOpen, setPveIsFormOpen] = useState(false);
    const [selectedPveRecord, setSelectedPveRecord] = useState<PveRecord | null>(null);
    const [pveFormData, setPveFormData] = useState<Partial<PveData>>(initialPveFormData);
    
    const [vitalEventIsFormOpen, setVitalEventIsFormOpen] = useState(false);
    const [selectedVitalEventId, setSelectedVitalEventId] = useState<string | null>(null);
    const [vitalEventFormData, setVitalEventFormData] = useState(initialVitalEventState);

    const [gerenciaReportIsFormOpen, setGerenciaReportIsFormOpen] = useState(false);
    const [selectedGerenciaReportId, setSelectedGerenciaReportId] = useState<string | null>(null);
    const [gerenciaReportFormData, setGerenciaReportFormData] = useState(initialGerenciaReportState);
    
    const [sstReportIsFormOpen, setSstReportIsFormOpen] = useState(false);
    const [selectedSstReportId, setSelectedSstReportId] = useState<string | null>(null);
    const [sstReportFormData, setSstReportFormData] = useState(initialSstReportState);
    
    const [rhReportIsFormOpen, setRhReportIsFormOpen] = useState(false);
    const [selectedRhReportId, setSelectedRhReportId] = useState<string | null>(null);
    const [rhReportFormData, setRhReportFormData] = useState(initialRhReportState);
    
    const [cclReportIsFormOpen, setCclReportIsFormOpen] = useState(false);
    const [selectedCclReportId, setSelectedCclReportId] = useState<string | null>(null);
    const [cclReportFormData, setCclReportFormData] = useState(initialCclReportState);

    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    
    // FILTERS
    const [pveFilters, setPveFilters] = useState({ search: '', tipoCaso: '', nivelRiesgo: '' });
    const [vitalEventFilters, setVitalEventFilters] = useState({ search: '', tipoEvento: '', estado: '' });
    const [gerenciaReportFilters, setGerenciaReportFilters] = useState({ identificacion: '' });
    const [sstReportFilters, setSstReportFilters] = useState({ identificacion: '' });
    const [rhReportFilters, setRhReportFilters] = useState({ identificacion: '' });
    const [cclReportFilters, setCclReportFilters] = useState({ identificacion: '' });


    const filteredPsychosocialRecords = useMemo(() => {
        if (!emos) return [];
        const searchLower = pveFilters.search.toLowerCase();
        return emos.filter(emo => 
            emo.psicosocial === 'X' &&
            (pveFilters.search === '' || emo.nombreCompleto.toLowerCase().includes(searchLower) || emo.cedula.toLowerCase().includes(searchLower)) &&
            (pveFilters.tipoCaso === '' || emo.tipoCaso === pveFilters.tipoCaso) &&
            (pveFilters.nivelRiesgo === '' || emo.nivelRiesgo === pveFilters.nivelRiesgo)
        );
    }, [emos, pveFilters]);
    
    const filteredVitalEvents = useMemo(() => {
        if (!vitalEvents) return [];
        const searchLower = vitalEventFilters.search.toLowerCase();
        return vitalEvents.filter(event => 
            (vitalEventFilters.search === '' || event.nombreCompleto.toLowerCase().includes(searchLower) || event.identificacion.toLowerCase().includes(searchLower)) &&
            (vitalEventFilters.tipoEvento === '' || event.tipoEvento.toLowerCase().includes(vitalEventFilters.tipoEvento.toLowerCase())) &&
            (vitalEventFilters.estado === '' || event.estado === vitalEventFilters.estado)
        );
    }, [vitalEvents, vitalEventFilters]);
    
    const filteredGerenciaReports = useMemo(() => {
        if (!gerenciaReports) return [];
        return gerenciaReports.filter(report => report.identificacion.toLowerCase().includes(gerenciaReportFilters.identificacion.toLowerCase()));
    }, [gerenciaReports, gerenciaReportFilters]);
    
    const filteredSstReports = useMemo(() => {
        if (!sstReports) return [];
        return sstReports.filter(report => report.identificacion.toLowerCase().includes(sstReportFilters.identificacion.toLowerCase()));
    }, [sstReports, sstReportFilters]);

    const filteredRhReports = useMemo(() => {
        if (!rhReports) return [];
        return rhReports.filter(report => report.identificacion.toLowerCase().includes(rhReportFilters.identificacion.toLowerCase()));
    }, [rhReports, rhReportFilters]);
    
    const filteredCclReports = useMemo(() => {
        if (!cclReports) return [];
        return cclReports.filter(report => report.identificacion.toLowerCase().includes(cclReportFilters.identificacion.toLowerCase()));
    }, [cclReports, cclReportFilters]);


    
    const handleOpenPveForm = (record: PveRecord) => {
        setSelectedPveRecord(record);
        setPveFormData({
            tipoCaso: record.tipoCaso || '',
            tipoPatologia: record.tipoPatologia || '',
            nivelRiesgo: record.nivelRiesgo || '',
            recomendacionesColaborador: record.recomendacionesColaborador || '',
            seguimientoRecomendaciones: record.seguimientoRecomendaciones || '',
            periodicidad: record.periodicidad || '',
            observaciones: record.observaciones || '',
            soportes: record.soportes || [],
        });
        setPveIsFormOpen(true);
    };

    const handleSavePve = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPveRecord || !tenantId) return;

        try {
            await updatePveData(selectedPveRecord.id, pveFormData, tenantId);
            toast({ title: 'Seguimiento Psicosocial Actualizado' });
            setPveIsFormOpen(false);
            setSelectedPveRecord(null);
            window.location.reload();
        } catch (error) {
            toast({ title: 'Error al Guardar', variant: 'destructive' });
        }
    };
    
    const handleOpenVitalEventForm = (event: VitalEvent | null = null) => {
        if (event) {
            setSelectedVitalEventId(event.id);
            setVitalEventFormData(event);
        } else {
            setSelectedVitalEventId(null);
            setVitalEventFormData(initialVitalEventState);
        }
        setVitalEventIsFormOpen(true);
    };

    const handleSelectEmployeeForVitalEvent = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
            setVitalEventFormData(prev => ({
                ...prev,
                employeeId: employee.id,
                nombreCompleto: employee.fullName,
                identificacion: employee.identification,
            }));
        }
    };
    
    const handleSaveVitalEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vitalEventFormData.employeeId || !tenantId) {
            toast({ title: 'Error', description: 'Debe seleccionar un empleado.', variant: 'destructive' });
            return;
        }

        try {
            if (selectedVitalEventId) {
                await updateVitalEvent(selectedVitalEventId, vitalEventFormData, tenantId);
                toast({ title: 'Evento Vital Actualizado' });
            } else {
                await addVitalEvent(vitalEventFormData, tenantId);
                toast({ title: 'Evento Vital Registrado' });
            }
            setVitalEventIsFormOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: 'Error al Guardar', variant: 'destructive' });
        }
    };

    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'vital-events-soportes');
            setVitalEventFormData(prev => ({ ...prev, soportes: [...(prev.soportes || []), downloadURL] }));
            toast({ title: 'Soporte cargado', description: 'El archivo se ha subido correctamente.' });
        } catch (error) {
            toast({ title: 'Error al subir', description: 'No se pudo cargar el archivo.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const removeSoporte = (urlToRemove: string) => {
        setVitalEventFormData(prev => ({ ...prev, soportes: (prev.soportes || []).filter(url => url !== urlToRemove) }));
    };

    const handleOpenGerenciaReportForm = (report: GerenciaReport | null = null) => {
        if(report) {
            setSelectedGerenciaReportId(report.id);
            setGerenciaReportFormData(report);
        } else {
            setSelectedGerenciaReportId(null);
            setGerenciaReportFormData(initialGerenciaReportState);
        }
        setGerenciaReportIsFormOpen(true);
    };

    const handleSaveGerenciaReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!tenantId) return;

        try {
            if(selectedGerenciaReportId) {
                await updateGerenciaReport(selectedGerenciaReportId, gerenciaReportFormData, tenantId);
                toast({ title: "Reporte de Gerencia Actualizado" });
            } else {
                await addGerenciaReport(gerenciaReportFormData, tenantId);
                toast({ title: "Reporte de Gerencia Guardado" });
            }
            setGerenciaReportIsFormOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: "Error al Guardar", variant: "destructive"});
        }
    };
    
    const handleOpenSstReportForm = (report: SstReport | null = null) => {
        if(report) {
            setSelectedSstReportId(report.id);
            setSstReportFormData(report);
        } else {
            setSelectedSstReportId(null);
            setSstReportFormData(initialSstReportState);
        }
        setSstReportIsFormOpen(true);
    };

    const handleSaveSstReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!tenantId) return;

        try {
            if(selectedSstReportId) {
                await updateSstReport(selectedSstReportId, sstReportFormData, tenantId);
                toast({ title: "Reporte SST Actualizado" });
            } else {
                await addSstReport(sstReportFormData, tenantId);
                toast({ title: "Reporte SST Guardado" });
            }
            setSstReportIsFormOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: "Error al Guardar", variant: "destructive"});
        }
    };
    
    const handleOpenRhReportForm = (report: RhReport | null = null) => {
        if (report) {
            setSelectedRhReportId(report.id);
            setRhReportFormData(report);
        } else {
            setSelectedRhReportId(null);
            setRhReportFormData(initialRhReportState);
        }
        setRhReportIsFormOpen(true);
    };
    
    const handleSaveRhReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        try {
            if (selectedRhReportId) {
                await updateRhReport(selectedRhReportId, rhReportFormData, tenantId);
                toast({ title: "Reporte de RH Actualizado" });
            } else {
                await addRhReport(rhReportFormData, tenantId);
                toast({ title: "Reporte de RH Guardado" });
            }
            setRhReportIsFormOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: "Error al Guardar", variant: "destructive" });
        }
    };
    
    const handleOpenCclReportForm = (report: CclReport | null = null) => {
        if (report) {
            setSelectedCclReportId(report.id);
            setCclReportFormData(report);
        } else {
            setSelectedCclReportId(null);
            setCclReportFormData(initialCclReportState);
        }
        setCclReportIsFormOpen(true);
    };
    
    const handleSaveCclReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        try {
            if (selectedCclReportId) {
                await updateCclReport(selectedCclReportId, cclReportFormData, tenantId);
                toast({ title: "Reporte CCL Actualizado" });
            } else {
                await addCclReport(cclReportFormData, tenantId);
                toast({ title: "Reporte CCL Guardado" });
            }
            setCclReportIsFormOpen(false);
            window.location.reload();
        } catch (error) {
            toast({ title: "Error al Guardar", variant: "destructive" });
        }
    };


    return (
        <AppLayout pageTitle="PVE Psicosocial">
             <Tabs defaultValue="pve">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="pve">Empleados en PVE</TabsTrigger>
                    <TabsTrigger value="vital-events">Eventos Vitales</TabsTrigger>
                    <TabsTrigger value="gerencia">Reporte Gerencia</TabsTrigger>
                    <TabsTrigger value="sst">Reporte SST</TabsTrigger>
                    <TabsTrigger value="rh">Reporte RH</TabsTrigger>
                    <TabsTrigger value="ccl">Reportes CCL</TabsTrigger>
                </TabsList>

                <TabsContent value="pve" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Empleados en PVE Psicosocial</CardTitle>
                            <CardDescription>Seguimiento de empleados incluidos en el programa de vigilancia psicosocial.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Registros</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div><Label>Nombre o ID</Label><Input value={pveFilters.search} onChange={(e) => setPveFilters(f => ({...f, search: e.target.value}))} /></div>
                                            <div><Label>Tipo de Caso</Label><Input value={pveFilters.tipoCaso} onChange={(e) => setPveFilters(f => ({...f, tipoCaso: e.target.value}))} /></div>
                                            <div>
                                                <Label>Nivel de Riesgo</Label>
                                                <Select value={pveFilters.nivelRiesgo} onValueChange={v => setPveFilters(f => ({...f, nivelRiesgo: v}))}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                                    <SelectContent><SelectItem value="BAJO">BAJO</SelectItem><SelectItem value="MEDIO">MEDIO</SelectItem><SelectItem value="ALTO">ALTO</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setPveFilters({ search: '', tipoCaso: '', nivelRiesgo: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar Filtros</Button></div>
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
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                     <TableBody>
                                        {filteredPsychosocialRecords.map(record => (
                                            <TableRow key={record.id}>
                                                <TableCell>{record.nombreCompleto}</TableCell>
                                                <TableCell>{record.cedula}</TableCell>
                                                <TableCell>{record.cargo}</TableCell>
                                                <TableCell>{formatDate(record.fechaExamen)}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenPveForm(record)}>Gestionar Seguimiento</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vital-events" className="mt-4">
                     <Card>
                         <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Registro de Eventos Vitales</CardTitle>
                                    <CardDescription>Documentar y seguir eventos importantes que puedan afectar el bienestar psicosocial del empleado.</CardDescription>
                                </div>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenVitalEventForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Evento Vital
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Eventos</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            <div><Label>Nombre o ID</Label><Input value={vitalEventFilters.search} onChange={(e) => setVitalEventFilters(f => ({...f, search: e.target.value}))} /></div>
                                            <div><Label>Tipo de Evento</Label><Input value={vitalEventFilters.tipoEvento} onChange={(e) => setVitalEventFilters(f => ({...f, tipoEvento: e.target.value}))} /></div>
                                            <div>
                                                <Label>Estado</Label>
                                                <Select value={vitalEventFilters.estado} onValueChange={v => setVitalEventFilters(f => ({...f, estado: v}))}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                                    <SelectContent><SelectItem value="Abierto">Abierto</SelectItem><SelectItem value="En Seguimiento">En Seguimiento</SelectItem><SelectItem value="Cerrado">Cerrado</SelectItem></SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setVitalEventFilters({ search: '', tipoEvento: '', estado: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar Filtros</Button></div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                             <div className="border rounded-lg mt-4">
                                 <Table>
                                     <TableHeader>
                                        <TableRow>
                                            <TableHead>Empleado</TableHead>
                                            <TableHead>Fecha del Evento</TableHead>
                                            <TableHead>Tipo de Evento</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredVitalEvents.map(event => (
                                            <TableRow key={event.id}>
                                                <TableCell>{event.nombreCompleto}</TableCell>
                                                <TableCell>{formatDate(event.fechaEvento)}</TableCell>
                                                <TableCell>{event.tipoEvento}</TableCell>
                                                <TableCell>{event.estado}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenVitalEventForm(event)}>Editar / Ver Detalles</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                 </Table>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="gerencia" className="mt-4">
                     <Card>
                         <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Reporte Area de Gerencia</CardTitle>
                                    <CardDescription>Seguimiento y análisis de datos para la gerencia.</CardDescription>
                                </div>
                                 <Button size="sm" className="gap-1" onClick={() => handleOpenGerenciaReportForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Reporte
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Reportes</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div><Label>Identificación</Label><Input value={gerenciaReportFilters.identificacion} onChange={(e) => setGerenciaReportFilters({ identificacion: e.target.value })} /></div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setGerenciaReportFilters({ identificacion: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar</Button></div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                           <div className="border rounded-lg mt-4">
                                <Table>
                                     <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Identificación</TableHead>
                                            <TableHead>Días Incapacidad</TableHead>
                                            <TableHead>IS</TableHead>
                                            <TableHead>Riesgo Generador</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGerenciaReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell>{formatDate(report.fecha)}</TableCell>
                                                <TableCell>{report.identificacion}</TableCell>
                                                <TableCell>{report.totalDiasIncapacidad}</TableCell>
                                                <TableCell>{report.indiceSeveridad}</TableCell>
                                                <TableCell>{report.riesgoGenerador}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenGerenciaReportForm(report)}>Editar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sst" className="mt-4">
                     <Card>
                         <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Reporte Area SST</CardTitle>
                                    <CardDescription>Seguimiento y análisis de datos para SST.</CardDescription>
                                </div>
                                 <Button size="sm" className="gap-1" onClick={() => handleOpenSstReportForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Reporte
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Reportes</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div><Label>Identificación</Label><Input value={sstReportFilters.identificacion} onChange={(e) => setSstReportFilters({ identificacion: e.target.value })} /></div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setSstReportFilters({ identificacion: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar</Button></div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                           <div className="border rounded-lg mt-4">
                                <Table>
                                     <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Identificación</TableHead>
                                            <TableHead>Origen</TableHead>
                                            <TableHead>Días</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSstReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell>{formatDate(report.fecha)}</TableCell>
                                                <TableCell>{report.identificacion}</TableCell>
                                                <TableCell>{report.origen}</TableCell>
                                                <TableCell>{report.dias}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenSstReportForm(report)}>Editar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="rh" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Reporte de Retiros RH</CardTitle>
                                    <CardDescription>Seguimiento de los motivos de retiro de personal.</CardDescription>
                                </div>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenRhReportForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Reporte RH
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Reportes</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div><Label>Identificación</Label><Input value={rhReportFilters.identificacion} onChange={(e) => setRhReportFilters({ identificacion: e.target.value })} /></div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setRhReportFilters({ identificacion: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar</Button></div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                            <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Identificación</TableHead>
                                            <TableHead>Motivo de Retiro</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRhReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell>{formatDate(report.fecha)}</TableCell>
                                                <TableCell>{report.identificacion}</TableCell>
                                                <TableCell>{report.motivoRetiro}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenRhReportForm(report)}>Editar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ccl" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Reportes Presidente CCL</CardTitle>
                                    <CardDescription>Seguimiento de casos relacionados con el Comité de Convivencia Laboral.</CardDescription>
                                </div>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenCclReportForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Reporte CCL
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Collapsible className="space-y-4 mb-4">
                                <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Reportes</Button></CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                        <div><Label>Identificación</Label><Input value={cclReportFilters.identificacion} onChange={(e) => setCclReportFilters({ identificacion: e.target.value })} /></div>
                                        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setCclReportFilters({ identificacion: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar</Button></div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                            <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha Reporte</TableHead>
                                            <TableHead>Identificación</TableHead>
                                            <TableHead>Estado del Proceso</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCclReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell>{formatDate(report.fechaReporte)}</TableCell>
                                                <TableCell>{report.identificacion}</TableCell>
                                                <TableCell>{report.estadoProceso}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleOpenCclReportForm(report)}>Editar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            

            <Dialog open={pveIsFormOpen} onOpenChange={setPveIsFormOpen}>
                 <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Gestionar Seguimiento Psicosocial</DialogTitle>
                        {selectedPveRecord && <DialogDescription>Empleado: {selectedPveRecord.nombreCompleto}</DialogDescription>}
                    </DialogHeader>
                     <form onSubmit={handleSavePve} className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Tipo de Caso</Label><Input id="tipoCaso" value={pveFormData.tipoCaso} onChange={(e) => setPveFormData({...pveFormData, tipoCaso: e.target.value})} /></div>
                            <div><Label>Tipo de Patología</Label><Input id="tipoPatologia" value={pveFormData.tipoPatologia} onChange={(e) => setPveFormData({...pveFormData, tipoPatologia: e.target.value})} /></div>
                            <div>
                                <Label>Nivel del Riesgo</Label>
                                <Select onValueChange={(v) => setPveFormData({...pveFormData, nivelRiesgo: v})} value={pveFormData.nivelRiesgo}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BAJO">BAJO</SelectItem>
                                        <SelectItem value="MEDIO">MEDIO</SelectItem>
                                        <SelectItem value="ALTO">ALTO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label>Periodicidad</Label><Input id="periodicidad" value={pveFormData.periodicidad} onChange={(e) => setPveFormData({...pveFormData, periodicidad: e.target.value})} /></div>
                            <div className="col-span-2"><Label>Recomendaciones</Label><Textarea id="recomendacionesColaborador" value={pveFormData.recomendacionesColaborador} onChange={(e) => setPveFormData({...pveFormData, recomendacionesColaborador: e.target.value})} /></div>
                            <div className="col-span-2"><Label>Seguimiento</Label><Textarea id="seguimientoRecomendaciones" value={pveFormData.seguimientoRecomendaciones} onChange={(e) => setPveFormData({...pveFormData, seguimientoRecomendaciones: e.target.value})} /></div>
                            <div className="col-span-2"><Label>Observaciones</Label><Textarea id="observaciones" value={pveFormData.observaciones} onChange={(e) => setPveFormData({...pveFormData, observaciones: e.target.value})} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setPveIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar Seguimiento</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            <Dialog open={vitalEventIsFormOpen} onOpenChange={setVitalEventIsFormOpen}>
                 <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{selectedVitalEventId ? 'Editar Evento Vital' : 'Registrar Nuevo Evento Vital'}</DialogTitle>
                        <DialogDescription>Documente un evento significativo para un empleado.</DialogDescription>
                    </DialogHeader>
                     <form onSubmit={handleSaveVitalEvent} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <div className="space-y-2">
                            <Label>Empleado</Label>
                            <Select onValueChange={handleSelectEmployeeForVitalEvent} value={vitalEventFormData.employeeId} disabled={!!selectedVitalEventId}>
                                <SelectTrigger><SelectValue placeholder="Seleccione un empleado"/></SelectTrigger>
                                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><Label>Identificación</Label><Input value={vitalEventFormData.identificacion} readOnly/></div>
                             <div><Label>Fecha del Evento</Label><Input type="date" value={dateToInputFormat(vitalEventFormData.fechaEvento)} onChange={e => setVitalEventFormData(p => ({...p, fechaEvento: new Date(e.target.value)}))} /></div>
                        </div>
                         <div className="space-y-2">
                             <Label>Tipo de Evento</Label>
                             <Input value={vitalEventFormData.tipoEvento} onChange={e => setVitalEventFormData(p => ({...p, tipoEvento: e.target.value}))} placeholder="Ej: Fallecimiento familiar, Nacimiento, Matrimonio..."/>
                         </div>
                         <div className="space-y-2">
                             <Label>Descripción</Label>
                             <Textarea value={vitalEventFormData.descripcion} onChange={e => setVitalEventFormData(p => ({...p, descripcion: e.target.value}))}/>
                         </div>
                          <div className="space-y-2">
                             <Label>Seguimiento Realizado</Label>
                             <Textarea value={vitalEventFormData.seguimiento} onChange={e => setVitalEventFormData(p => ({...p, seguimiento: e.target.value}))}/>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Estado</Label>
                                <Select value={vitalEventFormData.estado} onValueChange={v => setVitalEventFormData(p => ({...p, estado: v as any}))}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Abierto">Abierto</SelectItem>
                                        <SelectItem value="En Seguimiento">En Seguimiento</SelectItem>
                                        <SelectItem value="Cerrado">Cerrado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                         <div>
                            <Label>Soportes</Label>
                            <div className="flex items-center gap-2">
                                <Input type="file" onChange={handleSoporteUpload} disabled={isUploading} className="flex-grow"/>
                                {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                            </div>
                            <div className="mt-2 space-y-2">
                                {(vitalEventFormData.soportes || []).map((url, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                            <Paperclip className="h-4 w-4" />
                                            Soporte {index + 1}
                                        </a>
                                        <Button variant="ghost" size="icon" onClick={() => removeSoporte(url)}>
                                            <Trash2 className="h-4 w-4 text-red-500"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setVitalEventIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{selectedVitalEventId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Dialog open={gerenciaReportIsFormOpen} onOpenChange={setGerenciaReportIsFormOpen}>
                 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedGerenciaReportId ? 'Editar Reporte de Gerencia' : 'Nuevo Reporte de Gerencia'}</DialogTitle>
                        <DialogDescription>Complete la información para el reporte de gerencia.</DialogDescription>
                    </DialogHeader>
                     <form onSubmit={handleSaveGerenciaReport} className="space-y-4 py-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div><Label>Fecha</Label><Input type="date" value={dateToInputFormat(gerenciaReportFormData.fecha)} onChange={e => setGerenciaReportFormData(p => ({ ...p, fecha: new Date(e.target.value)}))} /></div>
                            <div><Label>MES</Label><Input value={gerenciaReportFormData.mes} onChange={e => setGerenciaReportFormData(p => ({ ...p, mes: e.target.value}))} /></div>
                            <div><Label>No DE IDENTIFICACIÓN</Label><Input value={gerenciaReportFormData.identificacion} onChange={e => setGerenciaReportFormData(p => ({ ...p, identificacion: e.target.value}))} /></div>
                            <div><Label>FECHA ACCIDENTE</Label><Input type="date" value={dateToInputFormat(gerenciaReportFormData.fechaAccidente)} onChange={e => setGerenciaReportFormData(p => ({ ...p, fechaAccidente: new Date(e.target.value)}))} /></div>
                            <div><Label>TOTAL DÍAS INCAPACIDAD</Label><Input type="number" value={gerenciaReportFormData.totalDiasIncapacidad} onChange={e => setGerenciaReportFormData(p => ({ ...p, totalDiasIncapacidad: Number(e.target.value)}))} /></div>
                            <div><Label>HORAS HOMBRE TRABAJADO HHT</Label><Input type="number" value={gerenciaReportFormData.horasHombreTrabajado} onChange={e => setGerenciaReportFormData(p => ({ ...p, horasHombreTrabajado: Number(e.target.value)}))} /></div>
                            <div><Label>ÍNDICE DE SEVERIDAD IS</Label><Input type="number" value={gerenciaReportFormData.indiceSeveridad} onChange={e => setGerenciaReportFormData(p => ({ ...p, indiceSeveridad: Number(e.target.value)}))} /></div>
                            <div><Label>CÓDIGO CIE 10 / Diagnósticos</Label><Input value={gerenciaReportFormData.codigoCie10} onChange={e => setGerenciaReportFormData(p => ({ ...p, codigoCie10: e.target.value}))} /></div>
                            <div className="col-span-2"><Label>DESCRIPCIÓN AL</Label><Input value={gerenciaReportFormData.descripcionAl} onChange={e => setGerenciaReportFormData(p => ({ ...p, descripcionAl: e.target.value}))} /></div>
                            <div className="col-span-2"><Label>RIESGO GENERADOR</Label><Input value={gerenciaReportFormData.riesgoGenerador} onChange={e => setGerenciaReportFormData(p => ({ ...p, riesgoGenerador: e.target.value}))} /></div>
                            <div><Label>PARTE DEL CUERPO AFECTADA</Label><Input value={gerenciaReportFormData.parteCuerpoAfectada} onChange={e => setGerenciaReportFormData(p => ({ ...p, parteCuerpoAfectada: e.target.value}))} /></div>
                            <div><Label>TIPO DE LESIÓN</Label><Input value={gerenciaReportFormData.tipoLesion} onChange={e => setGerenciaReportFormData(p => ({ ...p, tipoLesion: e.target.value}))} /></div>
                            <div><Label>SITIO</Label><Input value={gerenciaReportFormData.sitio} onChange={e => setGerenciaReportFormData(p => ({ ...p, sitio: e.target.value}))} /></div>
                            <div><Label>CONDICIÓN INSEGURA</Label><Input value={gerenciaReportFormData.condicionInsegura} onChange={e => setGerenciaReportFormData(p => ({ ...p, condicionInsegura: e.target.value}))} /></div>
                            <div><Label>ACTO INSEGURO</Label><Input value={gerenciaReportFormData.actoInseguro} onChange={e => setGerenciaReportFormData(p => ({ ...p, actoInseguro: e.target.value}))} /></div>
                            <div className="col-span-2"><Label>FACTORES BÁSICOS LABORALES</Label><Textarea value={gerenciaReportFormData.factoresBasicosLaborales} onChange={e => setGerenciaReportFormData(p => ({ ...p, factoresBasicosLaborales: e.target.value}))} /></div>
                            <div className="col-span-2"><Label>FACTORES BÁSICOS PERSONALES</Label><Textarea value={gerenciaReportFormData.factoresBasicosPersonales} onChange={e => setGerenciaReportFormData(p => ({ ...p, factoresBasicosPersonales: e.target.value}))} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setGerenciaReportIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{selectedGerenciaReportId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={sstReportIsFormOpen} onOpenChange={setSstReportIsFormOpen}>
                 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSstReportId ? 'Editar Reporte SST' : 'Nuevo Reporte SST'}</DialogTitle>
                        <DialogDescription>Complete la información para el reporte de SST.</DialogDescription>
                    </DialogHeader>
                     <form onSubmit={handleSaveSstReport} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Fecha</Label><Input type="date" value={dateToInputFormat(sstReportFormData.fecha)} onChange={e => setSstReportFormData(p => ({ ...p, fecha: new Date(e.target.value)}))} /></div>
                            <div><Label>MES</Label><Input value={sstReportFormData.mes} onChange={e => setSstReportFormData(p => ({ ...p, mes: e.target.value}))} /></div>
                            <div><Label>No DE IDENTIFICACIÓN</Label><Input value={sstReportFormData.identificacion} onChange={e => setSstReportFormData(p => ({ ...p, identificacion: e.target.value}))} /></div>
                            <div><Label>ORIGEN</Label><Input value={sstReportFormData.origen} onChange={e => setSstReportFormData(p => ({ ...p, origen: e.target.value}))} /></div>
                            <div><Label>DÍAS</Label><Input type="number" value={sstReportFormData.dias} onChange={e => setSstReportFormData(p => ({ ...p, dias: Number(e.target.value)}))} /></div>
                            <div><Label>FECHA INICIO REAL</Label><Input type="date" value={dateToInputFormat(sstReportFormData.fechaInicioReal)} onChange={e => setSstReportFormData(p => ({ ...p, fechaInicioReal: new Date(e.target.value)}))} /></div>
                            <div><Label>FECHA FIN REAL</Label><Input type="date" value={dateToInputFormat(sstReportFormData.fechaFinReal)} onChange={e => setSstReportFormData(p => ({ ...p, fechaFinReal: new Date(e.target.value)}))} /></div>
                            <div className="col-span-2">
                                <Label>CIE10 / Diagnóticos</Label>
                                <Combobox 
                                    items={cie10Codes} 
                                    value={sstReportFormData.codigoCie10} 
                                    onChange={v => setSstReportFormData(p => ({...p, codigoCie10: v}))}
                                    placeholder="Buscar código CIE-10"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setSstReportIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{selectedSstReportId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Dialog open={rhReportIsFormOpen} onOpenChange={setRhReportIsFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedRhReportId ? 'Editar Reporte RH' : 'Nuevo Reporte RH'}</DialogTitle>
                        <DialogDescription>Complete la información para el reporte de retiros.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveRhReport} className="space-y-4 py-4">
                        <div><Label>Fecha</Label><Input type="date" value={dateToInputFormat(rhReportFormData.fecha)} onChange={e => setRhReportFormData(p => ({ ...p, fecha: new Date(e.target.value) }))} /></div>
                        <div><Label>MES</Label><Input value={rhReportFormData.mes} onChange={e => setRhReportFormData(p => ({ ...p, mes: e.target.value }))} /></div>
                        <div><Label>No DE IDENTIFICACIÓN</Label><Input value={rhReportFormData.identificacion} onChange={e => setRhReportFormData(p => ({ ...p, identificacion: e.target.value }))} /></div>
                        <div><Label>MOTIVO DE RETIRÓ</Label><Textarea value={rhReportFormData.motivoRetiro} onChange={e => setRhReportFormData(p => ({ ...p, motivoRetiro: e.target.value }))} /></div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setRhReportIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{selectedRhReportId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
             <Dialog open={cclReportIsFormOpen} onOpenChange={setCclReportIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedCclReportId ? 'Editar Reporte CCL' : 'Nuevo Reporte CCL'}</DialogTitle>
                        <DialogDescription>Complete la información para el reporte del Comité de Convivencia Laboral.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCclReport} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Fecha</Label><Input type="date" value={dateToInputFormat(cclReportFormData.fecha)} onChange={e => setCclReportFormData(p => ({ ...p, fecha: new Date(e.target.value) }))} /></div>
                            <div><Label>Fecha del Reporte</Label><Input type="date" value={dateToInputFormat(cclReportFormData.fechaReporte)} onChange={e => setCclReportFormData(p => ({ ...p, fechaReporte: new Date(e.target.value) }))} /></div>
                            <div className="col-span-2"><Label>No DE IDENTIFICACIÓN</Label><Input value={cclReportFormData.identificacion} onChange={e => setCclReportFormData(p => ({ ...p, identificacion: e.target.value }))} /></div>
                            <div><Label>N° de Modalidades Relacionadas</Label><Input type="number" value={cclReportFormData.nModalidades} onChange={e => setCclReportFormData(p => ({ ...p, nModalidades: Number(e.target.value) }))} /></div>
                            <div><Label>Estado del Proceso del CCL</Label><Input value={cclReportFormData.estadoProceso} onChange={e => setCclReportFormData(p => ({ ...p, estadoProceso: e.target.value }))} /></div>
                            <div className="col-span-2"><Label>Nombre Modalidades Relacionadas</Label><Textarea value={cclReportFormData.nombreModalidades} onChange={e => setCclReportFormData(p => ({ ...p, nombreModalidades: e.target.value }))} /></div>
                            <div className="col-span-2"><Label>Diagnóstico Enfermedad Relacionada con el Acoso Laboral</Label><Textarea value={cclReportFormData.diagnosticoEnfermedad} onChange={e => setCclReportFormData(p => ({ ...p, diagnosticoEnfermedad: e.target.value }))} /></div>
                            <div className="col-span-2"><Label>Nombre de la Entidad que Emite el Diagnóstico</Label><Input value={cclReportFormData.entidadEmiteDiagnostico} onChange={e => setCclReportFormData(p => ({ ...p, entidadEmiteDiagnostico: e.target.value }))} /></div>
                            <div className="col-span-2"><Label>Recomendaciones para el PVE Psicosocial</Label><Textarea value={cclReportFormData.recomendacionesPve} onChange={e => setCclReportFormData(p => ({ ...p, recomendacionesPve: e.target.value }))} /></div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setCclReportIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{selectedCclReportId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
}
