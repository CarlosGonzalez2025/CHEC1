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
import { MoreHorizontal, PlusCircle, Download, Upload, Filter, X, Calendar as CalendarIcon, ChevronsUpDown, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { addAbsence, updateAbsence, uploadFile } from '@/lib/data';
import type { Absence } from '@/lib/types';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Combobox } from '@/components/ui/combobox';
import { cie10Codes } from '@/lib/cie10-data';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';


const initialAbsenceState: Omit<Absence, 'id'> = {
  employeeId: '',
  tenantId: '',
  nombreCompleto: '',
  identificacion: '',
  edad: null,
  fechaNacimiento: null,
  genero: '',
  telefono: '',
  cargo: '',
  centroDeCosto: '',
  fechaInicio: null,
  fechaFinal: null,
  dias: 0,
  horas: 0,
  costoAusentismo: 0,
  tipoAusencia: '',
  motivoAusencia: '',
  codigoCie10: '',
  diagnostico: '',
  sistemaAlterado: '',
  seguimiento: '',
  actividadesRealizar: '',
  soportes: [],
  status: 'Pending',
};

const absenceReasonMap: { [key: string]: string[] } = {
    'EG': [
        'Causas relacionadas con la salud',
        'Incapacidad por enfermedad general',
        'Incapacidad por enfermedad laboral',
        'Enfermedad General',
        'Cita médica EG',
    ],
    'AT': [
        'Accidente de trabajo',
        'Causas relacionadas con accidente de trabajo',
        'Cita médica AT',
    ],
    'LP': ['Licencia de paternidad'],
    'LR': [
        'Dia de la Familia',
        'Licencia Remunerada',
        'Licencia por Luto',
        'Calamidad',
        'Permiso Personal',
        'Tramites medicos',
        'Licencia por Matrimonio',
        'Día de la familia',
    ],
    'LRN': [
        'Licencia no Remunerada',
        'Ausencia no Justificada',
        'Suspension de contrato',
        'Ausentismo',
        'Ausencia no justificada'
    ]
};

const sistemasAlterados = [
    'APARATO REPRODUCTOR',
    'AUDITIVO',
    'CARDIOVASCULAR',
    'DERMATOLOGICO',
    'DIGESTIVO',
    'GINECOLOGICO',
    'NERVIOSO',
    'NEUROLOGICO',
    'ORAL',
    'OSTEOMUSCULAR',
    'PSICOSOCIAL',
    'RENAL',
    'RESPIRATORIO',
    'URINARIO',
    'VISUAL',
];


function dateToInputFormat(date: Date | null | string, includeTime = false): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        if (includeTime) {
            return d.toISOString().slice(0, 16);
        }
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

function formatDate(date: Date | null | string, includeTime = false): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        };
        if (includeTime) {
            options.hour = 'numeric';
            options.minute = 'numeric';
        }
        return new Intl.DateTimeFormat('es-CO', options).format(d);
    } catch (e) { return 'N/A'; }
}

function calculateAge(birthDate: Date | null): number | null {
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function calculateWorkingHours(start: Date, end: Date): { hours: number, days: number } {
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { hours: 0, days: 0 };
    }

    if (isSameDay(start, end)) {
      return { hours: 8, days: 1 };
    }

    let workingHours = 0;
    let runnerDate = new Date(start);

    while (runnerDate < end) {
        const dayOfWeek = runnerDate.getUTCDay(); // 0=Sunday, 6=Saturday
        const hourOfDay = runnerDate.getUTCHours();

        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            if ((hourOfDay >= 8 && hourOfDay < 12) || (hourOfDay >= 13 && hourOfDay < 17)) {
                workingHours++;
            }
        } else if (dayOfWeek === 6) { // Saturday
            if (hourOfDay >= 8 && hourOfDay < 12) {
                workingHours++;
            }
        }
        
        runnerDate.setHours(runnerDate.getHours() + 1);
    }

    const workDays = workingHours > 0 ? workingHours / 8 : 0;

    return { 
        hours: parseFloat(workingHours.toFixed(2)),
        days: parseFloat(workDays.toFixed(2)),
    };
}


export default function AbsenceTrackingPage() {
    const { user, absences, employees, loading, tenantId, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Omit<Absence, 'id'>>(initialAbsenceState);
    const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
    
    // Filters
    const [filterIdentificacion, setFilterIdentificacion] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [filterFechaInicio, setFilterFechaInicio] = useState<Date | undefined>();

    // Bulk upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(Omit<Absence, 'id'> & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<Omit<Absence, 'id'>[]>([]);

    const handleSelectEmployee = (employeeId: string) => {
        const selectedEmployee = employees.find(emp => emp.id === employeeId);
        if (selectedEmployee) {
            const age = calculateAge(selectedEmployee.birthDate);
            setFormData(prev => ({
                ...prev,
                employeeId: selectedEmployee.id,
                nombreCompleto: selectedEmployee.fullName,
                identificacion: selectedEmployee.identification,
                edad: age,
                fechaNacimiento: selectedEmployee.birthDate,
                genero: selectedEmployee.gender,
                telefono: selectedEmployee.mobilePhone,
                cargo: selectedEmployee.position,
                centroDeCosto: selectedEmployee.payrollDescription,
            }));
        }
    };

    const handleDateChange = (id: 'fechaInicio' | 'fechaFinal', value: string) => {
        const dateValue = value ? new Date(value) : null;
        setFormData(prev => ({ ...prev, [id]: dateValue }));
    };

    useEffect(() => {
        if (formData.fechaInicio && formData.fechaFinal && formData.employeeId && employees.length > 0) {
            const { hours, days } = calculateWorkingHours(new Date(formData.fechaInicio), new Date(formData.fechaFinal));
            const employee = employees.find(e => e.id === formData.employeeId);
            const hourlyRate = employee?.hourlyRate || 0;
            const cost = hours * hourlyRate;

            setFormData(prev => ({
                ...prev,
                horas: hours,
                dias: days,
                costoAusentismo: parseFloat(cost.toFixed(2)),
            }));
        }
    }, [formData.fechaInicio, formData.fechaFinal, formData.employeeId, employees]);


    const handleOpenForm = (absence: Absence | null = null) => {
        if (absence) {
            setEditingAbsenceId(absence.id);
            setFormData({
                ...absence,
                soportes: absence.soportes || [],
            });
        } else {
            setEditingAbsenceId(null);
            setFormData(initialAbsenceState);
        }
        setIsFormOpen(true);
    };

     const handleViewDetails = (absence: Absence) => {
        setSelectedAbsence(absence);
        setIsDetailsOpen(true);
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (!formData.employeeId || !tenantId) {
            toast({ title: "Error de validación", description: "Debe seleccionar un empleado y tener un tenant ID.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        try {
            if (editingAbsenceId) {
                await updateAbsence(editingAbsenceId, formData, tenantId);
                toast({ title: "Registro Actualizado", description: "El registro de ausencia ha sido actualizado." });
            } else {
                const result = await addAbsence(formData, tenantId);
                if (result.notificationSent) {
                    toast({ title: "Registro Guardado", description: "El registro de ausencia y la notificación se han procesado correctamente." });
                } else {
                     toast({ 
                        title: "Registro Guardado, pero Falló la Notificación", 
                        description: `El registro se guardó, pero el correo no se pudo enviar. Error: ${result.notificationError}`,
                        variant: "destructive" 
                    });
                }
            }
            setIsFormOpen(false);
            setEditingAbsenceId(null);
            setFormData(initialAbsenceState);
            fetchAllData();
        } catch (error) {
            console.error("Error saving absence:", error);
            toast({ title: "Error al Guardar", description: "No se pudo guardar el registro de ausencia.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleTypeChange = (type: string) => {
        setFormData(prev => ({
            ...prev,
            tipoAusencia: type,
            motivoAusencia: '', // Reset reason when type changes
            sistemaAlterado: !['LR', 'LRN'].includes(type) ? prev.sistemaAlterado : '',
        }));
    };
    
    const handleCie10Select = (value: string) => {
        const selectedCodeData = cie10Codes.find(code => code.value.toLowerCase() === value.toLowerCase());
        if (selectedCodeData) {
            const description = selectedCodeData.label.substring(selectedCodeData.label.indexOf('-') + 1).trim();
            setFormData(prev => ({
                ...prev,
                codigoCie10: selectedCodeData.value,
                diagnostico: description,
            }));
        } else {
             setFormData(prev => ({ ...prev, codigoCie10: value, diagnostico: '' }));
        }
    };

    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'absence-soportes');
            setFormData(prev => ({ ...prev, soportes: [...(prev.soportes || []), downloadURL] }));
            toast({ title: 'Soporte cargado', description: 'El archivo se ha subido correctamente.' });
        } catch (error) {
            toast({ title: 'Error al subir', description: 'No se pudo cargar el archivo.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const removeSoporte = (urlToRemove: string) => {
        setFormData(prev => ({ ...prev, soportes: (prev.soportes || []).filter(url => url !== urlToRemove) }));
    };

    const filteredAbsences = useMemo(() => {
        return absences.filter(absence => {
            const fechaMatch = !filterFechaInicio || (absence.fechaInicio && format(new Date(absence.fechaInicio), 'yyyy-MM-dd') === format(filterFechaInicio, 'yyyy-MM-dd'));
            return (
                absence.identificacion.toLowerCase().includes(filterIdentificacion.toLowerCase()) &&
                (filterTipo === '' || absence.tipoAusencia === filterTipo) &&
                fechaMatch
            );
        });
    }, [absences, filterIdentificacion, filterTipo, filterFechaInicio]);

    const absenceCSVHeaders = [
      'identificacion', 'nombreCompleto', 'cargo', 'centroDeCosto', 'fechaInicio', 
      'fechaFinal', 'dias', 'horas', 'costoAusentismo', 'tipoAusencia', 
      'motivoAusencia', 'codigoCie10', 'diagnostico', 'sistemaAlterado', 
      'seguimiento', 'actividadesRealizar'
    ];

    const downloadCSVTemplate = () => {
        const csvHeader = absenceCSVHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_ausentismo.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadData = () => {
        if (filteredAbsences.length === 0) {
            toast({ title: "No hay datos para exportar" });
            return;
        }
        const dataToExport = filteredAbsences.map(item => {
            const row: { [key: string]: any } = {};
            absenceCSVHeaders.forEach(key => {
                 const value = item[key as keyof Absence];
                 if (value instanceof Date) {
                    row[key] = value.toISOString();
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
        link.setAttribute("download", "export_ausentismo.csv");
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
        if (!tenantId || !employees || !absences) {
            toast({ title: 'Datos no disponibles', description: 'Los datos de la aplicación aún se están cargando. Por favor, espere un momento y vuelva a intentarlo.', variant: 'destructive' });
            return;
        }
        const employeeMap = new Map(employees.map(emp => [emp.identification, emp]));
        const uploadedDuplicates: (Omit<Absence, 'id'> & { id: string })[] = [];
        const uploadedNewRecords: Omit<Absence, 'id'>[] = [];

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
                'dd.MM.yyyy', 'd.M.yyyy', 'dd MMM yyyy', 'd MMM yyyy',
                'dd/MM/yyyy HH:mm', 'd/M/yyyy H:m'
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
            const startDate = parseDate(row.fechaInicio);
            if (!row.identificacion || !startDate) return;

            const employee = employeeMap.get(row.identificacion);
            if (!employee) return;
            
            const record: Omit<Absence, 'id'> = {
                ...initialAbsenceState,
                employeeId: employee.id,
                tenantId: tenantId,
                nombreCompleto: row.nombreCompleto || employee.fullName,
                identificacion: row.identificacion || employee.identification,
                cargo: row.cargo || employee.position,
                centroDeCosto: row.centroDeCosto || employee.payrollDescription,
                fechaInicio: startDate,
                fechaFinal: parseDate(row.fechaFinal),
                dias: parseFloat(String(row.dias || 0).replace(',', '.')),
                horas: parseFloat(String(row.horas || 0).replace(',', '.')),
                costoAusentismo: parseFloat(String(row.costoAusentismo || 0).replace(',', '.')),
                tipoAusencia: row.tipoAusencia || '',
                motivoAusencia: row.motivoAusencia || '',
                codigoCie10: row.codigoCie10 || '',
                diagnostico: row.diagnostico || '',
                sistemaAlterado: row.sistemaAlterado || '',
                seguimiento: row.seguimiento || '',
                actividadesRealizar: row.actividadesRealizar || '',
            };

            const existingRecord = absences.find(a => 
                a.identificacion === record.identificacion && 
                a.fechaInicio && new Date(a.fechaInicio).toISOString() === startDate.toISOString()
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
    
    const handleBulkCreate = async (records: Omit<Absence, 'id'>[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addAbsence(rec, tenantId)));
            toast({ title: `${records.length} registros creados con éxito.` });
            fetchAllData();
        } catch (error) { 
            console.error("Bulk create failed:", error);
            toast({ title: 'Error en la creación masiva', variant: 'destructive' }); 
        }
    };

    const handleBulkUpdate = async (records: (Omit<Absence, 'id'> & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateAbsence(rec.id, rec, tenantId)));
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

    const clearFilters = () => {
        setFilterIdentificacion('');
        setFilterTipo('');
        setFilterFechaInicio(undefined);
    };


    return (
        <AppLayout pageTitle="Gestión de Ausentismo">
            <Card>
                <CardHeader>
                    <div className="flex flex-row items-start justify-between">
                      <div>
                          <CardTitle>Todos los Registros de Ausentismo</CardTitle>
                          <CardDescription>
                            Ver, gestionar, filtrar y cargar registros de ausentismo.
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadData}><Download className="h-4 w-4" />Descargar Datos</Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}><Download className="h-4 w-4" />Descargar Plantilla</Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" />Cargar Archivo</Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                            setIsFormOpen(isOpen);
                            if (!isOpen) {
                                setEditingAbsenceId(null);
                                setFormData(initialAbsenceState);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Ausencia
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{editingAbsenceId ? 'Editar Ausencia' : 'Registrar Nueva Ausencia'}</DialogTitle>
                                    <DialogDescription>
                                        Complete los detalles para el registro de ausentismo.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSave}>
                                    <Tabs defaultValue="info-general">
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="info-general">Información General</TabsTrigger>
                                            <TabsTrigger value="diagnostico">Diagnóstico y Motivo</TabsTrigger>
                                            <TabsTrigger value="seguimiento">Seguimiento y Soportes</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="info-general" className="py-4 space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <Label htmlFor="cedula-select">Cédula del Empleado</Label>
                                                    <Select onValueChange={handleSelectEmployee} value={formData.employeeId} disabled={!!editingAbsenceId}>
                                                        <SelectTrigger id="cedula-select">
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
                                                <div><Label>Nombre Completo</Label><Input value={formData.nombreCompleto} readOnly /></div>
                                                <div><Label>Identificación</Label><Input value={formData.identificacion} readOnly /></div>
                                                <div><Label>Edad</Label><Input value={formData.edad || ''} readOnly /></div>
                                                <div><Label>Cargo</Label><Input value={formData.cargo} readOnly /></div>
                                                <div><Label>Centro de Costo</Label><Input value={formData.centroDeCosto} readOnly /></div>
                                            </div>
                                             <hr />
                                            <div className="grid grid-cols-3 gap-4 items-end">
                                                <div><Label>Fecha y Hora de Inicio</Label><Input type="datetime-local" value={dateToInputFormat(formData.fechaInicio, true)} onChange={(e) => handleDateChange('fechaInicio', e.target.value)} /></div>
                                                <div><Label>Fecha y Hora Final</Label><Input type="datetime-local" value={dateToInputFormat(formData.fechaFinal, true)} onChange={(e) => handleDateChange('fechaFinal', e.target.value)} /></div>
                                                <div><Label>Días de Ausencia (Jornadas 8h)</Label><Input value={formData.dias} readOnly /></div>
                                                <div><Label>Horas de Ausencia</Label><Input value={formData.horas} readOnly /></div>
                                                <div><Label>Costo Ausentismo</Label><Input value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(formData.costoAusentismo)} readOnly /></div>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="diagnostico" className="py-4 space-y-4">
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Tipo de Ausencia</Label>
                                                    <Select onValueChange={handleTypeChange} value={formData.tipoAusencia}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione un tipo..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.keys(absenceReasonMap).map(type => (
                                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Motivo de la Ausencia</Label>
                                                    <Select
                                                        onValueChange={(value) => setFormData(p => ({ ...p, motivoAusencia: value }))}
                                                        value={formData.motivoAusencia}
                                                        disabled={!formData.tipoAusencia}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione un motivo..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {formData.tipoAusencia && absenceReasonMap[formData.tipoAusencia] ? (
                                                                absenceReasonMap[formData.tipoAusencia].map(reason => (
                                                                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                                                ))
                                                            ) : (
                                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Seleccione primero un tipo</div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Código CIE 10</Label>
                                                    <Combobox
                                                        items={cie10Codes}
                                                        value={formData.codigoCie10}
                                                        onChange={handleCie10Select}
                                                        placeholder="Buscar código..."
                                                        searchPlaceholder="Buscar código CIE-10..."
                                                        noResultsText="No se encontraron códigos."
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Sistema Alterado</Label>
                                                    <Select 
                                                        onValueChange={(value) => setFormData(p => ({ ...p, sistemaAlterado: value }))} 
                                                        value={formData.sistemaAlterado}
                                                        disabled={['LR', 'LRN'].includes(formData.tipoAusencia)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione un sistema..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sistemasAlterados.map(sistema => (
                                                                <SelectItem key={sistema} value={sistema}>{sistema}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-full"><Label>Diagnóstico</Label><Textarea value={formData.diagnostico} readOnly /></div>
                                           </div>
                                        </TabsContent>
                                        <TabsContent value="seguimiento" className="py-4 space-y-4">
                                             <div className="grid grid-cols-1 gap-4">
                                                <div><Label>Seguimiento</Label><Textarea value={formData.seguimiento} onChange={e => setFormData(p => ({...p, seguimiento: e.target.value}))} /></div>
                                                <div><Label>Actividades a Realizar</Label><Textarea value={formData.actividadesRealizar} onChange={e => setFormData(p => ({...p, actividadesRealizar: e.target.value}))} /></div>
                                                <div>
                                                    <Label>Soportes</Label>
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
                                             </div>
                                        </TabsContent>
                                    </Tabs>
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar Registro
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Collapsible className="space-y-4 mb-4">
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                                <Filter className="h-4 w-4"/>
                                Filtrar Ausencias
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="filter-id">Identificación</Label>
                                        <Input id="filter-id" placeholder="Buscar por identificación..." value={filterIdentificacion} onChange={(e) => setFilterIdentificacion(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label htmlFor="filter-tipo">Tipo de Ausencia</Label>
                                        <Select value={filterTipo} onValueChange={setFilterTipo}>
                                            <SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                             <SelectContent>
                                                  <SelectItem value="EG">EG - Enfermedad General</SelectItem>
                                                  <SelectItem value="AT">AT - Accidente de Trabajo</SelectItem>
                                                  <SelectItem value="LP">LP - Licencia Paternidad</SelectItem>
                                                  <SelectItem value="LR">LR - Licencia Remunerada</SelectItem>
                                                  <SelectItem value="LRN">LRN - Licencia No Remunerada</SelectItem>
                                              </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="filter-start-date">Fecha de Inicio</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filterFechaInicio ? format(filterFechaInicio, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                            </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={filterFechaInicio} onSelect={setFilterFechaInicio} initialFocus/>
                                            </PopoverContent>
                                        </Popover>
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
                            <TableHead>Tipo de Ausencia</TableHead>
                            <TableHead>Fechas</TableHead>
                            <TableHead>Horas</TableHead>
                            <TableHead>
                              <span className="sr-only">Acciones</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                          ) : filteredAbsences.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No hay registros de ausencia.</TableCell>
                            </TableRow>
                          ) : (
                            filteredAbsences.map((absence) => (
                            <TableRow key={absence.id} onClick={() => handleViewDetails(absence)} className="cursor-pointer">
                              <TableCell className="font-medium">
                                {absence.nombreCompleto}
                              </TableCell>
                              <TableCell>{absence.identificacion}</TableCell>
                              <TableCell>{absence.tipoAusencia}</TableCell>
                              <TableCell>
                                {absence.fechaInicio ? format(absence.fechaInicio, 'P p', { locale: es }) : 'N/A'} - {absence.fechaFinal ? format(absence.fechaFinal, 'P p', { locale: es }) : 'N/A'}
                              </TableCell>
                              <TableCell>{absence.horas}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Toggle menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(absence); }}>Ver Detalles</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenForm(absence); }}>Editar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )))}
                        </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedAbsence && 
                    <AbsenceDetails 
                        absence={selectedAbsence} 
                        onClose={() => setIsDetailsOpen(false)} 
                        onEdit={() => {
                            setIsDetailsOpen(false);
                            handleOpenForm(selectedAbsence);
                        }}
                    />
                }
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

const AbsenceDetails = ({ absence, onClose, onEdit }: { absence: Absence, onClose: () => void, onEdit: () => void }) => {
    return (
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalle de Ausencia</DialogTitle>
                <DialogDescription>
                    Registro de {absence.nombreCompleto}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                {/* Employee Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Empleado</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Nombre Completo" value={absence.nombreCompleto} />
                        <DetailItem label="Identificación" value={absence.identificacion} />
                        <DetailItem label="Cargo" value={absence.cargo} />
                        <DetailItem label="Centro de Costo" value={absence.centroDeCosto} />
                    </div>
                </div>
                <Separator />
                {/* Absence Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Detalles del Ausentismo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                       <DetailItem label="Fecha y Hora de Inicio" value={formatDate(absence.fechaInicio, true)} />
                       <DetailItem label="Fecha y Hora Final" value={formatDate(absence.fechaFinal, true)} />
                       <DetailItem label="Horas de Ausencia" value={absence.horas} />
                       <DetailItem label="Días (Jornadas 8h)" value={absence.dias} />
                       <DetailItem label="Costo Ausentismo" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(absence.costoAusentismo)} />
                    </div>
                </div>
                <Separator />
                {/* Diagnosis Info */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Diagnóstico y Motivo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        <DetailItem label="Tipo de Ausencia" value={absence.tipoAusencia} />
                        <DetailItem label="Motivo de la Ausencia" value={absence.motivoAusencia} />
                        <DetailItem label="Código CIE 10" value={absence.codigoCie10} />
                        <DetailItem label="Sistema Alterado" value={absence.sistemaAlterado} />
                        <DetailItem label="Diagnóstico" value={absence.diagnostico} className="col-span-full"/>
                    </div>
                </div>
                <Separator />
                {/* Follow-up & Attachments */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Seguimiento y Soportes</h3>
                     <div className="space-y-4">
                        <DetailItem label="Seguimiento" value={<p className="whitespace-pre-wrap">{absence.seguimiento}</p>} />
                        <DetailItem label="Actividades a Realizar" value={<p className="whitespace-pre-wrap">{absence.actividadesRealizar}</p>} />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Soportes</p>
                             {(absence.soportes && absence.soportes.length > 0) ? (
                                <div className="flex flex-col gap-2 mt-1">
                                    {absence.soportes.map((url, index) => (
                                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 border rounded-md w-fit">
                                            <Paperclip className="h-4 w-4" />
                                            <span>Ver Soporte {index + 1}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm mt-1">No hay soportes adjuntos.</p>
                            )}
                        </div>
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
    