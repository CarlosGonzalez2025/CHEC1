
'use client';

import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Filter, PlusCircle, LineChart, Users, FileText, FileHeart, CalendarCheck, NotebookPen as NotebookPenIcon } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
    return (
        <AppLayout pageTitle="Reports">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Centro de Reportes</CardTitle>
                        <CardDescription>Seleccione un reporte para ver el análisis detallado.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                       <Card className="flex flex-col">
                            <CardHeader>
                                <Users className="h-8 w-8 mb-2 text-primary" />
                                <CardTitle className="text-lg">Análisis Base de Empleados</CardTitle>
                                <CardDescription className="text-sm">Análisis demográfico y de rotación de la plantilla de empleados.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                            <CardContent>
                                <Button className="w-full" asChild>
                                  <Link href="/reports/employee-analysis">Ver Reporte</Link>
                                </Button>
                            </CardContent>
                       </Card>
                        <Card className="flex flex-col">
                            <CardHeader>
                                <FileText className="h-8 w-8 mb-2 text-primary" />
                                <CardTitle className="text-lg">Análisis de Ausentismo</CardTitle>
                                <CardDescription className="text-sm">Dashboard interactivo para el control y análisis de ausentismo laboral.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                            <CardContent>
                                <Button className="w-full" asChild>
                                  <Link href="/reports/absence-analysis">Ver Reporte</Link>
                                </Button>
                            </CardContent>
                       </Card>
                       <Card className="flex flex-col">
                            <CardHeader>
                                <FileHeart className="h-8 w-8 mb-2 text-primary" />
                                <CardTitle className="text-lg">Análisis de Accidentalidad</CardTitle>
                                <CardDescription className="text-sm">Indicadores de frecuencia, severidad y análisis de accidentes de trabajo.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                            <CardContent>
                                <Button className="w-full" asChild>
                                  <Link href="/reports/accident-analysis">Ver Reporte</Link>
                                </Button>
                            </CardContent>
                       </Card>
                         <Card className="flex flex-col">
                            <CardHeader>
                                <NotebookPenIcon className="h-8 w-8 mb-2 text-primary" />
                                <CardTitle className="text-lg">Análisis de Seguimiento AT</CardTitle>
                                <CardDescription className="text-sm">Indicadores y estado de los casos de seguimiento de accidentes de trabajo.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                            <CardContent>
                                <Button className="w-full" asChild>
                                  <Link href="/reports/at-tracking-analysis">Ver Reporte</Link>
                                </Button>
                            </CardContent>
                       </Card>
                       <Card className="flex flex-col">
                            <CardHeader>
                                <CalendarCheck className="h-8 w-8 mb-2 text-primary" />
                                <CardTitle className="text-lg">Indicadores de Cronograma</CardTitle>
                                <CardDescription className="text-sm">Cumplimiento y cobertura de los programas de vigilancia epidemiológica (PVE).</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                            <CardContent>
                                <Button className="w-full" asChild>
                                  <Link href="/reports/schedule-indicators">Ver Reporte</Link>
                                </Button>
                            </CardContent>
                       </Card>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
