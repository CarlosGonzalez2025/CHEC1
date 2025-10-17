
// src/app/reports/at-tracking-analysis/page.tsx
'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layout/app-layout';
import type { ATTracking } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, getMonth, format } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
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

const caseStatusTypes = ['Abierto', 'Cerrado', 'En seguimiento'];
const eventTypes = ['Accidente De Trabajo', 'Enfermedad Común', 'Enfermedad Laboral'];


export default function AtTrackingAnalysisPage() {
    const { atTrackings: trackings, costCenters, loading } = useAuth();
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const [filters, setFilters] = useState({
        costCenter: 'Todos',
        year: 'Todos los años',
    });

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        trackings.forEach(t => {
            if (t.fechaRegistro) years.add(getYear(t.fechaRegistro));
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [trackings]);

    const filteredTrackings = useMemo(() => {
        return trackings.filter(t => {
            const yearMatch = filters.year === 'Todos los años' || (t.fechaRegistro && getYear(t.fechaRegistro).toString() === filters.year);
            const costCenterMatch = filters.costCenter === 'Todos' || t.centroDeCostos === filters.costCenter;
            return yearMatch && costCenterMatch;
        });
    }, [trackings, filters]);

    const kpis = useMemo(() => {
        const totalCases = filteredTrackings.length;
        const openCases = filteredTrackings.filter(t => t.estadoCaso === 'Abierto').length;
        const closedCases = filteredTrackings.filter(t => t.estadoCaso === 'Cerrado').length;
        const avgClosingDays = closedCases > 0
            ? filteredTrackings
                .filter(t => t.estadoCaso === 'Cerrado' && t.fechaRegistro && t.fechaCierre)
                .reduce((acc, t) => acc + (t.fechaCierre!.getTime() - t.fechaRegistro!.getTime()), 0) / (closedCases * 1000 * 60 * 60 * 24)
            : 0;

        return {
            totalCases,
            openCases,
            closedCases,
            avgClosingDays: Math.round(avgClosingDays),
        };
    }, [filteredTrackings]);

    const caseStatusData = useMemo(() => {
        const counts = groupAndCount(filteredTrackings, 'estadoCaso');
        const colors = { 'Abierto': '#f97316', 'Cerrado': '#22c55e', 'En seguimiento': '#3b82f6' };
        return Object.entries(counts).map(([name, value]) => ({ name, value: value as number, fill: colors[name as keyof typeof colors] || '#9ca3af' }));
    }, [filteredTrackings]);
    
    const eventTypeData = useMemo(() => {
        const counts = groupAndCount(filteredTrackings, 'tipoEvento');
        const colors = { 'Accidente De Trabajo': '#ef4444', 'Enfermedad Común': '#a855f7', 'Enfermedad Laboral': '#eab308' };
        return Object.entries(counts).map(([name, value]) => ({ name, value: value as number, fill: colors[name as keyof typeof colors] || '#9ca3af' }));
    }, [filteredTrackings]);
    
    const trendData = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const yearToFilter = filters.year === 'Todos los años' ? new Date().getFullYear() : parseInt(filters.year, 10);
        
        const monthlyData: { [key: string]: { name: string, Casos: number } } = {};
        monthNames.forEach((name, index) => {
            monthlyData[index] = { name, Casos: 0 };
        });

        filteredTrackings.forEach(t => {
            if (t.fechaRegistro && getYear(t.fechaRegistro) === yearToFilter) {
                const month = getMonth(t.fechaRegistro);
                if (monthlyData[month]) {
                    monthlyData[month].Casos++;
                }
            }
        });
        
        return Object.values(monthlyData);
    }, [filteredTrackings, filters.year]);

    const byCostCenterData = useMemo(() => {
        const costCenterData: { [key: string]: { name: string, Abiertos: number, Cerrados: number } } = {};
        
        filteredTrackings.forEach(t => {
            const cc = t.centroDeCostos || 'No especificado';
            if (!costCenterData[cc]) {
                costCenterData[cc] = { name: cc, Abiertos: 0, Cerrados: 0 };
            }
            if(t.estadoCaso === 'Abierto' || t.estadoCaso === 'En seguimiento') {
                costCenterData[cc].Abiertos++;
            } else if (t.estadoCaso === 'Cerrado') {
                costCenterData[cc].Cerrados++;
            }
        });
        
        return Object.values(costCenterData);
    }, [filteredTrackings]);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('analisis_seguimiento_at.pdf');
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Análisis de Seguimiento AT">
                <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            </AppLayout>
        );
    }
    
    return (
        <AppLayout pageTitle="Análisis de Seguimiento AT">
            <div className="space-y-6" ref={reportRef}>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Análisis de Seguimiento de Casos AT</CardTitle>
                                <CardDescription>Visión general del estado y tendencias de los seguimientos de accidentes de trabajo.</CardDescription>
                            </div>
                            <Button onClick={handleExportPDF} variant="outline" className="gap-1" disabled={isExportingPdf}>
                                {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                                Exportar a PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="w-full"><Label>Centro de Costo</Label><Select onValueChange={v => setFilters(f => ({...f, costCenter: v}))} defaultValue="Todos"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{costCenters.map(cc => <SelectItem key={cc.id} value={cc.name}>{cc.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="w-full"><Label>Año</Label><Select onValueChange={v => setFilters(f => ({...f, year: v}))} defaultValue="Todos los años"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos los años">Todos los años</SelectItem>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card><CardHeader><CardTitle className="text-sm font-medium">N° Total de Casos</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{kpis.totalCases}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{kpis.openCases}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Casos Cerrados</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{kpis.closedCases}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Promedio Días de Cierre</CardTitle></CardHeader><CardContent><p className="text-4xl font-bold">{kpis.avgClosingDays}</p></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Distribución por Estado del Caso</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={caseStatusData} dataKey="value" nameKey="name" innerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} >
                                             {caseStatusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Distribución por Origen del Evento</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={eventTypeData} dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                             {eventTypeData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                 
                 <Card>
                    <CardHeader><CardTitle>Tendencia de Casos Registrados ({filters.year === 'Todos los años' ? 'Año Actual' : filters.year})</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false}/>
                                <Tooltip />
                                <Line type="monotone" dataKey="Casos" stroke="#3b82f6" strokeWidth={2} name="N° de Casos" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                 </Card>

                 <Card>
                     <CardHeader><CardTitle>Resumen de Casos por Centro de Costo</CardTitle></CardHeader>
                     <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Centro de Costo</TableHead><TableHead className="text-right">Casos Abiertos</TableHead><TableHead className="text-right">Casos Cerrados</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {byCostCenterData.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.Abiertos}</TableCell>
                                        <TableCell className="text-right">{item.Cerrados}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                     </CardContent>
                 </Card>

            </div>
        </AppLayout>
    );
}
