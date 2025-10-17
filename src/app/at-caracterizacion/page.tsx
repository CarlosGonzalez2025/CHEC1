// src/app/at-caracterizacion/page.tsx
'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { AtCaracterizacion } from '@/lib/types';
import { addAtCaracterizacion, updateAtCaracterizacion, uploadFile, atCaracterizacionDateFields } from '@/lib/data';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, PlusCircle, Filter, X, Loader2, Paperclip, Trash2, Download, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cie10Codes } from '@/lib/cie10-data';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
import Papa from 'papaparse';
import { parse } from 'date-fns';
import { es } from 'date-fns/locale';
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

const initialFormState: Omit<AtCaracterizacion, 'id' | 'tenantId'> = {
    idInterno: '', estadoCaso: 'Abierto', fechaRegistro: new Date(), areaResponsable: 'SG-SST',
    linkEvidencias: '', razonSocial: '', nit: '', arl: '', centroTrabajo: '', ciudad: '', departamento: '',
    tipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '', sexo: '', fechaNacimiento: null,
    cargo: '', procesoDivision: '', tipoVinculacion: '', fechaIngreso: null, antiguedad: 0, jornadaHabitual: '',
    salarioBase: 0, clasificacionEvento: 'Accidente de trabajo', gravedad: 'Leve', fechaEvento: null,
    horaEvento: '', municipioEvento: '', lugarEspecifico: '', frenteProyecto: '', enMision: false, inItinere: false,
    descripcionTarea: '', descripcionEvento: '', testigos: '', reportadoSupervisor: '',
    recibioPrimerosAuxilios: false, ipsAtencionInicial: '', fechaAtencionInicial: null,
    diagnosticoCie10Codigo: '', diagnosticoCie10Descripcion: '', equipoInvestigador: '',
    metodologia: 'Árbol de causas', causasInmediatasActos: '', causasInmediatasCondiciones: '',
    causasBasicasFactoresPersonales: '', causasBasicasFactoresTrabajo: '', agenteMaterial: '',
    mecanismo: '', parteCuerpoAfectada: '', naturalezaLesion: '', numeroFurat: '', fechaRadicacionFurat: null,
    fechaReporteEps: null, numeroRadicacionEps: '', reporteMinTrabajo: false, fechaReporteMinTrabajo: null,
    radicadoSoporteMinTrabajo: '', fechaInicioIncapacidad: null, fechaFinIncapacidad: null,
    diasIncapacidadInicial: 0, diasProrrogas: 0, diasTotalesIncapacidad: 0, secuelas: false, pcl: 0,
    fechaCalificacionOrigen: null, accionesCorrectivas: '', accionesPreventivas: '', responsablesAcciones: '',
    fechasCompromiso: null, estadoAcciones: 'Abierta', fechaVerificacionCierre: null, eficaciaAcciones: '',
    reincidente: false, observacionesSeguimiento: '', diasPerdidos: 0, horasPerdidas: 0,
    costoDirectoEstimado: 0, costoIndirectoEstimado: 0, soportes: [],
};

const atCaracterizacionCSVHeaders = Object.keys(initialFormState);

const partesCuerpo = [
    "CABEZA", "OJO IZQUIERDO", "OJO DERECHO", "CUELLO", "HOMBRO DERECHO", "HOMBRO IZQUIERDO", "BRAZO DERECHO", "BRAZO IZQUIERDO", "CODO DERECHO", "CODO IZQUIERDO", "MANO DERECHA", "MANO IZQUIERDA", "TRONCO", "ESPALDA", "CADERA DERECHA", "CADERA IZQUIERDA", "PIERNA DERECHA", "PIERNA IZQUIERDA", "RODILLA DERECHA", "RODILLA IZQUIERDA", "PIE DERECHO", "PIE IZQUIERDO", "UBICACIONES MULTIPLES", "LESIONES GENERALES", "NO APLICA"
];


export default function AtCaracterizacionPage() {
    const { atCaracterizaciones, employees, tenantId, loading, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<AtCaracterizacion, 'id' | 'tenantId'>>(initialFormState);
    const { toast } = useToast();
    const [filters, setFilters] = useState({ numeroDocumento: '', estadoCaso: '', gravedad: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<AtCaracterizacion | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(Omit<AtCaracterizacion, 'id'> & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<Omit<AtCaracterizacion, 'id'>[]>([]);

    const filteredRecords = useMemo(() => {
        if (!atCaracterizaciones) return [];
        return atCaracterizaciones.filter(record =>
            (filters.numeroDocumento === '' || record.numeroDocumento.includes(filters.numeroDocumento)) &&
            (filters.estadoCaso === '' || record.estadoCaso === filters.estadoCaso) &&
            (filters.gravedad === '' || record.gravedad === filters.gravedad)
        );
    }, [atCaracterizaciones, filters]);
    
    const downloadCSVTemplate = () => {
        const csvHeader = atCaracterizacionCSVHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_caracterizacion_at.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                delimiter: ";",
                complete: (results) => processUploadedData(results.data as any[]),
                error: (error) => toast({ title: 'Error al procesar archivo', variant: 'destructive' }),
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const processUploadedData = (data: any[]) => {
        if (!employees || !atCaracterizaciones || !tenantId) {
            toast({ title: "Datos no disponibles", variant: "destructive" });
            return;
        }

        const uploadedDuplicates: (Omit<AtCaracterizacion, 'id'> & { id: string })[] = [];
        const uploadedNewRecords: Omit<AtCaracterizacion, 'id'>[] = [];

        const monthMap: { [key: string]: string } = {
            'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
            'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        const parseDate = (dateStr: string | number | undefined): Date | null => {
            if (!dateStr || String(dateStr).trim() === '') return null;

            if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)) && !/[/.-]/.test(String(dateStr)))) {
                return new Date(Math.round((Number(dateStr) - 25569) * 86400 * 1000));
            }
            
            const normalizedStr = String(dateStr).toLowerCase().replace(/ del? /g, ' ').trim();
            const formatStrings = [
                'dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy',
                'dd.MM.yyyy', 'd.M.yyyy', 'dd MMM yyyy', 'd MMM yyyy'
            ];

            for (const fmt of formatStrings) {
                try {
                    const parsedDate = parse(normalizedStr, fmt, new Date(), { locale: es });
                    if (!isNaN(parsedDate.getTime())) return parsedDate;
                } catch (e) { /* continue */ }
            }
            
            const textMatch = normalizedStr.match(/(\d{1,2})[ .]([a-z]+)[ .](\d{4})/);
            if (textMatch) {
                const day = textMatch[1];
                const monthName = textMatch[2];
                const year = textMatch[3];
                const month = Object.keys(monthMap).find(m => monthName.startsWith(m));
                if (day && month && year) {
                     try {
                        const parsedDate = parse(`${day}/${monthMap[month]}/${year}`, 'dd/MM/yyyy', new Date());
                        if (!isNaN(parsedDate.getTime())) return parsedDate;
                    } catch (e) { /* continue */ }
                }
            }
            
            const finalAttempt = new Date(dateStr);
            return isNaN(finalAttempt.getTime()) ? null : finalAttempt;
        };

        data.forEach(row => {
            if (!row.idInterno) return;

            const record: Omit<AtCaracterizacion, 'id'> = { ...initialFormState, tenantId };
            atCaracterizacionCSVHeaders.forEach(key => {
                const typedKey = key as keyof AtCaracterizacion;
                if (row[key] !== undefined && typedKey in record) {
                    if (atCaracterizacionDateFields.includes(key)) {
                        (record as any)[typedKey] = parseDate(row[key]);
                    } else if (typeof (record as any)[typedKey] === 'boolean') {
                        (record as any)[typedKey] = ['si', 'yes', 'true', '1'].includes(String(row[key]).toLowerCase());
                    } else if (typeof (record as any)[typedKey] === 'number') {
                        (record as any)[typedKey] = parseFloat(String(row[key]).replace(',', '.')) || 0;
                    } else {
                        (record as any)[typedKey] = String(row[key]);
                    }
                }
            });

            const existingRecord = atCaracterizaciones.find(a => a.idInterno === record.idInterno);
            
            if (existingRecord) {
                uploadedDuplicates.push({ ...record, id: existingRecord.id });
            } else {
                uploadedNewRecords.push(record);
            }
        });
        
        setNewRecords(uploadedNewRecords);
        setDuplicates(uploadedDuplicates);

        if (uploadedDuplicates.length > 0) {
            setIsAlertOpen(true);
        } else if (uploadedNewRecords.length > 0) {
            handleBulkCreate(uploadedNewRecords);
        } else {
            toast({ title: "No hay datos nuevos para cargar." });
        }
    };
    
    const handleBulkCreate = async (records: Omit<AtCaracterizacion, 'id'>[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addAtCaracterizacion(rec, tenantId)));
            toast({ title: `${records.length} registros creados con éxito.` });
            fetchAllData();
        } catch (error) { toast({ title: 'Error en la creación masiva', variant: 'destructive' }); }
    };
    
    const handleBulkUpdate = async (records: (Omit<AtCaracterizacion, 'id'> & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateAtCaracterizacion(rec.id, rec, tenantId)));
            toast({ title: `${records.length} registros actualizados con éxito.` });
            fetchAllData();
        } catch (error) { toast({ title: 'Error en la actualización masiva', variant: 'destructive' }); }
    };
    
    const confirmUpdate = async () => {
        setIsAlertOpen(false);
        const promises = [];
        if (duplicates.length > 0) promises.push(handleBulkUpdate(duplicates));
        if (newRecords.length > 0) promises.push(handleBulkCreate(newRecords));
        await Promise.all(promises);
    };

    const denyUpdate = async () => {
        setIsAlertOpen(false);
        if (newRecords.length > 0) {
            await handleBulkCreate(newRecords);
        } else {
            toast({ title: "Operación cancelada", description: "No se realizaron cambios." });
        }
    };


    const handleOpenForm = (record: AtCaracterizacion | null = null) => {
        if (record) {
            setEditingId(record.id);
            setFormData(record);
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setIsFormOpen(true);
    };
    
     const handleViewDetails = (record: AtCaracterizacion) => {
        setSelectedRecord(record);
        setIsDetailsOpen(true);
    };

    const handleChange = (field: keyof AtCaracterizacion, value: any) => {
        setFormData(p => ({ ...p, [field]: value }));
    };
    
    const handleCie10Select = (value: string) => {
        const selected = cie10Codes.find(c => c.value.toLowerCase() === value.toLowerCase());
        if(selected) {
            handleChange('diagnosticoCie10Codigo', selected.value);
            handleChange('diagnosticoCie10Descripcion', selected.label.split(' - ')[1]);
        }
    };
    
    const handleSelectEmployee = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
            const [nombres, ...apellidosArr] = employee.fullName.split(' ');
            const apellidos = apellidosArr.join(' ');
            
            setFormData(prev => ({
                ...prev,
                tipoDocumento: employee.identificationType,
                numeroDocumento: employee.identification,
                nombres: nombres || '',
                apellidos: apellidos || '',
                sexo: employee.gender,
                fechaNacimiento: employee.birthDate,
                cargo: employee.position,
                fechaIngreso: employee.hireDate,
                salarioBase: employee.salary,
                // You can add more fields to autofill here
            }));
        }
    };

    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'at-caracterizacion-soportes');
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        try {
            if (editingId) {
                await updateAtCaracterizacion(editingId, formData, tenantId);
                toast({ title: "Caracterización Actualizada" });
            } else {
                await addAtCaracterizacion(formData, tenantId);
                toast({ title: "Caracterización Guardada" });
            }
            setIsFormOpen(false);
            fetchAllData();
        } catch (error) {
            toast({ title: "Error al guardar", variant: "destructive" });
        }
    };

    return (
        <AppLayout pageTitle="Caracterización de Accidentes de Trabajo">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Listado de Caracterizaciones de AT</CardTitle>
                            <CardDescription>Gestión y seguimiento detallado de accidentes de trabajo.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}><Download className="h-4 w-4" />Descargar Plantilla</Button>
                             <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" />Cargar Archivo</Button>
                             <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                            <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                <PlusCircle className="h-4 w-4" />
                                Añadir Registro
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Collapsible className="space-y-4 mb-4">
                        <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4" />Filtrar Registros</Button></CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 border rounded-lg bg-muted/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div><Label>Número Documento</Label><Input value={filters.numeroDocumento} onChange={e => setFilters(f => ({ ...f, numeroDocumento: e.target.value }))} /></div>
                                <div><Label>Estado del Caso</Label><Select value={filters.estadoCaso} onValueChange={v => setFilters(f => ({ ...f, estadoCaso: v }))}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="Abierto">Abierto</SelectItem><SelectItem value="Cerrado">Cerrado</SelectItem></SelectContent></Select></div>
                                <div><Label>Gravedad</Label><Select value={filters.gravedad} onValueChange={v => setFilters(f => ({ ...f, gravedad: v }))}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="Leve">Leve</SelectItem><SelectItem value="Grave">Grave</SelectItem><SelectItem value="Mortal">Mortal</SelectItem></SelectContent></Select></div>
                                <div className="col-span-3 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setFilters({ numeroDocumento: '', estadoCaso: '', gravedad: '' })} className="gap-1"><X className="h-4 w-4" />Limpiar</Button></div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    <div className="border rounded-lg mt-4">
                        <Table>
                            <TableHeader><TableRow><TableHead>ID Interno</TableHead><TableHead>Trabajador</TableHead><TableHead>Fecha Evento</TableHead><TableHead>Gravedad</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredRecords.map(record => (
                                    <TableRow key={record.id} onClick={() => handleViewDetails(record)} className="cursor-pointer">
                                        <TableCell>{record.idInterno}</TableCell>
                                        <TableCell>{record.nombres} {record.apellidos}</TableCell>
                                        <TableCell>{formatDate(record.fechaEvento)}</TableCell>
                                        <TableCell>{record.gravedad}</TableCell>
                                        <TableCell>{record.estadoCaso}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleViewDetails(record); }}>Ver Detalles</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleOpenForm(record); }}>Editar</DropdownMenuItem>
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

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedRecord && 
                    <AtCaracterizacionDetails 
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
                <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Caracterización AT' : 'Nueva Caracterización AT'}</DialogTitle>
                        <DialogDescription>Complete todos los campos requeridos para el registro del evento.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-6">
                    <form onSubmit={handleSave} className="space-y-4">
                        <Tabs defaultValue="evento">
                            <TabsList className="grid w-full grid-cols-7"><TabsTrigger value="evento">Evento</TabsTrigger><TabsTrigger value="trabajador">Trabajador</TabsTrigger><TabsTrigger value="investigacion">Investigación</TabsTrigger><TabsTrigger value="reportes">Reportes</TabsTrigger><TabsTrigger value="consecuencias">Consecuencias</TabsTrigger><TabsTrigger value="acciones">Acciones</TabsTrigger><TabsTrigger value="soportes">Soportes</TabsTrigger></TabsList>
                            <TabsContent value="evento" className="grid grid-cols-4 gap-4 pt-4">
                                <div><Label>ID Interno</Label><Input value={formData.idInterno} onChange={e => handleChange('idInterno', e.target.value)} /></div>
                                <div><Label>Fecha de registro</Label><Input type="date" value={dateToInputFormat(formData.fechaRegistro)} onChange={e => handleChange('fechaRegistro', e.target.value)} /></div>
                                <div><Label>Clasificación</Label><Select onValueChange={v => handleChange('clasificacionEvento', v)} value={formData.clasificacionEvento}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Incidente">Incidente</SelectItem><SelectItem value="Accidente de trabajo">Accidente de trabajo</SelectItem></SelectContent></Select></div>
                                <div><Label>Gravedad</Label><Select onValueChange={v => handleChange('gravedad', v)} value={formData.gravedad}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Leve">Leve</SelectItem><SelectItem value="Grave">Grave</SelectItem><SelectItem value="Mortal">Mortal</SelectItem></SelectContent></Select></div>
                                <div><Label>Fecha del evento</Label><Input type="date" value={dateToInputFormat(formData.fechaEvento)} onChange={e => handleChange('fechaEvento', e.target.value)} /></div>
                                <div><Label>Hora del evento</Label><Input type="time" value={formData.horaEvento} onChange={e => handleChange('horaEvento', e.target.value)} /></div>
                                <div><Label>Municipio</Label><Input value={formData.municipioEvento} onChange={e => handleChange('municipioEvento', e.target.value)} /></div>
                                <div><Label>Lugar Específico</Label><Input value={formData.lugarEspecifico} onChange={e => handleChange('lugarEspecifico', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Frente/Proyecto/Obra</Label><Input value={formData.frenteProyecto} onChange={e => handleChange('frenteProyecto', e.target.value)} /></div>
                                <div className="flex items-center space-x-2 pt-6"><Checkbox id="enMision" checked={formData.enMision} onCheckedChange={c => handleChange('enMision', c)} /><Label htmlFor="enMision">¿En misión?</Label></div>
                                <div className="flex items-center space-x-2 pt-6"><Checkbox id="inItinere" checked={formData.inItinere} onCheckedChange={c => handleChange('inItinere', c)} /><Label htmlFor="inItinere">¿In itinere?</Label></div>
                                <div className="col-span-4"><Label>Descripción de la tarea</Label><Textarea value={formData.descripcionTarea} onChange={e => handleChange('descripcionTarea', e.target.value)} /></div>
                                <div className="col-span-4"><Label>Descripción del evento</Label><Textarea value={formData.descripcionEvento} onChange={e => handleChange('descripcionEvento', e.target.value)} /></div>
                            </TabsContent>
                             <TabsContent value="trabajador" className="grid grid-cols-4 gap-4 pt-4">
                                <div>
                                    <Label>Cédula del Empleado</Label>
                                    <Select onValueChange={handleSelectEmployee} disabled={!!editingId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione un empleado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.identification} - {emp.fullName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div>
                                    <Label>Tipo Documento</Label>
                                     <Select onValueChange={v => handleChange('tipoDocumento', v)} value={formData.tipoDocumento}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent><SelectItem value="CC">CC</SelectItem><SelectItem value="CE">CE</SelectItem><SelectItem value="PT">PT</SelectItem><SelectItem value="PA">PA</SelectItem></SelectContent></Select>
                                </div>
                                <div><Label>Número Documento</Label><Input value={formData.numeroDocumento} readOnly /></div>
                                <div><Label>Nombres</Label><Input value={formData.nombres} onChange={e => handleChange('nombres', e.target.value)} /></div>
                                <div><Label>Apellidos</Label><Input value={formData.apellidos} onChange={e => handleChange('apellidos', e.target.value)} /></div>
                                <div><Label>Sexo</Label><Select onValueChange={v => handleChange('sexo', v)} value={formData.sexo}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Femenino">Femenino</SelectItem></SelectContent></Select></div>
                                <div><Label>Fecha Nacimiento</Label><Input type="date" value={dateToInputFormat(formData.fechaNacimiento)} onChange={e => handleChange('fechaNacimiento', e.target.value)} /></div>
                                <div><Label>Cargo</Label><Input value={formData.cargo} onChange={e => handleChange('cargo', e.target.value)} /></div>
                                <div><Label>Proceso/División</Label><Input value={formData.procesoDivision} onChange={e => handleChange('procesoDivision', e.target.value)} /></div>
                                <div><Label>Fecha Ingreso</Label><Input type="date" value={dateToInputFormat(formData.fechaIngreso)} onChange={e => handleChange('fechaIngreso', e.target.value)} /></div>
                                <div><Label>Antigüedad (días)</Label><Input type="number" value={formData.antiguedad} onChange={e => handleChange('antiguedad', Number(e.target.value))} /></div>
                                <div><Label>Salario Base</Label><Input type="number" value={formData.salarioBase} onChange={e => handleChange('salarioBase', Number(e.target.value))} /></div>
                            </TabsContent>
                            <TabsContent value="investigacion" className="grid grid-cols-3 gap-4 pt-4">
                                <div>
                                    <Label>Parte del Cuerpo Afectada</Label>
                                    <Select onValueChange={(value) => handleChange('parteCuerpoAfectada', value)} value={formData.parteCuerpoAfectada}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una parte"/></SelectTrigger>
                                        <SelectContent>{partesCuerpo.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Naturaleza de la Lesión</Label><Input value={formData.naturalezaLesion} onChange={e => handleChange('naturalezaLesion', e.target.value)} /></div>
                                <div><Label>Metodología</Label><Select onValueChange={v => handleChange('metodologia', v)} value={formData.metodologia}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Árbol de causas">Árbol de causas</SelectItem><SelectItem value="ICAM">ICAM</SelectItem><SelectItem value="Otra">Otra</SelectItem></SelectContent></Select></div>
                                <div className="col-span-3"><Label>Equipo Investigador</Label><Textarea value={formData.equipoInvestigador} onChange={e => handleChange('equipoInvestigador', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Causas Inmediatas - Actos Inseguros</Label><Textarea value={formData.causasInmediatasActos} onChange={e => handleChange('causasInmediatasActos', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Causas Inmediatas - Condiciones Inseguras</Label><Textarea value={formData.causasInmediatasCondiciones} onChange={e => handleChange('causasInmediatasCondiciones', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Causas Básicas - Factores Personales</Label><Textarea value={formData.causasBasicasFactoresPersonales} onChange={e => handleChange('causasBasicasFactoresPersonales', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Causas Básicas - Factores del Trabajo</Label><Textarea value={formData.causasBasicasFactoresTrabajo} onChange={e => handleChange('causasBasicasFactoresTrabajo', e.target.value)} /></div>
                            </TabsContent>
                            <TabsContent value="reportes" className="grid grid-cols-3 gap-4 pt-4">
                                <div><Label>Número FURAT</Label><Input value={formData.numeroFurat} onChange={e => handleChange('numeroFurat', e.target.value)} /></div>
                                <div><Label>Fecha Radicación FURAT</Label><Input type="date" value={dateToInputFormat(formData.fechaRadicacionFurat)} onChange={e => handleChange('fechaRadicacionFurat', e.target.value)} /></div>
                                <div><Label>Fecha Reporte a EPS</Label><Input type="date" value={dateToInputFormat(formData.fechaReporteEps)} onChange={e => handleChange('fechaReporteEps', e.target.value)} /></div>
                                <div><Label>Número Radicación EPS</Label><Input value={formData.numeroRadicacionEps} onChange={e => handleChange('numeroRadicacionEps', e.target.value)} /></div>
                                <div className="flex items-center space-x-2"><Checkbox id="reporteMinTrabajo" checked={formData.reporteMinTrabajo} onCheckedChange={c => handleChange('reporteMinTrabajo', c)} /><Label htmlFor="reporteMinTrabajo">¿Reporte a MinTrabajo?</Label></div>
                                <div><Label>Fecha Reporte a MinTrabajo</Label><Input type="date" value={dateToInputFormat(formData.fechaReporteMinTrabajo)} onChange={e => handleChange('fechaReporteMinTrabajo', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Radicado/Soporte MinTrabajo</Label><Input value={formData.radicadoSoporteMinTrabajo} onChange={e => handleChange('radicadoSoporteMinTrabajo', e.target.value)} /></div>
                            </TabsContent>
                            <TabsContent value="consecuencias" className="grid grid-cols-4 gap-4 pt-4">
                                 <div><Label>CIE-10</Label><Combobox items={cie10Codes} value={formData.diagnosticoCie10Codigo} onChange={handleCie10Select} placeholder="Buscar CIE-10" /></div>
                                <div className="col-span-3"><Label>Descripción Diagnóstico</Label><Input value={formData.diagnosticoCie10Descripcion} readOnly /></div>
                                <div><Label>Fecha Inicio Incapacidad</Label><Input type="date" value={dateToInputFormat(formData.fechaInicioIncapacidad)} onChange={e => handleChange('fechaInicioIncapacidad', e.target.value)} /></div>
                                <div><Label>Fecha Fin Incapacidad</Label><Input type="date" value={dateToInputFormat(formData.fechaFinIncapacidad)} onChange={e => handleChange('fechaFinIncapacidad', e.target.value)} /></div>
                                <div><Label>Días Incapacidad Inicial</Label><Input type="number" value={formData.diasIncapacidadInicial} onChange={e => handleChange('diasIncapacidadInicial', Number(e.target.value))} /></div>
                                <div><Label>Días Prórrogas</Label><Input type="number" value={formData.diasProrrogas} onChange={e => handleChange('diasProrrogas', Number(e.target.value))} /></div>
                                <div><Label>Días Totales</Label><Input type="number" value={formData.diasTotalesIncapacidad} onChange={e => handleChange('diasTotalesIncapacidad', Number(e.target.value))} /></div>
                                <div><Label>PCL (%)</Label><Input type="number" value={formData.pcl} onChange={e => handleChange('pcl', Number(e.target.value))} /></div>
                                <div><Label>Fecha Calificación Origen</Label><Input type="date" value={dateToInputFormat(formData.fechaCalificacionOrigen)} onChange={e => handleChange('fechaCalificacionOrigen', e.target.value)} /></div>
                                <div className="flex items-center space-x-2"><Checkbox id="secuelas" checked={formData.secuelas} onCheckedChange={c => handleChange('secuelas', c)} /><Label htmlFor="secuelas">¿Dejó secuelas?</Label></div>
                            </TabsContent>
                            <TabsContent value="acciones" className="grid grid-cols-3 gap-4 pt-4">
                                <div className="col-span-3"><Label>Acciones Correctivas</Label><Textarea value={formData.accionesCorrectivas} onChange={e => handleChange('accionesCorrectivas', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Acciones Preventivas</Label><Textarea value={formData.accionesPreventivas} onChange={e => handleChange('accionesPreventivas', e.target.value)} /></div>
                                <div><Label>Responsables</Label><Input value={formData.responsablesAcciones} onChange={e => handleChange('responsablesAcciones', e.target.value)} /></div>
                                <div><Label>Fechas Compromiso</Label><Input type="date" value={dateToInputFormat(formData.fechasCompromiso)} onChange={e => handleChange('fechasCompromiso', e.target.value)} /></div>
                                <div><Label>Estado Acciones</Label><Select onValueChange={v => handleChange('estadoAcciones', v)} value={formData.estadoAcciones}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Abierta">Abierta</SelectItem><SelectItem value="Cerrada">Cerrada</SelectItem></SelectContent></Select></div>
                                <div><Label>Fecha Verificación Cierre</Label><Input type="date" value={dateToInputFormat(formData.fechaVerificacionCierre)} onChange={e => handleChange('fechaVerificacionCierre', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Eficacia de Acciones</Label><Textarea value={formData.eficaciaAcciones} onChange={e => handleChange('eficaciaAcciones', e.target.value)} /></div>
                            </TabsContent>
                            <TabsContent value="soportes" className="py-4">
                                <div className="space-y-4">
                                    <Label>Soportes del Caso</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" onChange={handleSoporteUpload} disabled={isUploading} className="flex-grow"/>
                                        {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {(formData.soportes || []).map((url, index) => (
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
                            </TabsContent>
                        </Tabs>
                        <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingId ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Se encontraron {duplicates.length} registros duplicados</AlertDialogTitle>
                        <AlertDialogDescription>¿Deseas actualizar los datos existentes con la información del archivo? Los registros nuevos se crearán de todas formas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={denyUpdate}>No, solo añadir nuevos</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUpdate}>Sí, actualizar existentes</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}


const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) => (
    <div className={className}>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);

const AtCaracterizacionDetails = ({ record, onClose, onEdit }: { record: AtCaracterizacion, onClose: () => void, onEdit: () => void }) => {
    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalle de Caracterización AT</DialogTitle>
                <DialogDescription>
                    ID Interno: {record.idInterno} - {record.nombres} {record.apellidos}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                {/* Evento */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Evento</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="ID Interno" value={record.idInterno} />
                        <DetailItem label="Fecha Evento" value={formatDate(record.fechaEvento)} />
                        <DetailItem label="Gravedad" value={record.gravedad} />
                        <DetailItem label="Estado del Caso" value={record.estadoCaso} />
                        <div className="col-span-full"><DetailItem label="Descripción del Evento" value={<p className="whitespace-pre-wrap">{record.descripcionEvento}</p>} /></div>
                    </div>
                </div>
                <Separator />
                {/* Trabajador */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Trabajador</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Nombre" value={`${record.nombres} ${record.apellidos}`} />
                        <DetailItem label="Identificación" value={record.numeroDocumento} />
                        <DetailItem label="Cargo" value={record.cargo} />
                        <DetailItem label="Centro de Trabajo" value={record.centroTrabajo} />
                    </div>
                </div>
                <Separator />
                {/* Consecuencias */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Consecuencias y Diagnóstico</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                       <DetailItem label="Parte del Cuerpo Afectada" value={record.parteCuerpoAfectada} />
                       <DetailItem label="Naturaleza de la Lesión" value={record.naturalezaLesion} />
                       <DetailItem label="Diagnóstico" value={record.diagnosticoCie10Descripcion} />
                       <DetailItem label="Días Totales Incapacidad" value={record.diasTotalesIncapacidad} />
                    </div>
                </div>
                 <Separator />
                 {/* Soportes */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Soportes</h3>
                     {(record.soportes && record.soportes.length > 0) ? (
                        <div className="flex flex-col gap-2 mt-1">
                            {record.soportes.map((url, index) => (
                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 border rounded-md w-fit">
                                    <Paperclip className="h-4 w-4" />
                                    <span>Ver Soporte {index + 1}</span>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm mt-1 text-muted-foreground">No hay soportes adjuntos.</p>
                    )}
                </div>
            </div>
            <DialogFooter className="pt-6">
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
                <Button onClick={onEdit}>Editar</Button>
            </DialogFooter>
        </DialogContent>
    );
};
