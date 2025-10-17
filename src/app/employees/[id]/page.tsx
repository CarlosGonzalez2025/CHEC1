// src/app/employees/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Employee, updateEmployee, healthFunds, pensionFunds, updateEmployeePhoto } from '@/lib/data';
import type { Emo, Absence, ATTracking, MedicalRecommendation } from '@/lib/types';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Check, Loader2, ArrowLeft, Edit, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


function formatDate(date: Date | null | string): string {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if(isNaN(d.getTime())) return 'N/A';
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('es-CO');
    } catch (e) {
        return 'N/A';
    }
}

function dateToInputFormat(date: Date | null | string): string {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    } catch (e) { return ''; }
}

function formatCurrency(value: number | undefined) {
    if (value === undefined || isNaN(value)) return '$ 0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

const pvePrograms = [
    { key: 'auditivo', name: 'Auditivo' },
    { key: 'osteomuscularRecomendacion', name: 'Osteomuscular' },
    { key: 'cardiovascular', name: 'Cardiovascular' },
    { key: 'psicosocial', name: 'Psicosocial' },
    { key: 'respiratorio', name: 'Respiratorio' },
    { key: 'visual', name: 'Visual' },
];

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{value || 'N/A'}</div>
    </div>
);

type EmployeeFormData = Omit<Employee, 'id'>;

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
      employees,
      emos: allEmos,
      absences: allAbsences,
      atTrackings: allAtTrackings,
      medicalRecommendations: allMedicalRecommendations,
      costCenters,
      loading: authLoading,
      updateProfilePicture,
  } = useAuth();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [emos, setEmos] = useState<Emo[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [atTrackings, setAtTrackings] = useState<ATTracking[]>([]);
  const [medicalRecommendations, setMedicalRecommendations] = useState<MedicalRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeFormData>>({});

  useEffect(() => {
    if (!authLoading && id) {
        const currentEmployee = employees.find(e => e.id === id);
        if (currentEmployee) {
            setEmployee(currentEmployee);
            setEmos(allEmos.filter(e => e.employeeId === id));
            setAbsences(allAbsences.filter(a => a.employeeId === id));
            setAtTrackings(allAtTrackings.filter(at => at.employeeId === id));
            setMedicalRecommendations(allMedicalRecommendations.filter(mr => mr.employeeId === id));
        }
        setLoading(false);
    }
  }, [id, authLoading, employees, allEmos, allAbsences, allAtTrackings, allMedicalRecommendations]);


  const handleEditClick = () => {
    if (!employee) return;
    setFormData({
        ...employee,
        birthDate: dateToInputFormat(employee.birthDate as Date),
        hireDate: dateToInputFormat(employee.hireDate as Date),
        contractEndDate: dateToInputFormat(employee.contractEndDate as Date),
        pmtCourseDate: dateToInputFormat(employee.pmtCourseDate as Date),
        foodHandlingCourseDate: dateToInputFormat(employee.foodHandlingCourseDate as Date),
        onacCertificateDate: dateToInputFormat(employee.onacCertificateDate as Date),
        sstCourseDate: dateToInputFormat(employee.sstCourseDate as Date),
        periodicExamDueDate: dateToInputFormat(employee.periodicExamDueDate as Date),
    });
    setIsFormOpen(true);
  };
  
  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({...prev, [id]: value }));
  }

  const handleFormSelectChange = (id: string, value: string) => {
      setFormData(prev => ({...prev, [id]: value }));
  }
  
  const handleFormDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFormData(prev => ({ ...prev, [id]: value || null }));
  }

  const handleFormSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSalary = parseFloat(e.target.value);
      setFormData(prev => ({...prev, salary: isNaN(newSalary) ? 0 : newSalary}));
  }

  useEffect(() => {
    if (formData.salary && formData.salary > 0) {
        setFormData(prev => ({...prev, hourlyRate: parseFloat(((prev.salary! / 30) / 8).toFixed(2))}));
    } else {
        setFormData(prev => ({...prev, hourlyRate: 0}));
    }
  }, [formData.salary]);

  const handleSaveEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!employee) return;

      try {
          const employeeToSave = {
              ...formData,
              birthDate: formData.birthDate ? new Date(formData.birthDate as string) : null,
              hireDate: formData.hireDate ? new Date(formData.hireDate as string) : null,
              contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate as string) : null,
              pmtCourseDate: formData.pmtCourseDate ? new Date(formData.pmtCourseDate as string) : null,
              foodHandlingCourseDate: formData.foodHandlingCourseDate ? new Date(formData.foodHandlingCourseDate as string) : null,
              onacCertificateDate: formData.onacCertificateDate ? new Date(formData.onacCertificateDate as string) : null,
              sstCourseDate: formData.sstCourseDate ? new Date(formData.sstCourseDate as string) : null,
              periodicExamDueDate: formData.periodicExamDueDate ? new Date(formData.periodicExamDueDate as string) : null,
          };

          await updateEmployee(employee.id, employeeToSave as Omit<Employee, 'id'>);
          toast({ title: "Empleado Actualizado", description: "La información del empleado ha sido actualizada." });
          setIsFormOpen(false);
          // Reloading the page to ensure all contexts and states are refreshed
          window.location.reload(); 
      } catch (error) {
          console.error("Error saving employee: ", error);
          toast({ title: "Error al Guardar", variant: "destructive" });
      }
  }


  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && employee) {
      setIsUploading(true);
      try {
        const photoURL = await updateEmployeePhoto(employee.id, file);
        setEmployee(prev => prev ? { ...prev, photoURL } : null);
        toast({ title: 'Foto actualizada', description: 'La foto de perfil del empleado ha sido cambiada.' });
      } catch (error) {
         toast({ title: 'Error al subir', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (loading) {
    return <AppLayout pageTitle="Cargando Hoja de Vida..."><div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!employee) {
    return <AppLayout pageTitle="Empleado no encontrado"><div className="text-center p-8"><h1>Empleado no encontrado.</h1><p>El empleado que buscas no existe o no tienes permisos para verlo.</p></div></AppLayout>;
  }
  
  const employeePvePrograms = pvePrograms.filter(pve => (emos.some(e => e[pve.key as keyof Emo] === 'X')));
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <AppLayout pageTitle={`Hoja de Vida: ${employee.fullName}`}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <div className="relative group">
                    <Avatar className="h-20 w-20 border">
                        <AvatarImage src={employee.photoURL || undefined} />
                        <AvatarFallback>{getInitials(employee.fullName)}</AvatarFallback>
                    </Avatar>
                    <button onClick={handleAvatarClick} disabled={isUploading} className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {isUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} disabled={isUploading} />
                </div>
                <div>
                  <CardTitle className="text-3xl">{employee.fullName}</CardTitle>
                  <CardDescription className="text-base">{employee.position}</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
                <Button onClick={handleEditClick}><Edit className="mr-2 h-4 w-4"/>Editar Empleado</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="my-4"/>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DetailItem label="Identificación" value={`${employee.identificationType} ${employee.identification}`} />
                <DetailItem label="Teléfono" value={employee.mobilePhone} />
                <DetailItem label="Fecha de Nacimiento" value={formatDate(employee.birthDate)} />
                <DetailItem label="Género" value={employee.gender} />
                <DetailItem label="Cargo" value={employee.position} />
                <DetailItem label="Estado del Contrato" value={<Badge className={employee.contractStatus === 'Activo' ? 'bg-green-500' : ''}>{employee.contractStatus}</Badge>} />
                <DetailItem label="Fecha de Ingreso" value={formatDate(employee.hireDate)} />
                <DetailItem label="Salario" value={formatCurrency(employee.salary)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de Exámenes Médicos Ocupacionales ({emos.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Concepto</TableHead><TableHead>IPS</TableHead></TableRow></TableHeader>
                <TableBody>
                    {emos.length > 0 ? emos.map(emo => (
                        <TableRow key={emo.id}><TableCell>{formatDate(emo.fechaExamen)}</TableCell><TableCell>{emo.tipoExamen}</TableCell><TableCell>{emo.concepto}</TableCell><TableCell>{emo.ipsRemision}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center">No hay registros.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Historial de Ausentismo ({absences.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Fecha Inicio</TableHead><TableHead>Fecha Final</TableHead><TableHead>Tipo</TableHead><TableHead>Motivo</TableHead><TableHead>Días</TableHead></TableRow></TableHeader>
                <TableBody>
                    {absences.length > 0 ? absences.map(a => (
                        <TableRow key={a.id}><TableCell>{formatDate(a.fechaInicio)}</TableCell><TableCell>{formatDate(a.fechaFinal)}</TableCell><TableCell>{a.tipoAusencia}</TableCell><TableCell>{a.motivoAusencia}</TableCell><TableCell>{a.dias}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={5} className="text-center">No hay registros.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de Seguimientos de Accidentes de Trabajo ({atTrackings.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Fecha Siniestro</TableHead><TableHead>Tipo Evento</TableHead><TableHead>Diagnóstico</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>
                    {atTrackings.length > 0 ? atTrackings.map(at => (
                        <TableRow key={at.id}><TableCell>{formatDate(at.fechaSiniestro)}</TableCell><TableCell>{at.tipoEvento}</TableCell><TableCell>{at.diagnostico}</TableCell><TableCell>{at.estadoCaso}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center">No hay registros.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historial de Seguimiento de Recomendaciones Médicas ({medicalRecommendations.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>Fecha Recomendación</TableHead><TableHead>Tipo Evento</TableHead><TableHead>Lesión</TableHead><TableHead>Estado del Caso</TableHead></TableRow></TableHeader>
                <TableBody>
                    {medicalRecommendations.length > 0 ? medicalRecommendations.map(mr => (
                        <TableRow key={mr.id}><TableCell>{formatDate(mr.fechaRecomendacion)}</TableCell><TableCell>{mr.tipoEvento}</TableCell><TableCell>{mr.lesionYParteCuerpo}</TableCell><TableCell>{mr.estadoCaso}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center">No hay registros.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Programas de Vigilancia Epidemiológica (PVE) Aplicables ({employeePvePrograms.length})</CardTitle></CardHeader>
          <CardContent>
            {employeePvePrograms.length > 0 ? (
                <ul className="space-y-2">
                    {employeePvePrograms.map(pve => (
                        <li key={pve.key} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                            <Check className="h-5 w-5 text-green-600"/>
                            <span className="font-medium">{pve.name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-muted-foreground">El empleado no está incluido en ningún programa PVE según sus exámenes médicos.</p>
            )}
          </CardContent>
        </Card>

      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEmployee}>
                <DialogHeader>
                    <DialogTitle>Editar Empleado</DialogTitle>
                    <DialogDescription>
                        Actualice la información del empleado.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {/* Column 1 */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="identificationType">Tipo de documento</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('identificationType', value)} value={formData.identificationType}>
                                <SelectTrigger id="identificationType"><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CC">CC - Cédula de Ciudadanía</SelectItem>
                                    <SelectItem value="CE">CE - Cédula de Extranjería</SelectItem>
                                    <SelectItem value="PT">PT - Permiso por Protección Temporal</SelectItem>
                                    <SelectItem value="PA">PA - Pasaporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="identification">Identificación</Label><Input id="identification" value={formData.identification} onChange={handleFormInputChange} /></div>
                        <div><Label htmlFor="fullName">Nombre Completo</Label><Input id="fullName" value={formData.fullName} onChange={handleFormInputChange}/></div>
                        <div>
                            <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                            <Input id="birthDate" type="date" value={dateToInputFormat(formData.birthDate as string)} onChange={handleFormDateChange} />
                        </div>
                        <div>
                            <Label htmlFor="gender">Género</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('gender', value)} value={formData.gender}>
                                <SelectTrigger id="gender"><SelectValue placeholder="Seleccione un género" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                    <SelectItem value="Femenino">Femenino</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-4">
                        <div><Label htmlFor="mobilePhone">Teléfono Celular</Label><Input id="mobilePhone" value={formData.mobilePhone} onChange={handleFormInputChange}/></div>
                        <div><Label htmlFor="position">Cargo</Label><Input id="position" value={formData.position} onChange={handleFormInputChange}/></div>
                        <div>
                            <Label htmlFor="positionType">Tipo de Cargo</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('positionType', value)} value={formData.positionType}>
                                <SelectTrigger id="positionType"><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                                <SelectContent><SelectItem value="Operativo">Operativo</SelectItem><SelectItem value="Administrativo">Administrativo</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="contractStatus">Estado Contrato</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('contractStatus', value)} value={formData.contractStatus}>
                                <SelectTrigger id="contractStatus"><SelectValue placeholder="Seleccione un estado" /></SelectTrigger>
                                <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Retirado">Retirado</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="hireDate">Fecha de Ingreso</Label><Input id="hireDate" type="date" value={dateToInputFormat(formData.hireDate as string)} onChange={handleFormDateChange} /></div>
                        <div><Label htmlFor="contractEndDate">Fecha de terminación de contrato</Label><Input id="contractEndDate" type="date" value={dateToInputFormat(formData.contractEndDate as string)} onChange={handleFormDateChange} /></div>
                    </div>
                    {/* Column 3 */}
                    <div className="space-y-4">
                         <div>
                            <Label htmlFor="payrollDescription">Descripción de Nómina</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('payrollDescription', value)} value={formData.payrollDescription}>
                                <SelectTrigger id="payrollDescription"><SelectValue placeholder="Seleccione una descripción" /></SelectTrigger>
                                <SelectContent>{costCenters.map(desc => (<SelectItem key={desc.id} value={desc.name}>{desc.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="salary">Salario</Label><Input id="salary" type="number" value={formData.salary} onChange={handleFormSalaryChange} /></div>
                        <div><Label htmlFor="hourlyRate">Valor Hora</Label><Input id="hourlyRate" type="number" value={formData.hourlyRate} readOnly /></div>
                        <div>
                            <Label htmlFor="healthFund">Fondo de Salud</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('healthFund', value)} value={formData.healthFund}>
                                <SelectTrigger id="healthFund"><SelectValue placeholder="Seleccione un fondo" /></SelectTrigger>
                                <SelectContent>{healthFunds.map(fund => (<SelectItem key={fund} value={fund}>{fund}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="pensionFund">Fondo de Pensión</Label>
                            <Select onValueChange={(value) => handleFormSelectChange('pensionFund', value)} value={formData.pensionFund}>
                                <SelectTrigger id="pensionFund"><SelectValue placeholder="Seleccione un fondo" /></SelectTrigger>
                                <SelectContent>{pensionFunds.map(fund => (<SelectItem key={fund} value={fund}>{fund}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div><Label htmlFor="pmtCourseDate">Fecha curso PMT</Label><Input id="pmtCourseDate" type="date" value={dateToInputFormat(formData.pmtCourseDate as string)} onChange={handleFormDateChange} /></div>
                        <div><Label htmlFor="foodHandlingCourseDate">Fecha curso Manipulación de alimentos</Label><Input id="foodHandlingCourseDate" type="date" value={dateToInputFormat(formData.foodHandlingCourseDate as string)} onChange={handleFormDateChange} /></div>
                        <div><Label htmlFor="onacCertificateDate">Fecha certificado ONAC</Label><Input id="onacCertificateDate" type="date" value={dateToInputFormat(formData.onacCertificateDate as string)} onChange={handleFormDateChange} /></div>
                        <div><Label htmlFor="sstCourseDate">Fecha Curso SST</Label><Input id="sstCourseDate" type="date" value={dateToInputFormat(formData.sstCourseDate as string)} onChange={handleFormDateChange} /></div>
                        <div><Label htmlFor="periodicExamDueDate">Venc. Examen Periódico</Label><Input id="periodicExamDueDate" type="date" value={dateToInputFormat(formData.periodicExamDueDate as string)} onChange={handleFormDateChange} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
