'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layout/app-layout';
import { getEmployees } from '@/lib/data';
import type { Employee } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { differenceInYears, getYear, getMonth } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Download, FileDown, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAuth } from '@/hooks/use-auth';
import { Label } from '@/components/ui/label';

const ageRanges = ['<18', '18-28', '29-40', '41-52', '53-63', '>=64'];

const calculateAge = (birthDate: Date | null): number | null => {
  if (!birthDate) return null;
  return differenceInYears(new Date(), birthDate);
};

const getAgeRange = (age: number | null): string => {
    if (age === null) return 'N/A';
    if (age < 18) return '<18';
    if (age >= 18 && age <= 28) return '18-28';
    if (age >= 29 && age <= 40) return '29-40';
    if (age >= 41 && age <= 52) return '41-52';
    if (age >= 53 && age <= 63) return '53-63';
    if (age >= 64) return '>=64';
    return 'N/A';
};

const pensionAgeMale = 62;
const pensionAgeFemale = 57;

const getPensionStatus = (employee: Employee): string => {
    const age = calculateAge(employee.birthDate);
    if (!age || !employee.gender) return 'En Edad Laboral';
    
    if (employee.gender === 'Masculino') {
        if (age >= pensionAgeMale) return 'En Edad de Pensión';
        if (age >= pensionAgeMale - 3) return 'Próximo a Pensión';
    } else if (employee.gender === 'Femenino') {
        if (age >= pensionAgeFemale) return 'En Edad de Pensión';
        if (age >= pensionAgeFemale - 3) return 'Próximo a Pensión';
    }
    return 'En Edad Laboral';
};

export default function EmployeeAnalysisPage() {
    const { employees, costCenters, loading } = useAuth();
    const [filters, setFilters] = useState({ gender: 'Todos', payroll: 'Todos', year: 'Todos los años' });
    const { toast } = useToast();
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const availableYears = useMemo(() => {
        const years = new Set(employees.map(emp => emp.hireDate ? getYear(emp.hireDate) : null).filter(Boolean));
        return Array.from(years).sort((a, b) => b - a);
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const genderMatch = filters.gender === 'Todos' || emp.gender === filters.gender;
            const payrollMatch = filters.payroll === 'Todos' || emp.payrollDescription === filters.payroll;
            const yearMatch = filters.year === 'Todos los años' || (emp.hireDate && getYear(emp.hireDate) === parseInt(filters.year, 10));
            return genderMatch && payrollMatch && yearMatch;
        });
    }, [employees, filters]);

    const ageGenderData = useMemo(() => {
        const data = ageRanges.map(range => {
            const rangeData: { name: string, Masculino: number, Femenino: number, Otro: number } = {
                name: range,
                Masculino: 0,
                Femenino: 0,
                Otro: 0,
            };
            filteredEmployees.forEach(emp => {
                const age = calculateAge(emp.birthDate);
                if (getAgeRange(age) === range) {
                    if (emp.gender === 'Masculino') rangeData.Masculino++;
                    else if (emp.gender === 'Femenino') rangeData.Femenino++;
                    else rangeData.Otro++;
                }
            });
            return rangeData;
        });
        return data;
    }, [filteredEmployees]);
    
    const pensionAlertData = useMemo(() => {
        const counts = {
            'En Edad Laboral': 0,
            'Próximo a Pensión': 0,
            'En Edad de Pensión': 0,
        };
        filteredEmployees.forEach(emp => {
            const status = getPensionStatus(emp);
            if (status in counts) {
                counts[status as keyof typeof counts]++;
            }
        });
        return [
            { name: 'En Edad Laboral', value: counts['En Edad Laboral'], fill: '#3b82f6' },
            { name: 'Próximo a Pensión', value: counts['Próximo a Pensión'], fill: '#f97316' },
            { name: 'En Edad de Pensión', value: counts['En Edad de Pensión'], fill: '#a855f7' },
        ];
    }, [filteredEmployees]);

    const turnoverByMonthData = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const yearToFilter = filters.year === 'Todos los años' ? new Date().getFullYear() : parseInt(filters.year, 10);
        
        const monthlyData: { [key: string]: { name: string, Ingresos: number, Salidas: number } } = {};
        monthNames.forEach((name, index) => {
            monthlyData[index] = { name, Ingresos: 0, Salidas: 0 };
        });

        // Use filteredEmployees instead of all employees
        filteredEmployees.forEach(emp => {
            if (emp.hireDate && getYear(emp.hireDate) === yearToFilter) {
                const month = getMonth(emp.hireDate);
                if (monthlyData[month]) {
                    monthlyData[month].Ingresos++;
                }
            }
            if (emp.contractStatus === 'Retirado' && emp.contractEndDate && getYear(emp.contractEndDate) === yearToFilter) {
               const month = getMonth(emp.contractEndDate);
                 if (monthlyData[month]) {
                    monthlyData[month].Salidas++;
                }
            }
        });
        
        return Object.values(monthlyData);
    }, [filteredEmployees, filters.year]);

    const turnoverByCostCenterData = useMemo(() => {
        const costCenterData: { [key: string]: { name: string, Ingresos: number, Salidas: number } } = {};
        const yearToFilter = filters.year === 'Todos los años' ? new Date().getFullYear() : parseInt(filters.year, 10);
        
        const relevantPayrolls = filters.payroll === 'Todos' ? costCenters.map(cc => cc.name) : [filters.payroll];
        relevantPayrolls.forEach(pd => {
            costCenterData[pd] = { name: pd, Ingresos: 0, Salidas: 0 };
        });

        // Use filteredEmployees instead of all employees
        filteredEmployees.forEach(emp => {
            const cc = emp.payrollDescription;
            if (!cc || !costCenterData[cc]) return;

            if (emp.hireDate && getYear(emp.hireDate) === yearToFilter) {
                costCenterData[cc].Ingresos++;
            }
            if (emp.contractStatus === 'Retirado' && emp.contractEndDate && getYear(emp.contractEndDate) === yearToFilter) {
               costCenterData[cc].Salidas++;
            }
        });
        
        return Object.values(costCenterData).filter(cc => cc.Ingresos > 0 || cc.Salidas > 0);
    }, [filteredEmployees, filters.year, filters.payroll, costCenters]);
    
    const handleExportCSV = () => {
        if (filteredEmployees.length === 0) {
            toast({ title: 'No hay datos para exportar', description: 'Seleccione otros filtros o asegúrese de que haya datos disponibles.' });
            return;
        }

        const dataToExport = filteredEmployees.map(emp => ({
            'Identificación': emp.identification,
            'Nombre Completo': emp.fullName,
            'Género': emp.gender,
            'Fecha de Nacimiento': emp.birthDate ? emp.birthDate.toLocaleDateString('es-CO') : 'N/A',
            'Edad': calculateAge(emp.birthDate),
            'Cargo': emp.position,
            'Nómina': emp.payrollDescription,
            'Estado Contrato': emp.contractStatus,
            'Fecha Ingreso': emp.hireDate ? emp.hireDate.toLocaleDateString('es-CO') : 'N/A',
            'Fecha Retiro': emp.contractEndDate ? emp.contractEndDate.toLocaleDateString('es-CO') : 'N/A',
            'Alerta Pensión': getPensionStatus(emp),
        }));

        const csv = Papa.unparse(dataToExport, { delimiter: ';' });
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'analisis_empleados.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);

        const canvas = await html2canvas(reportRef.current, {
            scale: 2, 
            useCORS: true,
            backgroundColor: null, 
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('analisis_empleados.pdf');
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Análisis Base de Empleados">
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout pageTitle="Análisis Base de Empleados">
            <div className="space-y-6" ref={reportRef}>
                 <Card>
                    <CardHeader>
                        <CardTitle>Filtros del Reporte</CardTitle>
                        <CardDescription>Seleccione para filtrar los datos del dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-1">
                            <Label>N° de Empleados</Label>
                            <p className="text-4xl font-bold">{filteredEmployees.length}</p>
                        </div>
                        <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            <div className="w-full">
                                <Label>Genero</Label>
                                <Select onValueChange={value => setFilters(f => ({ ...f, gender: value }))} value={filters.gender}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full">
                                <Label>Descripción de Nómina</Label>
                                <Select onValueChange={value => setFilters(f => ({ ...f, payroll: value }))} value={filters.payroll}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        {costCenters.map(pd => <SelectItem key={pd.id} value={pd.name}>{pd.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full">
                                <Label>Año de Ingreso</Label>
                                <Select onValueChange={value => setFilters(f => ({ ...f, year: value }))} value={filters.year}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos los años">Todos los años</SelectItem>
                                        {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleExportCSV} variant="outline" className="gap-1 w-full">
                                    <Download className="h-4 w-4" />
                                    CSV
                                </Button>
                                <Button onClick={handleExportPDF} variant="outline" className="gap-1 w-full" disabled={isExportingPdf}>
                                    {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>N° Personas Por Rango de Edad y Genero</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={ageGenderData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Masculino" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="Femenino" stackId="a" fill="#a855f7" />
                                    <Bar dataKey="Otro" stackId="a" fill="#9ca3af" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Alerta de Pensión</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={pensionAlertData} dataKey="value" nameKey="name" innerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(1)}%`}>
                                            {pensionAlertData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Rotación de Personal ({filters.year === 'Todos los años' ? new Date().getFullYear() : filters.year})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={turnoverByMonthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Ingresos" stroke="#3b82f6" strokeWidth={2} />
                                <Line type="monotone" dataKey="Salidas" stroke="#f97316" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ingresos y Salidas por Centro de Costo ({filters.year === 'Todos los años' ? new Date().getFullYear() : filters.year})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={turnoverByCostCenterData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Ingresos" fill="#3b82f6" />
                                <Bar dataKey="Salidas" fill="#f97316" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
