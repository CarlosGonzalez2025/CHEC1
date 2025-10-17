'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import AppLayout from '@/components/layout/app-layout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Download, Upload, Filter, X, CalendarIcon, Paperclip, Trash2, Loader2 } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';
import { getEmployees, getMedicalRecommendations, addMedicalRecommendation, updateMedicalRecommendation, medicalRecommendationDateFields, uploadFile } from '@/lib/data';
import type { Employee } from '@/lib/data';
import type { MedicalRecommendation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';


const initialFormState: Omit<MedicalRecommendation, 'id'> = {
    employeeId: '',
    tipoDocumento: '',
    identificacion: '',
    nombreCompleto: '',
    cargoContratacion: '',
    centroDeTrabajo: '',
    fechaIngresoPrograma: null,
    telefono: '',
    estadoEmpresa: 'Activo',
    fechaReubicacion: null,
    cargoReubicacion: '',
    funcionesCargoReubicacion: '',
    tipoEvento: 'AT',
    lesionYParteCuerpo: '',
    estadoCaso: 'Abierto',
    fechaRecomendacion: null,
    tipoRecomendacion: 'Temporal',
    vigenciaRecomendaciones: '',
    diasAcumulados: 0,
    fechaInicioRecomendaciones: null,
    fechaFinRecomendaciones: null,
    fechaReintegro: null,
    cartaReintegro: '',
    capacitacion: '',
    socializacionRecomendaciones: '',
    aptIpt: '',
    pcl: '',
    fechaCierre: null,
    recomendaciones: '',
    observaciones: '',
    observacionesMesaTrabajo: '',
    soportes: [],
};

type UploadedRecommendation = Omit<MedicalRecommendation, 'id'>;

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

export default function MedicalRecommendationsPage() {
    const { user, medicalRecommendations, employees, tenantId, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Omit<MedicalRecommendation, 'id'>>(initialFormState);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedRecommendation, setSelectedRecommendation] = useState<MedicalRecommendation | null>(null);


    // Filters
    const [filterIdentificacion, setFilterIdentificacion] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    
    // Bulk upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(UploadedRecommendation & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<UploadedRecommendation[]>([]);


    const filteredRecommendations = useMemo(() => {
        const userCostCenters = user?.costCenters || [];
        const canViewAll = userCostCenters.length === 0;

        return medicalRecommendations.filter(item => {
            const costCenterMatch = canViewAll || userCostCenters.includes(item.centroDeTrabajo);
            return (
                costCenterMatch &&
                item.identificacion.toLowerCase().includes(filterIdentificacion.toLowerCase()) &&
                (filterEstado === '' || item.estadoCaso === filterEstado) &&
                (filterTipo === '' || item.tipoRecomendacion === filterTipo)
            );
        });
    }, [medicalRecommendations, filterIdentificacion, filterEstado, filterTipo, user]);
    
    const clearFilters = () => {
        setFilterIdentificacion('');
        setFilterEstado('');
        setFilterTipo('');
    };

    const handleSelectEmployee = (employeeId: string) => {
        const selectedEmployee = employees.find(emp => emp.id === employeeId);
        if (selectedEmployee) {
            setFormData(prev => ({
                ...prev,
                employeeId: selectedEmployee.id,
                nombreCompleto: selectedEmployee.fullName,
                identificacion: selectedEmployee.identification,
                tipoDocumento: selectedEmployee.identificationType,
                cargoContratacion: selectedEmployee.position,
                centroDeTrabajo: selectedEmployee.payrollDescription,
                telefono: selectedEmployee.mobilePhone,
                estadoEmpresa: selectedEmployee.contractStatus === 'Activo' ? 'Activo' : 'Retirado',
            }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId || !tenantId) {
            toast({ title: "Error de validación", description: "Debe seleccionar un empleado.", variant: "destructive" });
            return;
        }

        try {
            if (editingId) {
                await updateMedicalRecommendation(editingId, formData, tenantId);
                toast({ title: "Registro Actualizado" });
            } else {
                await addMedicalRecommendation(formData, tenantId);
                toast({ title: "Registro Guardado" });
            }
            setIsFormOpen(false);
            fetchAllData();
        } catch (error) {
            console.error("Error saving recommendation:", error);
            toast({ title: "Error al Guardar", variant: "destructive" });
        }
    };
    
    const handleOpenForm = (recommendation: MedicalRecommendation | null = null) => {
        if (recommendation) {
            setEditingId(recommendation.id);
            setFormData(recommendation);
        } else {
            setEditingId(null);
            setFormData(initialFormState);
        }
        setIsFormOpen(true);
    };

    const handleViewDetails = (recommendation: MedicalRecommendation) => {
        setSelectedRecommendation(recommendation);
        setIsDetailsOpen(true);
    };


    const handleChange = (field: keyof MedicalRecommendation, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSoporteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadFile(file, 'medical-recommendations-soportes');
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

    const recommendationCSVHeaders = ['employeeId', ...Object.keys(initialFormState).filter(k => k !== 'employeeId')];

    const downloadCSVTemplate = () => {
        const csvHeader = recommendationCSVHeaders.join(";");
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_recomendaciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadData = () => {
        if (filteredRecommendations.length === 0) {
            toast({ title: "No hay datos para exportar" });
            return;
        }
        const dataToExport = filteredRecommendations.map(item => {
            const row: { [key: string]: any } = {};
            recommendationCSVHeaders.forEach(key => {
                 const value = item[key as keyof MedicalRecommendation];
                 if (value instanceof Date) row[key] = value.toLocaleDateString('es-CO');
                 else row[key] = value;
            });
            return row;
        });

        const csv = Papa.unparse(dataToExport, { delimiter: ";", header: true });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "export_recomendaciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true, skipEmptyLines: true, delimiter: ";",
                complete: (results) => processUploadedData(results.data as any[]),
                error: (error) => toast({ title: 'Error al procesar archivo', variant: 'destructive' }),
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const processUploadedData = (data: any[]) => {
        if (!employees || !medicalRecommendations) {
            toast({ title: "Datos no disponibles", description: "Los datos de la aplicación aún se están cargando.", variant: "destructive" });
            return;
        }
        const employeeMap = new Map(employees.map(emp => [emp.identification, emp]));
        const uploadedDuplicates: (UploadedRecommendation & { id: string })[] = [];
        const uploadedNewRecords: UploadedRecommendation[] = [];

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
            // Change key field from fechaRecomendacion to fechaIngresoPrograma for more stability
            const programDate = parseDate(row.fechaIngresoPrograma);
            if (!row.identificacion || !programDate) {
                console.warn("Skipping row due to missing identification or fechaIngresoPrograma", row);
                return;
            }

            const employee = employeeMap.get(row.identificacion);
            if (!employee) {
                console.warn("Skipping row because employee not found:", row.identificacion);
                return;
            }

            const record: UploadedRecommendation = { ...initialFormState };
            for(const key of recommendationCSVHeaders) {
                if (row[key] !== undefined) {
                    if(medicalRecommendationDateFields.includes(key)) (record as any)[key] = parseDate(row[key]);
                    else if (typeof (record as any)[key] === 'number') (record as any)[key] = parseFloat(String(row[key]).replace(',', '.')) || 0;
                    else if (key === 'soportes') (record as any)[key] = row[key] ? String(row[key]).split(',').map((s:string) => s.trim()) : [];
                    else (record as any)[key] = String(row[key]);
                }
            }
            record.employeeId = employee.id;

            // Use a more stable unique key
            const uniqueKey = `${record.identificacion}-${programDate.toISOString()}`;
            const existingRecord = medicalRecommendations.find(r => 
                r.identificacion === record.identificacion &&
                r.fechaIngresoPrograma && new Date(r.fechaIngresoPrograma).toISOString() === programDate.toISOString()
            );

            if (existingRecord) {
                uploadedDuplicates.push({ ...record, id: existingRecord.id });
            } else {
                uploadedNewRecords.push(record);
            }
        });
        
        setNewRecords(uploadedNewRecords);
        setDuplicates(uploadedDuplicates);

        if (uploadedDuplicates.length > 0) setIsAlertOpen(true);
        else if (uploadedNewRecords.length > 0) handleBulkCreate(uploadedNewRecords);
        else toast({ title: "No hay datos nuevos para cargar." });
    };
    
    const handleBulkCreate = async (records: UploadedRecommendation[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addMedicalRecommendation(rec, tenantId)));
            toast({ title: `${records.length} registros creados con éxito.` });
            fetchAllData();
        } catch (error) { toast({ title: 'Error en la creación masiva', variant: 'destructive' }); }
    };

    const handleBulkUpdate = async (records: (UploadedRecommendation & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateMedicalRecommendation(rec.id, rec, tenantId)));
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

    return (
        <AppLayout pageTitle="Seguimiento Recomendaciones Médicas">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Registros de Recomendaciones Médicas</CardTitle>
                            <CardDescription>Gestionar seguimientos de recomendaciones médicas.</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadData}><Download className="h-4 w-4" />Descargar Datos</Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}><Download className="h-4 w-4" />Descargar Plantilla</Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" />Cargar Archivo</Button>
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
                                    <div><Label>Identificación</Label><Input value={filterIdentificacion} onChange={(e) => setFilterIdentificacion(e.target.value)} /></div>
                                    <div>
                                        <Label>Estado del Caso</Label>
                                        <Select value={filterEstado} onValueChange={setFilterEstado}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                            <SelectContent><SelectItem value="Abierto">Abierto</SelectItem><SelectItem value="Cerrado">Cerrado</SelectItem><SelectItem value="En seguimiento">En seguimiento</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Tipo Recomendación</Label>
                                        <Select value={filterTipo} onValueChange={setFilterTipo}><SelectTrigger><SelectValue placeholder="Todos"/></SelectTrigger>
                                            <SelectContent><SelectItem value="Temporal">Temporal</SelectItem><SelectItem value="Permanente">Permanente</SelectItem></SelectContent>
                                        </Select>
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
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Identificación</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Tipo de Evento</TableHead>
                                    <TableHead>Estado del Caso</TableHead>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecommendations.length > 0 ? filteredRecommendations.map(item => (
                                    <TableRow key={item.id} onClick={() => handleViewDetails(item)} className="cursor-pointer">
                                        <TableCell>{item.nombreCompleto}</TableCell>
                                        <TableCell>{item.identificacion}</TableCell>
                                        <TableCell>{item.cargoContratacion}</TableCell>
                                        <TableCell>{item.tipoEvento}</TableCell>
                                        <TableCell>{item.estadoCaso}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menú</span></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleViewDetails(item)}>Ver Detalles</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenForm(item)}>Editar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No hay registros.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                {selectedRecommendation && <MedicalRecommendationDetails recommendation={selectedRecommendation} onClose={() => setIsDetailsOpen(false)} onEdit={() => { setIsDetailsOpen(false); handleOpenForm(selectedRecommendation); }} />}
            </Dialog>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Seguimiento' : 'Nuevo Seguimiento de Recomendación'}</DialogTitle>
                        <DialogDescription>Complete la información del seguimiento.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                       {/* Employee Info */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Información del Empleado</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label>Empleado</Label>
                                    <Select onValueChange={handleSelectEmployee} value={formData.employeeId} disabled={!!editingId}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione un empleado" /></SelectTrigger>
                                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Nombre Completo</Label><Input value={formData.nombreCompleto} readOnly /></div>
                                <div><Label>N° Documento</Label><Input value={formData.identificacion} readOnly /></div>
                                <div><Label>Teléfono</Label><Input value={formData.telefono} readOnly /></div>
                                <div><Label>Cargo de Contratación</Label><Input value={formData.cargoContratacion} readOnly /></div>
                                <div><Label>Centro de Trabajo</Label><Input value={formData.centroDeTrabajo} readOnly /></div>
                                <div><Label>Fecha Ingreso al Programa</Label><Input type="date" value={dateToInputFormat(formData.fechaIngresoPrograma)} onChange={e => handleChange('fechaIngresoPrograma', e.target.value)} /></div>
                                <div>
                                    <Label>Estado en la Empresa</Label>
                                    <Select value={formData.estadoEmpresa} onValueChange={v => handleChange('estadoEmpresa', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Activo">Activo</SelectItem>
                                            <SelectItem value="Retirado">Retirado</SelectItem>
                                            <SelectItem value="Cerrado">Cerrado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Event and Case Info */}
                        <div className="space-y-4 p-4 border rounded-lg">
                           <h3 className="font-semibold text-lg">Información del Evento y Caso</h3>
                           <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Tipo de Evento</Label>
                                    <Select value={formData.tipoEvento} onValueChange={v => handleChange('tipoEvento', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AT">AT</SelectItem>
                                            <SelectItem value="EG">EG</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Estado del Caso</Label>
                                     <Select value={formData.estadoCaso} onValueChange={v => handleChange('estadoCaso', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Abierto">Abierto</SelectItem>
                                            <SelectItem value="Cerrado">Cerrado</SelectItem>
                                            <SelectItem value="En seguimiento">En seguimiento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Lesión y Parte del Cuerpo</Label><Input value={formData.lesionYParteCuerpo} onChange={e => handleChange('lesionYParteCuerpo', e.target.value)} /></div>
                                <div><Label>Fecha de Cierre</Label><Input type="date" value={dateToInputFormat(formData.fechaCierre)} onChange={e => handleChange('fechaCierre', e.target.value)} /></div>
                                <div>
                                    <Label>APT/IPT</Label>
                                    <Select value={formData.aptIpt} onValueChange={v => handleChange('aptIpt', v)}>
                                        <SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="APT">APT</SelectItem>
                                            <SelectItem value="IPT">IPT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>PCL, Quien Emite y Fecha</Label><Input value={formData.pcl} onChange={e => handleChange('pcl', e.target.value)} /></div>
                           </div>
                        </div>

                        {/* Relocation Info */}
                        <div className="space-y-4 p-4 border rounded-lg">
                           <h3 className="font-semibold text-lg">Información de Reubicación</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div><Label>Fecha de Reubicación</Label><Input type="date" value={dateToInputFormat(formData.fechaReubicacion)} onChange={e => handleChange('fechaReubicacion', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Cargo de Reubicación</Label><Input value={formData.cargoReubicacion} onChange={e => handleChange('cargoReubicacion', e.target.value)} /></div>
                                <div className="col-span-3"><Label>Funciones del Cargo de Reubicación</Label><Textarea value={formData.funcionesCargoReubicacion} onChange={e => handleChange('funcionesCargoReubicacion', e.target.value)} /></div>
                            </div>
                        </div>

                        {/* Recommendation Details */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Detalle de Recomendaciones</h3>
                             <div className="grid grid-cols-3 gap-4">
                                <div><Label>Fecha de Recomendación</Label><Input type="date" value={dateToInputFormat(formData.fechaRecomendacion)} onChange={e => handleChange('fechaRecomendacion', e.target.value)} /></div>
                                <div>
                                    <Label>Tipo de Recomendación</Label>
                                    <Select value={formData.tipoRecomendacion} onValueChange={v => handleChange('tipoRecomendacion', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Temporal">Temporal</SelectItem>
                                            <SelectItem value="Permanente">Permanente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Vigencia de Recomendaciones</Label><Input value={formData.vigenciaRecomendaciones} onChange={e => handleChange('vigenciaRecomendaciones', e.target.value)} /></div>
                                <div><Label>Fecha Inicio Recomendaciones</Label><Input type="date" value={dateToInputFormat(formData.fechaInicioRecomendaciones)} onChange={e => handleChange('fechaInicioRecomendaciones', e.target.value)} /></div>
                                <div><Label>Fecha Fin Recomendaciones</Label><Input type="date" value={dateToInputFormat(formData.fechaFinRecomendaciones)} onChange={e => handleChange('fechaFinRecomendaciones', e.target.value)} /></div>
                                <div><Label>Días Acumulados</Label><Input type="number" value={formData.diasAcumulados} onChange={e => handleChange('diasAcumulados', Number(e.target.value))} /></div>
                                <div className="col-span-3"><Label>Recomendaciones</Label><Textarea value={formData.recomendaciones} onChange={e => handleChange('recomendaciones', e.target.value)} /></div>
                            </div>
                        </div>
                        
                        {/* Follow-up & Documents */}
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Reintegro y Seguimiento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Fecha de Reintegro</Label><Input type="date" value={dateToInputFormat(formData.fechaReintegro)} onChange={e => handleChange('fechaReintegro', e.target.value)} /></div>
                                <div>
                                    <Label>Carta de Reintegro (Soporte)</Label>
                                    <Select onValueChange={(v) => handleChange('cartaReintegro', v)} value={formData.cartaReintegro}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione una opción" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Si">Si</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Capacitación / Inducción / Reinducción</Label>
                                    <Select onValueChange={(v) => handleChange('capacitacion', v)} value={formData.capacitacion}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione una opción" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Capacitación">Capacitación</SelectItem>
                                            <SelectItem value="Inducción">Inducción</SelectItem>
                                            <SelectItem value="Reinducción">Reinducción</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Socialización Recomendaciones</Label>
                                    <Select onValueChange={(v) => handleChange('socializacionRecomendaciones', v)} value={formData.socializacionRecomendaciones}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione una opción" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Si">Si</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2"><Label>Observaciones</Label><Textarea value={formData.observaciones} onChange={e => handleChange('observaciones', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Observaciones Mesa de Trabajo</Label><Textarea value={formData.observacionesMesaTrabajo} onChange={e => handleChange('observacionesMesaTrabajo', e.target.value)} /></div>
                                <div className="col-span-2">
                                    <Label>Soportes Adicionales</Label>
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
                                                <Button variant="ghost" size="icon" type="button" onClick={() => removeSoporte(url)}>
                                                    <Trash2 className="h-4 w-4 text-red-500"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingId ? 'Actualizar' : 'Guardar'} Seguimiento</Button>
                        </DialogFooter>
                    </form>
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

const MedicalRecommendationDetails = ({ recommendation, onClose, onEdit }: { recommendation: MedicalRecommendation, onClose: () => void, onEdit: () => void }) => {
    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Detalle del Seguimiento</DialogTitle>
                <DialogDescription>
                    Registro de {recommendation.nombreCompleto} - {formatDate(recommendation.fechaRecomendacion)}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
                {/* Employee Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Empleado</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <DetailItem label="Nombre Completo" value={recommendation.nombreCompleto} />
                        <DetailItem label="N° Documento" value={recommendation.identificacion} />
                        <DetailItem label="Cargo" value={recommendation.cargoContratacion} />
                        <DetailItem label="Centro de Trabajo" value={recommendation.centroDeTrabajo} />
                        <DetailItem label="Estado en Empresa" value={recommendation.estadoEmpresa} />
                        <DetailItem label="Fecha Ingreso Programa" value={formatDate(recommendation.fechaIngresoPrograma)} />
                    </div>
                </div>
                <Separator />
                {/* Event and Case Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Información del Evento y Caso</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                       <DetailItem label="Tipo de Evento" value={recommendation.tipoEvento} />
                       <DetailItem label="Estado del Caso" value={recommendation.estadoCaso} />
                       <DetailItem label="Lesión y Parte del Cuerpo" value={recommendation.lesionYParteCuerpo} />
                       <DetailItem label="APT/IPT" value={recommendation.aptIpt} />
                       <DetailItem label="PCL" value={recommendation.pcl} />
                       <DetailItem label="Fecha Cierre" value={formatDate(recommendation.fechaCierre)} />
                    </div>
                </div>
                <Separator />
                {/* Recommendation Details */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Detalles de la Recomendación</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                       <DetailItem label="Fecha Recomendación" value={formatDate(recommendation.fechaRecomendacion)} />
                       <DetailItem label="Tipo" value={recommendation.tipoRecomendacion} />
                       <DetailItem label="Vigencia" value={recommendation.vigenciaRecomendaciones} />
                       <DetailItem label="Días Acumulados" value={recommendation.diasAcumulados} />
                       <DetailItem label="Fecha Inicio" value={formatDate(recommendation.fechaInicioRecomendaciones)} />
                       <DetailItem label="Fecha Fin" value={formatDate(recommendation.fechaFinRecomendaciones)} />
                       <div className="col-span-full"><DetailItem label="Recomendaciones" value={<p className="whitespace-pre-wrap">{recommendation.recomendaciones}</p>} />} /></div>
                    </div>
                </div>
                <Separator />
                 {/* Follow-up & Attachments */}
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Reintegro y Seguimiento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium">Reubicación</h4>
                             <DetailItem label="Fecha Reubicación" value={formatDate(recommendation.fechaReubicacion)} />
                             <DetailItem label="Cargo Reubicación" value={recommendation.cargoReubicacion} />
                             <DetailItem label="Funciones del Cargo" value={<p className="whitespace-pre-wrap">{recommendation.funcionesCargoReubicacion}</p>} />
                        </div>
                         <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium">Observaciones</h4>
                            <DetailItem label="Observaciones Generales" value={<p className="whitespace-pre-wrap">{recommendation.observaciones}</p>} />
                             <hr/>
                            <DetailItem label="Observaciones Mesa de Trabajo" value={<p className="whitespace-pre-wrap">{recommendation.observacionesMesaTrabajo}</p>} />
                        </div>
                        <div className="col-span-full space-y-4 p-4 border rounded-lg">
                             <h4 className="font-medium">Soportes</h4>
                             <SupportSection title="Documentos Adjuntos" urls={recommendation.soportes} />
                              {(!recommendation.soportes || recommendation.soportes.length === 0) &&
                                <p className="text-sm text-muted-foreground text-center py-4">No hay soportes adjuntos.</p>
                             }
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
