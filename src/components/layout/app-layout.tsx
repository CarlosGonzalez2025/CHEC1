import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Nav } from './nav';
import { Header } from './header';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';
import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

type AppLayoutProps = {
  children: ReactNode;
  pageTitle: string;
};

const AppLayoutClient = ({ children, pageTitle }: AppLayoutProps) => {
  const { tenantName, user, tenantLogo } = useAuth();
  
  let headerTitle = "NOVA SST";
  if (user?.role === 'SuperAdmin') {
    // For SuperAdmin, it can be a generic name or something else
    headerTitle = "NOVA SST Global";
  } else if (tenantName) {
    headerTitle = `NOVA SST - ${tenantName}`;
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            {tenantLogo ? (
              // tenant-specific logo
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenantLogo} alt="Tenant Logo" width={32} height={32} className="rounded" />
            ) : (
              <Image src="https://i.postimg.cc/dtrs3sSP/logo2-copia.png" alt="CHEC Logo" width={32} height={32} />
            )}
            <span className="text-lg font-bold font-headline">{headerTitle}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <Nav />
        </SidebarContent>
        <SidebarFooter className='flex flex-col gap-1 items-start'>
          <SidebarSeparator />
          <div className="w-full flex items-center justify-between py-2">
            {/* Left: tenant logo square */}
            <div className="flex items-center">
              {tenantLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenantLogo} alt="Tenant Logo" className="w-24 h-12 object-contain rounded-md bg-white p-1 shadow" />
              ) : (
                <div className="w-24 h-12 bg-gray-100 rounded-md" />
              )}
            </div>
            {/* Right: small caption */}
            <p className="text-xs text-muted-foreground">Powered by DateNova</p>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header pageTitle={pageTitle} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Since useAuth is a client hook, we need to make AppLayout a client component
// or wrap the part that uses the hook in its own client component.
export default function AppLayout({ children, pageTitle }: AppLayoutProps) {
  return <AppLayoutClient pageTitle={pageTitle}>{children}</AppLayoutClient>
}
