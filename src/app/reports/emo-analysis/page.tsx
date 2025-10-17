
// src/app/reports/emo-analysis/page.tsx
'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layout/app-layout';
import type { Emo } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear, format, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
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

const pveSystems = [
    { key: 'auditivo', name: 'AUDITIVO' },
    { key: 'osteomuscularRecomendacion', name: 'OSTEOMUSCULAR' },
    { key: 'cardiovascular', name: 'CARDIOVASCULAR' },
    { key: 'psicosocial', name: 'PSICOSOCIAL' },
    { key: 'respiratorio', name: 'RESPIRATORIO' },
    { key: 'visual', name: 'VISUAL' },
];

export default function EmoAnalysisPage() {
    const { emos, costCenters, loading } = useAuth();
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const [filters, setFilters] = useState({
        costCenter: 'Todos',
        year: 'Todos los años',
        concept: 'Todos',
        examType: 'Todos',
    });

    const { availableYears, availableConcepts, availableExamTypes } = useMemo(() => {
        const years = new Set<number>();
        const concepts = new Set<string>();
        const examTypes = new Set<string>();
        
        emos.forEach(emo => {
            if (emo.fechaExamen) years.add(getYear(emo.fechaExamen));
            if (emo.concepto) concepts.add(emo.concepto);
            if (emo.tipoExamen) examTypes.add(emo.tipoExamen);
        });

        return {
            availableYears: Array.from(years).sort((a, b) => b - a),
            availableConcepts: Array.from(concepts).sort(),
            availableExamTypes: Array.from(examTypes).sort(),
        };
    }, [emos]);

    const filteredEmos = useMemo(() => {
        return emos.filter(emo => {
            const yearMatch = filters.year === 'Todos los años' || (emo.fechaExamen && getYear(emo.fechaExamen).toString() === filters.year);
            const costCenterMatch = filters.costCenter === 'Todos' || emo.sede === filters.costCenter;
            const conceptMatch = filters.concept === 'Todos' || emo.concepto === filters.concept;
            const examTypeMatch = filters.examType === 'Todos' || emo.tipoExamen === filters.examType;
            return yearMatch && costCenterMatch && conceptMatch && examTypeMatch;
        });
    }, [emos, filters]);

    const trendData = useMemo(() => {
        const dataMap = new Map<string, any>();
        
        // Define the time keys (either months or years)
        let timeKeys: string[];
        if (filters.year !== 'Todos los años') {
            timeKeys = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM', { locale: es }));
        } else {
            timeKeys = availableYears.map(String).sort();
        }

        // Initialize map with all time keys and exam types
        timeKeys.forEach(key => {
            const initialData: any = { name: key };
            availableExamTypes.forEach(type => {
                initialData[type] = 0;
            });
            dataMap.set(key, initialData);
        });

        // Populate the map with data from filtered EMOs
        filteredEmos.forEach(emo => {
            if (emo.fechaExamen && emo.tipoExamen) {
                let key: string;
                if (filters.year !== 'Todos los años') {
                    key = format(emo.fechaExamen, 'MMM', { locale: es });
                } else {
                    key = getYear(emo.fechaExamen).toString();
                }

                if (dataMap.has(key)) {
                    const monthData = dataMap.get(key);
                    monthData[emo.tipoExamen] = (monthData[emo.tipoExamen] || 0) + 1;
                }
            }
        });

        return Array.from(dataMap.values());
    }, [filteredEmos, filters.year, availableYears, availableExamTypes]);

    const examTypeData = useMemo(() => {
        const counts = groupAndCount(filteredEmos, 'tipoExamen');
        return Object.entries(counts).map(([name, value]) => ({ name, value: value as number }));
    }, [filteredEmos]);

    const byCostCenterData = useMemo(() => {
        const counts = groupAndCount(filteredEmos, 'sede');
        return Object.entries(counts).map(([name, total]) => ({ name, total: total as number })).sort((a,b) => b.total - a.total);
    }, [filteredEmos]);
    
    const byConceptData = useMemo(() => {
        const counts = groupAndCount(filteredEmos, 'concepto');
        return Object.entries(counts).map(([name, total]) => ({ name, total: total as number })).sort((a,b) => b.total - a.total);
    }, [filteredEmos]);
    
    const pveData = useMemo(() => {
        return pveSystems.map(system => {
            const count = filteredEmos.filter(emo => (emo as any)[system.key] === 'X').length;
            return { name: system.name, 'N° Personas': count };
        });
    }, [filteredEmos]);
    
     const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExportingPdf(true);

        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('analisis_examenes_medicos.pdf');
        setIsExportingPdf(false);
    };

    if (loading) {
        return (
            <AppLayout pageTitle="Análisis de Control de Exámenes">
                <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            </AppLayout>
        );
    }
    
    const chartConfig = Object.fromEntries(
      availableExamTypes.map((type, index) => [
        type,
        {
          label: type,
          color: `hsl(var(--chart-${index + 1}))`,
        },
      ])
    );
    
    return (
        <AppLayout pageTitle="Análisis de Control de Exámenes">
            <div className="space-y-6" ref={reportRef}>
                <Card>
                     <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Análisis de Control de Exámenes</CardTitle>
                                <CardDescription>Empresa: CHEC - China Harbour Engineering Company</CardDescription>
                            </div>
                            <Button onClick={handleExportPDF} variant="outline" className="gap-1" disabled={isExportingPdf}>
                                {isExportingPdf ? <Loader2 className="animate-spin"/> : <FileDown className="h-4 w-4" />}
                                Exportar a PDF
                            </Button>
                        </div>
                     </CardHeader>
                     <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border rounded-lg">
                            <h3 className="text-sm font-medium text-muted-foreground">N° de Registros</h3>
                            <p className="text-5xl font-bold">{filteredEmos.length}</p>
                        </div>
                        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="w-full"><Label>Sede/Centro de Trabajo</Label><Select onValueChange={v => setFilters(f => ({...f, costCenter: v}))} defaultValue="Todos"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{costCenters.map(cc => <SelectItem key={cc.id} value={cc.name}>{cc.name}</SelectItem>)}</SelectContent></Select></div>
                            <div className="w-full"><Label>Selecciona un periodo</Label><Select onValueChange={v => setFilters(f => ({...f, year: v}))} defaultValue="Todos los años"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos los años">Todos los años</SelectItem>{availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                            <div className="w-full"><Label>Concepto</Label><Select onValueChange={v => setFilters(f => ({...f, concept: v}))} defaultValue="Todos"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{availableConcepts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                            <div className="w-full"><Label>Tipo de Examen</Label><Select onValueChange={v => setFilters(f => ({...f, examType: v}))} defaultValue="Todos"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{availableExamTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                     </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    <Card className="lg:col-span-5">
                         <CardHeader><CardTitle>Tendencia de Exámenes Realizados</CardTitle></CardHeader>
                         <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={trendData} margin={{ bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend verticalAlign="top" wrapperStyle={{ top: -4, right: 0 }} />
                                    {availableExamTypes.map((type, i) => <Bar key={type} dataKey={type} stackId="a" fill={`hsl(var(--chart-${i+1}))`} />)}
                                </BarChart>
                            </ResponsiveContainer>
                         </CardContent>
                    </Card>
                     <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Participación por Tipo de Examen</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={examTypeData} dataKey="value" nameKey="name" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            return (
                                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }}>
                                            {examTypeData.map((entry) => (<Cell key={`cell-${entry.name}`} fill={chartConfig[entry.name]?.color} />))}
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                     <Card className="lg:col-span-3">
                        <CardHeader><CardTitle>N° Registros EMO por Centro de Costo</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={byCostCenterData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={80} interval={0} fontSize={12} />
                                    <Tooltip />
                                    <Bar dataKey="total" name="Registros" fill="hsl(var(--chart-1))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Concepto de Aptitud</CardTitle></CardHeader>
                        <CardContent className="overflow-y-auto h-[350px]">
                            <Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">N° Registros</TableHead></TableRow></TableHeader><TableBody>{byConceptData.map(c => <TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell className="text-right">{c.total}</TableCell></TableRow>)}</TableBody></Table>
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-2">
                        <CardHeader><CardTitle>Cantidad Sistemas PVE</CardTitle></CardHeader>
                        <CardContent><Table><TableHeader><TableRow><TableHead>PVE</TableHead><TableHead className="text-right">N° Personas</TableHead></TableRow></TableHeader><TableBody>{pveData.map(p => <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p['N° Personas']}</TableCell></TableRow>)}</TableBody></Table></CardContent>
                    </Card>
                 </div>
            </div>
        </AppLayout>
    );
}
