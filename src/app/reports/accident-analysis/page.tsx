
// src/app/reports/accident-analysis/page.tsx
'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layout/app-layout';
import type { ATTracking, Employee } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnatomicalChart } from '@/components/anatomical-chart';
import { useAuth } from '@/hooks/use-auth';

const groupAndCount = (data: any[], key: string) => {
    return data.reduce((acc, item) => {
        const value = item[key];
        if (value) {
            acc[value] = (acc[value] || 0) + 1;
        }
        return acc;
    }, {});
};

export default function AccidentAnalysisPage() {
    const { employees, atTrackings, costCenters, loading } = useAuth();
    const [filters, setFilters] = useState({
        costCenter: 'Todos',
        year: 'Todos los años',
    });
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const availableYears = useMemo(() => {
        if (!atTrackings) return [];
        const years = new Set(atTrackings.map(t => t.fechaSiniestro ? getYear(t.fechaSiniestro) : null).filter(Boolean));
        return Array.from(years).sort((a, b) => b! - a!);
    }, [atTrackings]);

    const filteredData = useMemo(() => {
        if (!atTrackings || !employees) {
            return { trackings: [], employeeCount: 0 };
        }
        const filteredTrackings = atTrackings.filter(t => {
            const yearMatch = filters.year === 'Todos los años' || (t.fechaSiniestro && getYear(t.fechaSiniestro) === parseInt(filters.year, 10));
            const costCenterMatch = filters.costCenter === 'Todos' || t.centroDeCostos === filters.costCenter;
            return yearMatch && costCenterMatch;
        });

        const filteredEmployeeCount = employees.filter(e => {
             const costCenterMatch = filters.costCenter === 'Todos' || e.payrollDescription === filters.costCenter;
             return costCenterMatch && e.contractStatus === 'Activo';
        }).length;

        return { trackings: filteredTrackings, employeeCount: filteredEmployeeCount };
    }, [atTrackings, employees, filters]);

    const accidentIndicators = useMemo(() => {
        const { trackings: filtered, employeeCount } = filteredData;
        const totalAccidents = filtered.length;
        const monthsInPeriod = filters.year === 'Todos los años' ? 12 : 12;

        if (employeeCount === 0 || totalAccidents === 0) {
            return { frequency: 0, severity: 0, mortalProportion: 0, totalAccidents: 0 };
        }

        const avgMonthlyAccidents = totalAccidents / monthsInPeriod;
        const frequency = (avgMonthlyAccidents / employeeCount) * 100;

        const totalIncapacityDays = filtered.reduce((acc, t) => acc + (t.diasIncapacidad || 0), 0);
        const avgMonthlyIncapacityDays = totalIncapacityDays / monthsInPeriod;
        const severity = (avgMonthlyIncapacityDays / employeeCount) * 100;

        const mortalAccidents = filtered.filter(t => t.clasificacionEvento === 'Mortal').length;
        const mortalProportion = (mortalAccidents / totalAccidents) * 100;
        
        return {
            frequency: parseFloat(frequency.toFixed(2)),
            severity: parseFloat(severity.toFixed(2)),
            mortalProportion: parseFloat(mortalProportion.toFixed(2)),
            totalAccidents
        };

    }, [filteredData, filters.year]);


    const trendData = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const yearToFilter = filters.year === 'Todos los años' ? new Date().getFullYear() : parseInt(filters.year, 10);
        const data = monthNames.map(name => ({ name, Accidentes: 0 }));

        filteredData.trackings.forEach(t => {
            if (t.fechaSiniestro && getYear(t.fechaSiniestro) === yearToFilter) {
                data[getMonth(t.fechaSiniestro)].Accidentes++;
            }
        });
        return data;
    }, [filteredData, filters.year]);

    const byClassificationData = useMemo(() => {
        const counts = groupAndCount(filteredData.trackings, 'clasificacionEvento');
        const colors = { Leve: '#3b82f6', Grave: '#f97316', Mortal: '#ef4444', Moderado: '#a855f7', NA: '#9ca3af' };
        return Object.entries(counts).map(([name, value]) => ({ name, value: value as number, fill: colors[name as keyof typeof colors] || '#9ca3af' }));
    }, [filteredData]);

    const byBodyPartData = useMemo(() => {
        const counts = groupAndCount(filteredData.trackings, 'parteCuerpoAfectada');
        return Object.entries(counts).map(([name, total]) => ({ name, total: total as number })).sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredData]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('analisis_accidentalidad.pdf');
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Análisis de Accidentalidad">
                <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout pageTitle="Análisis de Accidentalidad">
             <div className="space-y-6" ref={reportRef}>
                 <Card>
                    <CardHeader>
                        <CardTitle>Indicadores de Accidentalidad</CardTitle>
                        <CardDescription>Filtre por año y centro de costo para ver los indicadores.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="w-full">
                            <label className="text-sm font-medium">Centro de Costo</label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, costCenter: value }))} defaultValue="Todos">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{costCenters.map(pd => <SelectItem key={pd.id} value={pd.name}>{pd.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="w-full">
                            <label className="text-sm font-medium">Año</label>
                            <Select onValueChange={value => setFilters(f => ({ ...f, year: value }))} defaultValue="Todos los años">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Todos los años">Todos los años</SelectItem>{availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                             <Button onClick={handleExportPDF} variant="outline" className="gap-1 w-full" disabled={isExportingPdf}>
                                {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                                Exportar a PDF
                            </Button>
                        </div>
                    </CardContent>
                 </Card>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">N° de Accidentes</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{accidentIndicators.totalAccidents}</p>
                            <p className="text-xs text-muted-foreground">Total en el período seleccionado.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">Índice de Frecuencia</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{accidentIndicators.frequency}</p>
                            <p className="text-xs text-muted-foreground">Accidentes (promedio mensual) por cada 100 trabajadores.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">Índice de Severidad</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{accidentIndicators.severity}</p>
                            <p className="text-xs text-muted-foreground">Días perdidos (promedio mensual) por cada 100 trabajadores.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle className="text-sm font-medium">Proporción Mortalidad</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{accidentIndicators.mortalProportion}%</p>
                            <p className="text-xs text-muted-foreground">Del total de accidentes en el período.</p>
                        </CardContent>
                    </Card>
                 </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Tendencia de Accidentes ({filters.year})</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false}/>
                                    <Tooltip />
                                    <Bar dataKey="Accidentes" fill="#3b82f6" name="N° de Accidentes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Accidentes por Clasificación</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={byClassificationData} dataKey="value" nameKey="name" innerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >
                                             {byClassificationData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                
                 <Card>
                    <CardHeader><CardTitle>Análisis Corporal de Lesiones</CardTitle></CardHeader>
                    <CardContent className="min-h-[500px]">
                        <AnatomicalChart data={byBodyPartData} />
                    </CardContent>
                 </Card>
             </div>
        </AppLayout>
    );
}
