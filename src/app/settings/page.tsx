// src/app/settings/page.tsx
'use client';
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: '',
        user: '',
        pass: '',
        from: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSmtpConfig(prev => ({...prev, [id]: value }));
    };


    const handleSaveSmtp = () => {
        // In a real application, you would save this to a secure server-side configuration,
        // not to local storage. This is for demonstration purposes only.
        localStorage.setItem('smtpConfig', JSON.stringify(smtpConfig));
        toast({
            title: "Configuración Guardada (Simulado)",
            description: "La configuración SMTP se ha guardado localmente. En producción, esto debe manejarse en el servidor.",
        });
    }

    return (
        <AppLayout pageTitle="Ajustes de la Aplicación">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Ajustes Generales</CardTitle>
                        <CardDescription>
                            Personaliza la apariencia y el comportamiento de la aplicación.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="dark-mode" className="text-base">Modo Oscuro</Label>
                                <p className="text-sm text-muted-foreground">
                                    Activa el tema oscuro para una mejor visualización.
                                </p>
                            </div>
                            <Switch 
                                id="dark-mode" 
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Configuración de Notificaciones (SMTP)</CardTitle>
                        <CardDescription>
                           Define los parámetros del servidor de correo para enviar notificaciones. Estos datos deben manejarse de forma segura.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="host">Servidor SMTP</Label>
                                <Input id="host" placeholder="smtp.gmail.com" value={smtpConfig.host} onChange={handleInputChange} />
                            </div>
                             <div>
                                <Label htmlFor="port">Puerto</Label>
                                <Input id="port" type="number" placeholder="465" value={smtpConfig.port} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="user">Usuario SMTP (Email)</Label>
                            <Input id="user" type="email" placeholder="tu-email@example.com" value={smtpConfig.user} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <Label htmlFor="pass">Contraseña SMTP</Label>
                            <Input id="pass" type="password" placeholder="••••••••••••••••" value={smtpConfig.pass} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <Label htmlFor="from">Dirección 'From' por Defecto</Label>
                            <Input id="from" type="email" placeholder="notificaciones@example.com" value={smtpConfig.from} onChange={handleInputChange}/>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSmtp}>Guardar Configuración SMTP</Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
