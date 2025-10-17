'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/components/layout/app-layout';
import { PlusCircle, MoreHorizontal, Download, Upload, Filter, X, CalendarIcon, Paperclip, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/lib/data';
import { getEmployees, getATTrackings, addATTracking, updateATTracking, atTrackingDateFields, uploadFile } from '@/lib/data';
import type { ATTracking } from '@/lib/types';
import { cie10Codes } from '@/lib/cie10-data';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';

const initialFormState: Omit<ATTracking, 'id'> = {
    fechaRegistro: new Date(),
    employeeId: '',
    tipoDocumento: '',
    nDocumento: '',
    nombreTrabajador: '',
    fechaNacimiento: null,
    cargo: '',
    centroDeCostos: '',
    telefono: '',
    fechaSiniestro: null,
    tipoEvento: '',
    clasificacionEvento: '',
    parteCuerpoAfectada: '',
    tipoLesion: '',
    codigoCie10: '',
    diagnostico: '',
    descripcionEvento: '',
    recomendaciones: 'NO',
    tipoRecomendaciones: '',
    fechaInicialRecomendaciones: null,
    fechaFinalRecomendaciones: null,
    descripcionRecomendaciones: '',
    incapacidad: false,
    fechaInicioIncapacidad: null,
    fechaFinIncapacidad: null,
    diasIncapacidad: 0,
    fechaReintegro: null,
    calificacionOrigen: '',
    instanciaCalificadora: '',
    pcl: 0,
    reubicacion: false,
    cargoAsignado: '',
    estadoCaso: 'Abierto',
    fechaCierre: null,
    seguimientosEnfermera: '',
    seguimientosMesaLaboral: '',
    observaciones: '',
    soportesRecomendaciones: [],
    soporteEntregaRecomendaciones: [],
    soporteReinduccion: [],
    soporteLeccionesAprendidas: [],
};

const partesCuerpo = [
    "CABEZA", "OJO IZQUIERDO", "OJO DERECHO", "CUELLO", "HOMBRO DERECHO", "HOMBRO IZQUIERDO", "BRAZO DERECHO", "BRAZO IZQUIERDO", "CODO DERECHO", "CODO IZQUIERDO", "MANO DERECHA", "MANO IZQUIERDA", "TRONCO", "ESPALDA", "CADERA DERECHA", "CADERA IZQUIERDA", "PIERNA DERECHA", "PIERNA IZQUIERDA", "RODILLA DERECHA", "RODILLA IZQUIERDA", "PIE DERECHO", "PIE IZQUIERDO", "UBICACIONES MULTIPLES", "LESIONES GENERALES", "NO APLICA"
];
const tiposLesion = ["FRACTURA", "LUXACION", "ESGUINCE", "CONTUSION", "HERIDA", "QUEMADURA", "AMPUTACION", "CUERPO EXTRAÑO", "INTOXICACION", "DERMATOSIS", "OTRO"];

function dateToInputFormat(date: Date | null | string): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

function formatDate(date: Date | null | string): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
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


export default function ATTrackingPage() {
    const { user, tenantId, atTrackings, employees, loading, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [formData, setFormData] = useState<Omit<ATTracking, 'id'>>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedTracking, setSelectedTracking] = useState<ATTracking | null>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState<string | null>(null);

    // Filters
    const [filterDocumento, setFilterDocumento] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterFechaSiniestro, setFilterFechaSiniestro] = useState<Date | undefined>();
    
    // Bulk upload states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(Omit<ATTracking, 'id'> & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<Omit<ATTracking, 'id'>[]>([]);

    const filteredTrackings = useMemo(() => {
        if (!atTrackings || !user) return [];
        const userCostCenters = user?.costCenters || [];
        const canViewAll = userCostCenters.length === 0;

        return atTrackings.filter(item => {
            const fechaMatch = !filterFechaSiniestro || (item.fechaSiniestro && format(new Date(item.fechaSiniestro), 'yyyy-MM-dd') === format(filterFechaSiniestro, 'yyyy-MM-dd'));
            const costCenterMatch = canViewAll || userCostCenters.includes(item.centroDeCostos);
            
            return (
                costCenterMatch &&
                item.nDocumento.toLowerCase().includes(filterDocumento.toLowerCase()) &&
                (filterEstado === '' || item.estadoCaso === filterEstado) &&
                fechaMatch
            );
        });
    }, [atTrackings, filterDocumento, filterEstado, filterFechaSiniestro, user]);

    const clearFilters = () => {
        setFilterDocumento('');
        setFilterEstado('');
        setFilterFechaSiniestro(undefined);
    };

    const handleSelectEmployee = (employeeId: string) => {
        const selectedEmployee = employees.find(emp => emp.id === employeeId);
        if (selectedEmployee) {
            setFormData(prev => ({
                ...prev,
                employeeId: selectedEmployee.id,
                nombreTrabajador: selectedEmployee.fullName,
                nDocumento: selectedEmployee.identification,
                tipoDocumento: selectedEmployee.identificationType,
                fechaNacimiento: selectedEmployee.birthDate,
                cargo: selectedEmployee.position,
                centroDeCostos: selectedEmployee.payrollDescription,
                telefono: selectedEmployee.mobilePhone,
            }));
        }
    };

    const handleCie10Select = (value: string) => {
        const selectedCodeData = cie10Codes.find(code => code.value.toLowerCase() === value.toLowerCase());
        if (selectedCodeData) {
            const description = selectedCodeData.label.substring(selectedCodeData.label.indexOf('-') + 1).trim();
            setFormData(prev => ({ ...prev, codigoCie10: selectedCodeData.value, diagnostico: description }));
        } else {
             setFormData(prev => ({ ...prev, codigoCie10: value, diagnostico: '' }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId || !tenantId) {
            toast({ title: "Error de validación", description: "Debe seleccionar un empleado y tener un ID de empresa.", variant: "destructive" });
            return;
        }

        try {
            if (editingId) {
                await updateATTracking(editingId, formData, tenantId);
                toast({ title: "Registro Actualizado", description: "El seguimiento ha sido actualizado." });
            } else {
                await addATTracking(formData, tenantId);
                toast({ title: "Registro Guardado", description: "El nuevo seguimiento ha sido guardado." });
            }
            setIsFormOpen(false);
            fetchAllData();
        } catch (error) {
            console.error("Error saving tracking:", error);
            toast({ title: "Error al Guardar", description: "No se pudo guardar el registro.", variant: "destructive" });
        }
    };
    
    const handleOpenForm = (tracking: ATTracking | null = null) => {
        if (tracking) {
            setEditingId(tracking.id);
            setFormData(tracking);
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setIsFormOpen(true);
    };

    const handleViewDetails = (tracking: ATTracking) => {
        setSelectedTracking(tracking);
        setIsDetailsOpen(true);
    };

    const handleChange = (field: keyof ATTracking, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof ATTracking) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(fieldName);
        try {
            const downloadURL = await uploadFile(file, `at-soportes/${fieldName}`);
            const currentFiles = formData[fieldName] as string[] || [];
            setFormData(prev => ({ ...prev, [fieldName]: [...currentFiles, downloadURL] }));
            toast({ title: 'Soporte cargado', description: 'El archivo se ha subido correctamente.' });
        } catch (error) {
            toast({ title: 'Error al subir', description: 'No se pudo cargar el archivo.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsUploading(null);
        }
    };

    const removeFile = (fieldName: keyof ATTracking, urlToRemove: string) => {
         const currentFiles = formData[fieldName] as string[] || [];
         setFormData(prev => ({ ...prev, [fieldName]: currentFiles.filter(url => url !== urlToRemove) }));
    };

    const atTrackingCSVHeaders = Object.keys(initialFormState);

    const downloadCSVTemplate = () => {
        const csvHeader = atTrackingCSVHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_seguimiento_at.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadData = () => {
        if (filteredTrackings.length === 0) {
            toast({ title: "No hay datos para exportar" });
            return;
        }
        const dataToExport = filteredTrackings.map(item => {
            const row: { [key: string]: any } = {};
            atTrackingCSVHeaders.forEach(key => {
                 const value = item[key as keyof ATTracking];
                 if (value instanceof Date) {
                    row[key] = value.toLocaleDateString('es-CO');
                 } else if (typeof value === 'boolean') {
                    row[key] = value ? 'SI' : 'NO';
                 } else {
                    row[key] = value;
                 }
            });
            return row;
        });

        const csv = Papa.unparse(dataToExport, { delimiter: ";", header: true });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "export_seguimiento_at.csv");
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
        if (!employees || !atTrackings) {
            toast({ title: "Datos no disponibles", description: "Los datos de empleados o seguimientos aún no se han cargado. Por favor, espere y vuelva a intentarlo.", variant: "destructive" });
            return;
        }
        const employeeMap = new Map(employees.map(emp => [emp.identification, emp]));

        const uploadedDuplicates: (Omit<ATTracking, 'id'> & { id: string })[] = [];
        const uploadedNewRecords: Omit<ATTracking, 'id'>[] = [];

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

        const supportFields: (keyof ATTracking)[] = ['soportesRecomendaciones', 'soporteEntregaRecomendaciones', 'soporteReinduccion', 'soporteLeccionesAprendidas'];

        data.forEach(row => {
            const siniestroDate = parseDate(row.fechaSiniestro);
            if (!row.nDocumento || !siniestroDate) {
                console.warn("Skipping row due to missing nDocumento or fechaSiniestro", row);
                return;
            }

            const employee = employeeMap.get(row.nDocumento);
            if (!employee) {
                console.warn("Skipping row because employee not found:", row.nDocumento);
                return;
            }

            const record: Omit<ATTracking, 'id'> = { ...initialFormState };
            for(const key of atTrackingCSVHeaders) {
                if (row[key] !== undefined) {
                    if(atTrackingDateFields.includes(key)) {
                        (record as any)[key] = parseDate(row[key]);
                    } else if (typeof (record as any)[key] === 'boolean') {
                        (record as any)[key] = ['si', 'yes', 'true'].includes(String(row[key]).toLowerCase());
                    } else if (typeof (record as any)[key] === 'number') {
                         (record as any)[key] = parseFloat(String(row[key]).replace(',', '.')) || 0;
                    } else if (supportFields.includes(key as keyof ATTracking)) {
                        (record as any)[key] = row[key] ? String(row[key]).split(',').map((s: string) => s.trim()) : [];
                    }
                    else {
                         (record as any)[key] = String(row[key]);
                    }
                }
            }
            record.employeeId = employee.id;

            const existingRecord = atTrackings.find(t => 
                t.nDocumento === record.nDocumento && 
                t.fechaSiniestro && new Date(t.fechaSiniestro).toISOString() === siniestroDate.toISOString()
            );

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
    
    const handleBulkCreate = async (records: Omit<ATTracking, 'id'>[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addATTracking(rec, tenantId)));
            toast({ title: `${records.length} registros creados con éxito.` });
            fetchAllData();
        } catch (error) { toast({ title: 'Error en la creación masiva', variant: 'destructive' }); }
    };

    const handleBulkUpdate = async (records: (Omit<ATTracking, 'id'> & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateATTracking(rec.id, rec, tenantId)));
            toast({ title: `${records.length} registros actualizados con éxito.` });
            fetchAllData();
        } catch (error) { toast({ title: 'Error en la actualización masiva', variant: 'destructive' }); }
    };
    
    const confirmUpdate = () => {
        setIsAlertOpen(false);
        if (duplicates.length > 0) handleBulkUpdate(duplicates);
        if (newRecords.length > 0) handleBulkCreate(newRecords);
    };

    const denyUpdate = () => {
        setIsAlertOpen(false);
        if (newRecords.length > 0) handleBulkCreate(newRecords);
        else toast({ title: "Operación cancelada", description: "No se realizaron cambios." });
    };
    
    type FileUploadGroupProps = {
        title: string;
        fieldName: keyof ATTracking;
    };
    
    const FileUploadGroup = ({ title, fieldName }: FileUploadGroupProps) => {
        const files = formData[fieldName];
        const fileList = Array.isArray(files) ? files : [];

        return (
            <div className="col-span-2">
                <Label>{title}</Label>
                <div className="flex items-center gap-2 mt-1">
                    <Input
                        type="file"
                        onChange={(e) => handleFileUpload(e, fieldName)}
                        disabled={isUploading === fieldName}
                        className="flex-grow"
                    />
                    {isUploading === fieldName && <Loader2 className="h-5 w-5 animate-spin" />}
                </div>
                <div className="mt-2 space-y-1">
                    {fileList.map((url, index) => (
                        <div key={index} className="flex items-center justify-between p-1.5 border rounded-md text-sm">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline truncate">
                                <Paperclip className="h-4 w-4" />
                                <span className="truncate">Soporte {index + 1}</span>
                            </a>
                            <Button variant="ghost" size="icon" type="button" onClick={() => removeFile(fieldName, url)}>
                                <Trash2 className="h-4 w-4 text-red-500"/>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <AppLayout pageTitle="Seguimiento de Accidentes de Trabajo (AT)">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Registros de Seguimiento de AT</CardTitle>
                            <CardDescription>Ver, gestionar, filtrar y cargar seguimientos de accidentes de trabajo.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadData} disabled={loading}><Download className="h-4 w-4" />Descargar Datos</Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate} disabled={loading}><Download className="h-4 w-4" />Descargar Plantilla</Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()} disabled={loading}><Upload className="h-4 w-4" />Cargar Archivo</Button>
                             <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                            <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                <PlusCircle className="h-4 w-4" />
                                Añadir Seguimiento
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Collapsible className="space-y-4 mb-4">
                        <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Registros</Button></CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div><Label htmlFor="filter-doc">N° Documento</Label><Input id="filter-doc" value={filterDocumento} onChange={(e) => setFilterDocumento(e.target.value)} /></div>
                                    <div>
                                        <Label htmlFor="filter-estado">Estado del Caso</Label>
                                        <Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                            <SelectContent><SelectItem value="Abierto">Abierto</SelectItem><SelectItem value="Cerrado">Cerrado</SelectItem><SelectItem value="En seguimiento">En seguimiento</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Fecha del Siniestro</Label>
                                        <Popover><PopoverTrigger asChild>
                                            <Button variant={"outline"} className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filterFechaSiniestro ? format(filterFechaSiniestro, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}</Button>
                                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterFechaSiniestro} onSelect={setFilterFechaSiniestro} initialFocus/></PopoverContent></Popover>
                                    </div>
                                </div>
                                <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" />Limpiar Filtros</Button></div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    <div className="border rounded-lg mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Trabajador</TableHead>
                                    <TableHead>N° Documento</TableHead>
                                    <TableHead>Fecha del Siniestro</TableHead>
                                    <TableHead>Diagnóstico</TableHead>
                                    <TableHead>Estado del Caso</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                ) : filteredTrackings.length > 0 ? filteredTrackings.map(item => (
                                    <TableRow key={item.id} onClick={() => handleViewDetails(item)} className="cursor-pointer">
                                        <TableCell>{item.nombreTrabajador}</TableCell>
                                        <TableCell>{item.nDocumento}</TableCell>
                                        <TableCell>{formatDate(item.fechaSiniestro)}</TableCell>
                                        <TableCell>{item.diagnostico}</TableCell>
                                        <TableCell>{item.estadoCaso}</TableCell>
                                        <TableCell>
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menú</span></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleViewDetails(item)}>Ver Detalles</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenForm(item)}>Editar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No hay registros aún.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedTracking && <ATTrackingDetails tracking={selectedTracking} onClose={() => setIsDetailsOpen(false)} onEdit={() => { setIsDetailsOpen(false); handleOpenForm(selectedTracking); }} />}
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Seguimiento AT' : 'Nuevo Seguimiento AT'}</DialogTitle>
                        <DialogDescription>Complete la información del seguimiento del accidente de trabajo.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                      <Tabs defaultValue="employee-info">
                        <TabsList className="grid w-full grid-cols-4">
                           <TabsTrigger value="employee-info">Info. Empleado y Evento</TabsTrigger>
                           <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
                           <TabsTrigger value="incapacity">Incapacidad y Reintegro</TabsTrigger>
                           <TabsTrigger value="follow-up">Seguimiento y Cierre</TabsTrigger>
                        </TabsList>
                        <TabsContent value="employee-info" className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Fecha de Registro</Label><Input type="date" value={dateToInputFormat(formData.fechaRegistro)} onChange={e => handleChange('fechaRegistro', e.target.value)} /></div>
                                <div>
                                    <Label>Empleado</Label>
                                    <Select onValueChange={handleSelectEmployee} value={formData.employeeId} disabled={!!editingId}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione un empleado" /></SelectTrigger>
                                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>N° Documento</Label><Input value={formData.nDocumento} readOnly /></div>
                                <div><Label>Cargo</Label><Input value={formData.cargo} readOnly /></div>
                                <div><Label>Centro de Costos</Label><Input value={formData.centroDeCostos} readOnly /></div>
                                <div><Label>Teléfono</Label><Input value={formData.telefono} readOnly /></div>
                            </div>
                            <hr />
                             <div className="grid grid-cols-3 gap-4">
                                <div><Label>Fecha del Siniestro</Label><Input type="date" value={dateToInputFormat(formData.fechaSiniestro)} onChange={e => handleChange('fechaSiniestro', e.target.value)} /></div>
                                <div>
                                    <Label>Tipo de Evento</Label>
                                    <Select onValueChange={(value) => handleChange('tipoEvento', value)} value={formData.tipoEvento}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione un tipo"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Accidente De Trabajo">Accidente De Trabajo</SelectItem>
                                            <SelectItem value="Enfermedad Común">Enfermedad Común</SelectItem>
                                            <SelectItem value="Enfermedad Laboral">Enfermedad Laboral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Clasificación del Evento</Label>
                                    <Select onValueChange={(value) => handleChange('clasificacionEvento', value)} value={formData.clasificacionEvento}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una clasificación"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Leve">Leve</SelectItem>
                                            <SelectItem value="Grave">Grave</SelectItem>
                                            <SelectItem value="Mortal">Mortal</SelectItem>
                                            <SelectItem value="Moderado">Moderado</SelectItem>
                                            <SelectItem value="NA">NA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Parte del Cuerpo Afectada</Label>
                                    <Select onValueChange={(value) => handleChange('parteCuerpoAfectada', value)} value={formData.parteCuerpoAfectada}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una parte"/></SelectTrigger>
                                        <SelectContent>{partesCuerpo.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Tipo de Lesión</Label>
                                    <Select onValueChange={(value) => handleChange('tipoLesion', value)} value={formData.tipoLesion}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione una lesión"/></SelectTrigger>
                                        <SelectContent>{tiposLesion.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Código CIE 10</Label>
                                    <Combobox items={cie10Codes} value={formData.codigoCie10} onChange={handleCie10Select} placeholder="Buscar código..." />
                                </div>
                                <div className="col-span-3"><Label>Diagnóstico</Label><Input value={formData.diagnostico} readOnly /></div>
                                <div className="col-span-3"><Label>Descripción del Evento</Label><Textarea value={formData.descripcionEvento} onChange={e => handleChange('descripcionEvento', e.target.value)} /></div>
                            </div>
                        </TabsContent>
                         <TabsContent value="recommendations" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Recomendaciones</Label>
                                    <Select onValueChange={(value) => handleChange('recomendaciones', value)} value={formData.recomendaciones}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SI">SI</SelectItem>
                                            <SelectItem value="NO">NO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Tipo de Recomendaciones</Label>
                                     <Select onValueChange={(value) => handleChange('tipoRecomendaciones', value)} value={formData.tipoRecomendaciones}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Temporal">Temporal</SelectItem>
                                            <SelectItem value="Permanente">Permanente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Fecha Inicial</Label><Input type="date" value={dateToInputFormat(formData.fechaInicialRecomendaciones)} onChange={e => handleChange('fechaInicialRecomendaciones', e.target.value)} /></div>
                                <div><Label>Fecha Final</Label><Input type="date" value={dateToInputFormat(formData.fechaFinalRecomendaciones)} onChange={e => handleChange('fechaFinalRecomendaciones', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Descripción de Recomendaciones</Label><Textarea value={formData.descripcionRecomendaciones} onChange={e => handleChange('descripcionRecomendaciones', e.target.value)} /></div>
                                <FileUploadGroup title="Soporte Recomendaciones" fieldName="soportesRecomendaciones" />
                                <FileUploadGroup title="Soporte Entrega Recomendaciones" fieldName="soporteEntregaRecomendaciones" />
                            </div>
                         </TabsContent>
                         <TabsContent value="incapacity" className="space-y-4 py-4">
                             <div className="grid grid-cols-3 gap-4 items-center">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="incapacidad" checked={formData.incapacidad} onCheckedChange={checked => handleChange('incapacidad', Boolean(checked))} />
                                    <Label htmlFor="incapacidad">Generó Incapacidad</Label>
                                </div>
                                <div><Label>Fecha Inicio Incapacidad</Label><Input type="date" value={dateToInputFormat(formData.fechaInicioIncapacidad)} onChange={e => handleChange('fechaInicioIncapacidad', e.target.value)} disabled={!formData.incapacidad} /></div>
                                <div><Label>Fecha Fin Incapacidad</Label><Input type="date" value={dateToInputFormat(formData.fechaFinIncapacidad)} onChange={e => handleChange('fechaFinIncapacidad', e.target.value)} disabled={!formData.incapacidad} /></div>
                                <div><Label>Días de Incapacidad</Label><Input type="number" value={formData.diasIncapacidad} onChange={e => handleChange('diasIncapacidad', e.target.valueAsNumber)} disabled={!formData.incapacidad} /></div>
                                <div className="col-span-3"><Label>Fecha Reintegro</Label><Input type="date" value={dateToInputFormat(formData.fechaReintegro)} onChange={e => handleChange('fechaReintegro', e.target.value)} /></div>
                                <div className="col-span-3"><FileUploadGroup title="Soporte Reinducción" fieldName="soporteReinduccion" /></div>
                            </div>
                         </TabsContent>
                          <TabsContent value="follow-up" className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div><Label>Calificación de Origen</Label><Input value={formData.calificacionOrigen} onChange={e => handleChange('calificacionOrigen', e.target.value)} /></div>
                                <div><Label>Instancia Calificadora</Label><Input value={formData.instanciaCalificadora} onChange={e => handleChange('instanciaCalificadora', e.target.value)} /></div>
                                <div><Label>PCL (%)</Label><Input type="number" value={formData.pcl} onChange={e => handleChange('pcl', e.target.valueAsNumber)} /></div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Checkbox id="reubicacion" checked={formData.reubicacion} onCheckedChange={checked => handleChange('reubicacion', Boolean(checked))} />
                                    <Label htmlFor="reubicacion">¿Hubo Reubicación?</Label>
                                </div>
                                <div><Label>Cargo Asignado</Label><Input value={formData.cargoAsignado} onChange={e => handleChange('cargoAsignado', e.target.value)} disabled={!formData.reubicacion} /></div>
                                 <div>
                                    <Label>Estado del Caso</Label>
                                    <Select value={formData.estadoCaso} onValueChange={v => handleChange('estadoCaso', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Abierto">Abierto</SelectItem>
                                            <SelectItem value="Cerrado">Cerrado</SelectItem>
                                            <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Fecha del Cierre</Label><Input type="date" value={dateToInputFormat(formData.fechaCierre)} onChange={e => handleChange('fechaCierre', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Seguimientos Enfermera</Label><Textarea value={formData.seguimientosEnfermera} onChange={e => handleChange('seguimientosEnfermera', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Seguimientos Mesa Laboral</Label><Textarea value={formData.seguimientosMesaLaboral} onChange={e => handleChange('seguimientosMesaLaboral', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Observaciones</Label><Textarea value={formData.observaciones} onChange={e => handleChange('observaciones', e.target.value)} /></div>
                                <div className="col-span-2"><FileUploadGroup title="Soporte Lecciones Aprendidas" fieldName="soporteLeccionesAprendidas" /></div>
                              </div>
                          </TabsContent>
                      </Tabs>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingId ? 'Actualizar' : 'Guardar'} Seguimiento</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

const ATTrackingDetails = ({ tracking, onClose, onEdit }: { tracking: ATTracking, onClose: () => void, onEdit: () => void }) => {
    
    const SupportSection = ({ title, urls }: { title: string, urls?: string[] }) => {
        if (!Array.isArray(urls) || urls.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold">{title}</h4>
                <div className="flex flex-col gap-2">
                    {urls.map((url, index) => (
                         <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 border rounded-md">
                            <Paperclip className="h-4 w-4" />
                            <span>Soporte {index + 1}</span>
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalle del Seguimiento de AT</DialogTitle>
                <DialogDescription>
                    Registro de {tracking.nombreTrabajador} - {formatDate(tracking.fechaSiniestro)}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                {/* Employee and Event Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Empleado y Evento</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Nombre del Trabajador" value={tracking.nombreTrabajador} />
                        <DetailItem label="N° Documento" value={tracking.nDocumento} />
                        <DetailItem label="Cargo" value={tracking.cargo} />
                        <DetailItem label="Centro de Costos" value={tracking.centroDeCostos} />
                        <DetailItem label="Fecha del Siniestro" value={formatDate(tracking.fechaSiniestro)} />
                        <DetailItem label="Tipo de Evento" value={tracking.tipoEvento} />
                        <DetailItem label="Clasificación" value={tracking.clasificacionEvento} />
                        <DetailItem label="Diagnóstico" value={`${tracking.codigoCie10} - ${tracking.diagnostico}`} />
                        <DetailItem label="Parte del Cuerpo" value={tracking.parteCuerpoAfectada} />
                        <DetailItem label="Tipo de Lesión" value={tracking.tipoLesion} />
                        <div className="col-span-full"><DetailItem label="Descripción del Evento" value={tracking.descripcionEvento} /></div>
                    </div>
                </div>
                <Separator />
                {/* Recommendations */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recomendaciones Médicas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailItem label="¿Tiene Recomendaciones?" value={tracking.recomendaciones} />
                        <DetailItem label="Tipo" value={tracking.tipoRecomendaciones} />
                        <DetailItem label="Fecha Inicial" value={formatDate(tracking.fechaInicialRecomendaciones)} />
                        <DetailItem label="Fecha Final" value={formatDate(tracking.fechaFinalRecomendaciones)} />
                        <div className="col-span-full"><DetailItem label="Descripción" value={tracking.descripcionRecomendaciones} /></div>
                    </div>
                </div>
                <Separator />
                {/* Incapacity and Reintegration */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Incapacidad y Reintegro</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailItem label="¿Generó Incapacidad?" value={tracking.incapacidad ? 'SI' : 'NO'} />
                        <DetailItem label="Fecha Inicio Incapacidad" value={formatDate(tracking.fechaInicioIncapacidad)} />
                        <DetailItem label="Fecha Fin Incapacidad" value={formatDate(tracking.fechaFinIncapacidad)} />
                        <DetailItem label="Días de Incapacidad" value={tracking.diasIncapacidad} />
                         <div className="col-span-full"><DetailItem label="Fecha de Reintegro" value={formatDate(tracking.fechaReintegro)} /></div>
                    </div>
                </div>
                <Separator />
                {/* Follow-up and Closing */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Seguimiento y Cierre del Caso</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                             <h4 className="font-medium">Calificación y Reubicación</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Calificación de Origen" value={tracking.calificacionOrigen} />
                                <DetailItem label="Instancia Calificadora" value={tracking.instanciaCalificadora} />
                                <DetailItem label="PCL (%)" value={`${tracking.pcl}%`} />
                                <DetailItem label="¿Hubo Reubicación?" value={tracking.reubicacion ? 'SI' : 'NO'} />
                                <div className="col-span-2"><DetailItem label="Cargo Asignado" value={tracking.cargoAsignado} /></div>
                             </div>
                        </div>
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium">Cierre y Observaciones</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Estado del Caso" value={tracking.estadoCaso} />
                                <DetailItem label="Fecha de Cierre" value={formatDate(tracking.fechaCierre)} />
                                <div className="col-span-full"><DetailItem label="Observaciones Generales" value={tracking.observaciones} /></div>
                            </div>
                        </div>
                         <div className="col-span-full space-y-4 p-4 border rounded-lg">
                             <h4 className="font-medium">Registros de Seguimiento</h4>
                             <DetailItem label="Seguimientos de Enfermería" value={<p className="whitespace-pre-wrap">{tracking.seguimientosEnfermera}</p>} />
                             <hr/>
                             <DetailItem label="Seguimientos de Mesa Laboral" value={<p className="whitespace-pre-wrap">{tracking.seguimientosMesaLaboral}</p>} />
                        </div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Soportes</h3>
                    <div className="p-4 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SupportSection title="Soportes de Recomendaciones" urls={tracking.soportesRecomendaciones} />
                        <SupportSection title="Soportes de Entrega Recomendaciones" urls={tracking.soporteEntregaRecomendaciones} />
                        <SupportSection title="Soportes de Reinducción" urls={tracking.soporteReinduccion} />
                        <SupportSection title="Soportes de Lecciones Aprendidas" urls={tracking.soporteLeccionesAprendidas} />
                         {(!tracking.soportesRecomendaciones || tracking.soportesRecomendaciones.length === 0) &&
                          (!tracking.soporteEntregaRecomendaciones || tracking.soporteEntregaRecomendaciones.length === 0) &&
                          (!tracking.soporteReinduccion || tracking.soporteReinduccion.length === 0) &&
                          (!tracking.soporteLeccionesAprendidas || tracking.soporteLeccionesAprendidas.length === 0) &&
                          <p className="text-sm text-muted-foreground col-span-full text-center py-4">No hay soportes adjuntos para este registro.</p>
                         }
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-6">
                <Button variant="outline" onClick={onClose}>Cerrar</Button>
                <Button onClick={onEdit}>Editar</Button>
            </DialogFooter>
        </DialogContent>
    );
};
