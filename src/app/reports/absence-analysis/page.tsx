'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Label as RechartsLabel
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layout/app-layout';
import type { Absence } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, format, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { Label } from '@/components/ui/label';


const sistemasAlterados = [
    'APARATO REPRODUCTOR', 'AUDITIVO', 'CARDIOVASCULAR', 'DERMATOLOGICO', 'DIGESTIVO',
    'GINECOLOGICO', 'NERVIOSO', 'NEUROLOGICO', 'ORAL', 'OSTEOMUSCULAR', 'PSICOSOCIAL',
    'RENAL', 'RESPIRATORIO', 'URINARIO', 'VISUAL',
];

const absenceTypes = ['EG', 'AT', 'LP', 'LR', 'LRN'];

const groupAndCount = (data: any[], key: string) => {
    return data.reduce((acc, item) => {
        const value = item[key];
        if (value) {
            acc[value] = (acc[value] || 0) + 1;
        }
        return acc;
    }, {});
};

const groupAndSum = (data: any[], groupKey: string, sumKey: string) => {
    return data.reduce((acc, item) => {
        const value = item[groupKey];
        if (value) {
            acc[value] = (acc[value] || 0) + (item[sumKey] || 0);
        }
        return acc;
    }, {});
};


export default function AbsenceAnalysisPage() {
    const { absences, costCenters, loading } = useAuth();
    const [filters, setFilters] = useState({
        costCenter: 'Todos',
        year: 'Todos los años',
        alteredSystem: 'Todos',
        absenceType: 'Todos',
    });
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const availableYears = useMemo(() => {
        if (!absences) return [];
        const years = new Set(absences.map(a => a.fechaInicio ? getYear(a.fechaInicio) : null).filter(Boolean));
        return Array.from(years).sort((a, b) => b! - a!);
    }, [absences]);

    const filteredAbsences = useMemo(() => {
        if (!absences) return [];
        return absences.filter(a => {
            const yearMatch = filters.year === 'Todos los años' || (a.fechaInicio && getYear(a.fechaInicio) === parseInt(filters.year, 10));
            const costCenterMatch = filters.costCenter === 'Todos' || a.centroDeCosto === filters.costCenter;
            const alteredSystemMatch = filters.alteredSystem === 'Todos' || a.sistemaAlterado === filters.alteredSystem;
            const absenceTypeMatch = filters.absenceType === 'Todos' || a.tipoAusencia === filters.absenceType;
            return yearMatch && costCenterMatch && alteredSystemMatch && absenceTypeMatch;
        });
    }, [absences, filters]);

    const kpis = useMemo(() => {
        const totalCost = filteredAbsences.reduce((sum, item) => sum + (item.costoAusentismo || 0), 0);
        return {
            totalRecords: filteredAbsences.length,
            totalCost,
        };
    }, [filteredAbsences]);

    const absenceTypeData = useMemo(() => {
        const counts = groupAndCount(filteredAbsences, 'tipoAusencia');
        const colors = { EG: '#3b82f6', AT: '#a855f7', LP: '#f97316', LR: '#22c55e', LRN: '#ef4444' };
        return Object.entries(counts).map(([name, value]) => ({ name, value: value as number, fill: colors[name as keyof typeof colors] || '#9ca3af' }));
    }, [filteredAbsences]);
    
    const trendData = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const yearToFilter = filters.year === 'Todos los años' ? new Date().getFullYear() : parseInt(filters.year, 10);
        
        const data = monthNames.map((name, index) => ({ name, Inicios: 0, Finales: 0 }));

        filteredAbsences.forEach(a => {
            if (a.fechaInicio && getYear(a.fechaInicio) === yearToFilter) {
                data[getMonth(a.fechaInicio)].Inicios++;
            }
            if (a.fechaFinal && getYear(a.fechaFinal) === yearToFilter) {
                data[getMonth(a.fechaFinal)].Finales++;
            }
        });
        return data;
    }, [filteredAbsences, filters.year]);

    const absencesByAlteredSystem = useMemo(() => {
        const counts = groupAndCount(filteredAbsences, 'sistemaAlterado');
        return Object.entries(counts).map(([name, total]) => ({ name, total: total as number })).sort((a,b) => b.total - a.total);
    }, [filteredAbsences]);
    
    const absencesByCostCenter = useMemo(() => {
        const counts = groupAndCount(filteredAbsences, 'centroDeCosto');
        return Object.entries(counts).map(([name, total]) => ({ name, total: total as number })).sort((a,b) => a.total - b.total);
    }, [filteredAbsences]);

    const absencesByReasonLR = useMemo(() => {
        const filtered = filteredAbsences.filter(a => ['LR', 'LRN'].includes(a.tipoAusencia));
        const counts = groupAndCount(filtered, 'motivoAusencia');
        return Object.entries(counts).map(([name, total]) => ({name, total: total as number}));
    }, [filteredAbsences]);
    
     const absencesByReasonEG = useMemo(() => {
        const filtered = filteredAbsences.filter(a => ['EG', 'AT', 'LP'].includes(a.tipoAusencia));
        const counts = groupAndCount(filtered, 'motivoAusencia');
        return Object.entries(counts).map(([name, total]) => ({name, total: total as number}));
    }, [filteredAbsences]);

    const costByCostCenterData = useMemo(() => {
        const sums = groupAndSum(filteredAbsences, 'centroDeCosto', 'costoAusentismo');
        return Object.entries(sums).map(([name, total]) => ({ name, 'Costo Total': total as number })).sort((a,b) => b['Costo Total'] - a['Costo Total']);
    }, [filteredAbsences]);
    
    const costByAbsenceTypeData = useMemo(() => {
        const sums = groupAndSum(filteredAbsences, 'tipoAusencia', 'costoAusentismo');
        return Object.entries(sums).map(([name, total]) => ({ name, 'Costo Total': total as number })).sort((a,b) => b['Costo Total'] - a['Costo Total']);
    }, [filteredAbsences]);
    
    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);

        const canvas = await html2canvas(reportRef.current, {
            scale: 2, useCORS: true, backgroundColor: null,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('analisis_ausentismo.pdf');
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Análisis de Control de Ausentismo">
                <div className="flex h-[80vh] items-center justify-center">
                     <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout pageTitle="Análisis de Control de Ausentismo">
             <div className="space-y-6" ref={reportRef}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">N° de Registros</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{kpis.totalRecords}</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Costo Total de Ausentismo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(kpis.totalCost)}</p>
                        </CardContent>
                    </Card>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                     <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label>Centro de Costo</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, costCenter: value }))} defaultValue="Todos">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{costCenters.map(pd => <SelectItem key={pd.id} value={pd.name}>{pd.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Periodo</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, year: value }))} defaultValue="Todos los años">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos los años">Todos los años</SelectItem>{availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sistema Alterado</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, alteredSystem: value }))} defaultValue="Todos">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{sistemasAlterados.map(sa => <SelectItem key={sa} value={sa}>{sa}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Tipo de Ausencia</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, absenceType: value }))} defaultValue="Todos">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{absenceTypes.map(at => <SelectItem key={at} value={at}>{at}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                 </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader><CardTitle>Distribución por Tipo de Ausencia</CardTitle></CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={absenceTypeData} dataKey="value" nameKey="name" innerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(1)}%`}>
                                            {absenceTypeData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Top Ausencias por Sistema Alterado</CardTitle></CardHeader>
                        <CardContent className="h-[350px] overflow-y-auto">
                            <div className="p-1">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Sistema Alterado</TableHead><TableHead className="text-right">N° de Registros</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {absencesByAlteredSystem.map(item => (
                                            <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{item.total}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                 <Card>
                    <CardHeader><CardTitle>Tendencia de Ausentismo ({filters.year === 'Todos los años' ? 'Año Actual' : filters.year})</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-center mb-2">Fecha de Inicio</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="Inicios" stroke="#3b82f6" name="Inicios" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h3 className="font-semibold text-center mb-2">Fecha de Fin</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="Finales" stroke="#f97316" name="Finales" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                 </Card>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Costo por Centro de Costo</CardTitle></CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={costByCostCenterData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 10}} />
                                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0}).format(value as number)} />
                                    <Bar dataKey="Costo Total" fill="#8884d8" name="Costo" />
                                </BarChart>
                             </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Costo por Tipo de Ausencia</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={costByAbsenceTypeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0}).format(value as number)} />
                                    <Bar dataKey="Costo Total" fill="#82ca9d" name="Costo" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                 </div>

                 <div className="flex justify-end pt-4">
                    <Button onClick={handleExportPDF} variant="outline" className="gap-1" disabled={isExportingPdf}>
                        {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                        Exportar a PDF
                    </Button>
                 </div>

             </div>
        </AppLayout>
    );
}
