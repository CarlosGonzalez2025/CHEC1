'use client';
import { Button } from '@/components/ui/button';
import { Check, MoreHorizontal, PlusCircle, Download, Upload, Filter, X, Loader2, Paperclip, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { useState, useMemo, useRef, useEffect } from 'react';
import type { Emo } from '@/lib/types';
import type { Employee } from '@/lib/data';
import { addEmo, updateEmo, uploadFile } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
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
import { useAuth } from '@/hooks/use-auth';

const initialEmoState: Omit<Emo, 'id' | 'edad'> = {
  employeeId: '',
  fechaIngresoBase: null,
  fechaExamen: null,
  ipsRemision: '',
  tipoExamen: '',
  nombreCompleto: '',
  tipoDocumento: '',
  cedula: '',
  fechaNacimiento: null,
  sexo: '',
  telefono: '',
  estadoCivil: '',
  fechaIngreso: null,
  sede: '',
  cargo: '',
  estado: '',
  concepto: '',
  anotacionesPuntuales: '',
  exposicionTar: '',
  ryrTar: '',
  examenMedicoGeneral: '',
  audiometria: '',
  osteomuscular: '',
  cuadroHematico: '',
  funcionRenal: '',
  funcionHepatica: '',
  perfilLipidico: '',
  glicemia: '',
  espirometria: '',
  psicosensometrico: '',
  electrocardiograma: '',
  optometria: '',
  coprologico: '',
  kohUnas: '',
  frotisGarganta: '',
  testAlturas: '',
  testDrogas: '',
  otro: '',
  recomendacionesEmpleador: '',
  recomendacionesColaborador: '',
  auditivo: '',
  osteomuscularRecomendacion: '',
  cardiovascular: '',
  psicosocial: '',
  respiratorio: '',
  visual: '',
  alturas: null,
  confinados: null,
  manejoDefensivo: null,
  optometriaRecomendacion: '',
  tipoVencimientoOptometria: '',
  audiometriaRecomendacion: '',
  espirometriaRecomendacion: '',
  tipoVencimientoEspirometria: '',
  certificadoOnac: null,
  cursoSst: null,
  manejoAlimentos: null,
  manejoTrafico: null,
  soportes: [],
};

type SortConfig = {
  key: keyof Emo | null;
  direction: 'asc' | 'desc';
};

type UploadedEmo = Omit<Emo, 'id' | 'edad'>;

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
        if(isNaN(d.getTime())) return 'N/A';
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('es-CO');
    } catch (e) {
        return 'N/A';
    }
}

function getConceptoBadge(concepto: string) {
    if(!concepto) return null;
    const lower = concepto.toLowerCase();
    if (lower.includes('apto') && !lower.includes('no')) {
        return <Badge className="bg-green-600">APTO</Badge>;
    } else if (lower.includes('no apto')) {
        return <Badge variant="destructive">NO APTO</Badge>;
    } else if (lower.includes('restricciones') || lower.includes('recomendaciones')) {
        return <Badge className="bg-yellow-600">CON RESTRICCIONES</Badge>;
    } else if (lower.includes('aplazado')) {
        return <Badge className="bg-orange-600">APLAZADO</Badge>;
    } else if (lower.includes('satisfactorio')) {
        return <Badge className="bg-blue-600">SATISFACTORIO</Badge>;
    }
    return <Badge variant="secondary">{concepto}</Badge>;
}

function getResultBadge(result: string) {
    const lower = result?.toLowerCase() || '';
    if (lower.includes('normal') || lower.includes('apto') || lower.includes('negativo') || lower.includes('sin alteración')) {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">{result}</Badge>;
    } else if (lower.includes('anormal') || lower.includes('con alteración') || lower.includes('positivo')) {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">{result}</Badge>;
    } else if (lower.includes('no aplica') || lower === 'n/a') {
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 text-xs">N/A</Badge>;
    }
    return <span className="text-xs text-muted-foreground">{result || 'N/A'}</span>;
}

const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) => (
    <div className={className}>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);

export default function EmoPage() {
    const { user, employees, emos, tenantId, costCenters, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Omit<Emo, 'id' | 'edad'>>(initialEmoState);
    const [editingEmoId, setEditingEmoId] = useState<string | null>(null);
    const { toast } = useToast();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedEmo, setSelectedEmo] = useState<Emo | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(UploadedEmo & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<UploadedEmo[]>([]);

    const [filterCedula, setFilterCedula] = useState('');
    const [filterTipoExamen, setFilterTipoExamen] = useState('');
    const [filterConcepto, setFilterConcepto] = useState('');
    const [filterFechaExamen, setFilterFechaExamen] = useState<Date | undefined>(undefined);
    const [isCandidate, setIsCandidate] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

    const filteredEmos = useMemo(() => {
        const userCostCenters = user?.costCenters || [];
        const canViewAll = userCostCenters.length === 0;

        return emos.filter(emo => {
            const fechaExamenMatch = !filterFechaExamen || (emo.fechaExamen && format(new Date(emo.fechaExamen), 'yyyy-MM-dd') === format(filterFechaExamen, 'yyyy-MM-dd'));
            const costCenterMatch = canViewAll || userCostCenters.includes(emo.sede);
            
            return (
                costCenterMatch &&
                emo.cedula.toLowerCase().includes(filterCedula.toLowerCase()) &&
                (filterTipoExamen === '' || emo.tipoExamen === filterTipoExamen) &&
                (filterConcepto === '' || emo.concepto === filterConcepto) &&
                fechaExamenMatch
            );
        });
    }, [emos, filterCedula, filterTipoExamen, filterConcepto, filterFechaExamen, user]);

    const sortedEmos = useMemo(() => {
        if (!sortConfig.key) return filteredEmos;

        return [...filteredEmos].sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            if (aValue instanceof Date && bValue instanceof Date) {
                return sortConfig.direction === 'asc'
                    ? aValue.getTime() - bValue.getTime()
                    : bValue.getTime() - aValue.getTime();
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredEmos, sortConfig]);

    const paginatedEmos = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return sortedEmos.slice(startIndex, endIndex);
    }, [sortedEmos, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(sortedEmos.length / rowsPerPage);

    const handleSort = (key: keyof Emo) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: keyof Emo) => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="ml-1 h-3 w-3 inline" />
            : <ArrowDown className="ml-1 h-3 w-3 inline" />;
    };

    const clearFilters = () => {
        setFilterCedula('');
        setFilterTipoExamen('');
        setFilterConcepto('');
        setFilterFechaExamen(undefined);
        setCurrentPage(1);
    };

    const handleSelectEmployee = (employeeId: string) => {
        const selectedEmployee = employees.find(emp => emp.id === employeeId);
        if (selectedEmployee) {
            setFormData(prev => ({
                ...prev,
                employeeId: selectedEmployee.id,
                nombreCompleto: selectedEmployee.fullName,
                tipoDocumento: selectedEmployee.identificationType,
                cedula: selectedEmployee.identification,
                fechaNacimiento: selectedEmployee.birthDate,
                sexo: selectedEmployee.gender,
                telefono: selectedEmployee.mobilePhone,
                fechaIngreso: selectedEmployee.hireDate,
                sede: selectedEmployee.payrollDescription,
                cargo: selectedEmployee.position,
                estado: selectedEmployee.contractStatus,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                employeeId: '',
                nombreCompleto: prev.nombreCompleto && isCandidate ? prev.nombreCompleto : '',
                cedula: prev.cedula && isCandidate ? prev.cedula : '',
            }));
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };
    
    const handleCheckboxChange = (id: string, checked: boolean | string) => {
        setFormData(prev => ({ ...prev, [id]: checked ? 'X' : '' }));
    };

    const handleDateChange = (id: keyof Emo, value: string) => {
        const dateValue = value ? new Date(value) : null;
        if(dateValue) {
           dateValue.setMinutes(dateValue.getMinutes() + dateValue.getTimezoneOffset());
        }
        setFormData(prev => ({ ...prev, [id]: dateValue }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCandidate && !formData.employeeId) {
            toast({ title: "Error de validación", description: "Debe seleccionar un empleado o marcar la opción 'Registrar Candidato'.", variant: "destructive" });
            return;
        }

        if (!tenantId) {
            toast({ title: "Error", description: "No se pudo identificar a la empresa.", variant: "destructive" });
            return;
        }

        try {
            if (editingEmoId) {
                await updateEmo(editingEmoId, formData, tenantId);
                 toast({ title: "Registro Actualizado", description: "El examen médico ha sido actualizado." });
            } else {
                await addEmo(formData, tenantId);
                toast({ title: "Registro Guardado", description: "El examen médico ha sido registrado." });
            }
            setIsFormOpen(false);
            setEditingEmoId(null);
            setFormData(initialEmoState);
            fetchAllData();
        } catch (error) {
            console.error("Error saving EMO:", error);
            toast({ title: "Error al Guardar", description: "No se pudo registrar el examen.", variant: "destructive" });
        }
    };

    const handleOpenForm = (emo: Emo | null = null) => {
        if (emo) {
            setEditingEmoId(emo.id);
            setFormData({ ...emo });
            setIsCandidate(!emo.employeeId);
        } else {
            setEditingEmoId(null);
            setFormData(initialEmoState);
            setIsCandidate(false);
        }
        setIsFormOpen(true);
    };

    const handleViewDetails = (emo: Emo) => {
        setSelectedEmo(emo);
        setIsDetailsOpen(true);
    };
    
    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'emo-soportes');
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

    const emoCSVHeaders = Object.keys(initialEmoState);

    function downloadCSVTemplate() {
        const csvHeader = emoCSVHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_emos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    const handleDownloadData = () => {
        if (filteredEmos.length === 0) {
            toast({ title: "No hay datos para exportar", description: "La tabla está vacía o los filtros no arrojan resultados." });
            return;
        }
        const dataToExport = filteredEmos.map(emo => {
            const emoData: { [key: string]: any } = {};
            for (const key of emoCSVHeaders) {
                const value = emo[key as keyof Emo];
                if (value instanceof Date) {
                    emoData[key] = value.toLocaleDateString('es-CO');
                } else if (Array.isArray(value)) {
                    emoData[key] = value.join(', ');
                }
                else {
                    emoData[key] = value;
                }
            }
            return emoData;
        });

        const csv = Papa.unparse(dataToExport, { delimiter: ";", header: true });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "export_emos.csv");
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
                error: (error) => toast({ title: 'Error al procesar archivo', description: 'El formato del CSV no es válido.', variant: 'destructive' }),
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const processUploadedData = (data: any[]) => {
        if (!employees || !emos) {
            toast({ title: "Datos no disponibles", description: "Los datos de la aplicación aún se están cargando.", variant: "destructive" });
            return;
        }
        
        const employeeMap = new Map(employees.map(emp => [emp.identification, emp]));

        const uploadedDuplicates: (UploadedEmo & { id: string })[] = [];
        const uploadedNewRecords: UploadedEmo[] = [];

        const parseDate = (dateStr: string | number | undefined): Date | null => {
            if (!dateStr || String(dateStr).trim() === '') return null;
            // Handle Excel's numeric date format
            if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)) && !String(dateStr).includes('/'))) {
                const excelDateNumber = Number(dateStr);
                const date = new Date(Math.round((excelDateNumber - 25569) * 86400 * 1000));
                return date;
            }
            // Handle common string date formats
            if (typeof dateStr === 'string') {
                const standardizedStr = dateStr.replace(/-/g, '/');
                // Regex for dd/mm/yyyy or d/m/yyyy
                const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
                const match = standardizedStr.match(dateRegex);
                if (match) {
                    const day = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
                    const year = parseInt(match[3], 10);
                    const parsed = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues
                    if (!isNaN(parsed.getTime())) {
                        return parsed;
                    }
                }
            }
            // Fallback for other formats like ISO
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        };

        data.forEach(row => {
            const examDate = parseDate(row.fechaExamen);
            if (!row.cedula || !examDate) {
                console.warn("Skipping row due to missing cedula or fechaExamen:", row);
                return;
            }

            const employee = employeeMap.get(row.cedula);
            
            const emoRecord: UploadedEmo = { ...initialEmoState };
            for(const key of emoCSVHeaders) {
                if (row[key] !== undefined) {
                    const fieldType = typeof initialEmoState[key as keyof typeof initialEmoState];
                    if(key.toLowerCase().includes('fecha') || ['alturas', 'confinados', 'manejoDefensivo', 'certificadoOnac', 'cursoSst', 'manejoAlimentos', 'manejoTrafico'].includes(key)) {
                        (emoRecord as any)[key] = parseDate(row[key]);
                    } else if (Array.isArray((emoRecord as any)[key])) {
                        (emoRecord as any)[key] = row[key] ? String(row[key]).split(',').map((s: string) => s.trim()) : [];
                    } else if (fieldType === 'string') {
                         (emoRecord as any)[key] = String(row[key]);
                    } else {
                         (emoRecord as any)[key] = row[key];
                    }
                }
            }
            
            if (employee) {
                emoRecord.employeeId = employee.id;
                emoRecord.nombreCompleto = employee.fullName;
            } else {
                emoRecord.employeeId = '';
            }

            const uniqueKey = `${emoRecord.cedula}-${examDate.toISOString()}`;
            const existingEmo = emos.find(e => 
                e.cedula === emoRecord.cedula && 
                e.fechaExamen && new Date(e.fechaExamen).toISOString() === examDate.toISOString()
            );

            if (existingEmo) {
                uploadedDuplicates.push({ ...emoRecord, id: existingEmo.id });
            } else {
                uploadedNewRecords.push(emoRecord);
            }
        });

        setNewRecords(uploadedNewRecords);
        setDuplicates(uploadedDuplicates);

        if (uploadedDuplicates.length > 0) {
            setIsAlertOpen(true);
        } else if (uploadedNewRecords.length > 0) {
            handleBulkCreate(uploadedNewRecords);
        } else {
             toast({ title: "No hay datos nuevos", description: "El archivo no contiene registros EMO nuevos o válidos." });
        }
    };
    
    const handleBulkCreate = async (records: UploadedEmo[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addEmo(rec, tenantId)));
            toast({ title: `${records.length} registros creados`, description: "Se han registrado los nuevos exámenes." });
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error en la creación masiva', variant: 'destructive' });
        }
    };

    const handleBulkUpdate = async (records: (UploadedEmo & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateEmo(rec.id, rec, tenantId)));
            toast({ title: `${records.length} registros actualizados`, description: "Se han actualizado los datos de los EMOs existentes." });
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error en la actualización masiva', variant: 'destructive' });
        }
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

  return (
    <AppLayout pageTitle="Exámenes Médicos Ocupacionales (EMO)">
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Todos los Registros EMO</CardTitle>
                        <CardDescription>
                            Ver, gestionar, filtrar y cargar registros EMO. Mostrando {paginatedEmos.length} de {sortedEmos.length} registros
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadData}>
                            <Download className="h-4 w-4" />
                            Descargar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}>
                            <Download className="h-4 w-4" />
                            Plantilla
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4" />
                            Cargar
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                         <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                            setIsFormOpen(isOpen);
                            if (!isOpen) {
                                setEditingEmoId(null);
                                setFormData(initialEmoState);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir
                                </Button>
                            </DialogTrigger>
                           <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmoId ? 'Editar Registro EMO' : 'Nuevo Registro EMO'}</DialogTitle>
                <DialogDescription>
                  Complete el formulario para un nuevo examen.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave}>
                <Tabs defaultValue="employee-info" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="employee-info">Datos Empleado</TabsTrigger>
                        <TabsTrigger value="exam-info">Info del Examen</TabsTrigger>
                        <TabsTrigger value="results">Resultados</TabsTrigger>
                        <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
                    </TabsList>
                    <TabsContent value="employee-info">
                        <div className="py-4 space-y-4">
                            {!editingEmoId && (
                                <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md">
                                    <Checkbox id="is-candidate" checked={isCandidate} onCheckedChange={(checked) => setIsCandidate(!!checked)} />
                                    <Label htmlFor="is-candidate">Registrar Candidato</Label>
                                </div>
                            )}
                             <div className="grid grid-cols-3 gap-4">
                                 <div>
                                    <Label htmlFor="cedula-select">Empleado</Label>
                                    <Select onValueChange={handleSelectEmployee} value={formData.employeeId} disabled={isCandidate || !!editingEmoId}>
                                        <SelectTrigger id="cedula-select">
                                            <SelectValue placeholder="Seleccione" />
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
                                <div><Label>Nombre</Label><Input id="nombreCompleto" value={formData.nombreCompleto} onChange={handleInputChange} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div>
                                  <Label>Tipo Doc</Label>
                                  {isCandidate || !formData.employeeId ? (
                                    <Select onValueChange={(v) => handleSelectChange('tipoDocumento', v)} value={formData.tipoDocumento}>
                                        <SelectTrigger><SelectValue placeholder="Tipo"/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CC">CC</SelectItem>
                                            <SelectItem value="CE">CE</SelectItem>
                                            <SelectItem value="PT">PT</SelectItem>
                                            <SelectItem value="PA">PA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input id="tipoDocumento" value={formData.tipoDocumento} readOnly />
                                  )}
                                </div>
                                <div><Label>Cédula</Label><Input id="cedula" value={formData.cedula} onChange={handleInputChange} readOnly={!isCandidate && !!formData.employeeId && !editingEmoId} /></div>
                                <div><Label>F. Nacimiento</Label><Input type="date" value={dateToInputFormat(formData.fechaNacimiento)} onChange={(e) => handleDateChange('fechaNacimiento', e.target.value)} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div>
                                    <Label>Sexo</Label>
                                    {isCandidate || !formData.employeeId ? (
                                        <Select onValueChange={(v) => handleSelectChange('sexo', v)} value={formData.sexo}>
                                            <SelectTrigger><SelectValue placeholder="Sexo"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Masculino">M</SelectItem>
                                                <SelectItem value="Femenino">F</SelectItem>
                                                <SelectItem value="Otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input id="sexo" value={formData.sexo} readOnly />
                                    )}
                                </div>
                                <div><Label>Teléfono</Label><Input id="telefono" value={formData.telefono} onChange={handleInputChange} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div><Label>F. Ingreso</Label><Input type="date" value={dateToInputFormat(formData.fechaIngreso)} onChange={(e) => handleDateChange('fechaIngreso', e.target.value)} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div>
                                    <Label>Sede</Label>
                                    {isCandidate || !formData.employeeId ? (
                                        <Select onValueChange={(v) => handleSelectChange('sede', v)} value={formData.sede}>
                                            <SelectTrigger><SelectValue placeholder="Sede"/></SelectTrigger>
                                            <SelectContent>
                                                {costCenters.map(desc => (
                                                    <SelectItem key={desc.id} value={desc.name}>{desc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input id="sede" value={formData.sede} readOnly />
                                    )}
                                </div>
                                <div><Label>Cargo</Label><Input id="cargo" value={formData.cargo} onChange={handleInputChange} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div><Label>Estado</Label><Input id="estado" value={formData.estado} onChange={handleInputChange} readOnly={!isCandidate && !!formData.employeeId} /></div>
                                <div><Label htmlFor="estadoCivil">E. Civil</Label><Input id="estadoCivil" value={formData.estadoCivil} onChange={handleInputChange} /></div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="exam-info">
                         <div className="grid grid-cols-3 gap-4 py-4">
                            <div><Label htmlFor="fechaIngresoBase">F. Ingreso Base</Label><Input id="fechaIngresoBase" type="date" value={dateToInputFormat(formData.fechaIngresoBase)} onChange={(e) => handleDateChange('fechaIngresoBase', e.target.value)} /></div>
                            <div><Label htmlFor="fechaExamen">F. Examen</Label><Input id="fechaExamen" type="date" value={dateToInputFormat(formData.fechaExamen)} onChange={(e) => handleDateChange('fechaExamen', e.target.value)} /></div>
                            <div><Label htmlFor="ipsRemision">IPS</Label><Input id="ipsRemision" value={formData.ipsRemision} onChange={handleInputChange} /></div>
                            <div>
                                <Label htmlFor="tipoExamen">Tipo</Label>
                                <Select onValueChange={(v) => handleSelectChange('tipoExamen', v)} value={formData.tipoExamen}>
                                    <SelectTrigger><SelectValue placeholder="Tipo"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERIODICO">PERIODICO</SelectItem>
                                        <SelectItem value="INGRESO">INGRESO</SelectItem>
                                        <SelectItem value="POST INCAPACIDAD">POST INCAPACIDAD</SelectItem>
                                        <SelectItem value="SEGUIMIENTO">SEGUIMIENTO</SelectItem>
                                        <SelectItem value="CAMBIO DE CARGO">CAMBIO DE CARGO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor="concepto">Concepto</Label>
                                <Select onValueChange={(v) => handleSelectChange('concepto', v)} value={formData.concepto}>
                                    <SelectTrigger><SelectValue placeholder="Concepto"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="APTO">APTO</SelectItem>
                                        <SelectItem value="NO APTO">NO APTO</SelectItem>
                                        <SelectItem value="APTO CON RECOMENDACIONES">CON REC</SelectItem>
                                        <SelectItem value="APLAZADO">APLAZADO</SelectItem>
                                        <SelectItem value="PERIODICO SATISFACTORIO">SATISFACTORIO</SelectItem>
                                        <SelectItem value="APTO CON RESTRICCIONES">CON REST</SelectItem>
                                        <SelectItem value="NO CONTRATADO">NO CONTRATADO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3"><Label htmlFor="anotacionesPuntuales">Anotaciones</Label><Textarea id="anotacionesPuntuales" value={formData.anotacionesPuntuales} onChange={handleInputChange} rows={2} /></div>
                        </div>
                    </TabsContent>
                    <TabsContent value="results">
                        <div className="grid grid-cols-3 gap-x-4 gap-y-3 py-4 max-h-96 overflow-y-auto">
                            <div><Label htmlFor="exposicionTar">Exp T.A.R</Label><Select onValueChange={(v) => handleSelectChange('exposicionTar', v)} value={formData.exposicionTar}><SelectTrigger><SelectValue placeholder="Opt"/></SelectTrigger><SelectContent><SelectItem value="NO PRESENTA RESTRICCIÓN PARA EL CARGO">Sin Rest</SelectItem><SelectItem value="PRESENTA RESTRICCIONES PARA EL CARGO">Con Rest</SelectItem><SelectItem value="NO APLICA">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="ryrTar">R y R T.A.R</Label><Select onValueChange={(v) => handleSelectChange('ryrTar', v)} value={formData.ryrTar}><SelectTrigger><SelectValue placeholder="Opt"/></SelectTrigger><SelectContent><SelectItem value="NO PRESENTA RESTRICCIÓN PARA EL CARGO">Sin Rest</SelectItem><SelectItem value="PRESENTA RESTRICCIONES PARA EL CARGO">Con Rest</SelectItem><SelectItem value="NO APLICA">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="examenMedicoGeneral">Ex Médico</Label><Select onValueChange={(v) => handleSelectChange('examenMedicoGeneral', v)} value={formData.examenMedicoGeneral}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="audiometria">Audiometría</Label><Select onValueChange={(v) => handleSelectChange('audiometria', v)} value={formData.audiometria}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Sin Alteración">Sin Alt</SelectItem><SelectItem value="Con Alteración">Con Alt</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="osteomuscular">Osteomuscular</Label><Select onValueChange={(v) => handleSelectChange('osteomuscular', v)} value={formData.osteomuscular}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="cuadroHematico">Cuadro Hem</Label><Select onValueChange={(v) => handleSelectChange('cuadroHematico', v)} value={formData.cuadroHematico}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="funcionRenal">F. Renal</Label><Select onValueChange={(v) => handleSelectChange('funcionRenal', v)} value={formData.funcionRenal}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="funcionHepatica">F. Hepática</Label><Select onValueChange={(v) => handleSelectChange('funcionHepatica', v)} value={formData.funcionHepatica}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="perfilLipidico">P. Lipídico</Label><Select onValueChange={(v) => handleSelectChange('perfilLipidico', v)} value={formData.perfilLipidico}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="glicemia">Glicemia</Label><Select onValueChange={(v) => handleSelectChange('glicemia', v)} value={formData.glicemia}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="espirometria">Espirometría</Label><Select onValueChange={(v) => handleSelectChange('espirometria', v)} value={formData.espirometria}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="psicosensometrico">Psicosens</Label><Select onValueChange={(v) => handleSelectChange('psicosensometrico', v)} value={formData.psicosensometrico}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Apto">Apto</SelectItem><SelectItem value="No Apto">No Apto</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="electrocardiograma">ECG</Label><Select onValueChange={(v) => handleSelectChange('electrocardiograma', v)} value={formData.electrocardiograma}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="optometria">Optometría</Label><Select onValueChange={(v) => handleSelectChange('optometria', v)} value={formData.optometria}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Con Alteración">Con Alt</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="coprologico">Copro</Label><Select onValueChange={(v) => handleSelectChange('coprologico', v)} value={formData.coprologico}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="kohUnas">KOH</Label><Select onValueChange={(v) => handleSelectChange('kohUnas', v)} value={formData.kohUnas}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="frotisGarganta">Frotis</Label><Select onValueChange={(v) => handleSelectChange('frotisGarganta', v)} value={formData.frotisGarganta}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Anormal">Anormal</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="testAlturas">Alturas</Label><Select onValueChange={(v) => handleSelectChange('testAlturas', v)} value={formData.testAlturas}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Apto">Apto</SelectItem><SelectItem value="No Apto">No Apto</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                             <div><Label htmlFor="testDrogas">Drogas</Label><Select onValueChange={(v) => handleSelectChange('testDrogas', v)} value={formData.testDrogas}><SelectTrigger><SelectValue placeholder="Res"/></SelectTrigger><SelectContent><SelectItem value="Negativo">Neg</SelectItem><SelectItem value="Positivo">Pos</SelectItem><SelectItem value="No Aplica">N/A</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="otro">Otro</Label><Input id="otro" value={formData.otro} onChange={handleInputChange} /></div>
                        </div>
                    </TabsContent>
                     <TabsContent value="recommendations">
                         <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="recomendacionesEmpleador">Rec Empleador</Label><Textarea id="recomendacionesEmpleador" value={formData.recomendacionesEmpleador} onChange={handleInputChange} rows={2} /></div>
                                <div><Label htmlFor="recomendacionesColaborador">Rec Colaborador</Label><Textarea id="recomendacionesColaborador" value={formData.recomendacionesColaborador} onChange={handleInputChange} rows={2} /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                 <div className="flex items-center space-x-2"><Checkbox id="auditivo" onCheckedChange={(c) => handleCheckboxChange('auditivo', c)} checked={formData.auditivo === 'X'} /><Label htmlFor="auditivo" className="text-sm font-normal">Auditivo</Label></div>
                                 <div className="flex items-center space-x-2"><Checkbox id="osteomuscularRecomendacion" onCheckedChange={(c) => handleCheckboxChange('osteomuscularRecomendacion', c)} checked={formData.osteomuscularRecomendacion === 'X'} /><Label htmlFor="osteomuscularRecomendacion" className="text-sm font-normal">Osteomuscular</Label></div>
                                 <div className="flex items-center space-x-2"><Checkbox id="cardiovascular" onCheckedChange={(c) => handleCheckboxChange('cardiovascular', c)} checked={formData.cardiovascular === 'X'} /><Label htmlFor="cardiovascular" className="text-sm font-normal">Cardiovascular</Label></div>
                                 <div className="flex items-center space-x-2"><Checkbox id="psicosocial" onCheckedChange={(c) => handleCheckboxChange('psicosocial', c)} checked={formData.psicosocial === 'X'} /><Label htmlFor="psicosocial" className="text-sm font-normal">Psicosocial</Label></div>
                                 <div className="flex items-center space-x-2"><Checkbox id="respiratorio" onCheckedChange={(c) => handleCheckboxChange('respiratorio', c)} checked={formData.respiratorio === 'X'} /><Label htmlFor="respiratorio" className="text-sm font-normal">Respiratorio</Label></div>
                                 <div className="flex items-center space-x-2"><Checkbox id="visual" onCheckedChange={(c) => handleCheckboxChange('visual', c)} checked={formData.visual === 'X'} /><Label htmlFor="visual" className="text-sm font-normal">Visual</Label></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><Label htmlFor="alturas">Alturas</Label><Input id="alturas" type="date" value={dateToInputFormat(formData.alturas)} onChange={(e) => handleDateChange('alturas', e.target.value)} /></div>
                                <div><Label htmlFor="confinados">Confinados</Label><Input id="confinados" type="date" value={dateToInputFormat(formData.confinados)} onChange={(e) => handleDateChange('confinados', e.target.value)} /></div>
                                <div><Label htmlFor="manejoDefensivo">M. Defensivo</Label><Input id="manejoDefensivo" type="date" value={dateToInputFormat(formData.manejoDefensivo)} onChange={(e) => handleDateChange('manejoDefensivo', e.target.value)} /></div>
                                <div><Label htmlFor="certificadoOnac">ONAC</Label><Input id="certificadoOnac" type="date" value={dateToInputFormat(formData.certificadoOnac)} onChange={(e) => handleDateChange('certificadoOnac', e.target.value)} /></div>
                                <div><Label htmlFor="cursoSst">SST</Label><Input id="cursoSst" type="date" value={dateToInputFormat(formData.cursoSst)} onChange={(e) => handleDateChange('cursoSst', e.target.value)} /></div>
                                <div><Label htmlFor="manejoAlimentos">Alimentos</Label><Input id="manejoAlimentos" type="date" value={dateToInputFormat(formData.manejoAlimentos)} onChange={(e) => handleDateChange('manejoAlimentos', e.target.value)} /></div>
                                <div><Label htmlFor="manejoTrafico">Tráfico</Label><Input id="manejoTrafico" type="date" value={dateToInputFormat(formData.manejoTrafico)} onChange={(e) => handleDateChange('manejoTrafico', e.target.value)} /></div>
                            </div>
                            <Separator />
                            <div>
                                <Label>Soportes</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" onChange={handleSoporteUpload} disabled={isUploading} className="flex-grow"/>
                                    {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                                </div>
                                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                                    {(formData.soportes || []).map((url, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline"><Paperclip className="h-3 w-3" />Soporte {index + 1}</a>
                                            <Button variant="ghost" size="icon" onClick={() => removeSoporte(url)} className="h-6 w-6"><Trash2 className="h-3 w-3 text-red-500"/></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <Collapsible className="flex-shrink-0">
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                            <Filter className="h-4 w-4"/>
                            Filtros
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="p-4 border rounded-lg bg-muted/50 space-y-4 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div><Label htmlFor="filter-cedula">Cédula</Label><Input id="filter-cedula" placeholder="Buscar..." value={filterCedula} onChange={(e) => setFilterCedula(e.target.value)} /></div>
                                <div><Label htmlFor="filter-tipo-examen">Tipo</Label><Select value={filterTipoExamen} onValueChange={setFilterTipoExamen}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent><SelectItem value="PERIODICO">PERIODICO</SelectItem><SelectItem value="INGRESO">INGRESO</SelectItem><SelectItem value="POST INCAPACIDAD">POST INCAP</SelectItem><SelectItem value="SEGUIMIENTO">SEGUIMIENTO</SelectItem><SelectItem value="CAMBIO DE CARGO">CAMBIO CARGO</SelectItem></SelectContent></Select></div>
                                <div><Label htmlFor="filter-concepto">Concepto</Label><Select value={filterConcepto} onValueChange={setFilterConcepto}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent><SelectItem value="APTO">APTO</SelectItem><SelectItem value="NO APTO">NO APTO</SelectItem><SelectItem value="APTO CON RECOMENDACIONES">CON REC</SelectItem><SelectItem value="APLAZADO">APLAZADO</SelectItem><SelectItem value="PERIODICO SATISFACTORIO">SATISFACTORIO</SelectItem><SelectItem value="APTO CON RESTRICCIONES">CON REST</SelectItem><SelectItem value="NO CONTRATADO">NO CONTRATADO</SelectItem></SelectContent></Select></div>
                                <div><Label htmlFor="filter-hire-date">Fecha</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className="w-full justify-start text-left font-normal text-xs"><CalendarIcon className="mr-2 h-4 w-4" />{filterFechaExamen ? format(filterFechaExamen, "PP") : <span>Fecha</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterFechaExamen} onSelect={setFilterFechaExamen} initialFocus/></PopoverContent></Popover></div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" />Limpiar</Button>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
                
                <div className="flex-1 mt-4 border rounded-lg flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-gray-600">Filas por página:</Label>
                            <Select value={String(rowsPerPage)} onValueChange={(v) => {
                                setRowsPerPage(Number(v));
                                setCurrentPage(1);
                            }}>
                                <SelectTrigger className="w-20 h-8 text-xs border-gray-300"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                            {sortedEmos.length > 0 ? `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, sortedEmos.length)} de ${sortedEmos.length}` : '0 registros'}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                       <table className="w-full text-sm relative border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="border-b border-gray-300">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200 sticky left-0 bg-gray-100 z-20 border-r border-gray-300" onClick={() => handleSort('nombreCompleto')}>
                        Nombre {getSortIcon('nombreCompleto')}
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('cedula')}>Cédula {getSortIcon('cedula')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('tipoDocumento')}>Tipo Doc {getSortIcon('tipoDocumento')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('fechaNacimiento')}>F. Nac {getSortIcon('fechaNacimiento')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('sexo')}>Sexo {getSortIcon('sexo')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('estadoCivil')}>E. Civil {getSortIcon('estadoCivil')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('telefono')}>Teléfono {getSortIcon('telefono')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('cargo')}>Cargo {getSortIcon('cargo')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('sede')}>Sede {getSortIcon('sede')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('estado')}>Estado {getSortIcon('estado')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('fechaIngreso')}>F. Ingreso {getSortIcon('fechaIngreso')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('fechaExamen')}>F. Examen {getSortIcon('fechaExamen')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('tipoExamen')}>Tipo Examen {getSortIcon('tipoExamen')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('concepto')}>Concepto {getSortIcon('concepto')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('ipsRemision')}>IPS {getSortIcon('ipsRemision')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Anotaciones</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('exposicionTar')}>Exp TAR {getSortIcon('exposicionTar')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('ryrTar')}>RyR TAR {getSortIcon('ryrTar')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('examenMedicoGeneral')}>Ex Médico {getSortIcon('examenMedicoGeneral')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('audiometria')}>Audiometría {getSortIcon('audiometria')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('osteomuscular')}>Osteomuscular {getSortIcon('osteomuscular')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('cuadroHematico')}>C. Hemático {getSortIcon('cuadroHematico')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('funcionRenal')}>F. Renal {getSortIcon('funcionRenal')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('funcionHepatica')}>F. Hepática {getSortIcon('funcionHepatica')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('perfilLipidico')}>P. Lipídico {getSortIcon('perfilLipidico')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('glicemia')}>Glicemia {getSortIcon('glicemia')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('espirometria')}>Espirometría {getSortIcon('espirometria')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('psicosensometrico')}>Psicosens {getSortIcon('psicosensometrico')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('electrocardiograma')}>ECG {getSortIcon('electrocardiograma')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('optometria')}>Optometría {getSortIcon('optometria')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('coprologico')}>Copro {getSortIcon('coprologico')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('kohUnas')}>KOH {getSortIcon('kohUnas')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('frotisGarganta')}>Frotis {getSortIcon('frotisGarganta')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('testAlturas')}>Alturas {getSortIcon('testAlturas')}</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200" onClick={() => handleSort('testDrogas')}>Drogas {getSortIcon('testDrogas')}</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Otro</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Rec Empleador</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Rec Colaborador</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">PVE</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Cursos</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 whitespace-nowrap sticky right-0 bg-gray-100 z-20 border-l border-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedEmos.length === 0 ? (
                      <tr>
                        <td colSpan={42} className="px-3 py-16 text-center text-sm text-gray-500">
                          No hay registros para mostrar
                        </td>
                      </tr>
                    ) : (
                      paginatedEmos.map((emo) => {
                        const pveCount = [emo.auditivo, emo.osteomuscularRecomendacion, emo.cardiovascular, emo.psicosocial, emo.respiratorio, emo.visual].filter(v => v === 'X').length;
                        const cursosCount = [emo.alturas, emo.confinados, emo.manejoDefensivo, emo.certificadoOnac, emo.cursoSst, emo.manejoAlimentos, emo.manejoTrafico].filter(v => v !== null).length;
                        
                        return (
                          <tr key={emo.id} onClick={() => handleViewDetails(emo)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                            <td className="px-3 py-3 text-xs text-gray-900 font-medium whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200">{emo.nombreCompleto}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.cedula}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.tipoDocumento || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{formatDate(emo.fechaNacimiento)}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.sexo || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.estadoCivil || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.telefono || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.cargo || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.sede || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.estado || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{formatDate(emo.fechaIngreso)}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{formatDate(emo.fechaExamen)}</td>
                            <td className="px-3 py-3 text-xs whitespace-nowrap"><Badge variant="outline" className="text-xs">{emo.tipoExamen || 'N/A'}</Badge></td>
                            <td className="px-3 py-3 text-xs whitespace-nowrap">{getConceptoBadge(emo.concepto || 'N/A')}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.ipsRemision || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap max-w-32 truncate" title={emo.anotacionesPuntuales}>{emo.anotacionesPuntuales || 'N/A'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 text-center">{emo.exposicionTar ? <span>✓</span> : '-'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 text-center">{emo.ryrTar ? <span>✓</span> : '-'}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.examenMedicoGeneral)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.audiometria)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.osteomuscular)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.cuadroHematico)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.funcionRenal)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.funcionHepatica)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.perfilLipidico)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.glicemia)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.espirometria)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.psicosensometrico)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.electrocardiograma)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.optometria)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.coprologico)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.kohUnas)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.frotisGarganta)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.testAlturas)}</td>
                            <td className="px-3 py-3 text-center">{getResultBadge(emo.testDrogas)}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap">{emo.otro || '-'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap max-w-32 truncate" title={emo.recomendacionesEmpleador}>{emo.recomendacionesEmpleador || '-'}</td>
                            <td className="px-3 py-3 text-xs text-gray-700 whitespace-nowrap max-w-32 truncate" title={emo.recomendacionesColaborador}>{emo.recomendacionesColaborador || '-'}</td>
                            <td className="px-3 py-3 text-center">{pveCount > 0 ? <Badge className="bg-blue-600 text-xs">{pveCount}</Badge> : <span className="text-xs text-gray-400">-</span>}</td>
                            <td className="px-3 py-3 text-center">{cursosCount > 0 ? <Badge variant="outline" className="text-xs">{cursosCount}</Badge> : <span className="text-xs text-gray-400">-</span>}</td>
                            <td className="px-3 py-3 text-right sticky right-0 bg-white hover:bg-gray-50 z-10 border-l border-gray-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()} className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(emo)}>Ver Detalles</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenForm(emo)}>Editar</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 flex-shrink-0">
                        <div className="text-xs font-medium text-gray-600">
                            Página {currentPage} de {totalPages || 1}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded">
                                {currentPage}
                            </div>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 border-gray-300" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        {selectedEmo && <EmoDetails emo={selectedEmo} onClose={() => setIsDetailsOpen(false)} onEdit={() => {
            setIsDetailsOpen(false);
            handleOpenForm(selectedEmo);
        }} />}
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se encontraron {duplicates.length} registros duplicados</AlertDialogTitle>
            <AlertDialogDescription>
                Se han encontrado exámenes en el archivo que ya existen. ¿Deseas actualizar sus datos?
                <br/><br/>
                Si eliges &quot;No&quot;, solo se agregarán los registros nuevos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={denyUpdate}>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdate}>Sí</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

const EmoDetails = ({ emo, onClose, onEdit }: { emo: Emo, onClose: () => void, onEdit: () => void }) => {
    const examResults = [
        { label: 'Ex. Médico', value: emo.examenMedicoGeneral },
        { label: 'Audiometría', value: emo.audiometria },
        { label: 'Osteomuscular', value: emo.osteomuscular },
        { label: 'C. Hemático', value: emo.cuadroHematico },
        { label: 'F. Renal', value: emo.funcionRenal },
        { label: 'F. Hepática', value: emo.funcionHepatica },
        { label: 'P. Lipídico', value: emo.perfilLipidico },
        { label: 'Glicemia', value: emo.glicemia },
        { label: 'Espirometría', value: emo.espirometria },
        { label: 'Psicosens', value: emo.psicosensometrico },
        { label: 'ECG', value: emo.electrocardiograma },
        { label: 'Optometría', value: emo.optometria },
        { label: 'Copro', value: emo.coprologico },
        { label: 'KOH', value: emo.kohUnas },
        { label: 'Frotis', value: emo.frotisGarganta },
        { label: 'Alturas', value: emo.testAlturas },
        { label: 'Drogas', value: emo.testDrogas },
        { label: 'Otro', value: emo.otro },
    ];
    
    const pveSystems = [
      { key: 'auditivo', label: 'Auditivo' },
      { key: 'osteomuscularRecomendacion', label: 'Osteomuscular' },
      { key: 'cardiovascular', label: 'Cardiovascular' },
      { key: 'psicosocial', label: 'Psicosocial' },
      { key: 'respiratorio', label: 'Respiratorio' },
      { key: 'visual', label: 'Visual' },
    ];

    const soportes = emo.soportes || [];

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalles del Examen Médico Ocupacional</DialogTitle>
                <DialogDescription>
                    {emo.nombreCompleto} - {formatDate(emo.fechaExamen)}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                
                {/* Employee and Exam Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información General</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Nombre" value={emo.nombreCompleto} className="col-span-2"/>
                        <DetailItem label="Identificación" value={`${emo.tipoDocumento || ''} ${emo.cedula}`} />
                        <DetailItem label="Cargo" value={emo.cargo} />
                        <DetailItem label="Sede" value={emo.sede} />
                        <DetailItem label="Fecha Examen" value={formatDate(emo.fechaExamen)} />
                        <DetailItem label="Tipo Examen" value={<Badge variant="outline">{emo.tipoExamen}</Badge>} />
                        <DetailItem label="Concepto Médico" value={getConceptoBadge(emo.concepto)} />
                    </div>
                </div>
                <Separator />
                
                {/* Exam Results */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Resultados de Pruebas</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-4">
                        {examResults.filter(r => r.value && r.value !== 'No Aplica').map(result => (
                           <DetailItem key={result.label} label={result.label} value={getResultBadge(result.value)} />
                        ))}
                    </div>
                </div>
                <Separator />
                
                {/* Recommendations and PVE */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Recomendaciones y Programas de Vigilancia</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <h4 className="font-medium">Recomendaciones</h4>
                             <DetailItem label="Para el Empleador" value={<p className="whitespace-pre-wrap text-xs">{emo.recomendacionesEmpleador}</p>} />
                             <DetailItem label="Para el Colaborador" value={<p className="whitespace-pre-wrap text-xs">{emo.recomendacionesColaborador}</p>} />
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-medium">Inclusión en PVE</h4>
                             <div className="flex flex-wrap gap-2">
                                {pveSystems.filter(sys => (emo as any)[sys.key] === 'X').map(sys => (
                                   <div key={sys.key} className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full text-sm">
                                       <Check className="h-4 w-4 text-green-600"/><span>{sys.label}</span>
                                   </div>
                                ))}
                                 {pveSystems.every(sys => (emo as any)[sys.key] !== 'X') && (
                                     <p className="text-sm text-muted-foreground">No incluido en PVEs.</p>
                                 )}
                            </div>
                        </div>
                     </div>
                </div>
                 <Separator />

                {/* Attachments */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Soportes Adjuntos</h3>
                     {soportes.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {soportes.map((url, index) => (
                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 text-sm text-blue-600 hover:underline p-2 border rounded-md">
                                    <Paperclip className="h-4 w-4" />
                                    <span>Ver Soporte {index + 1}</span>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No hay soportes adjuntos para este examen.</p>
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
