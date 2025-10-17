
'use client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Download, Upload, Filter, X, Lock, Unlock, Loader2, Paperclip, Trash2, ArrowUpDown } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ActivitySchedule } from '@/lib/types';
import { addActivitySchedule, getActivitySchedules, updateActivitySchedule, uploadFile } from '@/lib/data';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import Papa from 'papaparse';
import { parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const SECURITY_CODE = "JVC0607";

const initialFormState: Omit<ActivitySchedule, 'id' | 'tenantId'> = {
  fecha: null,
  pve: '',
  nombreActividad: '',
  mes: '',
  cantidadProgramada: 0,
  coberturaProgramada: 0,
  codigoSeguridad: '',
  estado: '',
  observaciones: '',
  fechaReprogramacion: null,
  cantidadEjecutada: 0,
  coberturaEjecutada: 0,
  reprogramacion: null,
  cumplimientoCronograma: '',
  cobertura: '',
  evidenciaCapacitacion: [],
  listadoAsistencia: [],
};

type SortConfig = {
  key: keyof ActivitySchedule | null;
  direction: 'asc' | 'desc';
};


function dateToInputFormat(date: Date | null | string): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    } catch (e) { return ''; }
}

function formatDate(date: Date | null | string): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('es-CO');
    } catch (e) { return 'N/A'; }
}

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const pvePrograms = ["Auditivo", "Osteomuscular", "Cardiovascular", "Respiratorio", "Visual", "Psicosocial", "Estilo de vida saludable"];

export default function ActivitySchedulePage() {
    const { tenantId, activitySchedules, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Omit<ActivitySchedule, 'id' | 'tenantId'>>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivitySchedule | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSecurityAlertOpen, setIsSecurityAlertOpen] = useState(false);
    const [securityCode, setSecurityCode] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);


    // Filters
    const [filterPve, setFilterPve] = useState('');
    const [filterMes, setFilterMes] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    
    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'fecha', direction: 'asc' });

    useEffect(() => {
      if (formData.fecha) {
          const date = new Date(formData.fecha);
          // Adjust for timezone to get the correct local month
          date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
          const monthName = months[date.getMonth()];
          setFormData(prev => ({...prev, mes: monthName}));
      }
    }, [formData.fecha]);


    const filteredActivities = useMemo(() => {
        return activitySchedules.filter(item => 
            (filterPve === '' || item.pve === filterPve) &&
            (filterMes === '' || item.mes === filterMes) &&
            (filterEstado === '' || item.estado === filterEstado)
        );
    }, [activitySchedules, filterPve, filterMes, filterEstado]);

    const sortedActivities = useMemo(() => {
        let sortableItems = [...filteredActivities];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredActivities, sortConfig]);

    const handleSort = (key: keyof ActivitySchedule) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const getSortIcon = (key: keyof ActivitySchedule) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };


    const clearFilters = () => {
        setFilterPve('');
        setFilterMes('');
        setFilterEstado('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) {
            toast({ title: "Error", description: "No se pudo identificar a la empresa.", variant: "destructive" });
            return;
        }
        try {
            if (editingId) {
                await updateActivitySchedule(editingId, formData, tenantId);
                toast({ title: "Actividad Actualizada" });
            } else {
                await addActivitySchedule(formData, tenantId);
                toast({ title: "Actividad Guardada" });
            }
            setIsFormOpen(false);
            fetchAllData();
        } catch (error) {
            toast({ title: "Error al guardar", variant: "destructive" });
        }
    };
    
    const handleOpenForm = (activity: ActivitySchedule | null = null) => {
        setIsUnlocked(false); 
        if (activity) {
            setEditingId(activity.id);
            setFormData({...activity, codigoSeguridad: ''});
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setIsFormOpen(true);
    };

    const handleViewDetails = (activity: ActivitySchedule) => {
        setSelectedActivity(activity);
        setIsDetailsOpen(true);
    };

    const handleCodeCheck = () => {
        if (formData.codigoSeguridad === SECURITY_CODE) {
            setIsUnlocked(true);
            toast({ title: "Seguimiento desbloqueado", description: "Ahora puedes editar los campos de ejecución." });
        } else {
            setIsUnlocked(false);
            toast({ title: "Código incorrecto", variant: "destructive" });
        }
    };
    
    const handleChange = (field: keyof Omit<ActivitySchedule, 'id' | 'tenantId'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleNumericChange = (field: keyof Omit<ActivitySchedule, 'id' | 'tenantId'>, value: string) => {
        const numValue = value === '' ? 0 : Number(value);
        if (!isNaN(numValue)) {
            setFormData(prev => ({ ...prev, [field]: numValue }));
        }
    };

    const calculateMetrics = useCallback(() => {
        const cantProg = formData.cantidadProgramada || 0;
        const cantEjec = formData.cantidadEjecutada || 0;
        const cobProg = formData.coberturaProgramada || 0;
        const cobEjec = formData.coberturaEjecutada || 0;

        const cumplimiento = cantProg > 0 ? (cantEjec / cantProg) : 0;
        const cobertura = cobProg > 0 ? (cobEjec / cobProg) : 0;

        setFormData(prev => ({
            ...prev,
            cumplimientoCronograma: `${(cumplimiento * 100).toFixed(0)}%`,
            cobertura: `${(cobertura * 100).toFixed(0)}%`
        }));
    }, [formData.cantidadProgramada, formData.cantidadEjecutada, formData.coberturaProgramada, formData.coberturaEjecutada]);

    useEffect(() => {
        calculateMetrics();
    }, [calculateMetrics]);
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'evidenciaCapacitacion' | 'listadoAsistencia') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(fieldName);
        try {
            const downloadURL = await uploadFile(file, `activity-schedules-soportes/${fieldName}`);
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

    const removeFile = (fieldName: 'evidenciaCapacitacion' | 'listadoAsistencia', urlToRemove: string) => {
         const currentFiles = formData[fieldName] as string[] || [];
         setFormData(prev => ({ ...prev, [fieldName]: currentFiles.filter(url => url !== urlToRemove) }));
    };
    
     const downloadCSVTemplate = () => {
        const planningHeaders = ['fecha', 'pve', 'nombreActividad', 'cantidadProgramada', 'coberturaProgramada'];
        const csvHeader = planningHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_planificacion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const downloadUpdateTemplate = () => {
        const updateHeaders = ['id', 'fecha', 'nombreActividad', 'estado', 'observaciones', 'fechaReprogramacion', 'cantidadEjecutada', 'coberturaEjecutada', 'reprogramacion'];
        const dataToExport = sortedActivities.map(item => ({
            id: item.id,
            fecha: formatDate(item.fecha),
            nombreActividad: item.nombreActividad,
            pve: item.pve,
            cantidadProgramada: item.cantidadProgramada,
            coberturaProgramada: item.coberturaProgramada,
            estado: item.estado,
            observaciones: item.observaciones,
            fechaReprogramacion: formatDate(item.fechaReprogramacion),
            cantidadEjecutada: item.cantidadEjecutada,
            coberturaEjecutada: item.coberturaEjecutada,
            reprogramacion: formatDate(item.reprogramacion)
        }));

        const csv = Papa.unparse(dataToExport, { fields: updateHeaders, delimiter: ";" });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_seguimiento.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, hasSecurityCheck: boolean) => {
        const file = event.target.files?.[0];
        if (file) {
            if (hasSecurityCheck) {
                setPendingFile(file);
                setIsSecurityAlertOpen(true);
            } else {
                parseAndProcessFile(file, false);
            }
        }
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUploadClick = (type: 'planning' | 'tracking') => {
        const hasSecurityCheck = type === 'tracking';
        fileInputRef.current?.setAttribute('data-secure', String(hasSecurityCheck));
        fileInputRef.current?.click();
    };
    
    const handleSecurityCheck = () => {
        if (securityCode === SECURITY_CODE) {
            setIsSecurityAlertOpen(false);
            if(pendingFile) {
                parseAndProcessFile(pendingFile, true);
            }
        } else {
            toast({ title: 'Código de seguridad incorrecto', variant: 'destructive' });
        }
        setSecurityCode('');
        setPendingFile(null);
    };

    const parseAndProcessFile = (file: File, hasExecutionPermission: boolean) => {
         Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: (results) => processUploadedData(results.data as any[], hasExecutionPermission),
            error: (error) => toast({ title: 'Error al procesar archivo', variant: 'destructive' }),
        });
    }


    const processUploadedData = async (data: any[], hasExecutionPermission: boolean) => {
        if (!tenantId) return;

        const newRecords: Omit<ActivitySchedule, 'id' | 'tenantId'>[] = [];
        const updateRecords: (Partial<ActivitySchedule> & { id: string })[] = [];

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

        for (const row of data) {
            if(row.id && hasExecutionPermission) { // UPDATE
                const existingRecord = activitySchedules.find(a => a.id === row.id);
                if (!existingRecord) continue;

                const updateData: Partial<ActivitySchedule> & { id: string } = { id: row.id, fecha: existingRecord.fecha };
                if (row.estado) updateData.estado = row.estado;
                if (row.observaciones) updateData.observaciones = row.observaciones;
                if (row.fechaReprogramacion) updateData.fechaReprogramacion = parseDate(row.fechaReprogramacion);
                if (row.cantidadEjecutada) updateData.cantidadEjecutada = Number(String(row.cantidadEjecutada).replace(',', '.'));
                if (row.coberturaEjecutada) updateData.coberturaEjecutada = Number(String(row.coberturaEjecutada).replace(',', '.'));
                if (row.reprogramacion) updateData.reprogramacion = parseDate(row.reprogramacion);

                // Calculate derived fields for updates
                const cantProg = existingRecord.cantidadProgramada || 0;
                const cantEjec = updateData.cantidadEjecutada || existingRecord.cantidadEjecutada || 0;
                const cobProg = existingRecord.coberturaProgramada || 0;
                const cobEjec = updateData.coberturaEjecutada || existingRecord.coberturaEjecutada || 0;

                updateData.cumplimientoCronograma = `${(cantProg > 0 ? (cantEjec / cantProg) * 100 : 0).toFixed(0)}%`;
                updateData.cobertura = `${(cobProg > 0 ? (cobEjec / cobProg) * 100 : 0).toFixed(0)}%`;

                updateRecords.push(updateData);

            } else if (!row.id) { // CREATE
                const fechaActividad = parseDate(row.fecha);
                if (!row.nombreActividad || !fechaActividad) continue;

                let mesActividad = row.mes || '';
                if (!mesActividad) {
                    mesActividad = months[fechaActividad.getUTCMonth()];
                }
                
                const record: Omit<ActivitySchedule, 'id' | 'tenantId'> = {
                    ...initialFormState,
                    fecha: fechaActividad,
                    pve: row.pve || '',
                    nombreActividad: row.nombreActividad,
                    mes: mesActividad,
                    cantidadProgramada: Number(String(row.cantidadProgramada || '0').replace(',', '.')),
                    coberturaProgramada: Number(String(row.coberturaProgramada || '0').replace(',', '.')),
                    estado: 'Programado',
                };
                newRecords.push(record);
            }
        }
        
        try {
            if(newRecords.length > 0) {
                await Promise.all(newRecords.map(rec => addActivitySchedule(rec, tenantId)));
                toast({ title: `${newRecords.length} actividades creadas con éxito.` });
            }
            if(updateRecords.length > 0) {
                await Promise.all(updateRecords.map(rec => updateActivitySchedule(rec.id, rec, tenantId)));
                toast({ title: `${updateRecords.length} actividades actualizadas con éxito.` });
            }
            if(newRecords.length > 0 || updateRecords.length > 0) {
                fetchAllData();
            } else {
                toast({ title: "No hay datos válidos para procesar." });
            }
        } catch (error) {
             toast({ title: 'Error en la carga masiva', variant: 'destructive' });
        }
    };


    type FileUploadGroupProps = {
        title: string;
        fieldName: 'evidenciaCapacitacion' | 'listadoAsistencia';
    };

    const FileUploadGroup = ({ title, fieldName }: FileUploadGroupProps) => (
        <div className="space-y-2">
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
                {(formData[fieldName] as string[] || []).map((url, index) => (
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
    );

    return (
        <AppLayout pageTitle="Cronograma de Actividades">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Cronograma de Actividades PVE</CardTitle>
                            <CardDescription>Planificar y hacer seguimiento a las actividades de los programas de vigilancia.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="gap-1" onClick={downloadUpdateTemplate}><Download className="h-4 w-4" />Descargar Seguimiento</Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}><Download className="h-4 w-4" />Descargar Planificación</Button>
                             <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, fileInputRef.current?.getAttribute('data-secure') === 'true')} className="hidden" accept=".csv" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1"><Upload className="h-4 w-4" />Cargar Archivo</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => handleUploadClick('planning')}>Cargar Planificación</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUploadClick('tracking')}>Cargar Seguimiento</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                <PlusCircle className="h-4 w-4" />
                                Añadir Actividad
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Collapsible className="space-y-4 mb-4">
                        <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Filter className="h-4 w-4"/>Filtrar Actividades</Button></CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div><Label>PVE</Label><Select value={filterPve} onValueChange={setFilterPve}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent>{pvePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>Mes</Label><Select value={filterMes} onValueChange={setFilterMes}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>Estado</Label><Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent><SelectItem value="Programado">Programado</SelectItem><SelectItem value="Ejecutado">Ejecutado</SelectItem><SelectItem value="Reprogramado">Reprogramado</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent></Select></div>
                                </div>
                                <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" />Limpiar Filtros</Button></div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    <div className="border rounded-lg mt-4 overflow-x-auto">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('fecha')}>Fecha {getSortIcon('fecha')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('nombreActividad')}>Actividad {getSortIcon('nombreActividad')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('pve')}>PVE {getSortIcon('pve')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('mes')}>Mes {getSortIcon('mes')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('cantidadProgramada')}>Cant. Prog. {getSortIcon('cantidadProgramada')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('coberturaProgramada')}>Cobe. Prog. {getSortIcon('coberturaProgramada')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('cantidadEjecutada')}>Cant. Ejec. {getSortIcon('cantidadEjecutada')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('coberturaEjecutada')}>Cobe. Ejec. {getSortIcon('coberturaEjecutada')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('estado')}>Estado {getSortIcon('estado')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('cumplimientoCronograma')}>Cumplimiento {getSortIcon('cumplimientoCronograma')}</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('cobertura')}>Cobertura {getSortIcon('cobertura')}</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedActivities.length > 0 ? sortedActivities.map(item => (
                                    <TableRow key={item.id} onClick={() => handleViewDetails(item)} className="cursor-pointer">
                                        <TableCell>{formatDate(item.fecha)}</TableCell>
                                        <TableCell>{item.nombreActividad}</TableCell>
                                        <TableCell>{item.pve}</TableCell>
                                        <TableCell>{item.mes}</TableCell>
                                        <TableCell>{item.cantidadProgramada}</TableCell>
                                        <TableCell>{item.coberturaProgramada}</TableCell>
                                        <TableCell>{item.cantidadEjecutada}</TableCell>
                                        <TableCell>{item.coberturaEjecutada}</TableCell>
                                        <TableCell>{item.estado}</TableCell>
                                        <TableCell>{item.cumplimientoCronograma}</TableCell>
                                        <TableCell>{item.cobertura}</TableCell>
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
                                    <TableRow><TableCell colSpan={12} className="text-center h-24">No hay actividades programadas.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedActivity && <ActivityScheduleDetails activity={selectedActivity} onClose={() => setIsDetailsOpen(false)} onEdit={() => { setIsDetailsOpen(false); handleOpenForm(selectedActivity); }} />}
            </Dialog>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Actividad' : 'Nueva Actividad del Cronograma'}</DialogTitle>
                        <DialogDescription>Complete la información de planificación y seguimiento.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Información de Planificación</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Fecha de programación</Label><Input type="date" value={dateToInputFormat(formData.fecha)} onChange={e => handleChange('fecha', e.target.value)} /></div>
                                <div><Label>PVE</Label><Select value={formData.pve} onValueChange={v => handleChange('pve', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{pvePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label>Mes (Automático)</Label><Input value={formData.mes} readOnly /></div>
                                <div className="col-span-3"><Label>Nombre de la Actividad</Label><Input value={formData.nombreActividad} onChange={e => handleChange('nombreActividad', e.target.value)} /></div>
                                <div><Label>Cantidad Programada</Label><Input type="number" value={formData.cantidadProgramada} onChange={e => handleNumericChange('cantidadProgramada', e.target.value)} /></div>
                                <div><Label>Cobertura Programada</Label><Input type="number" value={formData.coberturaProgramada} onChange={e => handleNumericChange('coberturaProgramada', e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 border rounded-lg">
                             <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    Información de Ejecución
                                    {isUnlocked && <Unlock className="h-4 w-4 text-green-600"/>}
                                </h3>
                                {!isUnlocked && (
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="codigoSeguridad">Código</Label>
                                        <Input id="codigoSeguridad" className="w-32" value={formData.codigoSeguridad} onChange={e => handleChange('codigoSeguridad', e.target.value)} />
                                        <Button type="button" size="icon" variant="outline" onClick={handleCodeCheck}><Lock /></Button>
                                    </div>
                                )}
                            </div>
                            <fieldset disabled={!isUnlocked} className="grid grid-cols-3 gap-4 pt-4 disabled:opacity-50">
                                 <div>
                                     <Label>Estado</Label>
                                     <Select value={formData.estado} onValueChange={v => handleChange('estado', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Programado">Programado</SelectItem>
                                            <SelectItem value="Ejecutado">Ejecutado</SelectItem>
                                            <SelectItem value="Reprogramado">Reprogramado</SelectItem>
                                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                                        </SelectContent>
                                     </Select>
                                 </div>
                                 <div><Label>Fecha de Reprogramación</Label><Input type="date" value={dateToInputFormat(formData.fechaReprogramacion)} onChange={e => handleChange('fechaReprogramacion', e.target.value)} /></div>
                                 <div className="col-span-3"><Label>Observaciones (Motivo)</Label><Textarea value={formData.observaciones} onChange={e => handleChange('observaciones', e.target.value)} /></div>
                                 <div><Label>Cantidad Ejecutada</Label><Input type="number" value={formData.cantidadEjecutada} onChange={e => handleNumericChange('cantidadEjecutada', e.target.value)} /></div>
                                 <div><Label>Cobertura Ejecutada</Label><Input type="number" value={formData.coberturaEjecutada} onChange={e => handleNumericChange('coberturaEjecutada', e.target.value)} /></div>
                                 <div><Label>Reprogramación</Label><Input type="date" value={dateToInputFormat(formData.reprogramacion)} onChange={e => handleChange('reprogramacion', e.target.value)} /></div>
                                 <div><Label>Cumplimiento Cronograma</Label><Input value={formData.cumplimientoCronograma} readOnly /></div>
                                 <div><Label>Cobertura</Label><Input value={formData.cobertura} readOnly /></div>
                            </fieldset>
                        </div>
                        
                         <div className="space-y-4 p-4 border rounded-lg">
                             <h3 className="font-semibold text-lg">Soportes</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FileUploadGroup title="Evidencia Capacitación" fieldName="evidenciaCapacitacion" />
                                <FileUploadGroup title="Listado de Asistencia" fieldName="listadoAsistencia" />
                            </div>
                        </div>
                        
                        <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">Guardar Actividad</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isSecurityAlertOpen} onOpenChange={setIsSecurityAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Código de Seguridad Requerido</AlertDialogTitle>
                        <AlertDialogDescription>
                           Para cargar un archivo con datos de seguimiento, por favor ingrese el código de seguridad.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="upload-security-code">Código de Seguridad</Label>
                        <Input 
                            id="upload-security-code" 
                            type="password"
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value)}
                            placeholder="Ingrese el código"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setPendingFile(null); setSecurityCode(''); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSecurityCheck}>Procesar Archivo</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);

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

const ActivityScheduleDetails = ({ activity, onClose, onEdit }: { activity: ActivitySchedule, onClose: () => void, onEdit: () => void }) => {
    return (
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalle de la Actividad</DialogTitle>
                <DialogDescription>
                    {activity.nombreActividad} - {formatDate(activity.fecha)}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información de Planificación</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Fecha Programada" value={formatDate(activity.fecha)} />
                        <DetailItem label="PVE" value={activity.pve} />
                        <DetailItem label="Mes" value={activity.mes} />
                        <DetailItem label="Nombre Actividad" value={activity.nombreActividad} />
                        <DetailItem label="Cantidad Programada" value={activity.cantidadProgramada} />
                        <DetailItem label="Cobertura Programada" value={activity.coberturaProgramada} />
                    </div>
                </div>
                <Separator />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información de Ejecución</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                       <DetailItem label="Estado" value={activity.estado} />
                       <DetailItem label="Cantidad Ejecutada" value={activity.cantidadEjecutada} />
                       <DetailItem label="Cobertura Ejecutada" value={activity.coberturaEjecutada} />
                       <DetailItem label="Cumplimiento Cronograma" value={activity.cumplimientoCronograma} />
                       <DetailItem label="Cobertura" value={activity.cobertura} />
                       <DetailItem label="Fecha de Reprogramación" value={formatDate(activity.fechaReprogramacion)} />
                       <div className="col-span-full"><DetailItem label="Observaciones" value={activity.observaciones} /></div>
                    </div>
                </div>
                <Separator />
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Soportes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SupportSection title="Evidencia de Capacitación" urls={activity.evidenciaCapacitacion} />
                        <SupportSection title="Listado de Asistencia" urls={activity.listadoAsistencia} />
                         {(!activity.evidenciaCapacitacion || activity.evidenciaCapacitacion.length === 0) &&
                          (!activity.listadoAsistencia || activity.listadoAsistencia.length === 0) &&
                          <p className="text-sm text-muted-foreground col-span-full text-center py-4">No hay soportes adjuntos para esta actividad.</p>
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
