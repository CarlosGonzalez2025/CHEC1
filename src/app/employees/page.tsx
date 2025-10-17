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
import { Download, MoreHorizontal, PlusCircle, Upload, Filter, X, BellDot } from 'lucide-react';
import { Employee, addEmployee, updateEmployee } from '@/lib/data';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parse, differenceInDays, addYears, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function getStatusBadge(status: string) {
  switch (status) {
    case 'Activo':
      return <Badge className="bg-green-500">Activo</Badge>;
    case 'Retirado':
      return <Badge variant="destructive">Retirado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const getExpirationAlert = (employee: Employee): { message: string; variant: "destructive" | "default" | "secondary" | "outline"; } => {
    if (employee.contractStatus === 'Retirado') {
        return { message: "Retirado", variant: 'outline' };
    }
    
    const { hireDate, positionType } = employee;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!hireDate) {
        return { message: "Sin Fecha Ingreso", variant: "secondary" };
    }
    if (!positionType) {
        return { message: "Sin Tipo Cargo", variant: "secondary" };
    }

    let expirationDate;
    try {
        const startDate = new Date(hireDate);
        startDate.setHours(0, 0, 0, 0);

        if (positionType === "Operativo") {
            expirationDate = addYears(startDate, 1);
        } else if (positionType === "Administrativo") {
            expirationDate = addMonths(addYears(startDate, 1), 6);
        } else {
            return { message: "Cargo no reconocido", variant: "secondary" };
        }
    } catch(e) {
        return { message: "Fecha Inválida", variant: "secondary" };
    }

    if (today > expirationDate) {
        return { message: "VENCIDO", variant: "destructive" };
    }

    const daysRemaining = differenceInDays(expirationDate, today);

    if (daysRemaining <= 30) {
        if (daysRemaining === 0) return { message: "Vence HOY", variant: "default" };
        if (daysRemaining === 1) return { message: "Vence en 1 día", variant: "default" };
        return { message: `Vence en ${daysRemaining} días`, variant: "default" };
    }

    return { message: "Vigente", variant: "default" };
};


const healthFunds = [
    "Entidad Promotora de Salud Sanitas S.A.S.",
    "EPS Suramericana S.A.",
    "Salud Total Entidad Promotora de Salud del regimen contributivo y del regimen subsidiado S.A.",
    "Compensar EPS",
    "EPS Famisanar S.A.S",
    "Nueva EPS S.A.",
    "Nueva EPS S.A. -CM",
    "Administradora de los recursos del sistema general de seguridad social en salud - MIN001",
    "COOSALUD EPS S.A.",
    "COOSALUD EPS S.A. -CM",
    "Asociacion Mutual Ser Empresa Solidaria de Salud Entidad Promotora de Salud - MUTUAL SER EPS",
    "Asociacion Mutual Ser Empresa Solidaria de Salud Entidad Promotora de Salud - MUTUAL SER EPS -CM",
    "Alianza Medellin Antioquia EPS S.A.S. Savia Salud EPS -CM",
    "Capital Salud Entidad Promotora de Salud del Régimen Subsidiado SAS -CM",
    "EPS Familiar de Colombia",
    "Administradora de los recursos del sistema general de seguridad social en salud - MIN002",
    "Sociedad Simplificada por Acciones Emssanar S.A.S.",
    "Aliansalud EPS S.A.",
    "Sin Definir",
    "Entidad Promotora de Salud Servicio Occidental de Salud S.A. S.O.S.",
    "Cajacopi EPS S.A.S."
];

const pensionFunds = [
    "Porvenir",
    "Administradora Colombiana de Pensiones Colpensiones",
    "Protección",
    "Skandia Fondo de Pensiones Obligatorias",
    "Colfondos",
    "Sin Definir",
    "Skandia Fondo Alternativo de Pensiones"
];


type EmployeeFormData = Omit<Employee, 'id' | 'tenantId'>;
const initialNewEmployeeState: EmployeeFormData = {
  user: '',
  identificationType: '',
  identification: '',
  fullName: '',
  birthDate: null,
  gender: '',
  mobilePhone: '',
  position: '',
  positionType: '',
  contractStatus: 'Activo',
  hireDate: null,
  contractEndDate: null,
  payrollDescription: '',
  salary: 0,
  hourlyRate: 0,
  healthFund: '',
  pensionFund: '',
  pmtCourseDate: null,
  foodHandlingCourseDate: null,
  onacCertificateDate: null,
  sstCourseDate: null,
  periodicExamDueDate: null,
  photoURL: null,
};


function dateToInputFormat(date: Date | null | string): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        // Adjust for timezone offset before converting to ISO string
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


const employeeCSVHeaders = [
    "user", "identificationType", "identification", "fullName", "birthDate", 
    "gender", "mobilePhone", "position", "positionType", "contractStatus", 
    "hireDate", "contractEndDate", "payrollDescription", "salary", "hourlyRate", 
    "healthFund", "pensionFund", "pmtCourseDate", "foodHandlingCourseDate", 
    "onacCertificateDate", "sstCourseDate", "periodicExamDueDate"
];

function downloadCSVTemplate() {
    const csvHeader = employeeCSVHeaders.join(";");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_empleados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


type UploadedEmployee = Omit<Employee, 'id' | 'tenantId'>;

export default function EmployeeManagementPage() {
    const router = useRouter();
    const { user, employees, emos, costCenters, loading, tenantId, fetchAllData } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [formData, setFormData] = useState<EmployeeFormData>(initialNewEmployeeState);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [duplicates, setDuplicates] = useState<(UploadedEmployee & { id: string })[]>([]);
    const [newRecords, setNewRecords] = useState<UploadedEmployee[]>([]);
    const [pendingCandidates, setPendingCandidates] = useState<any[]>([]);


    // Filter states
    const [filterIdentification, setFilterIdentification] = useState('');
    const [filterPayroll, setFilterPayroll] = useState('');
    const [filterHireDate, setFilterHireDate] = useState<Date | undefined>(undefined);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading) {
            const employeeIds = new Set(employees.map(e => e.identification));
            const candidates = emos.filter(
                emo => emo.tipoExamen === 'INGRESO' && !employeeIds.has(emo.cedula)
            );
            setPendingCandidates(candidates);
        }
    }, [loading, employees, emos]);


    const baseFilter = (emp: Employee) => {
        const userCostCenters = user?.costCenters || [];
        const canViewAll = userCostCenters.length === 0;

        const hireDateMatch = !filterHireDate || (emp.hireDate && format(new Date(emp.hireDate), 'yyyy-MM-dd') === format(filterHireDate, 'yyyy-MM-dd'));
        const costCenterMatch = canViewAll || userCostCenters.includes(emp.payrollDescription);

        return (
            costCenterMatch &&
            emp.identification.toLowerCase().includes(filterIdentification.toLowerCase()) &&
            (filterPayroll === '' || emp.payrollDescription === filterPayroll) &&
            hireDateMatch
        );
    };

    const activeEmployees = useMemo(() => {
        return employees.filter(emp => emp.contractStatus === 'Activo' && baseFilter(emp));
    }, [employees, filterIdentification, filterPayroll, filterHireDate, user]);

    const retiredEmployees = useMemo(() => {
        return employees.filter(emp => emp.contractStatus === 'Retirado' && baseFilter(emp));
    }, [employees, filterIdentification, filterPayroll, filterHireDate, user]);

    const clearFilters = () => {
        setFilterIdentification('');
        setFilterPayroll('');
        setFilterHireDate(undefined);
    };

    const handleDownloadData = (status: 'Activo' | 'Retirado') => {
        const dataToExport = (status === 'Activo' ? activeEmployees : retiredEmployees).map(emp => {
            const dateToString = (date: Date | null) => {
                if (!date) return '';
                try {
                    const d = new Date(date);
                    return d.toLocaleDateString('es-CO', { timeZone: 'UTC' });
                } catch {
                    return '';
                }
            }

            return {
                user: emp.user,
                identificationType: emp.identificationType,
                identification: emp.identification,
                fullName: emp.fullName,
                birthDate: dateToString(emp.birthDate),
                gender: emp.gender,
                mobilePhone: emp.mobilePhone,
                position: emp.position,
                positionType: emp.positionType,
                contractStatus: emp.contractStatus,
                hireDate: dateToString(emp.hireDate),
                contractEndDate: dateToString(emp.contractEndDate),
                payrollDescription: emp.payrollDescription,
                salary: emp.salary,
                hourlyRate: emp.hourlyRate,
                healthFund: emp.healthFund,
                pensionFund: emp.pensionFund,
                pmtCourseDate: dateToString(emp.pmtCourseDate),
                foodHandlingCourseDate: dateToString(emp.foodHandlingCourseDate),
                onacCertificateDate: dateToString(emp.onacCertificateDate),
                sstCourseDate: dateToString(emp.sstCourseDate),
                periodicExamDueDate: dateToString(emp.periodicExamDueDate),
            }
        });

        if (dataToExport.length === 0) {
            toast({
                title: "No hay datos para exportar",
                description: `La tabla de empleados ${status.toLowerCase()}s está vacía.`,
            });
            return;
        }

        const csv = Papa.unparse(dataToExport, { delimiter: ";", header: true });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export_empleados_${status.toLowerCase()}s.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    useEffect(() => {
        if (formData.salary > 0) {
            setFormData(prev => ({...prev, hourlyRate: parseFloat(((prev.salary / 30) / 8).toFixed(2))}));
        } else {
            setFormData(prev => ({...prev, hourlyRate: 0}));
        }
    }, [formData.salary]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({...prev, [id]: value }));
    }

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({...prev, [id]: value }));
    }
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value || null }));
    }

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSalary = parseFloat(e.target.value);
        setFormData(prev => ({...prev, salary: isNaN(newSalary) ? 0 : newSalary}));
    }

    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) {
            toast({ title: "Error", description: "No se pudo identificar a la empresa.", variant: "destructive"});
            return;
        }

        try {
            const employeeToSave = {
                ...formData,
                birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
                hireDate: formData.hireDate ? new Date(formData.hireDate) : null,
                contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate) : null,
                pmtCourseDate: formData.pmtCourseDate ? new Date(formData.pmtCourseDate) : null,
                foodHandlingCourseDate: formData.foodHandlingCourseDate ? new Date(formData.foodHandlingCourseDate) : null,
                onacCertificateDate: formData.onacCertificateDate ? new Date(formData.onacCertificateDate) : null,
                sstCourseDate: formData.sstCourseDate ? new Date(formData.sstCourseDate) : null,
                periodicExamDueDate: formData.periodicExamDueDate ? new Date(formData.periodicExamDueDate) : null,
            };

            if (editingEmployeeId) {
                await updateEmployee(editingEmployeeId, employeeToSave, tenantId);
                toast({ title: "Empleado Actualizado", description: "El empleado ha sido actualizado." });
            } else {
                await addEmployee(employeeToSave, tenantId);
                toast({ title: "Empleado Guardado", description: "El nuevo empleado ha sido registrado." });
            }

            setIsFormOpen(false);
            fetchAllData();
        } catch (error) {
            console.error("Error saving employee: ", error);
            toast({
                title: "Error al Guardar",
                description: "No se pudo guardar el empleado. Revisa la consola y las reglas de Firebase.",
                variant: "destructive",
            });
        }
    }
    
    const handleViewDetails = (employeeId: string) => {
        router.push(`/employees/${employeeId}`);
    };

    const handleOpenForm = (employee: Partial<EmployeeFormData> | null = null) => {
        if (employee && 'id' in employee) {
             setEditingEmployeeId((employee as Employee).id);
             setFormData({
                ...(employee as Employee),
                birthDate: dateToInputFormat(employee.birthDate),
                hireDate: dateToInputFormat(employee.hireDate),
                contractEndDate: dateToInputFormat(employee.contractEndDate),
                pmtCourseDate: dateToInputFormat(employee.pmtCourseDate),
                foodHandlingCourseDate: dateToInputFormat(employee.foodHandlingCourseDate),
                onacCertificateDate: dateToInputFormat(employee.onacCertificateDate),
                sstCourseDate: dateToInputFormat(employee.sstCourseDate),
                periodicExamDueDate: dateToInputFormat(employee.periodicExamDueDate),
            });
        } else if (employee) {
            // Pre-fill from candidate
             setEditingEmployeeId(null);
             setFormData({
                ...initialNewEmployeeState,
                fullName: employee.fullName || '',
                identification: employee.identification || '',
                identificationType: employee.identificationType || '',
                position: employee.position || '',
                // You can add more pre-filled fields here
            });
        }
        else {
            setEditingEmployeeId(null);
            setFormData(initialNewEmployeeState);
        }
        setIsFormOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && tenantId) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                delimiter: ";",
                complete: (results) => {
                    processUploadedData(results.data as any[]);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    toast({ 
                        title: 'Error al procesar archivo', 
                        description: 'El formato del CSV no es válido. Si edita en Excel, asegúrese de guardarlo como "CSV (delimitado por comas)" o "CSV (delimitado por punto y coma)".', 
                        variant: 'destructive' 
                    });
                }
            });
        }
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const processUploadedData = (data: any[]) => {
        const existingIdentifications = new Map(employees.map(emp => [emp.identification, emp.id]));
        const uploadedDuplicates: (UploadedEmployee & { id: string })[] = [];
        const uploadedNewRecords: UploadedEmployee[] = [];

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
            if (!row.identification || !row.fullName) {
                console.warn("Skipping row due to missing data:", row);
                return;
            }

            const employeeRecord: UploadedEmployee = {
                user: row.user || '',
                identificationType: row.identificationType || '',
                identification: row.identification || '',
                fullName: row.fullName || '',
                birthDate: parseDate(row.birthDate),
                gender: row.gender || '',
                mobilePhone: row.mobilePhone || '',
                position: row.position || '',
                positionType: row.positionType || '',
                contractStatus: row.contractStatus || 'Activo',
                hireDate: parseDate(row.hireDate),
                contractEndDate: parseDate(row.contractEndDate),
                payrollDescription: row.payrollDescription || '',
                salary: parseFloat(String(row.salary).replace(/[^0-9.-]+/g,"")) || 0,
                hourlyRate: parseFloat(String(row.hourlyRate).replace(/[^0-9.-]+/g,"")) || 0,
                healthFund: row.healthFund || '',
                pensionFund: row.pensionFund || '',
                pmtCourseDate: parseDate(row.pmtCourseDate),
                foodHandlingCourseDate: parseDate(row.foodHandlingCourseDate),
                onacCertificateDate: parseDate(row.onacCertificateDate),
                sstCourseDate: parseDate(row.sstCourseDate),
                periodicExamDueDate: parseDate(row.periodicExamDueDate),
                photoURL: null,
            };
            
            const existingId = existingIdentifications.get(employeeRecord.identification);
            if (existingId) {
                uploadedDuplicates.push({ ...employeeRecord, id: existingId });
            } else {
                uploadedNewRecords.push(employeeRecord);
            }
        });

        setNewRecords(uploadedNewRecords);
        setDuplicates(uploadedDuplicates);

        if (uploadedDuplicates.length > 0) {
            setIsAlertOpen(true);
        } else if (uploadedNewRecords.length > 0) {
            handleBulkCreate(uploadedNewRecords);
        } else {
             toast({ title: "No hay datos nuevos", description: "El archivo no contiene empleados nuevos o válidos." });
        }
    };
    
    const handleBulkCreate = async (records: UploadedEmployee[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => addEmployee(rec, tenantId)));
            toast({ title: `${records.length} empleados creados`, description: "Se han registrado los nuevos empleados." });
            fetchAllData();
        } catch (error) {
            console.error("Error creating employees:", error);
            toast({ title: 'Error en la creación masiva', description: "No se pudieron crear los empleados.", variant: 'destructive' });
        }
    };

    const handleBulkUpdate = async (records: (UploadedEmployee & { id: string })[]) => {
        if (!tenantId) return;
        try {
            await Promise.all(records.map(rec => updateEmployee(rec.id, rec, tenantId)));
            toast({ title: `${records.length} empleados actualizados`, description: "Se han actualizado los datos de los empleados existentes." });
            fetchAllData();
        } catch (error) {
            console.error("Error updating employees:", error);
            toast({ title: 'Error en la actualización masiva', description: "No se pudieron actualizar los empleados.", variant: 'destructive' });
        }
    };
    
    const confirmUpdate = () => {
        if (!tenantId) return;
        setIsAlertOpen(false);
        if (duplicates.length > 0) {
            handleBulkUpdate(duplicates);
        }
        if (newRecords.length > 0) {
            handleBulkCreate(newRecords);
        }
    };

    const denyUpdate = () => {
        if (!tenantId) return;
        setIsAlertOpen(false);
        if (newRecords.length > 0) {
            handleBulkCreate(newRecords);
        } else {
             toast({ title: "Operación cancelada", description: "No se realizaron cambios." });
        }
    };

    const handleDeactivate = async (employee: Employee) => {
        if (!tenantId) return;
        try {
            await updateEmployee(employee.id, { contractStatus: 'Retirado' }, tenantId);
            toast({ title: "Empleado Desactivado", description: `${employee.fullName} ha sido marcado como retirado.` });
            fetchAllData();
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo desactivar el empleado.', variant: 'destructive' });
        }
    };

  return (
    <AppLayout pageTitle="Gestión de Empleados">
        <Tabs defaultValue="management">
            <TabsList>
                <TabsTrigger value="management">Gestión de Empleados</TabsTrigger>
                <TabsTrigger value="alerts" className="relative">
                    Alertas de Ingreso
                    {pendingCandidates.length > 0 && 
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{pendingCandidates.length}</Badge>
                    }
                </TabsTrigger>
            </TabsList>
            <TabsContent value="management">
                <Card>
                    <CardHeader>
                        <div className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>Todos los Empleados</CardTitle>
                                <CardDescription>
                                Ver, gestionar y filtrar los registros de todos los empleados.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadData('Activo')}>
                                    <Download className="h-4 w-4" />
                                    Descargar Activos
                                </Button>
                                 <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadData('Retirado')}>
                                    <Download className="h-4 w-4" />
                                    Descargar Retirados
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1" onClick={downloadCSVTemplate}>
                                    <Download className="h-4 w-4" />
                                    Descargar Plantilla
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-4 w-4" />
                                    Cargar Archivo
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />
                                <Button size="sm" className="gap-1" onClick={() => handleOpenForm()}>
                                    <PlusCircle className="h-4 w-4" />
                                    Añadir Empleado
                                </Button>
                            </div>
                        </div>
                        <Collapsible className="mt-4">
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                    <Filter className="h-4 w-4"/>
                                    Filtrar Empleados
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="p-4 border rounded-lg bg-muted/50 mt-2 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="filter-id">Identificación</Label>
                                            <Input 
                                                id="filter-id" 
                                                placeholder="Buscar por identificación..." 
                                                value={filterIdentification} 
                                                onChange={(e) => setFilterIdentification(e.target.value)} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="filter-payroll">Descripción de Nómina</Label>
                                            <Select value={filterPayroll} onValueChange={setFilterPayroll}>
                                                <SelectTrigger id="filter-payroll">
                                                    <SelectValue placeholder="Todas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {costCenters.map(desc => (
                                                        <SelectItem key={desc.id} value={desc.name}>{desc.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="filter-hire-date">Fecha de Ingreso</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {filterHireDate ? format(filterHireDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={filterHireDate}
                                                    onSelect={setFilterHireDate}
                                                    initialFocus
                                                />
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
                    </CardHeader>
                    <CardContent>
                       <Tabs defaultValue="active">
                           <TabsList>
                               <TabsTrigger value="active">Activos ({activeEmployees.length})</TabsTrigger>
                               <TabsTrigger value="retired">Retirados ({retiredEmployees.length})</TabsTrigger>
                           </TabsList>
                           <TabsContent value="active">
                              <div className="mt-4 border rounded-lg">
                                 <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nombre Completo</TableHead>
                                        <TableHead>Identificación</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Tipo de Cargo</TableHead>
                                        <TableHead>Fecha de Ingreso</TableHead>
                                        <TableHead>Fin Contrato</TableHead>
                                        <TableHead>Descripción de Nómina</TableHead>
                                        <TableHead>Estado Contrato</TableHead>
                                        <TableHead>Alerta Vencimiento</TableHead>
                                        <TableHead>
                                          <span className="sr-only">Actions</span>
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {activeEmployees.map((employee) => {
                                        const alert = getExpirationAlert(employee);
                                        let badgeClass = '';
                                        if (alert.variant === 'destructive') badgeClass = 'bg-red-500 text-white';
                                        else if (alert.variant === 'default' && alert.message.includes('Vigente')) badgeClass = 'bg-green-500 text-white';
                                        else if (alert.variant === 'default') badgeClass = 'bg-yellow-500 text-black';
                                        else if (alert.variant === 'outline') badgeClass = 'bg-orange-500 text-white';
                                        return (
                                            <TableRow key={employee.id} onClick={() => handleViewDetails(employee.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{employee.fullName}</TableCell>
                                            <TableCell>{employee.identification}</TableCell>
                                            <TableCell>{employee.position}</TableCell>
                                            <TableCell>{employee.positionType}</TableCell>
                                            <TableCell>{formatDate(employee.hireDate)}</TableCell>
                                            <TableCell>{formatDate(employee.contractEndDate)}</TableCell>
                                            <TableCell>{employee.payrollDescription}</TableCell>
                                            <TableCell>{getStatusBadge(employee.contractStatus)}</TableCell>
                                            <TableCell>
                                                <Badge className={badgeClass} variant={alert.variant === 'secondary' ? 'secondary' : 'default'}>
                                                    {alert.message}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleViewDetails(employee.id)}}>Ver Detalles</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleOpenForm(employee)}}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleDeactivate(employee)}}>Desactivar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                              </div>
                           </TabsContent>
                           <TabsContent value="retired">
                                <div className="mt-4 border rounded-lg">
                                 <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nombre Completo</TableHead>
                                        <TableHead>Identificación</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Tipo de Cargo</TableHead>
                                        <TableHead>Fecha de Ingreso</TableHead>
                                        <TableHead>Fin Contrato</TableHead>
                                        <TableHead>Descripción de Nómina</TableHead>
                                        <TableHead>Estado Contrato</TableHead>
                                        <TableHead>
                                          <span className="sr-only">Actions</span>
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {retiredEmployees.map((employee) => (
                                            <TableRow key={employee.id} onClick={() => handleViewDetails(employee.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{employee.fullName}</TableCell>
                                            <TableCell>{employee.identification}</TableCell>
                                            <TableCell>{employee.position}</TableCell>
                                            <TableCell>{employee.positionType}</TableCell>
                                            <TableCell>{formatDate(employee.hireDate)}</TableCell>
                                            <TableCell>{formatDate(employee.contractEndDate)}</TableCell>
                                            <TableCell>{employee.payrollDescription}</TableCell>
                                            <TableCell>{getStatusBadge(employee.contractStatus)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleViewDetails(employee.id)}}>Ver Detalles</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleOpenForm(employee)}}>Editar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            </TableRow>
                                        )
                                      )}
                                    </TableBody>
                                  </Table>
                              </div>
                           </TabsContent>
                       </Tabs>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="alerts">
                 <Card>
                    <CardHeader>
                        <div className="flex items-start gap-4">
                            <BellDot className="h-6 w-6 text-yellow-600"/>
                            <div>
                                <CardTitle className="text-yellow-800">Alertas de Ingreso Pendiente</CardTitle>
                                <CardDescription className="text-yellow-700">Los siguientes candidatos tienen un examen de ingreso pero no existen en la base de datos de empleados.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Candidato</TableHead>
                                    <TableHead>Identificación</TableHead>
                                    <TableHead>Cargo al que Aplica</TableHead>
                                    <TableHead>Fecha de Examen</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingCandidates.map(candidate => (
                                    <TableRow key={candidate.id}>
                                        <TableCell>{candidate.nombreCompleto}</TableCell>
                                        <TableCell>{candidate.cedula}</TableCell>
                                        <TableCell>{candidate.cargo}</TableCell>
                                        <TableCell>{format(new Date(candidate.fechaExamen), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleOpenForm({ fullName: candidate.nombreCompleto, identification: candidate.cedula, position: candidate.cargo })}>Completar Registro</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEmployee}>
                <DialogHeader>
                    <DialogTitle>{editingEmployeeId ? 'Editar Empleado' : 'Añadir Nuevo Empleado'}</DialogTitle>
                    <DialogDescription>
                        Complete el formulario para registrar o actualizar un empleado.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {/* Column 1 */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="identificationType">Tipo de documento</Label>
                            <Select onValueChange={(value) => handleSelectChange('identificationType', value)} value={formData.identificationType}>
                                <SelectTrigger id="identificationType"><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CC">CC - Cédula de Ciudadanía</SelectItem>
                                    <SelectItem value="CE">CE - Cédula de Extranjería</SelectItem>
                                    <SelectItem value="PT">PT - Permiso por Protección Temporal</SelectItem>
                                    <SelectItem value="PA">PA - Pasaporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="identification">Identificación</Label><Input id="identification" value={formData.identification} onChange={handleInputChange} /></div>
                        <div><Label htmlFor="fullName">Nombre Completo</Label><Input id="fullName" value={formData.fullName} onChange={handleInputChange}/></div>
                        <div>
                            <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                            <Input id="birthDate" type="date" value={dateToInputFormat(formData.birthDate)} onChange={handleDateChange} />
                        </div>
                        <div>
                            <Label htmlFor="gender">Género</Label>
                            <Select onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender}>
                                <SelectTrigger id="gender"><SelectValue placeholder="Seleccione un género" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                    <SelectItem value="Femenino">Femenino</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-4">
                        <div><Label htmlFor="mobilePhone">Teléfono Celular</Label><Input id="mobilePhone" value={formData.mobilePhone} onChange={handleInputChange}/></div>
                        <div><Label htmlFor="position">Cargo</Label><Input id="position" value={formData.position} onChange={handleInputChange}/></div>
                        <div>
                            <Label htmlFor="positionType">Tipo de Cargo</Label>
                            <Select onValueChange={(value) => handleSelectChange('positionType', value)} value={formData.positionType}>
                                <SelectTrigger id="positionType"><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                                <SelectContent><SelectItem value="Operativo">Operativo</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="contractStatus">Estado Contrato</Label>
                            <Select onValueChange={(value) => handleSelectChange('contractStatus', value)} value={formData.contractStatus}>
                                <SelectTrigger id="contractStatus"><SelectValue placeholder="Seleccione un estado" /></SelectTrigger>
                                <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Retirado">Retirado</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="hireDate">Fecha de Ingreso</Label><Input id="hireDate" type="date" value={dateToInputFormat(formData.hireDate)} onChange={handleDateChange} /></div>
                        <div><Label htmlFor="contractEndDate">Fecha de terminación de contrato</Label><Input id="contractEndDate" type="date" value={dateToInputFormat(formData.contractEndDate)} onChange={handleDateChange} /></div>
                    </div>
                    {/* Column 3 */}
                    <div className="space-y-4">
                         <div>
                            <Label htmlFor="payrollDescription">Descripción de Nómina</Label>
                            <Select onValueChange={(value) => handleSelectChange('payrollDescription', value)} value={formData.payrollDescription}>
                                <SelectTrigger id="payrollDescription"><SelectValue placeholder="Seleccione una descripción" /></SelectTrigger>
                                <SelectContent>{costCenters.map(desc => (<SelectItem key={desc.id} value={desc.name}>{desc.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="salary">Salario</Label><Input id="salary" type="number" value={formData.salary} onChange={handleSalaryChange} /></div>
                        <div><Label htmlFor="hourlyRate">Valor Hora</Label><Input id="hourlyRate" type="number" value={formData.hourlyRate} readOnly /></div>
                        <div>
                            <Label htmlFor="healthFund">Fondo de Salud</Label>
                            <Select onValueChange={(value) => handleSelectChange('healthFund', value)} value={formData.healthFund}>
                                <SelectTrigger id="healthFund"><SelectValue placeholder="Seleccione un fondo" /></SelectTrigger>
                                <SelectContent>{healthFunds.map(fund => (<SelectItem key={fund} value={fund}>{fund}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="pensionFund">Fondo de Pensión</Label>
                            <Select onValueChange={(value) => handleSelectChange('pensionFund', value)} value={formData.pensionFund}>
                                <SelectTrigger id="pensionFund"><SelectValue placeholder="Seleccione un fondo" /></SelectTrigger>
                                <SelectContent>{pensionFunds.map(fund => (<SelectItem key={fund} value={fund}>{fund}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="pmtCourseDate">Fecha curso PMT</Label><Input id="pmtCourseDate" type="date" value={dateToInputFormat(formData.pmtCourseDate)} onChange={handleDateChange} /></div>
                        <div><Label htmlFor="foodHandlingCourseDate">Fecha curso Manipulación de alimentos</Label><Input id="foodHandlingCourseDate" type="date" value={dateToInputFormat(formData.foodHandlingCourseDate)} onChange={handleDateChange} /></div>
                        <div><Label htmlFor="onacCertificateDate">Fecha certificado ONAC</Label><Input id="onacCertificateDate" type="date" value={dateToInputFormat(formData.onacCertificateDate)} onChange={handleDateChange} /></div>
                        <div><Label htmlFor="sstCourseDate">Fecha Curso SST</Label><Input id="sstCourseDate" type="date" value={dateToInputFormat(formData.sstCourseDate)} onChange={handleDateChange} /></div>
                        <div><Label htmlFor="periodicExamDueDate">Venc. Examen Periódico</Label><Input id="periodicExamDueDate" type="date" value={dateToInputFormat(formData.periodicExamDueDate)} onChange={handleDateChange} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se encontraron {duplicates.length} empleados duplicados</AlertDialogTitle>
            <AlertDialogDescription>
                Se han encontrado empleados en el archivo que ya existen en el sistema (según su número de identificación). ¿Deseas actualizar sus datos con la información del archivo?
                <br/><br/>
                Si eliges "No", solo se agregarán los empleados que son completamente nuevos.
            </AlertDialogDescription>
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
