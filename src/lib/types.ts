
export type Emo = {
  id: string;
  tenantId: string; // Multi-tenant support
  // Employee linking
  employeeId: string; // Foreign key to Employee

  // Basic exam info
  fechaIngresoBase: Date | null;
  fechaExamen: Date | null;
  ipsRemision: string;
  tipoExamen: string;
  concepto: string;
  anotacionesPuntuales: string;
  
  // Auto-filled from Employee
  nombreCompleto: string;
  tipoDocumento: string;
  cedula: string;
  edad: number | null;
  fechaNacimiento: Date | null;
  sexo: string;
  telefono: string;
  estadoCivil: string; 
  fechaIngreso: Date | null;
  sede: string; 
  cargo: string;
  estado: string; 

  // Risk exposure
  exposicionTar: string;
  ryrTar: string;

  // Specific tests (boolean or string result)
  examenMedicoGeneral: string;
  audiometria: string;
  osteomuscular: string;
  cuadroHematico: string;
  funcionRenal: string;
  funcionHepatica: string;
  perfilLipidico: string;
  glicemia: string;
  espirometria: string;
  psicosensometrico: string;
  electrocardiograma: string;
  optometria: string;
  coprologico: string;
  kohUnas: string;
  frotisGarganta: string;
  testAlturas: string;
  testDrogas: string;
  otro: string;

  // Recommendations
  recomendacionesEmpleador: string;
  recomendacionesColaborador: string;
  
  // PVE
  auditivo: string;
  osteomuscularRecomendacion: string;
  cardiovascular: string;
  psicosocial: string;
  respiratorio: string;
  visual: string;

  // Expiration and alerts - Course/Cert Dates
  alturas: Date | null;
  confinados: Date | null;
  manejoDefensivo: Date | null;
  
  optometriaRecomendacion: string;
  tipoVencimientoOptometria: string;
  
  audiometriaRecomendacion: string;

  espirometriaRecomendacion: string;
  tipoVencimientoEspirometria: string;
  
  certificadoOnac: Date | null;
  cursoSst: Date | null;
  manejoAlimentos: Date | null;
  manejoTrafico: Date | null;

  // Attachments
  soportes: string[];
};

// Type for PVE specific data
export type PveData = {
    id: string; // This will likely be the EMO id
    tenantId: string;
    tipoCaso: string;
    tipoPatologia: string;
    nivelRiesgo: string;
    recomendacionesColaborador: string;
    seguimientoRecomendaciones: string;
    periodicidad: string;
    observaciones: string;
    soportes: string[]; 
};

// Combined type for a PVE record
export type PveRecord = Emo & Partial<PveData>;


export type Absence = {
    id: string;
    tenantId: string; // Multi-tenant support
    employeeId: string;
    
    // Auto-filled from Employee
    nombreCompleto: string;
    identificacion: string;
    edad: number | null;
    fechaNacimiento: Date | null;
    genero: string;
    telefono: string;
    cargo: string;
    centroDeCosto: string; // Sede/PayrollDescription

    // Core absence data
    fechaInicio: Date | null;
    fechaFinal: Date | null;
    dias: number;
    horas: number;
    costoAusentismo: number;
    tipoAusencia: string;
    motivoAusencia: string;
    codigoCie10: string;
    diagnostico: string;
    sistemaAlterado: string;
    
    // Follow-up
    seguimiento: string;
    actividadesRealizar: string;
    soportes: string[]; // Array of attachment URLs
    status: 'Approved' | 'Pending' | 'Rejected'; // Assuming we still need this
};

export type ATTracking = {
  id: string;
  tenantId: string; // Multi-tenant support
  fechaRegistro: Date | null;
  // Employee data
  employeeId: string;
  tipoDocumento: string;
  nDocumento: string;
  nombreTrabajador: string;
  fechaNacimiento: Date | null;
  cargo: string;
  centroDeCostos: string;
  telefono: string;
  // Event data
  fechaSiniestro: Date | null;
  tipoEvento: string;
  clasificacionEvento: string;
  parteCuerpoAfectada: string; // New field
  tipoLesion: string; // New field
  codigoCie10: string;
  diagnostico: string;
  descripcionEvento: string;
  // Recommendations
  recomendaciones: string;
  tipoRecomendaciones: string;
  fechaInicialRecomendaciones: Date | null;
  fechaFinalRecomendaciones: Date | null;
  descripcionRecomendaciones: string;
  // Incapacity
  incapacidad: boolean;
  fechaInicioIncapacidad: Date | null;
  fechaFinIncapacidad: Date | null;
  diasIncapacidad: number;
  // Follow-up
  fechaReintegro: Date | null;
  calificacionOrigen: string;
  instanciaCalificadora: string;
  pcl: number;
  reubicacion: boolean;
  cargoAsignado: string;
  estadoCaso: string;
  fechaCierre: Date | null;
  seguimientosEnfermera: string;
  seguimientosMesaLaboral: string;
  observaciones: string;
  // Attachments
  soportesRecomendaciones: string[];
  soporteEntregaRecomendaciones: string[];
  soporteReinduccion: string[];
  soporteLeccionesAprendidas: string[];
};

export type MedicalRecommendation = {
  id: string;
  tenantId: string; // Multi-tenant support
  employeeId: string;
  tipoDocumento: string;
  identificacion: string;
  nombreCompleto: string;
  cargoContratacion: string;
  centroDeTrabajo: string;
  fechaIngresoPrograma: Date | null;
  telefono: string;
  estadoEmpresa: 'Activo' | 'Retirado' | 'Cerrado';
  fechaReubicacion: Date | null;
  cargoReubicacion: string;
  funcionesCargoReubicacion: string;
  tipoEvento: 'AT' | 'EG';
  lesionYParteCuerpo: string;
  estadoCaso: 'Abierto' | 'Cerrado' | 'En seguimiento';
  fechaRecomendacion: Date | null;
  tipoRecomendacion: 'Temporal' | 'Permanente';
  vigenciaRecomendaciones: string;
  diasAcumulados: number;
  fechaInicioRecomendaciones: Date | null;
  fechaFinRecomendaciones: Date | null;
  fechaReintegro: Date | null;
  cartaReintegro: 'Si' | 'No' | '';
  capacitacion: 'Capacitación' | 'Inducción' | 'Reinducción' | '';
  socializacionRecomendaciones: 'Si' | 'No' | '';
  aptIpt: 'APT' | 'IPT' | '';
  pcl: string;
  fechaCierre: Date | null;
  recomendaciones: string;
  observaciones: string;
  observacionesMesaTrabajo: string;
  soportes: string[];
};


export type ActivitySchedule = {
  id: string;
  tenantId: string; // Multi-tenant support
  fecha: Date | null;
  pve: string;
  nombreActividad: string;
  mes: string;
  cantidadProgramada: number;
  coberturaProgramada: number;
  codigoSeguridad: string;
  // Fields below are enabled by security code
  estado: string;
  observaciones: string;
  fechaReprogramacion: Date | null;
  cantidadEjecutada: number;
  coberturaEjecutada: number;
  reprogramacion: Date | null;
  cumplimientoCronograma: string;
  cobertura: string;
  evidenciaCapacitacion: string[];
  listadoAsistencia: string[];
};

export type User = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  password?: string;
  photoURL?: string | null;
  role: 'SuperAdmin' | 'Admin' | 'HR' | 'Medical' | 'Management';
  status: 'Active' | 'Inactive';
  accessibleModules: string[];
  costCenters: string[];
};


export type Tenant = {
  id: string;
  name: string;
  createdAt: Date;
  status: 'Active' | 'Inactive';
  accessibleModules: string[];
};


export type VitalEvent = {
  id: string;
  tenantId: string;
  employeeId: string;
  nombreCompleto: string;
  identificacion: string;
  fechaEvento: Date | null;
  tipoEvento: string;
  descripcion: string;
  seguimiento: string;
  estado: 'Abierto' | 'Cerrado' | 'En Seguimiento';
  soportes: string[];
};

export type SstReport = {
    id: string;
    tenantId: string;
    fecha: Date | null;
    mes: string;
    identificacion: string;
    origen: string;
    dias: number;
    fechaInicioReal: Date | null;
    fechaFinReal: Date | null;
    codigoCie10: string;
};

export type RhReport = {
    id: string;
    tenantId: string;
    fecha: Date | null;
    mes: string;
    identificacion: string;
    motivoRetiro: string;
};

export type GerenciaReport = {
    id: string;
    tenantId: string;
    fecha: Date | null;
    mes: string;
    identificacion: string;
    fechaAccidente: Date | null;
    totalDiasIncapacidad: number;
    horasHombreTrabajado: number;
    indiceSeveridad: number;
    codigoCie10: string;
    descripcionAl: string;
    riesgoGenerador: string;
    parteCuerpoAfectada: string;
    tipoLesion: string;
    sitio: string;
    condicionInsegura: string;
    actoInseguro: string;
    factoresBasicosLaborales: string;
    factoresBasicosPersonales: string;
};

export type CclReport = {
    id: string;
    tenantId: string;
    fecha: Date | null;
    fechaReporte: Date | null;
    identificacion: string;
    nModalidades: number;
    nombreModalidades: string;
    estadoProceso: string;
    diagnosticoEnfermedad: string;
    entidadEmiteDiagnostico: string;
    recomendacionesPve: string;
};

export type AtCaracterizacion = {
    id: string;
    tenantId: string;
    // Metadatos
    idInterno: string;
    estadoCaso: string;
    fechaRegistro: Date | null;
    areaResponsable: string;
    linkEvidencias: string;
    // Empleador
    razonSocial: string;
    nit: string;
    arl: string;
    centroTrabajo: string;
    ciudad: string;
    departamento: string;
    // Trabajador
    tipoDocumento: string;
    numeroDocumento: string;
    nombres: string;
    apellidos: string;
    sexo: string;
    fechaNacimiento: Date | null;
    cargo: string;
    procesoDivision: string;
    tipoVinculacion: string;
    fechaIngreso: Date | null;
    antiguedad: number;
    jornadaHabitual: string;
    salarioBase: number;
    // Evento
    clasificacionEvento: string;
    gravedad: string;
    fechaEvento: Date | null;
    horaEvento: string;
    municipioEvento: string;
    lugarEspecifico: string;
    frenteProyecto: string;
    enMision: boolean;
    inItinere: boolean;
    descripcionTarea: string;
    descripcionEvento: string;
    testigos: string;
    reportadoSupervisor: string;
    // Atención en Salud
    recibioPrimerosAuxilios: boolean;
    ipsAtencionInicial: string;
    fechaAtencionInicial: Date | null;
    diagnosticoCie10Codigo: string;
    diagnosticoCie10Descripcion: string;
    // Investigación
    equipoInvestigador: string;
    metodologia: string;
    causasInmediatasActos: string;
    causasInmediatasCondiciones: string;
    causasBasicasFactoresPersonales: string;
    causasBasicasFactoresTrabajo: string;
    agenteMaterial: string;
    mecanismo: string;
    parteCuerpoAfectada: string;
    naturalezaLesion: string;
    // Reportes Legales
    numeroFurat: string;
    fechaRadicacionFurat: Date | null;
    fechaReporteEps: Date | null;
    numeroRadicacionEps: string;
    reporteMinTrabajo: boolean;
    fechaReporteMinTrabajo: Date | null;
    radicadoSoporteMinTrabajo: string;
    // Incapacidad y Consecuencias
    fechaInicioIncapacidad: Date | null;
    fechaFinIncapacidad: Date | null;
    diasIncapacidadInicial: number;
    diasProrrogas: number;
    diasTotalesIncapacidad: number;
    secuelas: boolean;
    pcl: number;
    fechaCalificacionOrigen: Date | null;
    // Acciones y Seguimiento
    accionesCorrectivas: string;
    accionesPreventivas: string;
    responsablesAcciones: string;
    fechasCompromiso: Date | null;
    estadoAcciones: string;
    fechaVerificacionCierre: Date | null;
    eficaciaAcciones: string;
    reincidente: boolean;
    observacionesSeguimiento: string;
    // Indicadores y Costos
    diasPerdidos: number;
    horasPerdidas: number;
    costoDirectoEstimado: number;
    costoIndirectoEstimado: number;
    // Soportes
    soportes: string[];
};

export type CostCenter = {
  id: string;
  tenantId: string;
  name: string;
};

export type TicketComment = {
  commentId: string;
  userId: string;
  userName: string;
  createdAt: Date;
  text: string;
};

export type Ticket = {
  id: string;
  tenantId: string;
  tenantName?: string; // Optional, denormalized for easy display
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: Date;
  title: string;
  description: string;
  category: 'Fallo' | 'Ajuste' | 'Modificación' | 'Otro';
  priority: 'Baja' | 'Media' | 'Alta';
  status: 'Abierto' | 'En Progreso' | 'Resuelto' | 'Cerrado';
  attachments: string[];
  comments: TicketComment[];
};
