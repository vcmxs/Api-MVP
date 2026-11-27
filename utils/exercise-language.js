// utils/exercise-language.js
//
// Resolves the language used to render exercise names/instructions.
//
// Order: `?lang=es|en` → JWT `req.user.language` → `Accept-Language` → `es`.
// The frontend appends `lang` to every API call from `dupla_lang`, so the
// language follows the UI even for users whose token predates the field.
// Unknown values are ignored instead of failing the request.

const SUPPORTED = new Set(['es', 'en']);
const DEFAULT_LOCALE = 'es';

function normalizeLocale(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  // "es-ES", "en_US", "es-MX,es;q=0.9" → "es"/"en"
  const first = raw.split(',')[0].trim().split(/[-_]/)[0];
  return SUPPORTED.has(first) ? first : null;
}

function fromAcceptLanguage(header) {
  if (typeof header !== 'string' || !header.trim()) return null;

  const candidates = header
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find(param => param.trim().toLowerCase().startsWith('q='));
      const quality = q ? Number.parseFloat(q.split('=')[1]) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter(item => item.tag && item.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate.tag);
    if (locale) return locale;
  }
  return null;
}

/**
 * @param {import('express').Request} req
 * @returns {'es'|'en'}
 */
function resolveExerciseLocale(req) {
  const queryLocale = normalizeLocale(req?.query?.lang);
  if (queryLocale) return queryLocale;

  const userLocale = normalizeLocale(req?.user?.language);
  if (userLocale) return userLocale;

  const headerLocale = fromAcceptLanguage(req?.headers?.['accept-language']);
  if (headerLocale) return headerLocale;

  return DEFAULT_LOCALE;
}

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES: Array.from(SUPPORTED),
  normalizeLocale,
  resolveExerciseLocale,
};
