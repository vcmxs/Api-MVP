// scripts/exercise-dataset/sync-media.js
//
// Prepares the self-hosted media repository (`Dupla-exercises-media`) that the
// API serves through jsDelivr:
//
//   <repo>/gif/0001-2gPfomN.gif
//   <repo>/thumb/0001-2gPfomN.jpg
//   <repo>/manifest.json
//   <repo>/README.md
//
// The file names are copied verbatim from the dataset, so the API can build
// `${EXERCISE_MEDIA_BASE}/gif/${gif_file}` without a lookup table.
//
// Usage:
//   node scripts/exercise-dataset/sync-media.js                    (verify only)
//   node scripts/exercise-dataset/sync-media.js --copy             (copy files)
//   node scripts/exercise-dataset/sync-media.js --copy --out=D:/repo
//
// After pushing the repository, pin the commit SHA in the API/frontend env:
//   https://cdn.jsdelivr.net/gh/<user>/Dupla-exercises-media@<sha>

const fs = require('fs');
const path = require('path');

const DEFAULT_DATASET_DIR = 'C:/Users/admin/Documents/GitHub/exercises-dataset-main';
const DEFAULT_OUT = 'C:/Users/admin/Documents/GitHub/Dupla-exercises-media';

const args = process.argv.slice(2);
const copyFiles = args.includes('--copy');
const datasetDir = (args.find(arg => arg.startsWith('--dataset-dir=')) ?? '').split('=')[1] || DEFAULT_DATASET_DIR;
const outDir = (args.find(arg => arg.startsWith('--out=')) ?? '').split('=')[1] || DEFAULT_OUT;

const README = `# Dupla exercises media

Animated demonstrations and thumbnails used by the Dupla exercise library.

- \`gif/<id>-<media>.gif\` — 180×180 animation shown in the exercise reference dialog.
- \`thumb/<id>-<media>.jpg\` — 180×180 still used by the pickers.
- \`manifest.json\` — dataset id → file names + exercise name.

Media © Gym visual — https://gymvisual.com/ (see the upstream
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) licence).

Consumed by the API through jsDelivr with a pinned commit:

\`\`\`
https://cdn.jsdelivr.net/gh/<user>/Dupla-exercises-media@<commit-sha>
\`\`\`

Pin the SHA (instead of a branch) so a force-push cannot silently change the
media under a running deployment.
`;

function main() {
    const datasetFile = path.join(datasetDir, 'data', 'exercises.json');
    if (!fs.existsSync(datasetFile)) {
        console.error(`❌ Dataset not found: ${datasetFile}`);
        process.exit(1);
    }

    const records = JSON.parse(fs.readFileSync(datasetFile, 'utf8'));
    const manifest = [];
    const missing = [];
    let gifBytes = 0;
    let thumbBytes = 0;

    for (const record of records) {
        const gifPath = path.join(datasetDir, record.gif_url);
        const thumbPath = path.join(datasetDir, record.image);
        const gifFile = path.basename(record.gif_url);
        const thumbFile = path.basename(record.image);

        if (!fs.existsSync(gifPath) || !fs.existsSync(thumbPath)) {
            missing.push(record.id);
            continue;
        }

        gifBytes += fs.statSync(gifPath).size;
        thumbBytes += fs.statSync(thumbPath).size;

        manifest.push({
            id: record.id,
            name: record.name,
            gif: gifFile,
            thumb: thumbFile,
            body_part: record.body_part,
            target: record.target,
            equipment: record.equipment,
            attribution: record.attribution,
        });
    }

    const mb = bytes => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    console.log(`🎬 Registros: ${records.length} · con media: ${manifest.length} · sin media: ${missing.length}`);
    console.log(`📦 Animaciones: ${mb(gifBytes)} · Miniaturas: ${mb(thumbBytes)} · Total: ${mb(gifBytes + thumbBytes)}`);
    if (missing.length > 0) console.log(`⚠️  IDs sin archivos: ${missing.slice(0, 10).join(', ')}`);

    fs.mkdirSync(path.join(outDir, 'gif'), { recursive: true });
    fs.mkdirSync(path.join(outDir, 'thumb'), { recursive: true });
    fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(outDir, 'README.md'), README, 'utf8');
    console.log(`📝 manifest.json + README.md escritos en ${outDir}`);

    if (!copyFiles) {
        console.log('\nℹ️  Verificación únicamente. Ejecuta con --copy para copiar los archivos.');
        return;
    }

    let copied = 0;
    for (const entry of manifest) {
        const gifSource = path.join(datasetDir, 'videos', entry.gif);
        const thumbSource = path.join(datasetDir, 'images', entry.thumb);
        fs.copyFileSync(gifSource, path.join(outDir, 'gif', entry.gif));
        fs.copyFileSync(thumbSource, path.join(outDir, 'thumb', entry.thumb));
        copied += 1;
        if (copied % 250 === 0) console.log(`  … ${copied}/${manifest.length}`);
    }

    console.log(`✅ ${copied * 2} archivos copiados en ${outDir}`);
    console.log('\nSiguientes pasos:');
    console.log('  1) git init && git add . && git commit -m "Add exercise media"');
    console.log('  2) git remote add origin https://github.com/<user>/Dupla-exercises-media.git && git push -u origin main');
    console.log('  3) Copia el SHA del commit y define EXERCISE_MEDIA_BASE=');
    console.log('     https://cdn.jsdelivr.net/gh/<user>/Dupla-exercises-media@<sha>');
}

main();
