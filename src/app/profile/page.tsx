// src/app/profile/page.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRef, useState } from 'react';


const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your new password." }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <div className="text-base">{value || 'N/A'}</div>
  </div>
);

export default function ProfilePage() {
  const { user, loading, changePassword, updateProfilePicture } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  async function onSubmit(data: z.infer<typeof passwordFormSchema>) {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast({
        title: "Success",
        description: "Your password has been changed successfully.",
      });
      form.reset();
    } catch (error) {
       toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    }
  }
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await updateProfilePicture(file);
        toast({
          title: 'Éxito',
          description: 'Tu foto de perfil ha sido actualizada.',
        });
      } catch (error) {
         toast({
          title: 'Error al subir la foto',
          description: 'No se pudo actualizar tu foto de perfil.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    }
  };


  if (loading || !user) {
    return (
      <AppLayout pageTitle="Perfil de Usuario">
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <AppLayout pageTitle="Perfil de Usuario">
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-6">
                 <div className="relative group">
                  <Avatar className="h-24 w-24 border">
                    <AvatarImage src={user.photoURL || undefined} alt={user.name} />
                    <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={handleAvatarClick}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-3xl">{user.name}</CardTitle>
                  <CardDescription className="text-lg">{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-2">
              <Separator />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <DetailItem
                  label="Rol"
                  value={
                    <Badge
                      className={
                        user.role === 'Admin'
                          ? 'bg-red-500'
                          : user.role === 'HR'
                          ? 'bg-blue-500'
                          : user.role === 'Medical'
                          ? 'bg-purple-500'
                          : 'bg-gray-500'
                      }
                    >
                      {user.role}
                    </Badge>
                  }
                />
                <DetailItem
                  label="Estado"
                  value={
                    <Badge
                      variant={user.status === 'Active' ? 'default' : 'destructive'}
                      className={user.status === 'Active' ? 'bg-green-500' : ''}
                    >
                      {user.status}
                    </Badge>
                  }
                />
                <div className="md:col-span-2">
                  <DetailItem
                    label="Módulos Accesibles"
                    value={
                      <div className="flex flex-wrap gap-2 mt-1">
                        {user.accessibleModules.map((module) => (
                          <Badge key={module} variant="secondary">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <DetailItem
                    label="Centros de Costo Asignados"
                    value={
                      <div className="flex flex-wrap gap-2 mt-1">
                        {user.costCenters.length > 0 ? (
                          user.costCenters.map((center) => (
                            <Badge key={center} variant="outline">
                              {center}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">Todos</Badge>
                        )}
                      </div>
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
           <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Para mayor seguridad, asegúrese de utilizar una contraseña segura.
                </CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                       <FormField
                          control={form.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contraseña Actual</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nueva Contraseña</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                    </CardContent>
                    <CardFooter>
                       <Button type="submit" disabled={form.formState.isSubmitting}>
                         {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Actualizar Contraseña
                       </Button>
                    </CardFooter>
                </form>
              </Form>
           </Card>
        </div>
      </div>
    </AppLayout>
  );
}
