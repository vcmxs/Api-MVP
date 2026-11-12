// services/notificationI18n.js
//
// Server-side localization for notifications. The database stores the params as
// JSON (language-neutral) and every client renders it with its own dictionary;
// push notifications do leave the app, so they must be rendered here in the
// recipient's language (`users.language`).

const DEFAULT_LANGUAGE = 'es';

const TEMPLATES = {
    en: {
        fallbackTitle: 'Notification',
        workoutCompletedTitle: 'Workout Completed',
        workoutCompletedBody: '{name} completed the workout: {workoutName}',
        workoutCompletedBodyNamed: '{name} completed a workout',
        workoutCompletedBodyAnon: 'A trainee completed a workout',
        workoutAssignedTitle: 'Workout Assigned',
        workoutAssignedTitleCoop: 'New Co-Op Workout Assigned',
        workoutAssignedBody: '{name} assigned you a new workout: {workoutName}',
        workoutAssignedBodyCoop: '{name} assigned you a new Co-Op workout: {workoutName}',
        workoutAssignedBodyWorkout: 'New workout assigned: {workoutName}',
        workoutAssignedBodyCoopWorkout: 'New Co-Op workout assigned: {workoutName}',
        workoutAssignedBodyAnon: 'A new workout was assigned',
        workoutAssignedBodyCoopAnon: 'A new Co-Op workout was assigned',
        subExpiringTitle: 'Subscription Expiring Soon',
        subExpiringBodyNamed: "{name}'s subscription is expiring soon",
        subExpiringBodyAnon: "A trainee's subscription is expiring soon",
        subExpiredTitle: 'Subscription Expired',
        subExpiredBodyNamed: "{name}'s subscription has expired",
        subExpiredBodyOwn: 'Your premium subscription has expired. You have been reverted to the Starter plan.',
        subReminderTitle: 'Subscription Reminder',
        subReminderBody3Days: 'Your subscription expires in 3 days ({date}). Renew now to keep your benefits!',
        subReminderBodyTomorrow: 'Your subscription expires tomorrow! Renew now to avoid losing premium features.',
        subReminderBodyGeneric: 'Your subscription is about to expire. Renew now to keep your benefits.',
        blastTitle: 'Blast Message',
        messageTitle: 'New message from {name}',
        messageTitleAnon: 'New message',
        newTraineeTitle: 'New Trainee',
        newTraineeBodyNamed: '{name} joined as a new trainee',
        newTraineeBodyAnon: 'A new trainee joined',
        coachUnlinkedTitle: 'Coach unlinked',
        coachUnlinkedBody: 'You are no longer training with {name}',
        coachUnlinkedBodyAnon: 'Your coach unlinked you',
        traineeUnlinkedTitle: 'Trainee unlinked',
        traineeUnlinkedBody: '{name} is no longer in your trainee list',
        traineeUnlinkedBodyAnon: 'A trainee left your list',
    },
    es: {
        fallbackTitle: 'Notificación',
        workoutCompletedTitle: 'Rutina Completada',
        workoutCompletedBody: '{name} completó la rutina: {workoutName}',
        workoutCompletedBodyNamed: '{name} completó una rutina',
        workoutCompletedBodyAnon: 'Un alumno completó una rutina',
        workoutAssignedTitle: 'Rutina Asignada',
        workoutAssignedTitleCoop: 'Nueva Rutina Co-Op Asignada',
        workoutAssignedBody: '{name} te asignó una nueva rutina: {workoutName}',
        workoutAssignedBodyCoop: '{name} te asignó una nueva rutina Co-Op: {workoutName}',
        workoutAssignedBodyWorkout: 'Nueva rutina asignada: {workoutName}',
        workoutAssignedBodyCoopWorkout: 'Nueva rutina Co-Op asignada: {workoutName}',
        workoutAssignedBodyAnon: 'Se asignó una nueva rutina',
        workoutAssignedBodyCoopAnon: 'Se asignó una nueva rutina Co-Op',
        subExpiringTitle: 'Suscripción por Expirar',
        subExpiringBodyNamed: 'La suscripción de {name} expira pronto',
        subExpiringBodyAnon: 'La suscripción de un alumno expira pronto',
        subExpiredTitle: 'Suscripción Expirada',
        subExpiredBodyNamed: 'La suscripción de {name} ha expirado',
        subExpiredBodyOwn: 'Tu suscripción premium ha expirado. Has vuelto al plan Starter.',
        subReminderTitle: 'Recordatorio de Suscripción',
        subReminderBody3Days: 'Tu suscripción vence en 3 días ({date}). ¡Renueva ahora para mantener tus beneficios!',
        subReminderBodyTomorrow: '¡Tu suscripción vence mañana! Renueva ahora para no perder las funciones premium.',
        subReminderBodyGeneric: 'Tu suscripción está por vencer. Renueva ahora para mantener tus beneficios.',
        blastTitle: 'Mensaje Masivo',
        messageTitle: 'Nuevo mensaje de {name}',
        messageTitleAnon: 'Nuevo mensaje',
        newTraineeTitle: 'Nuevo Alumno',
        newTraineeBodyNamed: '{name} se unió como nuevo alumno',
        newTraineeBodyAnon: 'Un nuevo alumno se unió',
        coachUnlinkedTitle: 'Coach desvinculado',
        coachUnlinkedBody: 'Ya no estás entrenando con {name}',
        coachUnlinkedBodyAnon: 'Tu coach se desvinculó',
        traineeUnlinkedTitle: 'Alumno desvinculado',
        traineeUnlinkedBody: '{name} ya no está en tu lista de alumnos',
        traineeUnlinkedBodyAnon: 'Un alumno dejó tu lista',
    },
};

// {placeholder} interpolation
function fill(template, params) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        const value = params[key];
        return value === undefined || value === null ? '' : String(value);
    });
}

function normalizeLanguage(language) {
    const code = String(language || DEFAULT_LANGUAGE).toLowerCase().slice(0, 2);
    return TEMPLATES[code] ? code : DEFAULT_LANGUAGE;
}

/**
 * Rows created before the i18n change (and blast messages) store plain text;
 * everything else stores `JSON.stringify(params)`. Both shapes are accepted.
 */
function parseNotificationParams(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) return {};
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function isPlainText(value) {
    return typeof value === 'string' && value.trim().length > 0 && !value.trim().startsWith('{');
}

function buildNotificationText(type, params = {}, language = DEFAULT_LANGUAGE, fallback = {}) {
    const t = TEMPLATES[normalizeLanguage(language)];
    const p = params && typeof params === 'object' ? params : {};
    const key = String(type || '').toLowerCase();

    const rawTitle = isPlainText(fallback.title) ? fallback.title : '';
    const rawMessage = isPlainText(fallback.message) ? fallback.message : '';

    const reminderBody = () => {
        const days = Number(p.days);
        if (days === 3) {
            return p.date ? fill(t.subReminderBody3Days, p) : t.subReminderBody3Days.replace(/\s*\(\{date\}\)/, '');
        }
        if (days === 1) return t.subReminderBodyTomorrow;
        return t.subReminderBodyGeneric;
    };

    switch (key) {
        case 'workout_completed':
            return {
                title: t.workoutCompletedTitle,
                body: p.name && p.workoutName
                    ? fill(t.workoutCompletedBody, p)
                    : p.name ? fill(t.workoutCompletedBodyNamed, p) : t.workoutCompletedBodyAnon,
            };

        case 'workout_assigned': {
            const coop = String(p.kind || '').toLowerCase() === 'coop' || /co-?op/i.test(rawTitle);
            const title = coop ? t.workoutAssignedTitleCoop : t.workoutAssignedTitle;
            if (p.name && p.workoutName) {
                return { title, body: fill(coop ? t.workoutAssignedBodyCoop : t.workoutAssignedBody, p) };
            }
            if (p.workoutName) {
                return { title, body: fill(coop ? t.workoutAssignedBodyCoopWorkout : t.workoutAssignedBodyWorkout, p) };
            }
            return { title, body: coop ? t.workoutAssignedBodyCoopAnon : t.workoutAssignedBodyAnon };
        }

        case 'subscription_expiring':
            return {
                title: t.subExpiringTitle,
                body: p.name ? fill(t.subExpiringBodyNamed, p) : t.subExpiringBodyAnon,
            };

        case 'subscription_expired':
            return {
                title: t.subExpiredTitle,
                body: p.name ? fill(t.subExpiredBodyNamed, p) : t.subExpiredBodyOwn,
            };

        case 'subscription_reminder':
            return { title: t.subReminderTitle, body: reminderBody() };

        case 'direct_message':
            return {
                title: p.name ? fill(t.messageTitle, p) : t.messageTitleAnon,
                body: p.preview || p.message || rawMessage,
            };

        case 'blast':
            return { title: rawTitle || t.blastTitle, body: rawMessage || p.message || p.body || '' };

        case 'new_trainee':
            return {
                title: t.newTraineeTitle,
                body: p.name ? fill(t.newTraineeBodyNamed, p) : t.newTraineeBodyAnon,
            };

        case 'coach_unlinked':
            return {
                title: t.coachUnlinkedTitle,
                body: p.name ? fill(t.coachUnlinkedBody, p) : t.coachUnlinkedBodyAnon,
            };

        case 'trainee_unlinked':
            return {
                title: t.traineeUnlinkedTitle,
                body: p.name ? fill(t.traineeUnlinkedBody, p) : t.traineeUnlinkedBodyAnon,
            };

        default:
            return {
                title: rawTitle || key || t.fallbackTitle,
                body: rawMessage || Object.values(p).join(' — '),
            };
    }
}

module.exports = {
    buildNotificationText,
    parseNotificationParams,
    normalizeLanguage,
    DEFAULT_LANGUAGE,
};
