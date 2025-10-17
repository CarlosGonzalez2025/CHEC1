'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, CalendarClock, Activity, FileWarning, BadgeCheck, BookUser, AlertTriangle } from 'lucide-react';
import type { Absence, Employee, MedicalFollowUp, Emo } from '@/lib/data';
import { useMemo } from 'react';
import { getYear, getMonth, differenceInYears, isWithinInterval, startOfDay, endOfDay, addDays, isBefore, differenceInDays } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import Link from 'next/link';

interface DashboardClientProps {
    employees: Employee[];
    absences: Absence[];
    medicalFollowUps: MedicalFollowUp[];
    emos: Emo[];
}

const calculateAge = (birthDate: Date | null): number | null => {
  if (!birthDate) return null;
  return differenceInYears(new Date(), birthDate);
};

const getPensionStatus = (employee: Employee): 'En Edad de Pensión' | 'Próximo a Pensión' | 'En Edad Laboral' => {
    const age = calculateAge(employee.birthDate);
    if (!age || !employee.gender) return 'En Edad Laboral';
    
    const pensionAge = employee.gender === 'Masculino' ? 62 : 57;
    if (age >= pensionAge) return 'En Edad de Pensión';
    if (age >= pensionAge - 3) return 'Próximo a Pensión';
    
    return 'En Edad Laboral';
};

const UpcomingExpirations = ({ emos, employees }: { emos: Emo[], employees: Employee[] }) => {
    const upcomingExpirations = useMemo(() => {
        const today = new Date();
        const sixtyDaysFromNow = addDays(today, 60);
        
        return emos
            .map(emo => {
                const employee = employees.find(e => e.id === emo.employeeId);
                if (!emo.fechaExamen || !employee) return null;

                const expirationDate = new Date(emo.fechaExamen);
                expirationDate.setFullYear(expirationDate.getFullYear() + 1); // Asume vencimiento en 1 año

                if (isWithinInterval(expirationDate, { start: today, end: sixtyDaysFromNow })) {
                    return {
                        employeeName: employee.fullName,
                        employeeId: employee.id,
                        examDate: emo.fechaExamen,
                        expirationDate: expirationDate,
                        daysUntil: differenceInDays(expirationDate, today),
                    };
                }
                return null;
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())
            .slice(0, 5); // Limit to top 5
    }, [emos, employees]);

    if (upcomingExpirations.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">No hay vencimientos próximos.</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Vence en (días)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {upcomingExpirations.map((item, index) => (
                    <TableRow key={index}>
                         <TableCell>
                            <Link href={`/employees/${item.employeeId}`} className="font-medium hover:underline">{item.employeeName}</Link>
                        </TableCell>
                        <TableCell className="text-right">
                             <Badge variant={item.daysUntil <= 30 ? 'destructive' : 'secondary'}>{item.daysUntil}</Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};


export function DashboardClient({ employees, absences, medicalFollowUps, emos }: DashboardClientProps) {

  const kpis = useMemo(() => {
    const today = new Date();
    const onLeaveToday = absences.filter(a => a.fechaInicio && a.fechaFinal && isWithinInterval(today, { start: startOfDay(a.fechaInicio), end: endOfDay(a.fechaFinal) })).length;
    
    const upcomingFollowUps = medicalFollowUps.filter(f => f.status === 'Scheduled' && isBefore(f.dateTime, addDays(today, 30))).length;
    
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const workingDaysInMonth = totalDaysInMonth - 8; // Approximation
    const totalAbsenceDaysThisMonth = absences.reduce((acc, a) => {
        if (a.fechaInicio && getMonth(a.fechaInicio) === getMonth(today) && getYear(a.fechaInicio) === getYear(today)) {
            return acc + (a.dias || 0);
        }
        return acc;
    }, 0);
    const absenceRate = employees.length > 0 ? (totalAbsenceDaysThisMonth / (employees.length * workingDaysInMonth)) * 100 : 0;

    const pensionAlerts = employees.filter(e => getPensionStatus(e) !== 'En Edad Laboral').length;

    return {
        totalEmployees: employees.length,
        onLeaveToday,
        upcomingFollowUps,
        absenceRate: absenceRate.toFixed(1) + '%',
        pensionAlerts,
    };
  }, [employees, absences, medicalFollowUps]);
  
  const absenceHistoryForChart = useMemo(() => {
    const currentYear = getYear(new Date());
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyData = Array(12).fill(0).map((_, i) => ({ date: monthNames[i], total: 0 }));

    absences.forEach(a => {
        if (a.fechaInicio && getYear(a.fechaInicio) === currentYear) {
            monthlyData[getMonth(a.fechaInicio)].total += 1;
        }
    });

    return monthlyData;
  }, [absences]);
  
  const absenceDataByCategory = useMemo(() => {
    const counts: { [key: string]: number } = {};
    absences.forEach(a => {
        if (a.tipoAusencia) {
            counts[a.tipoAusencia] = (counts[a.tipoAusencia] || 0) + 1;
        }
    });
    const colors = { EG: '#3b82f6', AT: '#a855f7', LP: '#f97316', LR: '#22c55e', LRN: '#ef4444', default: '#9ca3af' };
    return Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        fill: colors[name as keyof typeof colors] || colors.default
    }));
  }, [absences]);

  const recentAbsences = useMemo(() => {
    return [...absences]
        .filter(a => a.fechaInicio)
        .sort((a, b) => b.fechaInicio!.getTime() - a.fechaInicio!.getTime())
        .slice(0, 5);
  }, [absences]);


  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Empleados activos en el sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentes Hoy</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.onLeaveToday}</div>
            <p className="text-xs text-muted-foreground">Basado en registros aprobados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Ausentismo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.absenceRate}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerta de Pensión</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pensionAlerts}</div>
            <p className="text-xs text-muted-foreground">Próximos a edad de jubilación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.upcomingFollowUps}</div>
            <p className="text-xs text-muted-foreground">Seguimientos en 30 días</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Ausentismo</CardTitle>
            <CardDescription>Tendencia mensual de ausencias para el año en curso.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={{ total: { label: "Ausencias", color: "hsl(var(--chart-1))" } }} className="h-[300px] w-full">
              <BarChart data={absenceHistoryForChart}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ausencias por Categoría</CardTitle>
            <CardDescription>Distribución de los tipos de ausencia.</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={300}>
                <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={absenceDataByCategory} dataKey="value" nameKey="name" innerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {absenceDataByCategory.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimos 5 registros de ausentismo añadidos.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Empleado</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Fecha de Inicio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentAbsences.map(absence => (
                             <TableRow key={absence.id}>
                                <TableCell>
                                    <Link href={`/employees/${absence.employeeId}`} className="font-medium hover:underline">{absence.nombreCompleto}</Link>
                                </TableCell>
                                <TableCell>{absence.tipoAusencia}</TableCell>
                                <TableCell>{new Date(absence.fechaInicio!).toLocaleDateString('es-CO')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle>Próximos Vencimientos de Exámenes</CardTitle>
                <CardDescription>Exámenes médicos que vencerán en los próximos 60 días.</CardDescription>
            </CardHeader>
            <CardContent>
               <UpcomingExpirations emos={emos} employees={employees} />
            </CardContent>
          </Card>
      </div>
    </>
  );
}
