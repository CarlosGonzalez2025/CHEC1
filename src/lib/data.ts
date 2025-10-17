

import { collection, getDocs, addDoc, Timestamp, doc, updateDoc, getDoc, setDoc, query, where, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db, auth, storage } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword as firebaseSignIn, signOut, signInWithCredential, reauthenticateWithCredential, EmailAuthProvider, updatePassword as firebaseUpdatePassword, getAuth } from 'firebase/auth';
import type { Emo, PveData, Absence, ATTracking, MedicalRecommendation, ActivitySchedule, User, Tenant, VitalEvent, GerenciaReport, SstReport, RhReport, CclReport, AtCaracterizacion, CostCenter, Ticket, TicketComment } from './types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../firebase/config';
import { sendEmailAction } from './actions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export type Employee = {
  id: string;
  tenantId: string; // Multi-tenant support
  user: string;
  identificationType: string;
  identification: string;
  fullName: string;
  birthDate: Date | null;
  gender: string;
  mobilePhone: string;
  position: string;
  positionType: string;
  contractStatus: string;
  hireDate: Date | null;
  contractEndDate: Date | null;
  payrollDescription: string;
  salary: number;
  hourlyRate: number;
  healthFund: string;
  pensionFund: string;
  pmtCourseDate: Date | null;
  foodHandlingCourseDate: Date | null;
  onacCertificateDate: Date | null;
  sstCourseDate: Date | null;
  periodicExamDueDate: Date | null;
  photoURL?: string | null;
};

export const healthFunds = [
    "Entidad Promotora de Salud Sanitas S.A.S.",
    "EPS Suramericana S.A.",
    "Salud Total Entidad Promotora de Salud del regimen contributivo y del regimen subsidiado S.A.",
    "Compensar EPS",
    "EPS Famisanar S.A.S",
    "Nueva EPS S.A.",
    "Nueva EPS S.A. -CM",
    "Administradora de los recursos del sistema general de seguridad social en salud - MIN001",
    "COOSALUD EPS S.A.",
    "COOSALUD EPS S.A. -CM",
    "Asociacion Mutual Ser Empresa Solidaria de Salud Entidad Promotora de Salud - MUTUAL SER EPS",
    "Asociacion Mutual Ser Empresa Solidaria de Salud Entidad Promotora de Salud - MUTUAL SER EPS -CM",
    "Alianza Medellin Antioquia EPS S.A.S. Savia Salud EPS -CM",
    "Capital Salud Entidad Promotora de Salud del Régimen Subsidiado SAS -CM",
    "EPS Familiar de Colombia",
    "Administradora de los recursos del sistema general de seguridad social en salud - MIN002",
    "Sociedad Simplificada por Acciones Emssanar S.A.S.",
    "Aliansalud EPS S.A.",
    "Sin Definir",
    "Entidad Promotora de Salud Servicio Occidental de Salud S.A. S.O.S.",
    "Cajacopi EPS S.A.S."
];

export const pensionFunds = [
    "Porvenir",
    "Administradora Colombiana de Pensiones Colpensiones",
    "Protección",
    "Skandia Fondo de Pensiones Obligatorias",
    "Colfondos",
    "Sin Definir",
    "Skandia Fondo Alternativo de Pensiones"
];


// ✅ MÓDULO OSTEOMUSCULAR Y TICKETS AGREGADOS
export const navItems = [
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


/**
 * Wrapper function to call the server action for sending an email.
 * This function can be safely called from client components.
 * @param to The recipient's email address.
 * @param subject The subject of the email.
 * @param html The HTML content of the email.
 */
export async function sendNotificationEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendEmailAction(to, subject, html);
  } catch (error) {
    console.error("Error dispatching send-email action:", error);
    // Re-throw the error so the UI can catch it.
    throw error;
  }
}


/**
 * Uploads a file to a specified path in Firebase Storage.
 * @param file The file to upload.
 * @param path The path in storage (e.g., 'absence-soportes').
 * @returns The download URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  if (!storage) throw new Error("Firebase Storage is not initialized.");
  const fileId = uuidv4();
  const fileRef = ref(storage, `${path}/${fileId}_${file.name}`);
  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
}

export async function updateEmployeePhoto(employeeId: string, file: File): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");
    const userProfile = await getUserById(user.uid);
    if (!userProfile?.tenantId) throw new Error("User tenant not found.");

    const photoURL = await uploadFile(file, `employee-photos/${employeeId}`);
    await updateEmployee(employeeId, { photoURL }, userProfile.tenantId);
    return photoURL;
}


export async function addEmployee(employee: Omit<Employee, 'id'>, tenantId: string): Promise<string> {
    if (!db) {
        throw new Error("Firebase is not initialized.");
    }
    const employeeData = {
        ...employee,
        tenantId, // Add tenantId to the new record
        birthDate: employee.birthDate ? Timestamp.fromDate(new Date(employee.birthDate)) : null,
        hireDate: employee.hireDate ? Timestamp.fromDate(new Date(employee.hireDate)) : null,
        contractEndDate: employee.contractEndDate ? Timestamp.fromDate(new Date(employee.contractEndDate)) : null,
        pmtCourseDate: employee.pmtCourseDate ? Timestamp.fromDate(new Date(employee.pmtCourseDate)) : null,
        foodHandlingCourseDate: employee.foodHandlingCourseDate ? Timestamp.fromDate(new Date(employee.foodHandlingCourseDate)) : null,
        onacCertificateDate: employee.onacCertificateDate ? Timestamp.fromDate(new Date(employee.onacCertificateDate)) : null,
        sstCourseDate: employee.sstCourseDate ? Timestamp.fromDate(new Date(employee.sstCourseDate)) : null,
        periodicExamDueDate: employee.periodicExamDueDate ? Timestamp.fromDate(new Date(employee.periodicExamDueDate)) : null,
    };
    const docRef = await addDoc(collection(db, 'employees'), employeeData);
    return docRef.id;
}

export async function updateUser(id: string, userData: Partial<Omit<User, 'id' | 'password'>>): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated.");
    
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, { ...userData });
}


export async function addUser(user: Omit<User, 'id'>): Promise<string> {
    if (!db || !auth) {
        throw new Error("Firebase is not initialized.");
    }
    const adminUser = auth.currentUser;
    if (!adminUser || !adminUser.email) {
        throw new Error("Admin user is not properly signed in.");
    }

    // Create a temporary Firebase app + auth instance to isolate auth state
    const tempAppName = `temp-${uuidv4()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        // Create the new user with the temporary auth instance
        const { user: newUser } = await createUserWithEmailAndPassword(tempAuth, user.email, user.password!);
        const newUserId = newUser.uid;

        const userToSave: Omit<User, 'id' | 'password'> = {
            name: user.name,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            status: user.status,
            accessibleModules: user.accessibleModules,
            costCenters: user.costCenters,
            photoURL: null,
        };
        await setDoc(doc(db, "users", newUserId), userToSave);

        // Sign out from the temporary auth instance and delete the temporary app
        try {
            await signOut(tempAuth);
        } catch (e) {
            // ignore
        }
        try {
            await deleteApp(tempApp);
        } catch (e) {
            // ignore
        }

        return newUserId;
    } catch (error) {
        console.error("Error during new user creation:", error);
        // Attempt cleanup
        try {
            await signOut(getAuth(tempApp));
        } catch (e) {}
        try {
            await deleteApp(tempApp);
        } catch (e) {}
        throw error;
    }

}


export async function updateEmployee(id: string, employee: Partial<Omit<Employee, 'id'>>, tenantId: string): Promise<void> {
    if (!db) {
        throw new Error("Firebase is not initialized.");
    }

    const employeeRef = doc(db, 'employees', id);
    
    // Create a new object for Firestore with date conversions
    const firestoreData: { [key: string]: any } = { tenantId }; // Always ensure tenantId is part of the update
    for (const [key, value] of Object.entries(employee)) {
        if (['birthDate', 'hireDate', 'contractEndDate', 'pmtCourseDate', 'foodHandlingCourseDate', 'onacCertificateDate', 'sstCourseDate', 'periodicExamDueDate'].includes(key)) {
            firestoreData[key] = value ? Timestamp.fromDate(new Date(value as string | Date)) : null;
        } else {
            firestoreData[key] = value;
        }
    }
    await updateDoc(employeeRef, firestoreData);
}


// --- Generic Helper to convert Firestore Timestamps to JS Dates ---
const convertDocDates = <T extends { id: string }>(doc: any): T => {
    const data = doc.data();
    if (!data) return { id: doc.id } as T;

    const convertedData: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
        if (value instanceof Timestamp) {
            convertedData[key] = value.toDate();
        } else if (Array.isArray(value)) {
            // Recursively check for Timestamps in arrays of objects
            convertedData[key] = value.map(item => {
                if (item instanceof Timestamp) {
                    return item.toDate();
                }
                if (typeof item === 'object' && item !== null) {
                    const nestedConverted: { [key: string]: any } = {};
                    for (const [nestedKey, nestedValue] of Object.entries(item)) {
                        if (nestedValue instanceof Timestamp) {
                            nestedConverted[nestedKey] = nestedValue.toDate();
                        } else {
                            nestedConverted[nestedKey] = nestedValue;
                        }
                    }
                    return nestedConverted;
                }
                return item;
            });
        }
        else if (value !== undefined) {
            convertedData[key] = value;
        }
    }
    return { id: doc.id, ...convertedData } as T;
};

// Generic data fetching function
const getCollectionData = async <T extends { id: string }>(collectionName: string, tenantId?: string): Promise<T[]> => {
    if (!db) return [];
    const q = tenantId
        ? query(collection(db, collectionName), where("tenantId", "==", tenantId))
        : collection(db, collectionName);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertDocDates<T>(doc));
};

export async function getEmployees(tenantId?: string): Promise<Employee[]> {
  return getCollectionData<Employee>('employees', tenantId);
}

export async function getAbsences(tenantId?: string): Promise<Absence[]> {
    return getCollectionData<Absence>('absences', tenantId);
}

export async function addAbsence(absence: Omit<Absence, 'id'>, tenantId: string): Promise<{docId: string, notificationSent: boolean, notificationError?: string}> {
    if (!db) throw new Error("Firebase is not initialized.");
    
    const dataToSave = {
        ...absence,
        tenantId,
        fechaInicio: absence.fechaInicio ? Timestamp.fromDate(absence.fechaInicio) : null,
        fechaFinal: absence.fechaFinal ? Timestamp.fromDate(absence.fechaFinal) : null,
        fechaNacimiento: absence.fechaNacimiento ? Timestamp.fromDate(absence.fechaNacimiento) : null,
    };

    const docRef = await addDoc(collection(db, 'absences'), dataToSave);
    
    try {
        const to = "checcolombia3@gmail.com";
        const subject = `Nuevo Registro de Ausentismo: ${absence.nombreCompleto}`;
        const html = `
            <h1>Nuevo Registro de Ausentismo</h1>
            <p>Se ha creado un nuevo registro de ausencia para el empleado <strong>${absence.nombreCompleto}</strong>.</p>
            <ul>
                <li><strong>Tipo de Ausencia:</strong> ${absence.tipoAusencia}</li>
                <li><strong>Motivo:</strong> ${absence.motivoAusencia}</li>
                <li><strong>Fecha de Inicio:</strong> ${absence.fechaInicio?.toLocaleDateString('es-CO')}</li>
                <li><strong>Fecha Final:</strong> ${absence.fechaFinal?.toLocaleDateString('es-CO')}</li>
                <li><strong>Días:</strong> ${absence.dias}</li>
            </ul>
            <p>Puedes ver los detalles en la plataforma de CONTROL CHEC.</p>
        `;
        await sendNotificationEmail(to, subject, html);
        return { docId: docRef.id, notificationSent: true };
    } catch (error) {
        console.error("Failed to send notification email, but absence was saved:", error);
        return { 
            docId: docRef.id, 
            notificationSent: false, 
            notificationError: error instanceof Error ? error.message : "An unknown error occurred while sending the email."
        };
    }
}


export async function updateAbsence(id: string, absence: Partial<Omit<Absence, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const absenceRef = doc(db, 'absences', id);

    const firestoreData: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(absence)) {
        if (['fechaInicio', 'fechaFinal', 'fechaNacimiento'].includes(key)) {
            firestoreData[key] = value ? Timestamp.fromDate(new Date(value as string | Date)) : null;
        } else {
            firestoreData[key] = value;
        }
    }
    await updateDoc(absenceRef, { ...firestoreData, tenantId });
}


export type MedicalFollowUp = {
  id: string;
  tenantId: string; // Multi-tenant support
  employeeId: string;
  dateTime: Date;
  doctor: string;
  notes: string;
  status: 'Scheduled' | 'Completed' | 'Canceled';
};

export async function getMedicalFollowUps(tenantId?: string): Promise<MedicalFollowUp[]> {
     return getCollectionData<MedicalFollowUp>('medicalFollowUps', tenantId);
}

export async function getUsers(): Promise<User[]> {
    if (!db) return [];
    const user = auth.currentUser;
    if (!user) return [];
    const userProfile = await getUserById(user.uid);
    // SuperAdmins should see all users, others only see users from their own tenant.
    const q = userProfile?.role === 'SuperAdmin' 
        ? collection(db, 'users')
        : query(collection(db, 'users'), where("tenantId", "==", userProfile?.tenantId));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getUserById(uid: string): Promise<User | null> {
    if (!db) return null;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
}


export async function getEmos(tenantId?: string): Promise<Emo[]> {
    return getCollectionData<Emo>('emos', tenantId);
}

const emoDateFields = [
    'fechaIngresoBase', 'fechaExamen', 'fechaNacimiento', 'fechaIngreso',
    'alturas', 'confinados', 'manejoDefensivo', 'certificadoOnac',
    'cursoSst', 'manejoAlimentos', 'manejoTrafico'
];


// Function to add a new EMO record
export async function addEmo(emo: Omit<Emo, 'id' | 'edad'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    
    const emoDataForFirestore: { [key: string]: any } = { tenantId }; // Ensure tenantId is always included
    for (const [key, value] of Object.entries(emo)) {
        if (emoDateFields.includes(key) && value) {
            emoDataForFirestore[key] = Timestamp.fromDate(new Date(value as string | Date));
        } else if (key === 'employeeId' && !value) {
            // Specifically skip adding employeeId if it's an empty string
        } else {
            emoDataForFirestore[key] = value;
        }
    }

    const docRef = await addDoc(collection(db, 'emos'), emoDataForFirestore);
    return docRef.id;
}



// Function to update an EMO record
export async function updateEmo(id: string, emo: Partial<Omit<Emo, 'id' | 'edad'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const emoRef = doc(db, 'emos', id);

    const firestoreData: { [key: string]: any } = { tenantId }; // Ensure tenantId is always included
    for (const [key, value] of Object.entries(emo)) {
       if (emoDateFields.includes(key) && value) {
            firestoreData[key] = Timestamp.fromDate(new Date(value as string | Date));
        } else if (key === 'employeeId' && !value) {
            // Do not add empty employeeId to the document
        } else {
            firestoreData[key] = value;
        }
    }

    await updateDoc(emoRef, firestoreData);
}

// Function to update PVE-specific data on an EMO record
export async function updatePveData(emoId: string, pveData: Partial<PveData>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const pveRef = doc(db, 'emos', emoId);
    await updateDoc(pveRef, { ...pveData, tenantId });
}

const dateFieldsToTimestamp = (data: Record<string, any>, fields: string[]) => {
    const firestoreData: Record<string, any> = { ...data };
    for (const field of fields) {
        if (firestoreData[field] && (typeof firestoreData[field] === 'string' || firestoreData[field] instanceof Date)) {
            const date = new Date(firestoreData[field]);
            if (!isNaN(date.getTime())) {
                firestoreData[field] = Timestamp.fromDate(date);
            } else {
                firestoreData[field] = null; // Set to null if date is invalid
            }
        } else if (firestoreData[field] === undefined) {
             firestoreData[field] = null;
        }
    }
    return firestoreData;
};

export const atTrackingDateFields = [
    'fechaRegistro', 'fechaNacimiento', 'fechaSiniestro', 'fechaInicialRecomendaciones', 
    'fechaFinalRecomendaciones', 'fechaInicioIncapacidad', 'fechaFinIncapacidad', 
    'fechaReintegro', 'fechaCierre'
];

export async function getATTrackings(tenantId?: string): Promise<ATTracking[]> {
    return getCollectionData<ATTracking>('at-trackings', tenantId);
}

export async function addATTracking(tracking: Omit<ATTracking, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...tracking, tenantId }, atTrackingDateFields);
    const docRef = await addDoc(collection(db, 'at-trackings'), dataToSave);
    return docRef.id;
}

export async function updateATTracking(id: string, tracking: Partial<Omit<ATTracking, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const trackingRef = doc(db, 'at-trackings', id);
    const dataToSave = dateFieldsToTimestamp(tracking, atTrackingDateFields);
    await updateDoc(trackingRef, { ...dataToSave, tenantId });
}

// Medical Recommendation Functions
export const medicalRecommendationDateFields = [
    'fechaIngresoPrograma', 'fechaReubicacion', 'fechaRecomendacion',
    'fechaInicioRecomendaciones', 'fechaFinRecomendaciones',
    'fechaReintegro', 'fechaCierre'
];

export async function getMedicalRecommendations(tenantId?: string): Promise<MedicalRecommendation[]> {
    return getCollectionData<MedicalRecommendation>('medical-recommendations', tenantId);
}

export async function addMedicalRecommendation(recommendation: Omit<MedicalRecommendation, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({...recommendation, tenantId}, medicalRecommendationDateFields);
    const docRef = await addDoc(collection(db, 'medical-recommendations'), dataToSave);
    return docRef.id;
}

export async function updateMedicalRecommendation(id: string, recommendation: Partial<Omit<MedicalRecommendation, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const recRef = doc(db, 'medical-recommendations', id);
    const dataToSave = dateFieldsToTimestamp(recommendation, medicalRecommendationDateFields);
    await updateDoc(recRef, { ...dataToSave, tenantId });
}

// Activity Schedule Functions
export const activityScheduleDateFields = ['fecha', 'fechaReprogramacion', 'reprogramacion'];

export async function getActivitySchedules(tenantId?: string): Promise<ActivitySchedule[]> {
    return getCollectionData<ActivitySchedule>('activity-schedules', tenantId);
}

export async function addActivitySchedule(activity: Omit<ActivitySchedule, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({...activity, tenantId}, activityScheduleDateFields);
    const docRef = await addDoc(collection(db, 'activity-schedules'), dataToSave);
    return docRef.id;
}

export async function updateActivitySchedule(id: string, activity: Partial<Omit<ActivitySchedule, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const activityRef = doc(db, 'activity-schedules', id);
    const dataToSave = dateFieldsToTimestamp(activity, activityScheduleDateFields);
    await updateDoc(activityRef, { ...dataToSave, tenantId });
}

// Vital Event Functions
export const vitalEventDateFields = ['fechaEvento'];

export async function getVitalEvents(tenantId?: string): Promise<VitalEvent[]> {
    return getCollectionData<VitalEvent>('vital-events', tenantId);
}

export async function addVitalEvent(event: Omit<VitalEvent, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...event, tenantId }, vitalEventDateFields);
    const docRef = await addDoc(collection(db, 'vital-events'), dataToSave);
    return docRef.id;
}

export async function updateVitalEvent(id: string, event: Partial<Omit<VitalEvent, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const eventRef = doc(db, 'vital-events', id);
    const dataToSave = dateFieldsToTimestamp(event, vitalEventDateFields);
    await updateDoc(eventRef, { ...dataToSave, tenantId });
}

// Gerencia Report Functions
export const gerenciaReportDateFields = ['fecha', 'fechaAccidente'];

export async function getGerenciaReports(tenantId?: string): Promise<GerenciaReport[]> {
    return getCollectionData<GerenciaReport>('gerencia-reports', tenantId);
}

export async function addGerenciaReport(report: Omit<GerenciaReport, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...report, tenantId }, gerenciaReportDateFields);
    const docRef = await addDoc(collection(db, 'gerencia-reports'), dataToSave);
    return docRef.id;
}

export async function updateGerenciaReport(id: string, report: Partial<Omit<GerenciaReport, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const reportRef = doc(db, 'gerencia-reports', id);
    const dataToSave = dateFieldsToTimestamp(report, gerenciaReportDateFields);
    await updateDoc(reportRef, { ...dataToSave, tenantId });
}

// SST Report Functions
export const sstReportDateFields = ['fecha', 'fechaInicioReal', 'fechaFinReal'];

export async function getSstReports(tenantId?: string): Promise<SstReport[]> {
    return getCollectionData<SstReport>('sst-reports', tenantId);
}

export async function addSstReport(report: Omit<SstReport, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...report, tenantId }, sstReportDateFields);
    const docRef = await addDoc(collection(db, 'sst-reports'), dataToSave);
    return docRef.id;
}

export async function updateSstReport(id: string, report: Partial<Omit<SstReport, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const reportRef = doc(db, 'sst-reports', id);
    const dataToSave = dateFieldsToTimestamp(report, sstReportDateFields);
    await updateDoc(reportRef, { ...dataToSave, tenantId });
}

// RH Report Functions
export const rhReportDateFields = ['fecha'];

export async function getRhReports(tenantId?: string): Promise<RhReport[]> {
    return getCollectionData<RhReport>('rh-reports', tenantId);
}

export async function addRhReport(report: Omit<RhReport, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...report, tenantId }, rhReportDateFields);
    const docRef = await addDoc(collection(db, 'rh-reports'), dataToSave);
    return docRef.id;
}

export async function updateRhReport(id: string, report: Partial<Omit<RhReport, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const reportRef = doc(db, 'rh-reports', id);
    const dataToSave = dateFieldsToTimestamp(report, rhReportDateFields);
    await updateDoc(reportRef, { ...dataToSave, tenantId });
}

// CCL Report Functions
export const cclReportDateFields = ['fecha', 'fechaReporte'];

export async function getCclReports(tenantId?: string): Promise<CclReport[]> {
    return getCollectionData<CclReport>('ccl-reports', tenantId);
}

export async function addCclReport(report: Omit<CclReport, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...report, tenantId }, cclReportDateFields);
    const docRef = await addDoc(collection(db, 'ccl-reports'), dataToSave);
    return docRef.id;
}

export async function updateCclReport(id: string, report: Partial<Omit<CclReport, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const reportRef = doc(db, 'ccl-reports', id);
    const dataToSave = dateFieldsToTimestamp(report, cclReportDateFields);
    await updateDoc(reportRef, { ...dataToSave, tenantId });
}

// AtCaracterizacion Functions
export const atCaracterizacionDateFields = [
    'fechaRegistro', 'fechaNacimiento', 'fechaIngreso', 'fechaEvento', 'fechaAtencionInicial',
    'fechaRadicacionFurat', 'fechaReporteEps', 'fechaReporteMinTrabajo', 'fechaInicioIncapacidad',
    'fechaFinIncapacidad', 'fechaCalificacionOrigen', 'fechasCompromiso', 'fechaVerificacionCierre'
];

export async function getAtCaracterizaciones(tenantId?: string): Promise<AtCaracterizacion[]> {
    return getCollectionData<AtCaracterizacion>('at-caracterizacion', tenantId);
}

export async function addAtCaracterizacion(caracterizacion: Omit<AtCaracterizacion, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const dataToSave = dateFieldsToTimestamp({ ...caracterizacion, tenantId }, atCaracterizacionDateFields);
    const docRef = await addDoc(collection(db, 'at-caracterizacion'), dataToSave);
    return docRef.id;
}

export async function updateAtCaracterizacion(id: string, caracterizacion: Partial<Omit<AtCaracterizacion, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const caracterizacionRef = doc(db, 'at-caracterizacion', id);
    const dataToSave = dateFieldsToTimestamp(caracterizacion, atCaracterizacionDateFields);
    await updateDoc(caracterizacionRef, { ...dataToSave, tenantId });
}


// Tenant Management Functions (SuperAdmin only)
export async function getTenants(): Promise<Tenant[]> {
    if (!db) return [];
    const querySnapshot = await getDocs(collection(db, 'tenants'));
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            status: data.status,
            createdAt: data.createdAt.toDate(),
            accessibleModules: data.accessibleModules || [],
            logoURL: data.logoURL || null,
            nit: data.nit || null,
        } as Tenant;
    });
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
    if (!db) return null;
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantDocRef);
    if (tenantDoc.exists()) {
        const data = tenantDoc.data();
        return {
            id: tenantDoc.id,
            name: data.name,
            status: data.status,
            createdAt: data.createdAt.toDate(),
            accessibleModules: data.accessibleModules || [],
            logoURL: data.logoURL || null,
            nit: data.nit || null,
        } as Tenant;
    }
    return null;
}


export async function addTenant(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const docRef = await addDoc(collection(db, 'tenants'), {
        ...tenant,
        logoURL: tenant.logoURL || null,
        nit: tenant.nit || null,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function updateTenant(id: string, tenantData: Partial<Omit<Tenant, 'id'>>): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const tenantRef = doc(db, 'tenants', id);
    await updateDoc(tenantRef, tenantData);
}

// Cost Center Functions
export async function getCostCenters(tenantId?: string): Promise<CostCenter[]> {
    return getCollectionData<CostCenter>('costCenters', tenantId);
}

export async function addCostCenter(costCenter: Omit<CostCenter, 'id'>, tenantId: string): Promise<string> {
    if (!db) throw new Error("Firebase is not initialized.");
    const docRef = await addDoc(collection(db, 'costCenters'), { ...costCenter, tenantId });
    return docRef.id;
}

export async function updateCostCenter(id: string, costCenter: Partial<Omit<CostCenter, 'id'>>, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const costCenterRef = doc(db, 'costCenters', id);
    await updateDoc(costCenterRef, { ...costCenter, tenantId });
}

export async function deleteCostCenter(id: string, tenantId: string): Promise<void> {
    if (!db) throw new Error("Firebase is not initialized.");
    const costCenterRef = doc(db, 'costCenters', id);
    // You might add a check here to ensure the doc belongs to the tenantId before deleting
    await deleteDoc(costCenterRef);
}


// Ticket System Functions
export async function getTickets(tenantId?: string): Promise<Ticket[]> {
    const tenants = await getTenants();
    const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

    const tickets = await getCollectionData<Ticket>('tickets', tenantId);
    
    // Manually convert comment dates
    return tickets.map(ticket => ({
        ...ticket,
        tenantName: tenantMap.get(ticket.tenantId) || 'N/A',
        comments: ticket.comments ? ticket.comments.map(comment => {
            const newComment = { ...comment };
            if (newComment.createdAt && newComment.createdAt instanceof Timestamp) {
                newComment.createdAt = newComment.createdAt.toDate();
            }
            return newComment;
        }) : []
    }));
}


export async function addTicket(ticketData: Omit<Ticket, 'id'>): Promise<string> {
    const dataToSave = {
        ...ticketData,
        createdAt: Timestamp.now(),
    };

    const ticketsCollection = collection(db, 'tickets');
    
    return addDoc(ticketsCollection, dataToSave)
        .then(docRef => docRef.id)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: ticketsCollection.path,
                operation: 'create',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw serverError; // Re-throw original error after emitting
        });
}

export async function updateTicket(id: string, ticketData: Partial<Omit<Ticket, 'id'>>): Promise<void> {
    const ticketRef = doc(db, 'tickets', id);

    updateDoc(ticketRef, ticketData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: ticketRef.path,
                operation: 'update',
                requestResourceData: ticketData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw serverError;
        });
}

export async function addTicketComment(ticketId: string, commentData: Omit<TicketComment, 'commentId'>): Promise<void> {
    const ticketRef = doc(db, 'tickets', ticketId);
    const commentWithId = {
        ...commentData,
        commentId: uuidv4(),
        createdAt: Timestamp.now(),
    };

    updateDoc(ticketRef, { comments: arrayUnion(commentWithId) })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: ticketRef.path,
                operation: 'update',
                requestResourceData: { comments: '...' }, // Can't send the full array, just indicate intent
            });
            errorEmitter.emit('permission-error', permissionError);
            throw serverError;
        });
}


export const absenceHistoryForChart = [
    { date: 'Jan', total: Math.floor(Math.random() * 20) + 10 },
    { date: 'Feb', total: Math.floor(Math.random() * 20) + 10 },
    { date: 'Mar', total: Math.floor(Math.random() * 20) + 10 },
    { date: 'Apr', total: Math.floor(Math.random() * 20) + 10 },
    { date: 'May', total: Math.floor(Math.random() * 20) + 10 },
    { date: 'Jun', total: Math.floor(Math.random() * 20) + 20 },
    { date: 'Jul', total: Math.floor(Math.random() * 20) + 15 },
]

export const absenceDataByCategory = [
  { name: 'Sick Leave', value: 45, fill: 'var(--color-chart-1)' },
  { name: 'Vacation', value: 30, fill: 'var(--color-chart-2)' },
  { name: 'Personal', value: 15, fill: 'var(--color-chart-3)' },
  { name: 'Other', value: 10, fill: 'var(--color-chart-4)' },
]

export const historicalAbsenceDataCSV = `date,absences
2024-01-01,5
2024-01-02,3
2024-01-03,4
2024-01-04,6
2024-01-05,2
2024-01-06,1
2024-01-07,3
2024-01-08,5
2024-01-09,7
2024-01-10,8
2024-01-11,4
2024-01-12,3
2024-01-13,2
2024-01-14,4
2024-01-15,6
2024-01-16,5
2024-01-17,7
2024-01-18,9
2024-01-19,5
2024-01-20,4
2024-01-21,3
2024-01-22,6
2024-01-23,8
2024-01-24,7
2024-01-25,5
2024-01-26,4
2024-01-27,3
2024-01-28,5
2024-01-29,7
2024-01-30,6
2024-01-31,8
`;
