
'use client';

import {
  User,
  getUsers,
  getUserById,
  getEmployees,
  getAbsences,
  getMedicalFollowUps,
  getEmos,
  updateUser,
  updateEmployee,
  getTenantById,
  getTenants,
  Tenant,
  getATTrackings,
  getMedicalRecommendations,
  getActivitySchedules,
  getVitalEvents,
  getGerenciaReports,
  getSstReports,
  getRhReports,
  getCclReports,
  getAtCaracterizaciones,
  getCostCenters,
  getTickets, // Import ticket functions
  updateAbsence,
  navItems,
} from '@/lib/data';
import type { Employee, Absence, MedicalFollowUp, Emo, ATTracking, MedicalRecommendation, ActivitySchedule, VitalEvent, GerenciaReport, SstReport, RhReport, CclReport, AtCaracterizacion, CostCenter, Ticket } from '@/lib/data';
import { auth, storage } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuthContextType {
  user: (User & { photoURL?: string | null; }) | null;
  firebaseUser: FirebaseUser | null;
  employees: Employee[];
  absences: Absence[];
  medicalFollowUps: MedicalFollowUp[];
  atTrackings: ATTracking[]; 
  atCaracterizaciones: AtCaracterizacion[];
  medicalRecommendations: MedicalRecommendation[];
  activitySchedules: ActivitySchedule[];
  vitalEvents: VitalEvent[]; 
  gerenciaReports: GerenciaReport[];
  sstReports: SstReport[];
  rhReports: RhReport[];
  cclReports: CclReport[];
  costCenters: CostCenter[];
  emos: Emo[];
  tickets: Ticket[]; // Add tickets to context
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchAllData: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfilePicture: (file: File) => Promise<void>;
  loading: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantLogo?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Moved calculation logic here to be reusable
const calculateWorkingHours = (start: Date, end: Date): { hours: number, days: number } => {
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { hours: 0, days: 0 };
    }

    if (isSameDay(start, end)) {
      return { hours: 8, days: 1 };
    }

    let workingHours = 0;
    let runnerDate = new Date(start); 

    while (runnerDate < end) {
        const dayOfWeek = runnerDate.getUTCDay(); // 0=Sunday, 6=Saturday
        const hourOfDay = runnerDate.getUTCHours();

        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            if ((hourOfDay >= 8 && hourOfDay < 12) || (hourOfDay >= 13 && hourOfDay < 17)) {
                workingHours++;
            }
        } else if (dayOfWeek === 6) { // Saturday
            if (hourOfDay >= 8 && hourOfDay < 12) {
                workingHours++;
            }
        }
        runnerDate.setHours(runnerDate.getHours() + 1);
    }

    const workDays = workingHours > 0 ? workingHours / 8 : 0;

    return { 
        hours: parseFloat(workingHours.toFixed(2)),
        days: parseFloat(workDays.toFixed(2)),
    };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(User & { photoURL?: string | null; }) | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  // `refreshing` is used for in-app data refreshes triggered by components
  // so we don't show the global full-screen loader and we can coalesce
  // concurrent refresh requests.
  const [refreshing, setRefreshing] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [medicalFollowUps, setMedicalFollowUps] = useState<MedicalFollowUp[]>([]);
  const [atTrackings, setAtTrackings] = useState<ATTracking[]>([]);
  const [atCaracterizaciones, setAtCaracterizaciones] = useState<AtCaracterizacion[]>([]);
  const [medicalRecommendations, setMedicalRecommendations] = useState<MedicalRecommendation[]>([]);
  const [activitySchedules, setActivitySchedules] = useState<ActivitySchedule[]>([]);
  const [vitalEvents, setVitalEvents] = useState<VitalEvent[]>([]);
  const [gerenciaReports, setGerenciaReports] = useState<GerenciaReport[]>([]);
  const [sstReports, setSstReports] = useState<SstReport[]>([]);
  const [rhReports, setRhReports] = useState<RhReport[]>([]);
  const [cclReports, setCclReports] = useState<CclReport[]>([]);
  const [emos, setEmos] = useState<Emo[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchAllData = useCallback(async (currentUser: User) => {
    if (!currentUser) return;
    
    const tenantIdParam = currentUser.role === 'SuperAdmin' ? undefined : currentUser.tenantId;
    const modules = currentUser.accessibleModules || [];
    
    // Schedule all data fetching in parallel
    const promises = [
        ...(modules.includes('employees') ? [getEmployees(tenantIdParam)] : []),
        ...(modules.includes('absence-tracking') ? [getAbsences(tenantIdParam)] : []),
        ...(modules.includes('medical-follow-ups') ? [getMedicalFollowUps(tenantIdParam)] : []),
        ...(modules.includes('emo') || modules.includes('pve') || modules.includes('psychosocial') || modules.includes('osteomuscular') ? [getEmos(tenantIdParam)] : []),
        ...(modules.includes('at-tracking') ? [getATTrackings(tenantIdParam)] : []),
        ...(modules.includes('at-caracterizacion') ? [getAtCaracterizaciones(tenantIdParam)] : []),
        ...(modules.includes('medical-recommendations') ? [getMedicalRecommendations(tenantIdParam)] : []),
        ...(modules.includes('activity-schedule') ? [getActivitySchedules(tenantIdParam)] : []),
        ...(modules.includes('psychosocial') ? [
            getVitalEvents(tenantIdParam),
            getGerenciaReports(tenantIdParam),
            getSstReports(tenantIdParam),
            getRhReports(tenantIdParam),
            getCclReports(tenantIdParam)
        ] : []),
        ...((['Admin', 'SuperAdmin'].includes(currentUser.role)) ? [getCostCenters(tenantIdParam)] : []),
        getTickets(currentUser.role === 'SuperAdmin' ? undefined : currentUser.tenantId), // Always fetch tickets
    ];

    const results = await Promise.all(promises);
    
    let promiseIndex = 0;
    
    const employeeData = modules.includes('employees') ? results[promiseIndex++] : [];
    setEmployees(employeeData);

    if (modules.includes('absence-tracking')) {
        const fetchedAbsences = results[promiseIndex++];
        
        const updatesToPerform: { id: string; data: Partial<Absence> }[] = [];
        const employeeMap = new Map(employeeData.map((emp: Employee) => [emp.id, emp]));

        fetchedAbsences.forEach((absence: Absence) => {
            let needsUpdate = false;
            let updatedData: Partial<Absence> = {};

            if ((!absence.horas || absence.horas === 0) && absence.fechaInicio && absence.fechaFinal) {
                const { hours, days } = calculateWorkingHours(absence.fechaInicio, absence.fechaFinal);
                if (hours > 0) {
                    updatedData.horas = hours;
                    updatedData.dias = days;
                    needsUpdate = true;
                }
            }

            if ((!absence.costoAusentismo || absence.costoAusentismo === 0) && absence.employeeId) {
                const employee = employeeMap.get(absence.employeeId);
                if (employee && employee.hourlyRate > 0) {
                    const hours = updatedData.horas || absence.horas;
                    if (hours > 0) {
                        updatedData.costoAusentismo = hours * employee.hourlyRate;
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                updatesToPerform.push({ id: absence.id, data: updatedData });
            }
        });
        
        if (updatesToPerform.length > 0 && tenantIdParam) {
            console.log(`Found ${updatesToPerform.length} absence records to recalculate. Updating now...`);
            const updatePromises = updatesToPerform.map(update => updateAbsence(update.id, update.data, tenantIdParam));
            Promise.all(updatePromises).then(() => {
                 getAbsences(tenantIdParam).then(setAbsences); 
            }).catch(err => console.error("Error during batch absence update:", err));
        } else {
            setAbsences(fetchedAbsences);
        }
    }
    
    if (modules.includes('medical-follow-ups')) setMedicalFollowUps(results[promiseIndex++]);
    if (modules.includes('emo') || modules.includes('pve') || modules.includes('psychosocial') || modules.includes('osteomuscular')) setEmos(results[promiseIndex++]);
    if (modules.includes('at-tracking')) setAtTrackings(results[promiseIndex++]);
    if (modules.includes('at-caracterizacion')) setAtCaracterizaciones(results[promiseIndex++]);
    if (modules.includes('medical-recommendations')) setMedicalRecommendations(results[promiseIndex++]);
    if (modules.includes('activity-schedule')) {
       const schedules = results[promiseIndex++];
       const processedSchedules = schedules.map((schedule: ActivitySchedule) => {
            if (!schedule.mes && schedule.fecha) {
                try {
                    const date = new Date(schedule.fecha);
                    const monthName = format(date, 'MMMM', { locale: es });
                    schedule.mes = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                } catch(e) { /* ignore */ }
            }
            return schedule;
        });
        setActivitySchedules(processedSchedules);
    }
    if (modules.includes('psychosocial')) {
        setVitalEvents(results[promiseIndex++]);
        setGerenciaReports(results[promiseIndex++]);
        setSstReports(results[promiseIndex++]);
        setRhReports(results[promiseIndex++]);
        setCclReports(results[promiseIndex++]);
    }
    if (['Admin', 'SuperAdmin'].includes(currentUser.role)) {
        setCostCenters(results[promiseIndex++]);
    }
    setTickets(results[promiseIndex++]);
  }, []);

  const clearAllData = () => {
    setFirebaseUser(null);
    setUser(null);
    setTenantId(null);
    setTenantName(null);
    setTenantLogo(null);
    setEmployees([]);
    setAbsences([]);
    setMedicalFollowUps([]);
    setAtTrackings([]);
    setAtCaracterizaciones([]);
    setMedicalRecommendations([]);
    setActivitySchedules([]);
    setVitalEvents([]);
    setGerenciaReports([]);
    setSstReports([]);
    setRhReports([]);
    setCclReports([]);
    setEmos([]);
    setCostCenters([]);
    setTickets([]);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userProfile = await getUserById(fbUser.uid);

        if (!userProfile || userProfile.status !== 'Active') {
          await signOut(auth);
          clearAllData();
          setLoading(false);
          return;
        }

        const baseModules = ['dashboard', 'guide', 'profile', 'tickets'];
        let finalModules: string[] = [];
        let currentTenantId: string | null = null;
        let currentTenantName: string | null = null;
        
        if (userProfile.role === 'SuperAdmin') {
            currentTenantId = null;
            currentTenantName = 'Global';
      // SuperAdmin has no tenant logo
      setTenantLogo(null);
            const allNavItems = navItems.map(item => item.id);
            finalModules = [...new Set([...baseModules, ...allNavItems])];
        } else if (userProfile.tenantId) {
            const tenant = await getTenantById(userProfile.tenantId);
            if (!tenant || tenant.status !== 'Active') {
                await signOut(auth);
                clearAllData();
                setLoading(false);
                return;
            }
            currentTenantId = userProfile.tenantId;
            currentTenantName = tenant.name;
      setTenantLogo(tenant.logoURL || null);
            const tenantModules = new Set(tenant.accessibleModules || []);
            const userModules = new Set(userProfile.accessibleModules || []);
            finalModules = Array.from(new Set([...baseModules, ...tenantModules, ...userModules]));
             if(userProfile.role === 'Admin') {
                finalModules.push('user-management', 'cost-centers');
            }
        } else {
             await signOut(auth);
             clearAllData();
             setLoading(false);
             return;
        }
        
        const userWithFullProfile = { ...userProfile, photoURL: fbUser.photoURL, accessibleModules: finalModules };
        setUser(userWithFullProfile);
        setTenantId(currentTenantId);
        setTenantName(currentTenantName);
        
        await fetchAllData(userWithFullProfile);

        if (pathname === '/') {
          router.replace('/dashboard');
        }
      } else {
        clearAllData();
        if (pathname !== '/') {
          router.replace('/');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname, fetchAllData]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in.");
    }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);

    await reauthenticateWithCredential(user, credential);
    
    await updatePassword(user, newPassword);
  };

  const updateProfilePicture = async (file: File) => {
    if (!firebaseUser || !user) {
        throw new Error("No user is signed in.");
    }
    
    const storageRef = ref(storage, `profile-pictures/${firebaseUser.uid}`);
    await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(storageRef);

    await updateProfile(firebaseUser, { photoURL });
    
    await updateUser(user.id, { photoURL });

    if (user.tenantId) {
        const allEmployees = await getEmployees(user.tenantId);
        const employeeProfile = allEmployees.find(e => e.user === user.id);
        if (employeeProfile) {
            await updateEmployee(employeeProfile.id, { photoURL }, user.tenantId);
        }
    }

    setUser(prev => prev ? { ...prev, photoURL } : null);
  };

  const refreshData = useCallback(async () => {
    if (!user) return;
    // If a refresh is already running, return the existing promise to
    // coalesce multiple rapid calls.
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchAllData(user);
    } finally {
      setRefreshing(false);
    }
  }, [user, fetchAllData, refreshing]);

  const value = {
    user,
    firebaseUser,
    employees,
    absences,
    medicalFollowUps,
    atTrackings, 
    atCaracterizaciones,
    medicalRecommendations,
    activitySchedules,
    vitalEvents,
    gerenciaReports,
    sstReports,
    rhReports,
    cclReports,
    emos,
    costCenters,
    tickets,
    login,
    logout,
  fetchAllData: refreshData,
  // expose refreshing so components can show inline spinners if needed
  refreshing,
    changePassword,
    updateProfilePicture,
    loading,
    tenantId,
    tenantName,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
