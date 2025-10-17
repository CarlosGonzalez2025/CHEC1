
// src/app/reports/schedule-indicators/page.tsx
'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import type { ActivitySchedule, Emo } from '@/lib/types';
import { getYear, format, getMonth, isWithinInterval, startOfYear, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Target, Users, CheckCircle, XCircle, Percent, TrendingUp, ActivityIcon, FileDown, CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Label } from '@/components/ui/label';

const pvePrograms = [
    { key: 'auditivo', name: 'Auditivo' },
    { key: 'osteomuscularRecomendacion', name: 'Osteomuscular' },
    { key: 'cardiovascular', name: 'Cardiovascular' },
    { key: 'respiratorio', name: 'Respiratorio' },
    { key: 'visual', name: 'Visual' },
    { key: 'psicosocial', name: 'Psicosocial' },
    { key: 'estiloVidaSaludable', name: 'Estilo de vida saludable' },
];
const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const pveKeyToField: { [key: string]: keyof Emo } = {
    auditivo: 'audiometria',
    osteomuscularRecomendacion: 'osteomuscular',
    cardiovascular: 'electrocardiograma',
    respiratorio: 'espirometria',
    visual: 'optometria',
    psicosocial: 'psicosensometrico',
};

const getHeatmapColor = (value: number, goal: 'high' | 'low') => {
    if (isNaN(value) || value <= 0) return { backgroundColor: 'transparent' }; 

    if (goal === 'high') {
        const opacity = value / 100 * 0.7; // Max opacity 0.7 for softer green
        return { backgroundColor: `rgba(74, 222, 128, ${opacity})` }; // Softer green
    } else {
        if (value <= 2.5) return { backgroundColor: '#dcfce7' }; // Light green
        if (value <= 5) return { backgroundColor: '#fef9c3' }; // Light yellow
        if (value <= 10) return { backgroundColor: '#ffedd5' }; // Light orange
        return { backgroundColor: '#fee2e2' }; // Light red
    }
};


export default function ScheduleIndicatorsPage() {
    const { activitySchedules: activities, emos, employees, loading } = useAuth();
    const [filters, setFilters] = useState({
        pve: pvePrograms[0].key,
        year: new Date().getFullYear().toString(),
        activity: 'Todas',
    });
    
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        activities.forEach(a => { if (a.fecha) years.add(getYear(new Date(a.fecha))) });
        emos.forEach(emo => { if (emo.fechaExamen) years.add(getYear(new Date(emo.fechaExamen))) });
        if (!years.has(new Date().getFullYear())) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [activities, emos]);
    
    useEffect(() => {
        if(filters.year !== 'Todos') {
            setCurrentMonth(new Date(parseInt(filters.year), 0, 1));
        }
    }, [filters.year]);

    const availableActivities = useMemo(() => {
        const pveMatch = pvePrograms.find(p => p.key === filters.pve)?.name;
        const yearMatch = filters.year === 'Todos' ? null : parseInt(filters.year);

        const filtered = activities.filter(a => {
            const activityYear = a.fecha ? getYear(new Date(a.fecha)) : null;
            return (pveMatch ? a.pve.toLowerCase() === pveMatch.toLowerCase() : true) &&
                   (yearMatch ? activityYear === yearMatch : true);
        });

        const uniqueActivities = [...new Set(filtered.map(a => a.nombreActividad))];
        return uniqueActivities.sort();
    }, [activities, filters.pve, filters.year]);

    useEffect(() => {
        setFilters(f => ({ ...f, activity: 'Todas' }));
    }, [filters.pve, filters.year]);


    const filteredData = useMemo(() => {
        const pveField = pveKeyToField[filters.pve];
        
        const filteredActivities = activities.filter(a => {
            if (!a.fecha) return false;
            const activityYear = getYear(new Date(a.fecha));
            const yearMatch = filters.year === 'Todos' || activityYear.toString() === filters.year;
            
            const activityPveName = pvePrograms.find(p => p.key === filters.pve)?.name;
            const pveMatch = filters.pve === 'Todos' || a.pve.toLowerCase() === activityPveName?.toLowerCase();

            const activityMatch = filters.activity === 'Todas' || a.nombreActividad === filters.activity;

            return yearMatch && pveMatch && activityMatch;
        });
        
        const filteredEmos = emos.filter(emo => {
            if (!emo.fechaExamen) return false;
            const emoYear = getYear(new Date(emo.fechaExamen));
            const yearMatch = filters.year === 'Todos' || emoYear.toString() === filters.year;
            const isInPve = (emo as any)[filters.pve] === 'X';
            return yearMatch && isInPve;
        });

        return { filteredActivities, filteredEmos, pveField };
    }, [activities, emos, filters]);


     const monthlyIndicators = useMemo(() => {
        const yearToFilter = filters.year === 'Todos' ? new Date().getFullYear() : parseInt(filters.year, 10);
        const pveField = filteredData.pveField;
        
        let casosAntiguosAcumulados = 0;

        return months.map((monthName, monthIndex) => {
            // --- Activity Indicators ---
            const monthActivities = filteredData.filteredActivities.filter(a => {
                if (!a.fecha) return false;
                const activityDate = new Date(a.fecha);
                return activityDate.getMonth() === monthIndex && getYear(activityDate) === yearToFilter;
            });
            
            const Programadas = monthActivities.length;
            const Ejecutadas = monthActivities.filter(a => a.estado?.toLowerCase() === 'ejecutado').length;
            const cumplimiento = Programadas > 0 ? (Ejecutadas / Programadas) * 100 : 0;
    
            const coberturaProgramada = monthActivities.reduce((sum, a) => sum + (a.coberturaProgramada || 0), 0);
            const coberturaEjecutada = monthActivities.reduce((sum, a) => sum + (a.coberturaEjecutada || 0), 0);
            const cobertura = coberturaProgramada > 0 ? (coberturaEjecutada / coberturaProgramada) * 100 : 0;

            // --- Health Indicators ---
            const monthStart = new Date(yearToFilter, monthIndex, 1);
            const monthEnd = endOfMonth(monthStart);

            const trabajadoresExpuestosEnMes = new Set(filteredData.filteredEmos
                .filter(e => e.fechaExamen && isWithinInterval(new Date(e.fechaExamen), { start: monthStart, end: monthEnd }))
                .map(e => e.cedula)).size;

            let incidencia = 0;
            let prevalencia = 0;

            if (trabajadoresExpuestosEnMes > 0 && pveField) {
                 const casosNuevosEnMes = new Set<string>();
                
                filteredData.filteredEmos.forEach(emo => {
                    if (emo.fechaExamen && isWithinInterval(new Date(emo.fechaExamen), { start: monthStart, end: monthEnd })) {
                        const isCase = emo[pveField] && (String(emo[pveField]!).toLowerCase().includes('anormal') || String(emo[pveField]!).toLowerCase().includes('con alteración'));
                        
                        if (isCase) {
                            const hasPreviousCase = filteredData.filteredEmos.some(prevEmo => 
                                prevEmo.cedula === emo.cedula &&
                                prevEmo.fechaExamen && new Date(prevEmo.fechaExamen) < monthStart &&
                                prevEmo[pveField] && (String(prevEmo[pveField]!).toLowerCase().includes('anormal') || String(prevEmo[pveField]!).toLowerCase().includes('con alteración'))
                            );
                            
                            if (!hasPreviousCase) {
                                casosNuevosEnMes.add(emo.cedula);
                            }
                        }
                    }
                });

                const numCasosNuevos = casosNuevosEnMes.size;
                const totalCasosMes = casosAntiguosAcumulados + numCasosNuevos;
                
                incidencia = (numCasosNuevos / trabajadoresExpuestosEnMes) * 100;
                prevalencia = (totalCasosMes / trabajadoresExpuestosEnMes) * 100;
                
                casosAntiguosAcumulados = totalCasosMes;
            } else {
                 casosAntiguosAcumulados = casosAntiguosAcumulados;
            }
            
            return { name: monthName, Cumplimiento: cumplimiento, Cobertura: cobertura, Incidencia: incidencia, Prevalencia: prevalencia, Programadas, Ejecutadas };
        });
    }, [filteredData, filters, emos]);


    const kpis = useMemo(() => {
        const { filteredActivities, filteredEmos, pveField } = filteredData;
        const lastMonthData = monthlyIndicators[monthlyIndicators.length - 1];

        const ejecutadas = filteredActivities.filter(a => a.estado?.toLowerCase() === 'ejecutado');
        const totalProgramadas = filteredActivities.length;
        const cumplimiento = totalProgramadas > 0 ? (ejecutadas.length / totalProgramadas) * 100 : 0;
        
        const totalCoberturaProgramada = ejecutadas.reduce((sum, a) => sum + (a.coberturaProgramada || 0), 0);
        const totalCoberturaEjecutada = ejecutadas.reduce((sum, a) => sum + (a.coberturaEjecutada || 0), 0);
        const cobertura = totalCoberturaProgramada > 0 ? (totalCoberturaEjecutada / totalCoberturaProgramada) * 100 : 0;

        const totalTrabajadoresExpuestos = new Set(filteredEmos.map(e => e.cedula)).size;
        
        const { Incidencia, Prevalencia } = monthlyIndicators[11] || { Incidencia: 0, Prevalencia: 0 };

        const casosCalificados = 0; 
        const eficacia = totalTrabajadoresExpuestos > 0 ? (casosCalificados / totalTrabajadoresExpuestos) * 100 : 0;

        return {
            cumplimiento,
            cobertura,
            eficacia,
            incidencia: Incidencia,
            prevalencia: Prevalencia,
            ejecutadas: ejecutadas.length,
            totalProgramadas: totalProgramadas,
        };
    }, [filteredData, monthlyIndicators]);

    const activitySummaryData = useMemo(() => {
        const summary = new Map<string, { programadas: number, ejecutadas: number, totalCoberturaProgramada: number, totalCoberturaEjecutada: number }>();
        filteredData.filteredActivities.forEach(a => {
            const entry = summary.get(a.nombreActividad) || { programadas: 0, ejecutadas: 0, totalCoberturaProgramada: 0, totalCoberturaEjecutada: 0 };
            entry.programadas += 1;
            entry.totalCoberturaProgramada += (a.coberturaProgramada || 0);
            if (a.estado?.toLowerCase() === 'ejecutado') {
                entry.ejecutadas += 1;
                entry.totalCoberturaEjecutada += (a.coberturaEjecutada || 0);
            }
            summary.set(a.nombreActividad, entry);
        });

        return Array.from(summary.entries()).map(([name, data]) => ({
            name,
            cumplimiento: data.programadas > 0 ? (data.ejecutadas / data.programadas) * 100 : 0,
            cobertura: data.totalCoberturaProgramada > 0 ? (data.totalCoberturaEjecutada / data.totalCoberturaProgramada) * 100 : 0,
        }));
    }, [filteredData.filteredActivities]);
    
    const statusChartData = useMemo(() => {
        const statusCounts = filteredData.filteredActivities.reduce((acc, activity) => {
            const status = activity.estado?.toLowerCase() || 'no definido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
    
        const colors = {
            'ejecutado': '#22c55e', 
            'programado': '#3b82f6',
            'cancelado': '#f97316',
            'reprogramado': '#facc15',
            'no definido': 'hsl(var(--muted))',
        };
    
        return Object.entries(statusCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            fill: colors[name as keyof typeof colors] || colors['no definido'],
        }));
    }, [filteredData.filteredActivities]);

    const activitiesByDay = useMemo(() => {
        const activityMap = new Map<string, { name: string; estado: string }[]>();
        filteredData.filteredActivities.forEach(activity => {
            if (activity.fecha) {
                const day = format(new Date(activity.fecha), 'yyyy-MM-dd');
                const activities = activityMap.get(day) || [];
                activities.push({ name: activity.nombreActividad, estado: activity.estado });
                activityMap.set(day, activities);
            }
        });
        return activityMap;
    }, [filteredData.filteredActivities]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`indicadores_cronograma_${filters.pve}.pdf`);
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Indicadores de Cronograma">
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout pageTitle="Indicadores de Cronograma">
            <div className="space-y-6" ref={reportRef}>
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Filtros del Reporte</CardTitle>
                                <CardDescription>Seleccione el programa y el año para analizar.</CardDescription>
                            </div>
                            <Button onClick={handleExportPDF} variant="outline" className="gap-1" disabled={isExportingPdf}>
                                {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                                Exportar a PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex items-end gap-4">
                        <div className="w-full max-w-xs">
                            <Label>Programa de Vigilancia (PVE)</Label>
                             <Select onValueChange={value => setFilters(f => ({ ...f, pve: value }))} defaultValue={filters.pve}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {pvePrograms.map(p => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="w-full max-w-xs">
                            <Label>Año</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, year: value }))} defaultValue={filters.year}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todos los años</SelectItem>
                                    {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full max-w-xs">
                            <Label>Actividad</Label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, activity: value }))} value={filters.activity}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todas">Todas</SelectItem>
                                    {availableActivities.map(activity => <SelectItem key={activity} value={activity}>{activity}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                 </Card>
                 
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cumplimiento del Cronograma</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {kpis.cumplimiento.toFixed(1)}%
                                {kpis.cumplimiento >= 80 ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            </div>
                            <p className="text-xs text-muted-foreground">Meta: &gt;= 80% ({kpis.ejecutadas} de {kpis.totalProgramadas} ejecutadas)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cobertura de Actividades</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold flex items-center gap-2">
                                {kpis.cobertura.toFixed(1)}%
                                {kpis.cobertura >= 80 ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            </div>
                            <p className="text-xs text-muted-foreground">Meta: &gt;= 80% (Promedio de cobertura)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Eficacia</CardTitle><ActivityIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {kpis.eficacia.toFixed(2)}%
                                {kpis.eficacia >= 90 ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            </div>
                            <p className="text-xs text-muted-foreground">Meta: &gt;= 90% (Casos calificados)</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Incidencia</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold flex items-center gap-2">
                                {kpis.incidencia.toFixed(2)}%
                                {kpis.incidencia <= 5 ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            </div>
                            <p className="text-xs text-muted-foreground">Meta: &lt;= 5% (Nuevos casos)</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Prevalencia</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold flex items-center gap-2">
                                {kpis.prevalencia.toFixed(2)}%
                                {kpis.prevalencia <= 5 ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>}
                            </div>
                            <p className="text-xs text-muted-foreground">Meta: &lt;= 5% (Total de casos)</p>
                        </CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Indicadores Mensuales ({filters.year})</CardTitle>
                        <CardDescription>Evolución mensual de los principales indicadores del programa.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Indicador</TableHead>
                                    {months.map(m => <TableHead key={m} className="text-right text-xs">{m}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Incidencia (%)</TableCell>
                                    {monthlyIndicators.map((d, i) => <TableCell key={i} style={getHeatmapColor(d.Incidencia, 'low')} className="text-right font-mono text-xs">{d.Incidencia.toFixed(2)}</TableCell>)}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Prevalencia (%)</TableCell>
                                    {monthlyIndicators.map((d, i) => <TableCell key={i} style={getHeatmapColor(d.Prevalencia, 'low')} className="text-right font-mono text-xs">{d.Prevalencia.toFixed(2)}</TableCell>)}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Cobertura (%)</TableCell>
                                    {monthlyIndicators.map((d, i) => <TableCell key={i} style={getHeatmapColor(d.Cobertura, 'high')} className="text-right font-mono text-xs">{d.Cobertura.toFixed(1)}</TableCell>)}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Cumplimiento (%)</TableCell>
                                    {monthlyIndicators.map((d, i) => <TableCell key={i} style={getHeatmapColor(d.Cumplimiento, 'high')} className="text-right font-mono text-xs">{d.Cumplimiento.toFixed(1)}</TableCell>)}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                     <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle>Cumplimiento Mensual de Actividades ({filters.year})</CardTitle>
                            <CardDescription>Comparativo de actividades programadas vs. ejecutadas cada mes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyIndicators}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Programadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Ejecutadas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Distribución por Estado</CardTitle>
                            <CardDescription>Proporción de actividades según su estado actual.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie 
                                            data={statusChartData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            innerRadius={60} 
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {statusChartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                 <div className="grid gap-6 md:grid-cols-3">
                     <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Resumen por Actividad</CardTitle>
                            <CardDescription>Desglose del cumplimiento y cobertura por cada tipo de actividad.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre de la Actividad</TableHead>
                                        <TableHead className="text-right">Cumplimiento (%)</TableHead>
                                        <TableHead className="text-right">Cobertura (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activitySummaryData.map(item => (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right">{item.cumplimiento.toFixed(1)}</TableCell>
                                            <TableCell className="text-right">{item.cobertura.toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Calendario de Actividades ({format(currentMonth, 'MMMM yyyy', { locale: es })})</CardTitle>
                            <CardDescription>Vista mensual de las actividades programadas.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={undefined}
                                onMonthChange={setCurrentMonth}
                                month={currentMonth}
                                className="rounded-md border"
                                modifiers={{
                                    hasActivity: (day) => {
                                        const dayString = format(day, 'yyyy-MM-dd');
                                        return activitiesByDay.has(dayString);
                                    }
                                }}
                                modifiersClassNames={{
                                    hasActivity: 'bg-primary/20'
                                }}
                                components={{
                                    DayContent: (props) => {
                                        const dayString = format(props.date, 'yyyy-MM-dd');
                                        const dayActivities = activitiesByDay.get(dayString);
                                        return (
                                            <Popover>
                                                <PopoverTrigger asChild disabled={!dayActivities}>
                                                    <div className="w-full h-full flex items-center justify-center relative">
                                                        {props.date.getDate()}
                                                        {dayActivities && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-primary rounded-full"></span>}
                                                    </div>
                                                </PopoverTrigger>
                                                {dayActivities && (
                                                    <PopoverContent className="w-80">
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium leading-none">{format(props.date, 'PPP', {locale: es})}</h4>
                                                            <ul className="text-sm text-muted-foreground list-disc pl-4">
                                                                {dayActivities.map((act, i) => <li key={i}>{act.name} ({act.estado})</li>)}
                                                            </ul>
                                                        </div>
                                                    </PopoverContent>
                                                )}
                                            </Popover>
                                        );
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

