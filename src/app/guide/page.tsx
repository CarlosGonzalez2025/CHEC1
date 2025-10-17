// src/app/guide/page.tsx
'use client';
import AppLayout from '@/components/layout/app-layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, BookHeart, Briefcase, CalendarCheck, CalendarX2, Activity, HeartHandshake, HeartPulse, LayoutDashboard, NotebookPen, ShieldCheck, Users, ClipboardPlus, BrainCircuit } from 'lucide-react';
import Image from 'next/image';

const GuideItem = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <AccordionItem value={title}>
        <AccordionTrigger className="text-lg hover:no-underline">
            <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 text-primary" />
                {title}
            </div>
        </AccordionTrigger>
        <AccordionContent className="prose prose-sm max-w-none text-muted-foreground pl-12">
            {children}
        </AccordionContent>
    </AccordionItem>
);

export default function GuidePage() {
  return (
    <AppLayout pageTitle="Guía del Sistema NOVA SST">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center text-center">
            <BookHeart className="h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl">Bienvenido a la Guía Interactiva de NOVA SST</CardTitle>
            <CardDescription className="text-lg mt-2">
              Tu manual completo para dominar todas las funcionalidades de la plataforma.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            
            <GuideItem title="Dashboard (Inicio)" icon={LayoutDashboard}>
              <p>El Dashboard es tu centro de comando. Ofrece una vista rápida y consolidada de los indicadores más importantes de la gestión de Recursos Humanos y SST.</p>
              <ul>
                <li><strong>Indicadores Clave (KPIs):</strong> Visualiza en tiempo real el total de empleados, ausentes del día, tasa de ausentismo mensual y alertas de pensión.</li>
                <li><strong>Gráficos Interactivos:</strong> Analiza la tendencia mensual de ausentismo y la distribución de ausencias por categoría (Enfermedad General, Accidente de Trabajo, etc.).</li>
                <li><strong>Actividad Reciente:</strong> Mantente al día con los últimos registros de ausentismo añadidos al sistema.</li>
                <li><strong>Alertas y Vencimientos:</strong> Consulta una lista de los próximos vencimientos de exámenes médicos para una gestión proactiva.</li>
              </ul>
            </GuideItem>

            <GuideItem title="Gestión de Empleados" icon={Briefcase}>
                <p>Este módulo es la base de datos central de todo tu personal. Aquí puedes gestionar la información de cada colaborador de forma integral.</p>
                <ul>
                    <li><strong>Creación y Edición:</strong> Añade nuevos empleados o actualiza la información de los existentes a través de un formulario completo.</li>
                    <li><strong>Carga Masiva:</strong> Ahorra tiempo cargando múltiples empleados a la vez usando una plantilla de CSV. El sistema detecta duplicados y te permite decidir si actualizar o solo añadir nuevos.</li>
                    <li><strong>Filtros Avanzados:</strong> Encuentra rápidamente a cualquier empleado usando filtros por identificación, estado de contrato, o centro de costo.</li>
                    <li><strong>Hoja de Vida Detallada:</strong> Haz clic en un empleado para ver su perfil completo, incluyendo su historial de ausencias, exámenes, seguimientos y más.</li>
                    <li><strong>Foto de Perfil:</strong> Personaliza el perfil de cada empleado subiendo su foto.</li>
                </ul>
            </GuideItem>

             <GuideItem title="Gestión de Ausentismo" icon={CalendarX2}>
                <p>Registra y gestiona de forma precisa todas las ausencias de los empleados, desde incapacidades hasta licencias remuneradas.</p>
                <ul>
                    <li><strong>Registro Detallado:</strong> Formulario para registrar ausencias con fechas, tipo, motivo, diagnóstico (con códigos CIE-10), costos y más.</li>
                    <li><strong>Cálculos Automáticos:</strong> El sistema calcula automáticamente los días, horas y el costo del ausentismo basándose en las fechas y el salario del empleado.</li>
                    <li><strong>Soportes Digitales:</strong> Adjunta archivos (incapacidades, licencias) directamente a cada registro de ausencia.</li>
                    <li><strong>Carga Masiva y Exportación:</strong> Carga registros de ausentismo desde un archivo CSV y exporta los datos filtrados para tus informes.</li>
                </ul>
            </GuideItem>
            
            <GuideItem title="Exámenes Médicos (EMO)" icon={HeartPulse}>
              <p>Centraliza toda la información de los exámenes médicos ocupacionales de tus colaboradores.</p>
               <ul>
                <li><strong>Formulario Completo:</strong> Registra todos los resultados de los exámenes, desde audiometrías hasta perfiles lipídicos, y añade recomendaciones específicas.</li>
                <li><strong>Carga Masiva Inteligente:</strong> Carga cientos de registros EMO desde un archivo CSV. El sistema puede identificar duplicados (misma cédula y fecha de examen) para evitar datos redundantes.</li>
                <li><strong>Detalles del Examen:</strong> Accede a una vista detallada de cada examen, con un resumen claro de los resultados, recomendaciones y alertas de vencimiento de cursos.</li>
                <li><strong>Filtros y Búsqueda:</strong> Encuentra exámenes por cédula, tipo de examen, concepto de aptitud o fecha.</li>
              </ul>
            </GuideItem>
            
             <GuideItem title="Caracterización de Accidentes (AT)" icon={ClipboardPlus}>
              <p>Documenta y gestiona de principio a fin cada caso de accidente de trabajo con un nivel de detalle exhaustivo para cumplir con la normatividad.</p>
              <ul>
                <li><strong>Registro Integral:</strong> Formulario dividido en 7 pestañas para una trazabilidad completa: información del evento, datos del trabajador, investigación (causas, equipo investigador), reportes legales (FURAT, EPS), consecuencias (incapacidades, PCL), plan de acción y soportes.</li>
                <li><strong>Gestión de Soportes:</strong> Centraliza todos los documentos relevantes del caso en un solo lugar.</li>
                <li><strong>Carga y Descarga Masiva:</strong> Utiliza plantillas CSV para cargar múltiples caracterizaciones a la vez o para exportar los datos para análisis externos.</li>
              </ul>
            </GuideItem>

            <GuideItem title="Seguimiento de Accidentes (AT)" icon={Activity}>
              <p>Realiza un seguimiento continuo de los casos de AT, desde el evento inicial hasta el cierre completo del caso.</p>
              <ul>
                <li><strong>Seguimiento Post-Evento:</strong> Registra recomendaciones, incapacidades, información de reintegro y calificación de origen.</li>
                <li><strong>Centralización de Observaciones:</strong> Espacios dedicados para el seguimiento de enfermería y de la mesa laboral.</li>
                <li><strong>Gestión Documental:</strong> Adjunta soportes clave como la entrega de recomendaciones, reinducción y lecciones aprendidas.</li>
              </ul>
            </GuideItem>
            
             <GuideItem title="Seguimiento de Recomendaciones" icon={NotebookPen}>
              <p>Asegura el cumplimiento y seguimiento de las recomendaciones médicas post-evento (tanto para AT como para Enfermedad General).</p>
               <ul>
                <li><strong>Registro Detallado:</strong> Documenta el tipo de recomendación (temporal o permanente), vigencia, días acumulados, y si hubo reubicación laboral.</li>
                <li><strong>Control de Reintegro:</strong> Registra la fecha de reintegro y verifica el cumplimiento de capacitaciones y la socialización de recomendaciones al trabajador.</li>
                <li><strong>Observaciones Centralizadas:</strong> Espacio para anotaciones del área SST y de la mesa de trabajo para un seguimiento multidisciplinario.</li>
              </ul>
            </GuideItem>
            
             <GuideItem title="Vigilancia Epidemiológica (PVE)" icon={ShieldCheck}>
                <p>Gestiona los Programas de Vigilancia Epidemiológica (PVE) para diferentes sistemas como Auditivo, Osteomuscular, Cardiovascular, etc.</p>
                <ul>
                    <li><strong>Visión por Programa:</strong> Navega fácilmente entre los diferentes PVE a través de pestañas dedicadas.</li>
                    <li><strong>Seguimiento Individual:</strong> Para cada empleado incluido en un programa, puedes registrar el tipo de caso, nivel de riesgo, periodicidad del seguimiento y observaciones específicas.</li>
                    <li><strong>Gestión Documental:</strong> Adjunta soportes y documentos relevantes para cada caso dentro del PVE.</li>
                    <li><strong>Filtros Avanzados:</strong> Encuentra rápidamente a los trabajadores por nombre, cargo, sede o nivel de riesgo dentro de cada programa.</li>
                </ul>
            </GuideItem>
            
            <GuideItem title="PVE Psicosocial" icon={BrainCircuit}>
                <p>Este es un módulo especializado para la gestión integral del riesgo psicosocial, incluyendo el seguimiento a casos, eventos vitales y reportes específicos.</p>
                <ul>
                    <li><strong>Seguimiento PVE:</strong> Similar al módulo PVE general, pero enfocado en los empleados incluidos en el programa psicosocial.</li>
                    <li><strong>Registro de Eventos Vitales:</strong> Documenta y sigue eventos importantes (fallecimientos, nacimientos, etc.) que impactan al trabajador.</li>
                    <li><strong>Reportes Especializados:</strong> Genera reportes específicos para Gerencia, SST, RH y el Comité de Convivencia Laboral (CCL), cada uno con su propio formulario y listado.</li>
                </ul>
            </GuideItem>

             <GuideItem title="Cronograma de Actividades" icon={CalendarCheck}>
              <p>Planifica, ejecuta y mide la eficacia de las actividades de tus Programas de Vigilancia Epidemiológica (PVE).</p>
               <ul>
                <li><strong>Planificación y Seguimiento:</strong> Registra actividades programadas con metas de cantidad y cobertura. Luego, actualiza con los datos de ejecución.</li>
                <li><strong>Métricas de Cumplimiento:</strong> El sistema calcula automáticamente el porcentaje de cumplimiento y cobertura para cada actividad.</li>
                <li><strong>Desbloqueo de Seguridad:</strong> El seguimiento de la ejecución está protegido por un código de seguridad para garantizar la integridad de los datos.</li>
                <li><strong>Carga Masiva:</strong> Planifica todo tu cronograma anual cargando un archivo CSV.</li>
              </ul>
            </GuideItem>

            <GuideItem title="Reportes y Análisis" icon={BarChart3}>
                <p>Transforma tus datos en conocimiento. Este módulo te ofrece dashboards interactivos para la toma de decisiones estratégicas.</p>
                <ul>
                    <li><strong>Análisis de Empleados:</strong> Gráficos sobre distribución de edad, género, y alertas de pensión. Analiza la rotación de personal por mes y por centro de costo.</li>
                    <li><strong>Análisis de Ausentismo:</strong> Visualiza la distribución de ausencias por tipo, motivo, costo y sistema alterado. Identifica tendencias mensuales y compara el ausentismo entre centros de costo.</li>
                    <li><strong>Análisis de Accidentalidad:</strong> Mide indicadores clave como el índice de frecuencia y severidad. Analiza la tendencia de accidentes por mes y su clasificación. Incluye un innovador **mapa corporal de lesiones**.</li>
                    <li><strong>Análisis de Seguimiento AT:</strong> Evalúa la eficiencia en la gestión de casos con KPIs como el tiempo promedio de cierre y la distribución de casos por estado y origen.</li>
                    <li><strong>Indicadores de Cronograma:</strong> Mide la eficacia de tus PVE con gráficos de cumplimiento y cobertura mensual.</li>
                    <li><strong>Exportación a PDF:</strong> Todos los reportes se pueden exportar a un archivo PDF con un solo clic, listos para tu presentación.</li>
                </ul>
            </GuideItem>
            
          </Accordion>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
