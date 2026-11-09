const axios = require('axios');
const https = require('https');

// Resolves a YouTube reference video for an exercise name when the catalog has no
// usable video_url. Results are cached in memory so repeated lookups (and every
// exercise row of a workout) do not hit YouTube again.
const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/results';
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for hits
const MISS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for misses

const cache = new Map();

const client = axios.create({
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        // Skip the consent interstitial YouTube serves to some regions
        'Cookie': 'CONSENT=YES+cb; SOCS=CAI'
    },
    timeout: 9000
});

function normalizeExerciseName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getSearchUrl(query) {
    return `${YOUTUBE_SEARCH_URL}?search_query=${encodeURIComponent(query)}`;
}

function getThumbnailUrl(videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function getEmbedUrl(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

// YouTube renders the results page with a `ytInitialData = { ... };` JSON blob.
function extractInitialData(html) {
    const markerIndex = html.indexOf('ytInitialData');
    if (markerIndex === -1) return null;

    const start = html.indexOf('{', markerIndex);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < html.length; index += 1) {
        const character = html[index];

        if (inString) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === '"') inString = false;
            continue;
        }

        if (character === '"') {
            inString = true;
        } else if (character === '{') {
            depth += 1;
        } else if (character === '}') {
            depth -= 1;
            if (depth === 0) {
                try {
                    return JSON.parse(html.slice(start, index + 1));
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

function collectVideoRenderers(node, results, limit, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 16 || results.length >= limit) return;

    if (Array.isArray(node)) {
        for (const item of node) {
            collectVideoRenderers(item, results, limit, depth + 1);
            if (results.length >= limit) return;
        }
        return;
    }

    if (node.videoRenderer && typeof node.videoRenderer.videoId === 'string' && VIDEO_ID_PATTERN.test(node.videoRenderer.videoId)) {
        results.push(node.videoRenderer);
        return;
    }

    for (const value of Object.values(node)) {
        collectVideoRenderers(value, results, limit, depth + 1);
        if (results.length >= limit) return;
    }
}

function readTitle(renderer) {
    const runs = renderer && renderer.title && renderer.title.runs;
    if (Array.isArray(runs) && runs.length > 0) {
        return runs.map((run) => run.text || '').join('').trim() || null;
    }
    const simpleText = renderer && renderer.title && renderer.title.simpleText;
    return typeof simpleText === 'string' ? simpleText.trim() : null;
}

const TECHNIQUE_KEYWORDS = ['tecnica', 'technique', 'tutorial', 'como hacer', 'how to', 'ejercicio', 'exercise', 'forma correcta', 'correct form', 'explicado', 'guia', 'coach'];
const STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'para', 'en', 'y', 'un', 'una', 'the', 'of', 'a', 'to', 'for', 'and']);

function extractTokens(name) {
    return normalizeExerciseName(name).split(' ').filter((token) => token && !STOP_WORDS.has(token));
}

// Ranks the search results so a tutorial that actually names the exercise wins over
// generic listicles or unrelated vlogs.
function scoreRenderer(renderer, name) {
    const normalizedTitle = normalizeExerciseName(readTitle(renderer));
    const tokens = extractTokens(name);
    if (!normalizedTitle || tokens.length === 0) return 0;

    const matched = tokens.filter((token) => normalizedTitle.includes(token)).length;
    if (matched === 0) return 0;

    let score = (matched / tokens.length) * 6;

    if (matched === tokens.length) score += 3;
    if (TECHNIQUE_KEYWORDS.some((keyword) => normalizedTitle.includes(normalizeExerciseName(keyword)))) score += 2;

    return score;
}

function pickBestRenderer(renderers, name) {
    let best = null;
    let bestScore = 0;

    for (const renderer of renderers) {
        const score = scoreRenderer(renderer, name);
        if (score > bestScore) {
            best = renderer;
            bestScore = score;
        }
    }

    return best ? { renderer: best, score: bestScore } : null;
}

async function searchFirstVideo(query, matchName = query, limit = 20) {
    const response = await client.get(YOUTUBE_SEARCH_URL, {
        params: { search_query: query, hl: 'es', gl: 'ES' },
        responseType: 'text',
        validateStatus: (status) => status >= 200 && status < 400
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data || '');
    const initialData = extractInitialData(html);
    const renderers = [];
    if (initialData) collectVideoRenderers(initialData, renderers, limit);

    if (renderers.length > 0) {
        // Only accept a result whose title actually mentions the exercise name.
        const best = pickBestRenderer(renderers, matchName);
        return best ? { videoId: best.renderer.videoId, title: readTitle(best.renderer) } : null;
    }

    // Page structure changed: fall back to the first videoId in the payload
    const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    return match ? { videoId: match[1], title: null } : null;
}

function buildResult(name, video) {
    return {
        name,
        videoId: video ? video.videoId : null,
        title: video ? video.title || null : null,
        thumbnailUrl: video ? getThumbnailUrl(video.videoId) : null,
        embedUrl: video ? getEmbedUrl(video.videoId) : null,
        searchUrl: getSearchUrl(name),
        source: video ? 'youtube-search' : 'none'
    };
}

exports.normalizeExerciseName = normalizeExerciseName;
exports.searchFirstVideo = searchFirstVideo;

exports.getExerciseVideo = async (exerciseName) => {
    const name = String(exerciseName || '').trim();
    if (!name) throw new Error('exerciseName is required');

    const cacheKey = normalizeExerciseName(name);
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
    }

    let result;
    try {
        // Technique-focused query first; fall back to the raw name when nothing is found.
        let video = await searchFirstVideo(`${name} tecnica`, name);
        if (!video) video = await searchFirstVideo(name, name);
        result = buildResult(name, video);
    } catch (error) {
        console.warn(`YouTube video lookup failed for "${name}": ${error.message}`);
        result = buildResult(name, null);
    }

    cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + (result.videoId ? CACHE_TTL_MS : MISS_TTL_MS)
    });

    return result;
};

exports.clearExerciseVideoCache = () => cache.clear();
exports.getExerciseVideoCacheSize = () => cache.size;
