
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  CalendarX2,
  BrainCircuit,
  Stethoscope,
  BarChart3,
  Users,
  Briefcase,
  HeartPulse,
  ShieldCheck,
  Activity,
  NotebookPen,
  HeartHandshake,
  CalendarCheck,
  FileHeart,
  FileSearch,
  BookHeart,
  Building,
  ClipboardPlus,
  Network,
  Bone,
  Ticket, // New Icon
} from 'lucide-react';

const navIcons: { [key: string]: React.ElementType } = {
  dashboard: LayoutDashboard,
  employees: Briefcase,
  'user-management': Users,
  emo: HeartPulse,
  pve: ShieldCheck,
  osteomuscular: Bone,
  psychosocial: BrainCircuit,
  'absence-tracking': CalendarX2,
  'at-tracking': Activity,
  'at-caracterizacion': ClipboardPlus,
  'medical-recommendations': NotebookPen,
  'activity-schedule': CalendarCheck,
  'cost-centers': Network,
  reports: BarChart3,
  'tenant-management': Building,
  guide: BookHeart,
  tickets: Ticket, // New Nav Item
};

const navItemsList = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'employees', label: 'Gestión de Empleados' },
    { id: 'user-management', label: 'Gestión de Usuarios' },
    { id: 'emo', label: 'Exámenes Médicos' },
    { id: 'pve', label: 'Vigilancia (PVE)' },
    { id: 'osteomuscular', label: 'PVE Osteomuscular' },
    { id: 'psychosocial', label: 'Psicosocial' },
    { id: 'absence-tracking', label: 'Gestión de Ausentismo' },
    { id: 'at-tracking', label: 'Seguimiento AT' },
    { id: 'at-caracterizacion', label: 'Caracterización AT' },
    { id: 'medical-recommendations', label: 'Seguimiento Recomendaciones' },
    { id: 'activity-schedule', label: 'Cronograma' },
    { id: 'cost-centers', label: 'Centros de Trabajo' },
    { id: 'reports', label: 'Reportes y Análisis' },
    { id: 'tenant-management', label: 'Gestión de Empresas' },
    { id: 'tickets', label: 'Soporte y Tickets' },
    { id: 'guide', label: 'Guía del Sistema' },
];


const reportSubNav = [
    { id: 'reports/employee-analysis', label: 'Análisis de Empleados', icon: Users },
    { id: 'reports/emo-analysis', label: 'Análisis EMO', icon: FileSearch },
    { id: 'reports/absence-analysis', label: 'Análisis de Ausentismo', icon: CalendarX2 },
    { id: 'reports/accident-analysis', label: 'Análisis de Accidentalidad', icon: FileHeart },
    { id: 'reports/at-tracking-analysis', label: 'Análisis de Seguimiento AT', icon: NotebookPen },
    { id: 'reports/schedule-indicators', label: 'Indicadores de Cronograma', icon: CalendarCheck },
];


export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  if (!user) return null; // Or a loading spinner

  const visibleModules = user.accessibleModules || [];
  
  const isReportsActive = pathname.startsWith('/reports');
  const isPveActive = pathname === '/pve';
  const isPsychosocialActive = pathname === '/psychosocial';
  const isOsteomuscularActive = pathname === '/osteomuscular';

  // Define which modules are available for all users vs. which are permission-based
  const baseModules = ['dashboard', 'guide', 'profile', 'tickets'];
  const allModules = [...baseModules, ...visibleModules];


  return (
    <SidebarMenu>
      {navItemsList
        .filter(({ id }) => {
            if (['tenant-management', 'cost-centers'].includes(id)) return user.role === 'SuperAdmin' || user.role === 'Admin';
            if (id === 'user-management') return ['SuperAdmin', 'Admin'].includes(user.role);
            return allModules.includes(id)
        })
        .map(({id, label}) => (
        <SidebarMenuItem key={id}>
          <SidebarMenuButton
            asChild
            isActive={
              (id === 'dashboard' && pathname.endsWith('/dashboard')) ||
              (id === 'reports' && isReportsActive) || 
              (id === 'pve' && isPveActive) ||
              (id === 'psychosocial' && isPsychosocialActive) ||
              (id === 'osteomuscular' && isOsteomuscularActive) ||
              (pathname.startsWith(`/${id}`) && !isReportsActive && id !== 'pve' && id !== 'psychosocial' && id !== 'osteomuscular' && id !== 'dashboard')
            }
            tooltip={{children: label}}
          >
            <Link href={`/${id}`}>
              {React.createElement(navIcons[id])}
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
           {id === 'reports' && (
             <SidebarMenuSub>
                {reportSubNav.map(item => (
                     <SidebarMenuSubItem key={item.id}>
                        <SidebarMenuSubButton asChild isActive={pathname === `/${item.id}`}>
                            <Link href={`/${item.id}`}>
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                ))}
             </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
