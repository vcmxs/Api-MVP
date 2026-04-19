import type { TranslationKeys } from "./en"

const es: TranslationKeys = {
  // ── Sidebar nav ────────────────────────────────────────────────────────────
  nav: {
    overview: "Inicio",
    trainees: "Alumnos",
    workouts: "Mis Rutinas",
    programs: "Programas",
    messages: "Mensajes",
    insights: "Estadísticas",
    nutrition: "Nutrición",
    progression: "Progresión",
    revenue: "Ingresos",
    winwin: "Win-Win",
    notifications: "Notificaciones",
    settings: "Configuración",
    logout: "Cerrar sesión",
  },

  // ── Page header subtitles ──────────────────────────────────────────────────
  header: {
    overview:      { title: "Inicio",             subtitle: "Esto es lo que está pasando con tus alumnos." },
    trainees:      { title: "Alumnos",             subtitle: "Gestiona tus alumnos y su progreso." },
    workouts:      { title: "Mis Rutinas",         subtitle: "Crea y administra plantillas de entrenamiento." },
    programs:      { title: "Programas",           subtitle: "Crea programas de entrenamiento para tus alumnos." },
    messages:      { title: "Mensajes",            subtitle: "Comunícate con tus alumnos." },
    insights:      { title: "Estadísticas",        subtitle: "Analiza el rendimiento y las métricas." },
    nutrition:     { title: "Nutrición",           subtitle: "Registra tus calorías y macros del día." },
    progression:   { title: "Progresión",          subtitle: "Rastrea tu fuerza y peso corporal a lo largo del tiempo." },
    revenue:       { title: "Ingresos",            subtitle: "Monitorea pagos y ganancias de tus alumnos." },
    winwin:        { title: "Programa Win-Win",    subtitle: "Refiere entrenadores y gana recompensas." },
    notifications: { title: "Notificaciones",      subtitle: "Mantente al día con la actividad reciente." },
    settings:      { title: "Configuración",       subtitle: "Gestiona tu cuenta y preferencias." },
    traineeProfile:{ title: "Perfil del Alumno",   subtitle: "Ver y gestionar los detalles del alumno." },
  },

  // ── Common ─────────────────────────────────────────────────────────────────
  common: {
    save: "Guardar cambios",
    saving: "Guardando…",
    saved: "¡Guardado!",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Eliminar",
    add: "Agregar",
    edit: "Editar",
    close: "Cerrar",
    loading: "Cargando…",
    retry: "Reintentar",
    viewAll: "Ver todo",
    refresh: "Actualizar",
    search: "Buscar",
    noData: "Sin datos",
    error: "Ocurrió un error",
    back: "Volver",
    apply: "Aplicar",
  },

  // ── KPIs ───────────────────────────────────────────────────────────────────
  kpi: {
    activeTrainees: "Alumnos Activos",
    monthlyRevenue: "Ingresos Mensuales",
  },

  // ── Quick Actions ──────────────────────────────────────────────────────────
  quickActions: {
    title: "Acciones Rápidas",
    addTrainee: "Agregar Alumno",
    newWorkout: "Nueva Rutina",
    createProgram: "Crear Programa",
    blastMessage: "Mensaje Masivo",
  },

  // ── Recent Activity ────────────────────────────────────────────────────────
  recentActivity: {
    title: "Actividad Reciente",
    viewAll: "Ver todo",
    noActivity: "Sin actividad reciente",
    justNow: "Ahora mismo",
    ago: "atrás",
  },

  // ── Trainees View ──────────────────────────────────────────────────────────
  trainees: {
    title: "Mis Alumnos",
    searchPlaceholder: "Buscar por nombre o email...",
    addTrainee: "Agregar Alumno",
    noTrainees: "Aún no tienes alumnos",
    noTraineesHint: "Agrega tu primer alumno para comenzar",
    noResults: "No se encontraron alumnos que coincidan con",
    loadingTrainees: "Cargando alumnos...",
    blocked: "Bloqueado",
    active: "Activo",
    addDialog: {
      title: "Agregar Nuevo Alumno",
      emailLabel: "Correo Electrónico",
      emailPlaceholder: "alumno@email.com",
      adding: "Agregando...",
      add: "Agregar Alumno",
    },
  },

  // ── Trainee Detail ────────────────────────────────────────────────────────
  traineeDetail: {
    progression: "Progresión",
    nutrition: "Nutrición",
    message: "Mensaje",
    subscription: "Suscripción",
    assignedWorkouts: "Rutinas Asignadas",
    assignWorkout: "Asignar Rutina",
    noWorkouts: "Sin rutinas asignadas aún",
    exerciseNotes: "Notas de Ejercicios",
    traineeInfo: "Info del Alumno",
    gym: "Gimnasio",
    email: "Email",
    phone: "Teléfono",
    age: "Edad",
    years: "años",
    sex: "Sexo",
    height: "Altura",
    weight: "Peso",
    pathologies: "Patologías / Notas",
    tier: "Nivel",
    status: "Estado",
    expires: "Vence",
    noSets: "Aún no se han registrado series",
    exercises: "Ejercicio",
    exercises_plural: "Ejercicios",
    target: "Objetivo",
    sets: "series",
    reps: "reps",
    done: "listos",
    tomorrow: "Mañana",
    today: "Hoy",
    yesterday: "Ayer",
  },

  // ── Messages ───────────────────────────────────────────────────────────────
  messages: {
    noMessages: "Sin mensajes aún",
    noMessagesHint: "Inicia una conversación desde el perfil de un alumno.",
    searchConversations: "Buscar conversaciones...",
    selectConversation: "Selecciona una conversación",
    selectConversationHint: "Elige una conversación para comenzar a escribir",
    typeMessage: "Escribe un mensaje...",
    noConversationsFound: "No se encontraron conversaciones",
    active: "Activo",
    sayHello: "Aún no hay mensajes. ¡Di hola!",
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications: {
    title: "Notificaciones",
    noNotifications: "Sin notificaciones",
    seeAll: "Ver todas las notificaciones",
    markAllRead: "Marcar todo como leído",
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    personalInfo: "Información Personal",
    fullName: "Nombre Completo",
    fullNamePlaceholder: "Tu nombre completo",
    email: "Correo Electrónico",
    phone: "Teléfono",
    phonePlaceholder: "+1 000 000 0000",
    gym: "Gimnasio",
    gymPlaceholder: "Nombre de tu gimnasio",
    age: "Edad",
    sex: "Sexo",
    sexSelect: "Seleccionar",
    sexMale: "Masculino",
    sexFemale: "Femenino",
    sexOther: "Otro",
    height: "Altura (cm)",
    weight: "Peso (kg)",
    pathologies: "Patologías / Notas",
    pathologiesPlaceholder: "Condiciones médicas, lesiones o notas relevantes...",
    username: "Nombre de usuario",
    usernameHelp: "Usado para agregar amigos y conectar con alumnos.",
    subscription: "Suscripción",
    status: "Estado",
    tier: "Nivel",
    started: "Inicio",
    expires: "Vence",
    expired: "Vencida",
    daysLeft: "d restantes",
    notifications: "Notificaciones",
    pushNotifications: "Notificaciones Push",
    pushNotificationsDesc: "Recibe notificaciones por actividad importante",
    workoutAlerts: "Alertas de Rutinas",
    workoutAlertsDesc: "Recibe notificaciones cuando un alumno completa una rutina",
    language: "Idioma",
    dangerZone: "Zona de Peligro",
    deleteAccount: "Eliminar Mi Cuenta",
    deleteAccountDesc: "Elimina permanentemente todos tus datos. Esto no se puede deshacer.",
    deleteConfirmDesc: "Esto eliminará permanentemente todos tus datos incluyendo rutinas, registros y perfil. Ingresa tu PIN para confirmar.",
    deleteButton: "Eliminar Cuenta",
    confirmDelete: "Confirmar Eliminación",
    pinPlaceholder: "Ingresa el PIN de confirmación",
    failedToSave: "Error al guardar",
  },

  // ── Revenue / Subscription ────────────────────────────────────────────────
  revenue: {
    title: "Ingresos",
    totalEarned: "Total Ganado",
    lastPayment: "Último Pago",
    status: "Estado",
    filter: "Filtrar",
    all: "Todos",
    paid: "Pagado",
    pending: "Pendiente",
    overdue: "Vencido",
    noTrainees: "Sin datos de alumnos",
    manageSubscription: "Gestionar Suscripción",
    duration: "Duración",
    startDate: "Fecha de Inicio",
    amount: "Monto",
    confirmExtension: "Confirmar Extensión",
    cancelSubscription: "Cancelar Suscripción",
    paymentHistory: "Historial de Pagos",
    sendReminder: "Enviar Recordatorio",
    noHistory: "Sin historial de pagos",
    days7: "7 Días",
    days15: "15 Días",
    month1: "1 Mes",
    cancelConfirm: "¿Cancelar la suscripción de este alumno?",
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  nutrition: {
    daily: "Diario",
    goals: "Objetivos",
    stats: "Estadísticas",
    calories: "Calorías",
    protein: "Proteínas",
    carbs: "Carbohidratos",
    fat: "Grasas",
    addFood: "Registrar Comida",
    noMeals: "No hay comidas registradas hoy",
    noMealsHint: "Toca + para registrar tu primera comida",
    breakfast: "Desayuno",
    lunch: "Almuerzo",
    dinner: "Cena",
    snack: "Merienda",
    deleteConfirm: "¿Eliminar este registro de comida?",
    searchFood: "Buscar alimento...",
    quantity: "Cantidad (g)",
    mealType: "Tipo de Comida",
    logFood: "Registrar",
    foodPreview: "Vista previa",
    goalCalories: "Meta de Calorías",
    goalProtein: "Meta de Proteínas (g)",
    goalCarbs: "Meta de Carbohidratos (g)",
    goalFat: "Meta de Grasas (g)",
    saveGoals: "Guardar Objetivos",
    bmrCalculator: "Calculadora TMB",
    activityLevel: "Nivel de Actividad",
    goalType: "Tipo de Objetivo",
    cut: "Definición",
    maintain: "Mantenimiento",
    bulk: "Volumen",
    sedentary: "Sedentario",
    light: "Ligero",
    moderate: "Moderado",
    active: "Activo",
    veryActive: "Muy Activo",
    calculate: "Calcular",
    applyGoals: "Aplicar Objetivos",
    weekRange: "Semana",
    monthRange: "Mes",
    statsCalories: "Calorías",
    statsMacros: "Macros",
    remaining: "Restantes",
    consumed: "Consumidas",
  },

  // ── Progression ───────────────────────────────────────────────────────────
  progression: {
    myProgression: "Mi Progresión",
    selectSubject: "Seleccionar Alumno",
    searchTrainees: "Buscar alumnos...",
    selectExercise: "Seleccionar Ejercicio",
    noData: "No se encontraron datos de progresión",
    weight: "Peso Corporal",
    addWeight: "Agregar Peso",
    exercise: "Ejercicio",
    date: "Fecha",
    volume: "Volumen",
    oneRM: "1RM",
    history: "Historial",
  },

  // ── Workouts ──────────────────────────────────────────────────────────────
  workouts: {
    title: "Mis Rutinas",
    newWorkout: "Nueva Rutina",
    noWorkouts: "Sin rutinas aún",
    noWorkoutsHint: "Crea tu primera plantilla de rutina",
    exercises: "ejercicios",
    exercise: "ejercicio",
    deleteConfirm: "¿Eliminar esta rutina?",
    assignTo: "Asignar a Alumno",
  },

  // ── Programs ──────────────────────────────────────────────────────────────
  programs: {
    title: "Programas",
    newProgram: "Nuevo Programa",
    noPrograms: "Sin programas aún",
    noProgramsHint: "Crea tu primer programa de entrenamiento",
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  login: {
    signIn: "Iniciar sesión para continuar",
    email: "Correo Electrónico",
    password: "Contraseña",
    submit: "Iniciar Sesión",
    loading: "Iniciando sesión...",
    noAccount: "¿No tienes cuenta?",
    register: "Regístrate",
    forgotPassword: "¿Olvidaste tu contraseña?",
    fillFields: "Por favor completa todos los campos.",
    failed: "Error al iniciar sesión",
  },

  // ── Landing Page ──────────────────────────────────────────────────────────
  landing: {
    nav: {
      signIn: "Iniciar Sesión"
    },
    hero: {
      badge: "Creado para entrenadores profesionales",
      title1: "Entrena Mejor.",
      title2: "Gestiona Mejor.",
      subtitle: "La plataforma todo en uno que conecta entrenadores con sus alumnos. Rutinas personalizadas, seguimiento en tiempo real y gestión nutricional — todo en un solo lugar.",
      ctaPrimary: "Empieza Gratis →",
      ctaSecondary: "Iniciar Sesión",
      stat1Value: "500+",
      stat1Label: "Entrenadores activos",
      stat2Value: "2k+",
      stat2Label: "Alumnos",
      stat3Value: "50k+",
      stat3Label: "Rutinas registradas"
    },
    features: {
      label: "Todo lo que necesitas",
      title: "Creado para dar Resultados",
      subtitle: "Todas las herramientas que los entrenadores necesitan para crecer y todas las funciones que los alumnos necesitan para lograr sus metas.",
      items: [
        { title: "Planes Personalizados", desc: "Crea y asigna rutinas con ejercicios, series, reps, peso y objetivos de RPE para cada cliente." },
        { title: "Seguimiento en Vivo", desc: "Los alumnos registran sus series en tiempo real. Cada rep, cada serie, cada sesión — capturada al instante." },
        { title: "Gestión Nutricional", desc: "Registro diario de calorías y macros con buscador de alimentos, metas y reportes semanales." },
        { title: "Gráficas de Progreso", desc: "Gráficas de 1RM e historial de peso corporal para que entrenadores y alumnos vean resultados reales." },
        { title: "Mensajería Directa", desc: "Chat 1:1 en tiempo real entre entrenadores y alumnos. Mantén la comunicación fluida y constante." },
        { title: "Temporizador y Cardio", desc: "Temporizador de descanso con alertas de sonido y contador de cardio con estimación de calorías." }
      ]
    },
    how: {
      label: "Cómo funciona",
      title: "Una Plataforma, Dos Perspectivas",
      subtitle: "Dupla le da a los entrenadores las herramientas para gestionar su negocio y a los alumnos la experiencia para entrenar al máximo.",
      coachLabel: "Para Entrenadores",
      coachTitle: "Haz crecer tu negocio de coaching",
      coachSteps: [
        { title: "Agrega a tus alumnos", desc: "Invita a clientes por email y gestiónalos a todos desde un solo panel de control." },
        { title: "Crea sus programas", desc: "Diseña planes de entrenamiento personalizados con ejercicios adaptados a sus metas." },
        { title: "Rastrea su progreso", desc: "Mira registros en tiempo real, gráficas de progresión y datos nutricionales de cada alumno." },
        { title: "Aumenta tus ingresos", desc: "Lleva el control de pagos por cliente y escala con un plan que se adapte a tu negocio." }
      ],
      traineeLabel: "Para Alumnos",
      traineeTitle: "Entrena con propósito y claridad",
      traineeSteps: [
        { title: "Conecta con tu coach", desc: "Tu entrenador te agrega a la plataforma y te asigna tu programa personalizado." },
        { title: "Sigue tu plan", desc: "Mira tus rutinas programadas, inicia sesiones y registra tus series con temporizador integrado." },
        { title: "Controla tu nutrición", desc: "Registra tus comidas diarias para mantenerte en el objetivo de tus macros." },
        { title: "Mira tu progreso", desc: "Visualiza tu progresión de fuerza (1RM) e historial de peso para mantener la motivación." }
      ]
    },
    pricing: {
      label: "Precios",
      title: "Planes para cada Entrenador",
      subtitle: "Comienza gratis con un alumno. Escala a medida que crezca tu lista de clientes.",
      foreverFree: "Gratis por siempre",
      mostPopular: "MÁS POPULAR",
      perMonth: "/mes",
      tiers: {
        starter: { name: "Starter", sub: "Gratis por siempre", cta: "Empieza gratis", features: ["1 Alumno", "Creador de rutinas", "Seguimiento de sesiones"] },
        bronze:  { name: "Bronze",  sub: "Hasta 4 alumnos",  cta: "Obtener Bronze",    features: ["4 Alumnos", "Todo lo de Starter", "Estadísticas avanzadas", "Control de pagos"] },
        silver:  { name: "Silver",  sub: "Hasta 10 alumnos", cta: "Ir a Silver",       features: ["10 Alumnos", "Soporte prioritario", "Analítica completa", "Reportes semanales"] },
        gold:    { name: "Gold",    sub: "Hasta 25 alumnos", cta: "Obtener Gold",      features: ["25 Alumnos", "Todas las funciones", "Soporte 24/7", "Programa de referidos"] },
        olympian:{ name: "Olympian",sub: "Alumnos ilimitados",cta: "Contactar Ventas", features: ["Alumnos ilimitados", "Acceso VIP", "Herramientas Enterprise", "Soporte dedicado"] }
      }
    },
    modal: {
      title: "Mejorar a",
      subtitle: "Contáctanos para activar tu plan",
      body: "Para procesar tu pago y activar tu suscripción, ponte en contacto con nuestro equipo por WhatsApp o email.",
      whatsapp: "Contactar por WhatsApp",
      emailBtn: "Enviar Email en su lugar"
    },
    referral: {
      label: "Programa de referidos",
      title: "Programa Win-Win",
      subtitle: "Crezcan juntos. Gana para siempre.",
      step1Title: "Invita Entrenadores",
      step1Desc: "Comparte tu código único con otros entrenadores de tu red.",
      step2Title: "Ellos reciben 20% Off",
      step2Desc: "Tus amigos obtienen un 20% de descuento en su primer mes — un gran trato para empezar.",
      step3Title: "Tú ganas el 10%",
      step3Desc: "Ganas un 10% de comisión por cada pago que realicen, mientras permanezcan activos.",
      cta: "Empieza a Ganar →"
    },
    footer: {
      copyright: "© 2026 Dupla. Todos los derechos reservados."
    }
  },
}

export default es
