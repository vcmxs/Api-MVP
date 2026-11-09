# Dataset match review

Generado: 2026-11-09 · dry run sobre `exercise_library` (165 filas de catálogo).

| Resultado | Filas |
| --- | --- |
| Datos del dataset leídos | 1324 (8 nombres duplicados descartados) |
| Catálogo enriquecido (UPDATE) | 79 |
| Nuevos ejercicios (INSERT) | 1237 |
| Ambiguos (revisión manual) | 3 |
| Sin equivalente en el dataset | 83 |
| Conflictos (mismo registro para 2 filas) | 22 |

> Para corregir cualquier match edita `scripts/exercise-dataset/match-overrides.json`
> y vuelve a ejecutar el dry run. `--apply` escribe en `DATABASE_URL`.

## Catálogo enriquecido

### ABDOMEN

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| DEAD BUG | 0276 · dead bug | abs |
| ELEVACIONES DE PIERNA COLGADO | 0472 · hanging leg raise | abs |
| FLEXIÓN DE CADERA | 0865 · lying leg-hip raise | abs |

### ADUCTORES

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| ADUCTORES EN MÁQUINA | 0598 · lever seated hip adduction | adductors |

### BÍCEPS

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| BANCO SCOTT / CURL PREDICADOR | 0070 · barbell preacher curl | biceps |
| CURL ARAÑA | 0454 · ez barbell spider curl | biceps |
| CURL DE BÍCEPS BILATERAL CON MANCUERNAS | 0294 · dumbbell biceps curl | biceps |
| CURL DE BÍCEPS CON BARRA Z | 0447 · ez barbell curl | biceps |
| CURL DE BÍCEPS EN BANCO INCLINADO | 0315 · dumbbell incline biceps curl | biceps |
| CURL DE BÍCEPS EN POLEA BAJA | 0868 · cable curl | biceps |
| CURL MARTILLO BILATERAL | 0313 · dumbbell hammer curl | biceps |
| CURL MARTILLO UNILATERAL  | 1669 · dumbbell one arm seated hammer curl | biceps |
| CURL PREDICADOR EN MÁQUINA | 0592 · lever preacher curl | biceps |
| CURL PREDICADOR UNILATERAL | 1663 · dumbbell one arm hammer preacher curl | biceps |
| DRAG CURL BILATERAL | 0038 · barbell drag curl | biceps |

### CARDIO

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| CAMINADORA | 3666 · walking on incline treadmill | cardiovascular system |
| ESCALADORA | 2311 · walking on stepmill | cardiovascular system |

### CUADRICEPS

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| HACK SQUAT | 0743 · sled hack squat | glutes |
| LEG EXTENSION | 0585 · lever leg extension | quads |
| PRENSA 45° | 0739 · sled 45° leg press | glutes |
| SENTADILLA CON BARRA ALTA | 1436 · barbell high bar squat | glutes |
| SENTADILLA EN MULTIPOWER (DOMINANTE DE RODILLA) | 0770 · smith squat | glutes |
| ZANCADA CON CARGA BILATERAL (PARA CUÁDRICEPS) | 3470 · forward lunge (male) | glutes |

### DELTOIDES

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| ELEVACIONES LATERALES A LA ALTURA DE LA RODILLA | 0334 · dumbbell lateral raise | delts |
| ELEVACIONES LATERALES EN POLEA | 0178 · cable lateral raise | delts |
| MÁQUINA DE ELEVACIONES LATERALES SENTADO | 0584 · lever lateral raise | delts |
| POSTERIOR CON MANCUERNAS | 0378 · dumbbell rear fly | delts |
| POSTERIOR EN POLEA | 0205 · cable rear pulldown | lats |
| PRESS MILITAR CON BARRA | 0091 · barbell seated overhead press | delts |
| PRESS MILITAR CON MANCUERNAS | 0405 · dumbbell seated shoulder press | delts |
| PRESS MILITAR EN MULTIPOWER | 0766 · smith shoulder press | delts |

### DORSAL

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| PULL DOWN CON AGARRE NEUTRO | 0678 · rocky pull-up pulldown | lats |
| REMO CON MANCUERNA | 1328 · dumbbell lying rear delt row | upper back |
| REMO DORIAN | 0499 · inverted row | upper back |
| REMO EN POLEA BAJA | 1324 · cable upper row | upper back |
| REMO CON BARRA (AGARRE PRONO) | 0027 · barbell bent over row | upper back |

### EN CASA

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| FLEXIONES CON APOYO EN LA PARED  | 0659 · push-up (wall) | pectorals |
| PRESS FRANCÉS CON PESO | 2189 · dumbbells seated triceps extension | triceps |
| CHEST PRESS (CON BANDA ELÁSTICA) | 1254 · band bench press | pectorals |
| CURL DE BÍCEPS (CON BANDA ELÁSTICA) | 3123 · resistance band seated biceps curl | biceps |
| EXTENSIÓN DE TRÍCEPS (CON BANDA ELÁSTICA) | 0998 · band side triceps extension | triceps |
| REMO SENTADO (CON BANDA ELÁSTICA) | 3144 · resistance band seated straight back row | upper back |

### GEMELOS

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| ELEVACIONES DE TALÓN | 1383 · hack calf raise | calves |
| ELEVACIONES DE TALÓN DE PIE EN MÁQUINA | 0605 · lever standing calf raise | calves |
| ELEVACIONES DE TALÓN UNILATERAL CON CARGA | 1384 · hack one leg calf raise | calves |

### GLÚTEOS

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| ABDUCTORES EN MÁQUINA | 0597 · lever seated hip abduction | abductors |
| PUENTE DE GLÚTEOS | 1422 · pelvic tilt into bridge | glutes |
| SENTADILLA CON BARRA BAJA | 1435 · barbell low bar squat | glutes |

### ISQUIOSURAL

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| CURL FEMORAL | 0586 · lever lying leg curl | hamstrings |
| PESO MUERTO CON BANDA ELÁSTICA | 1009 · band stiff leg deadlift | glutes |
| PESO MUERTO CON BARRA | 0032 · barbell deadlift | glutes |
| PESO MUERTO CONVENCIONAL CON MANCUERNAS | 0300 · dumbbell deadlift | glutes |
| PESO MUERTO EN MULTIPOWER | 0752 · smith deadlift | glutes |
| PESO MUERTO PIERNAS SEMIRIGIDAS | 0085 · barbell romanian deadlift | glutes |

### LUMBAR

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| HIPEREXTENSIONES (PARA LUMBAR) | 0489 · hyperextension | spine |

### PECTORAL

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| FLEXIONES | 0662 · push-up | pectorals |
| FLEXIONES CON APOYO EN LAS RODILLAS | 3211 · kneeling push-up (male) | pectorals |
| FLEXIONES CON PIES ELEVADOS | 0279 · decline push-up | pectorals |
| PECK FLY | 0308 · dumbbell fly | pectorals |
| PRESS DECLINADO EN MÁQUINA | 1300 · lever decline chest press | pectorals |
| PRESS DECLINADO EN MULTIPOWER | 0753 · smith decline bench press | pectorals |
| PRESS HORIZONTAL EN MÁQUINA | 0577 · lever chest press | pectorals |
| PRESS INCLINADO CON BARRA | 0047 · barbell incline bench press | pectorals |
| PRESS INCLINADO CON MANCUERNAS | 0314 · dumbbell incline bench press | pectorals |
| PRESS INCLINADO EN MÁQUINA | 1299 · lever incline chest press | pectorals |
| PRESS INCLINADO EN MULTIPOWER | 0757 · smith incline bench press | pectorals |
| PRESS PLANO CON BARRA | 0025 · barbell bench press | pectorals |
| PRESS PLANO CON MANCUERNAS | 0289 · dumbbell bench press | pectorals |
| PRESS PLANO CON TOPE EN MULTIPOWER | 0748 · smith bench press | pectorals |

### SIN CATEGORÍA

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| SALTO DE CUERDA | 2612 · jump rope | cardiovascular system |

### TRÍCEPS

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| Copa bilateral | 0194 · cable overhead triceps extension (rope attachment) | triceps |
| EXTENSIÓN DE TRÍCEPS EN MÁQUINA | 0607 · lever triceps extension | triceps |
| EXTENSIÓN DE TRÍCEPS EN POLEA | 0176 · cable kneeling triceps extension | triceps |
| EXTENSIÓN DE TRÍCEPS UNILATERAL | 0231 · cable standing one arm triceps extension | triceps |
| FONDO DE TRÍCEPS EN MÁQUINA | 1451 · lever seated dip | triceps |
| FONDOS EN BANCO | 1399 · bench dip on floor | triceps |
| PRESS FRANCÉS CON BARRA | 0061 · barbell lying triceps extension | triceps |
| PRESS FRANCÉS CON MANCUERNAS | 0351 · dumbbell lying triceps extension | triceps |

### Yoga

| Ejercicio del catálogo | Registro del dataset | Músculo objetivo |
| --- | --- | --- |
| ESTIRAMIENTO DE YOGA PARA ISQUIOSURAL | 1511 · hamstring stretch | hamstrings |

## Ambiguos — requieren decisión manual

- **CRUNCH ABDOMINAL CLÁSICO** (ABDOMEN): crunch floor · groin crunch · negative crunch · knee touch crunch · oblique crunches floor
- **PRESS MILITAR EN MÁQUINA** (DELTOIDES): lever military press · lever shoulder press · lever shoulder press v. 3
- **SENTADILLA SIN PESO** (CALENTAMIENTO): potty squat · sissy squat · split squats · curtsey squat · frankenstein squat

## Conflictos — dos filas apuntan al mismo registro

- **PRENSA HORIZONTAL** quería 0739 · sled 45° leg press (ya usado por PRENSA 45°)
- **PRENSA PENDULAR** quería 0739 · sled 45° leg press (ya usado por PRENSA 45°)
- **ELEVACIONES LATERALES CON MANCUERNAS** quería 0334 · dumbbell lateral raise (ya usado por ELEVACIONES LATERALES A LA ALTURA DE LA RODILLA)
- **ELEVACIONES LATERALES EN POLEA EN PLANO ESCAPULAR** quería 0178 · cable lateral raise (ya usado por ELEVACIONES LATERALES EN POLEA)
- **PULL DOWN DIVERGENTE** quería 0678 · rocky pull-up pulldown (ya usado por PULL DOWN CON AGARRE NEUTRO)
- **REMO HAMMER** quería 0499 · inverted row (ya usado por REMO DORIAN)
- **ELEVACIONES DE TALÓN SENTADO** quería 1383 · hack calf raise (ya usado por ELEVACIONES DE TALÓN)
- **Curl femoral de pie unipodal** quería 0586 · lever lying leg curl (ya usado por CURL FEMORAL)
- **CURL FEMORAL EN MÁQUINA DE PALANCA** quería 0586 · lever lying leg curl (ya usado por CURL FEMORAL)
- **LEG CURL TUMBADO** quería 0586 · lever lying leg curl (ya usado por CURL FEMORAL)
- **FLEXIONES EN BANCO** quería 0662 · push-up (ya usado por FLEXIONES)
- **PRESS PLANO CON BARRA Y TOPE** quería 0025 · barbell bench press (ya usado por PRESS PLANO CON BARRA)
- **PRESS PLANO EN MULTIPOWER** quería 0748 · smith bench press (ya usado por PRESS PLANO CON TOPE EN MULTIPOWER)
- **CURL MARTILLO (ENFOQUE BRAQUIAL)** quería 0313 · dumbbell hammer curl (ya usado por CURL MARTILLO BILATERAL)
- **ZANCADA ESTÁTICA (PARA CUÁDRICEPS)** quería 3470 · forward lunge (male) (ya usado por ZANCADA CON CARGA BILATERAL (PARA CUÁDRICEPS))
- **PULL DOWN (AGARRE NEUTRO)** quería 0678 · rocky pull-up pulldown (ya usado por PULL DOWN CON AGARRE NEUTRO)
- **PULL DOWN (AGARRE PRONO)** quería 0678 · rocky pull-up pulldown (ya usado por PULL DOWN CON AGARRE NEUTRO)
- **ZANCADA CON CARGA BILATERAL (PARA GLÚTEOS)** quería 3470 · forward lunge (male) (ya usado por ZANCADA CON CARGA BILATERAL (PARA CUÁDRICEPS))
- **ZANCADA ESTÁTICA (PARA GLÚTEOS)** quería 3470 · forward lunge (male) (ya usado por ZANCADA CON CARGA BILATERAL (PARA CUÁDRICEPS))
- **CALENTAMIENTO (EXTENSIÓN DE TRÍCEPS EN POLEA)** quería 0176 · cable kneeling triceps extension (ya usado por EXTENSIÓN DE TRÍCEPS EN POLEA)
- **CALENTAMIENTO (LEG CURL)** quería 0586 · lever lying leg curl (ya usado por CURL FEMORAL)
- **CALENTAMIENTO (LEG EXTENSION)** quería 0585 · lever leg extension (ya usado por LEG EXTENSION)

## Sin equivalente en el dataset

- TOQUES AL TALÓN (ABDOMEN) — no-candidate
- ZANCADAS LATERALES (ADUCTORES) — no-candidate
- CURL BAYESIAN BILATERAL (BÍCEPS) — no-equivalent
- CURL BAYESIAN UNILATERAL (BÍCEPS) — no-equivalent
- DRAG CURL UNILATERAL (BÍCEPS) — no-candidate
- LEG EXTENSION EN MÁQUINA DE POLEA (CUADRICEPS) — no-candidate
- LEG EXTENSION UNILATERALE EN MÁQUINA DE PALANCA (CUADRICEPS) — no-candidate
- PRENSA HORIZONTAL (CUADRICEPS) — already-claimed
- PRENSA PENDULAR (CUADRICEPS) — already-claimed
- SENTADILLA CON MOCHILA  (CUADRICEPS) — no-equivalent
- ELEVACIONES LATERALES CON MANCUERNAS (DELTOIDES) — already-claimed
- ELEVACIONES LATERALES EN POLEA EN PLANO ESCAPULAR (DELTOIDES) — already-claimed
- POSTERIOR EN MÁQUINA (DELTOIDES) — no-candidate
- BARRA T CON AGARRE ABIERTO (DORSAL) — no-candidate
- BARRA T CON AGARRE CERRADO (DORSAL) — no-candidate
- PULL DOWN CON AGARRE AMPLIO (DORSAL) — no-candidate
- PULL DOWN DIVERGENTE (DORSAL) — already-claimed
- PULL OVER UNILATERAL (DORSAL) — no-rule
- RACK CHINS  (DORSAL) — no-candidate
- REMO HAMMER (DORSAL) — already-claimed
- ELEVACIONES DE TALÓN SENTADO (GEMELOS) — already-claimed
- HIP THRUST CON BARRA (GLÚTEOS) — no-candidate
- HIP THRUST EN MÁQUINA (GLÚTEOS) — no-candidate
- HIP THRUST EN MULTIPOWER (GLÚTEOS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA CONTRALATERAL (GLÚTEOS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA IPSILATERAL (GLÚTEOS) — no-candidate
- Curl femoral de pie unipodal (ISQUIOSURAL) — already-claimed
- CURL FEMORAL EN MÁQUINA DE PALANCA (ISQUIOSURAL) — already-claimed
- CURL NÓRDICO (ISQUIOSURAL) — no-candidate
- LEG CURL TUMBADO (ISQUIOSURAL) — already-claimed
- FLEXIÓN DE HOMBRO EN BANCO INCLINADO (PECTORAL) — no-candidate
- FLEXIONES EN BANCO (PECTORAL) — already-claimed
- PRESS INCLINADO EN MÁQUINA DE POLEA (PECTORAL) — no-candidate
- PRESS PLANO CON BARRA Y TOPE (PECTORAL) — already-claimed
- PRESS PLANO EN MULTIPOWER (PECTORAL) — already-claimed
- COPA UNILATERAL  (TRÍCEPS) — no-candidate
- EXTENSIÓN GUILLOTINA (TRÍCEPS) — no-equivalent
- EXTENSIÓN KATANA (TRÍCEPS) — no-equivalent
- EXTENSIONES EN X (TRÍCEPS) — no-equivalent
- CURL MARTILLO (ENFOQUE BRAQUIAL) (BÍCEPS) — already-claimed
- SENTADILLA BÚLGARA (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA BILATERAL (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA CONTRALATERAL (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA IPSILATERAL (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- SENTADILLA EN MULTIPOWER (DOMINANTE DE CADERA) (CUADRICEPS) — no-candidate
- ZANCADA CON CARGA CONTRALATERAL (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- ZANCADA CON CARGA IPSILATERAL (PARA CUÁDRICEPS) (CUADRICEPS) — no-candidate
- ZANCADA ESTÁTICA (PARA CUÁDRICEPS) (CUADRICEPS) — already-claimed
- PULL DOWN (AGARRE NEUTRO) (DORSAL) — already-claimed
- PULL DOWN (AGARRE PRONO) (DORSAL) — already-claimed
- PULL DOWN (AGARRE SUPINO) (DORSAL) — no-candidate
- REMO CON BARRA (AGARRE SUPINO) (DORSAL) — no-candidate
- HIPEREXTENSIONES (PARA GLÚTEOS) (GLÚTEOS) — no-candidate
- PATADA DE GLÚTEOS (CON POLEA DESDE ABAJO) (GLÚTEOS) — no-candidate
- SENTADILLA BÚLGARA (PARA GLÚTEOS) (GLÚTEOS) — no-candidate
- SENTADILLA BÚLGARA CON CARGA BILATERAL (PARA GLÚTEOS) (GLÚTEOS) — no-candidate
- ZANCADA CON CARGA BILATERAL (PARA GLÚTEOS) (GLÚTEOS) — already-claimed
- ZANCADA CON CARGA CONTRALATERAL (PARA GLÚTEOS) (GLÚTEOS) — no-candidate
- ZANCADA CON CARGA IPSILATERAL (PARA GLÚTEOS) (GLÚTEOS) — no-candidate
- ZANCADA ESTÁTICA (PARA GLÚTEOS) (GLÚTEOS) — already-claimed
- SENTADILLA SUMO (sin categoría) — no-candidate
- APROXIMACIÓN DEL PRIMER EJERCICIO (CALENTAMIENTO) — no-equivalent
- MOVILIDAD ARTICULAR DE TREN INFERIOR (CALENTAMIENTO) — no-equivalent
- BIRD-DOG (EN CASA) — no-rule
- CURL DE BÍCEPS CON MOCHILA (EN CASA) — no-equivalent
- EMPUJE DE CODO CONTRA EL SUELO (EN CASA) — no-rule
- FLEXIÓN PLANTAR (EN CASA) — no-rule
- PESO MUERTO SIN PESO (EN CASA) — no-candidate
- PULL OVER CON MANCUERNA (EN CASA) — no-rule
- REMO UNILATERAL CON MOCHILA (EN CASA) — no-equivalent
- SHORT FOOT (TERAPIA) — no-equivalent
- CALENTAMIENTO (ABDUCCIÓN DE HOMBRO) (CALENTAMIENTO) — no-candidate
- CALENTAMIENTO (ABDUCCIÓN HORIZONTAL DE HOMBRO) (CALENTAMIENTO) — no-candidate
- CALENTAMIENTO (BISAGRA DE CADERA) (CALENTAMIENTO) — no-rule
- CALENTAMIENTO (EXTENSIÓN DE HOMBRO) (CALENTAMIENTO) — no-rule
- CALENTAMIENTO (EXTENSIÓN DE TRÍCEPS EN POLEA) (CALENTAMIENTO) — already-claimed
- CALENTAMIENTO (FLEXIÓN DE HOMBRO) (CALENTAMIENTO) — no-candidate
- CALENTAMIENTO (LEG CURL) (CALENTAMIENTO) — already-claimed
- CALENTAMIENTO (LEG EXTENSION) (CALENTAMIENTO) — already-claimed
- CALENTAMIENTO BÁSICO DE PIERNAS (L.E-L.C-AD) (CALENTAMIENTO) — no-rule
- CALENTAMIENTO (FLEXIÓN Y EXTENSIÓN DE RODILLA SENTADO) (EN CASA) — no-rule
- ELEVACIONES LATERALES (CON BANDA ELÁSTICA) (EN CASA) — no-candidate
- PATADA DE TRÍCEPS (CON BANDA ELÁSTICA) (EN CASA) — no-candidate

## Nuevos ejercicios por categoría

| Categoría | Nuevos |
| --- | --- |
| ABDOMEN | 166 |
| ADUCTORES | 5 |
| ANTEBRAZOS | 37 |
| BÍCEPS | 137 |
| CARDIO | 26 |
| CUADRICEPS | 43 |
| CUELLO | 2 |
| DELTOIDES | 136 |
| DORSAL | 177 |
| GEMELOS | 54 |
| GLÚTEOS | 136 |
| ISQUIOSURAL | 25 |
| LUMBAR | 18 |
| PECTORAL | 145 |
| TRÍCEPS | 130 |

