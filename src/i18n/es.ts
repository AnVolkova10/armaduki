// Castellano rioplatense: voseo, y en femenino para las jugadoras. Los roles quedan con sus
// códigos (GK, DEF, MID, ATT, FLEX), que son los de la planilla.
import type { Attributes, BalanceLabel, FallbackCause, HardRule, RuleIssue, TeamLabel } from '../types/index.ts';
import type { Dict } from './en.ts';

// Los dos equipos se llaman por el color de la pechera (25/11): T1 es el Rojo y T2, el Negro.
const team = (label: TeamLabel): string => (label === 'T1' ? 'Rojo' : 'Negro');
const theTeam = (label: TeamLabel) => `El ${team(label)}`;

/** "a", "a y b", "a, b y c". */
const list = (items: string[]): string =>
    items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

/** A whole number with a real minus sign when negative. */
const signed = (n: number): string => (n < 0 ? `\u2212${-n}` : String(n));

const BALANCE_SENTENCE: Record<BalanceLabel, string> = {
    highlyBalanced: 'Los equipos están muy parejos.',
    balanced: 'Los equipos están parejos.',
    playable: 'Se puede jugar, pero un equipo es algo más fuerte.',
    imbalanced: 'Los equipos están desparejos: uno es claramente más fuerte.',
};

const attributes: Record<keyof Attributes, string> = {
    shooting: 'Remate',
    control: 'Control',
    passing: 'Pase',
    defense: 'Marca',
    pace: 'Velocidad',
    vision: 'Visión',
    grit: 'Garra',
    stamina: 'Aire',
};

const balance: Record<BalanceLabel, string> = {
    highlyBalanced: 'Muy parejo',
    balanced: 'Parejo',
    playable: 'Jugable, pero desparejo',
    imbalanced: 'Desparejo',
};

const rules: Record<HardRule, string> = {
    avoids: 'Avoids',
    wants: 'Wants mutuos',
    ownerBias: 'Owner bias',
    roleSpread: 'Reparto de ATT y DEF',
    roleLimits: 'Límites de GK y DEF',
};

const CLEARED: Record<string, string> = {
    'all links': 'los links',
    'positive links': 'los wants',
    'negative links': 'los avoids',
};

export const es: Dict = {
    common: {
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        retry: 'Reintentar',
        close: 'Cerrar',
        team,
        attributes,
    },

    lang: {
        label: 'Idioma',
        english: 'Inglés',
        spanish: 'Castellano',
    },

    page: {
        title: 'Jugadoras',
        addPlayer: '+ Sumar jugadora',
        addPlayerWaits: 'Primero tienen que cargar las jugadoras desde Google Sheets',
        selected: 'elegidas',
        clear: 'Limpiar',
        clearSelection: 'Limpiar selección',
        clearFilters: 'Limpiar filtros',
        clearWants: 'Borrar wants',
        clearAvoids: 'Borrar avoids',
        clearLinks: 'Borrar links',
        generate: 'Armar equipos',
        dismissError: 'Cerrar aviso',
        loading: 'Cargando jugadoras desde Google Sheets',
        empty: 'Todavía no hay jugadoras.',
        emptyHint: 'Los datos vienen de Google Sheets. Podés sumar jugadoras acá o editar la planilla.',
        noMatch: 'Ninguna jugadora coincide con la búsqueda y los filtros.',
        noMatchFiltered: 'Probá con otro comienzo de nombre o con otro filtro de rol o score.',
        noMatchSorted: 'Probá cambiando la búsqueda, el filtro o el orden.',
        updating: 'Actualizando desde Google Sheets...',
        savedCopyRefresh: 'Copia guardada · Actualizar',
        showing: (shown, total) => `${shown} de ${total} jugadoras`,
        total: (total) => `Total: ${total} jugadoras`,
        selectExactly: (selected) => `Elegí exactamente 10 jugadoras. Elegidas: ${selected}`,
        couldNotGenerate: 'No se pudieron armar equipos válidos. Revisá los roles y quién puede atajar.',
    },

    confirm: {
        deleteTitle: '¿Borrar jugadora?',
        deleteMessage: 'Se borra de la app y de la planilla.',
        deleteLabel: 'Borrar',
        linksTitle: '¿Borrar los links?',
        linksMessage: 'Se borran todos los wants y los avoids de todas las jugadoras.',
        linksLabel: 'Borrar links',
        wantsTitle: '¿Borrar los wants?',
        wantsMessage: 'Se borran los wants de todas las jugadoras.',
        wantsLabel: 'Borrar wants',
        avoidsTitle: '¿Borrar los avoids?',
        avoidsMessage: 'Se borran los avoids de todas las jugadoras.',
        avoidsLabel: 'Borrar avoids',
    },

    controls: {
        search: 'Buscar jugadoras por apodo o nombre',
        role: 'Rol',
        score: 'Score',
        sort: 'Orden',
        all: 'Todos',
        sortDefault: 'Normal',
        sortSelected: 'Elegidas',
        sortScore: 'Score',
        sortPosition: 'Puesto',
        filterByRole: 'Filtrar por rol',
        filterByScore: 'Filtrar por score',
        sortPlayers: 'Ordenar jugadoras',
        highToLow: 'Score: de mayor a menor',
        lowToHigh: 'Score: de menor a mayor',
    },

    card: {
        select: (nickname) => `Elegir a ${nickname}`,
        edit: 'Editar',
        editPlayer: (nickname) => `Editar a ${nickname}`,
        delete: 'Borrar',
        deletePlayer: (nickname) => `Borrar a ${nickname}`,
    },

    notices: {
        dismissWarning: 'Cerrar aviso',
        dismissSyncErrors: 'Cerrar errores de guardado',
        manyFailed: (count) => `${count} cambios no se pudieron guardar en Google Sheets.`,
        unsavedOnlyHere: 'Lo que no se guardó vive solo en esta pestaña hasta que un reintento funcione.',
        saving: 'Guardando...',
        loadingSheet: 'Cargando desde Google Sheets',
    },

    gate: {
        idle: 'Hacé el gol para entrar',
        goal: 'Gol',
        saved: 'Atajada. Esa no es la clave.',
        post: 'Palo. No hubo respuesta, probá de nuevo.',
        scene: 'Una arquera en su línea, esperando un penal',
        keyLabel: 'Clave de acceso',
        keyPlaceholder: 'Clave',
        shoot: 'Patear',
    },

    form: {
        newPlayer: 'Jugadora nueva',
        nickname: 'Apodo',
        nicknameBlank: 'El apodo no puede quedar vacío',
        name: 'Nombre o descripción',
        photoUpload: 'Subir',
        photoChange: 'Cambiar',
        photoAlt: 'Vista previa',
        photoTooHeavy: 'La foto pesa demasiado para Sheets. Probá con otra.',
        photoUnreadable: 'No se puede leer esta imagen. Usá un JPG o un PNG.',
        shirtNumber: 'Camiseta',
        teams: 'Equipos',
        teamsSelected: (count) => (count === 1 ? '1 elegido' : `${count} elegidos`),
        teamsLoading: 'Cargando equipos...',
        teamsEmpty: 'Todavía no hay equipos cargados',
        teamSelected: 'Elegido',
        teamAdd: 'Sumar',
        teamIsMain: (name) => `${name} es el equipo principal`,
        teamSetMain: (name) => `Poner ${name} como equipo principal`,
        position: 'Puesto',
        goalkeeper: '¿Ataja?',
        gkGood: 'Bien',
        gkLow: 'Poco',
        gkNo: 'No',
        rating: 'Rating',
        suggested: 'sugerido',
        attributes: 'Atributos',
        level: { low: 'bajo', mid: 'medio', high: 'alto' },
        wants: 'Quiere jugar con',
        avoids: 'Evita jugar con',
        wantsYou: (nickname) => `${nickname} quiere jugar con ella`,
        avoidsYou: (nickname) => `${nickname} la evita`,
        extraInfo: 'Más datos',
        save: 'Guardar cambios',
        add: 'Sumar jugadora',
    },

    result: {
        title: 'Equipos',
        allRulesKept: 'Todas las reglas',
        fallback: 'Fallback',
        power: 'Power',
        copy: 'Copiar equipos',
        copied: 'Copiado',
        balance: 'Parejo',
        balanceLabel: balance,
        score: (score) => `Score ${signed(score)}`,
        ratingDiff: (diff, favors) => `rating +${diff} para el ${team(favors)}`,
        ratingEven: 'rating igual',
        social: 'Social',
        wantsKept: (met, total) => `Wants ${met}/${total}`,
        avoidsKept: (met, total) => `Avoids ${met}/${total}`,
        noLinks: 'No hay links entre ellas',
        rules: 'Reglas',
        allKept: 'Todas se cumplen',
        brokenCount: (count) => (count === 1 ? 'Se rompió 1' : `Se rompieron ${count}`),
        strictNote: 'Ninguna regla fuerte se rompe',
        fallbackNote: 'El reparto que menos rompe',

        fallbackTitle: 'Ningún reparto cumple todas las reglas',
        why: 'Por qué',
        broken: 'Se rompió',
        kept: 'Se mantuvo',
        noSingleCause: 'No hay una sola causa: las reglas chocan cuando se combinan.',
        relaxOrder: 'Las reglas ceden en este orden',
        rule: rules,
        cause: (cause: FallbackCause): string => {
            switch (cause.kind) {
                case 'tooManyGK':
                    return `Hay ${cause.count} GK elegidas y el máximo es ${cause.maxPerTeam} por equipo.`;
                case 'tooManyDEF':
                    return `Hay ${cause.count} DEF elegidas y el máximo es ${cause.maxPerTeam} por equipo.`;
                case 'fewKeepers':
                    return `Hay ${cause.gkCount} GK elegidas y solo ${cause.capable} arqueras de emergencia: cada equipo sin GK necesita ${cause.neededPerTeam}.`;
                case 'wantsChain':
                    return `Los wants mutuos encadenan a ${cause.nicknames.length} jugadoras (${cause.nicknames.join(', ')}) y en un equipo entran ${cause.teamSize}.`;
                case 'avoidInChain':
                    return `${cause.from} evita a ${cause.to}, pero los wants mutuos las encadenan en el mismo equipo.`;
            }
        },
        issue: (issue: RuleIssue): string => {
            switch (issue.kind) {
                case 'avoidTogether':
                    return issue.link.mutual
                        ? `${issue.link.from} y ${issue.link.to} se evitan y quedaron juntas.`
                        : `${issue.link.from} evita a ${issue.link.to} y quedaron juntas.`;
                case 'wantSplit':
                    return `${issue.link.from} y ${issue.link.to} quieren jugar juntas y quedaron separadas.`;
                case 'ownerOnStronger':
                    return `${issue.nickname} quedó en el equipo más fuerte.`;
                case 'defSplit':
                    return `Las 2 DEF van una por equipo: el Rojo tiene ${issue.team1} y el Negro, ${issue.team2}.`;
                case 'attSplit':
                    return `Las ATT pueden diferir en 1 como mucho: el Rojo tiene ${issue.team1} y el Negro, ${issue.team2}.`;
                case 'tooManyGK':
                    return `${theTeam(issue.team)} quedó con ${issue.count} GK (máximo ${issue.max}).`;
                case 'tooManyDEF':
                    return `${theTeam(issue.team)} quedó con ${issue.count} DEF (máximo ${issue.max}).`;
                case 'fewKeepers':
                    return `${theTeam(issue.team)} no tiene GK y tiene ${issue.capable} de las ${issue.needed} arqueras de emergencia que necesita.`;
            }
        },

        showAnalysis: 'Análisis completo',
        hideAnalysis: 'Ocultar análisis',

        inWords: 'En palabras',
        lead: {
            balance: 'Parejo',
            rating: 'Rating',
            attributes: 'Atributos',
            keepers: 'Arqueras',
            att: 'ATT',
            links: 'Links',
        },
        balanceSentence: (label, score) => `${BALANCE_SENTENCE[label]} Score ${signed(score)}: cuanto más alto, más parejo.`,
        ratingSentence: (diff, favors, totals) => {
            const detail = totals ? ` (${totals[0]} a ${totals[1]})` : '';
            if (favors === 'Even') return `Los dos equipos suman el mismo rating${detail}.`;
            return `${theTeam(favors)} suma ${diff} ${diff === 1 ? 'punto' : 'puntos'} más de rating${detail}.`;
        },
        attributesSentence: (team1, team2, even) => {
            const parts: string[] = [];
            if (team1.length > 0) parts.push(`El Rojo es mejor en ${list(team1)}`);
            if (team2.length > 0) parts.push(team1.length > 0 ? `el Negro, en ${list(team2)}` : `El Negro es mejor en ${list(team2)}`);
            if (parts.length === 0) return 'Iguales en todos los atributos.';
            return `${parts.join('; ')}.${even.length > 0 ? ` Iguales en ${list(even)}.` : ''}`;
        },
        keepersEach: 'Cada equipo tiene su GK.',
        keepersTeam: (label, gkCount, good, others, needed) => {
            if (gkCount === 1) return `${theTeam(label)} tiene su GK.`;
            if (gkCount > 1) return `${theTeam(label)} tiene ${gkCount} GK.`;
            const capable = good.length + others.length;
            if (capable === 0) return `${theTeam(label)} no tiene GK ni quien ataje (necesita ${needed}).`;
            if (capable < needed) {
                const can = capable === 1 ? 'puede' : 'pueden';
                return `${theTeam(label)} no tiene GK y solo ${can} atajar ${list([...good, ...others])} (necesita ${needed}).`;
            }
            if (good.length > 0) {
                const rest = others.length > 0 ? `; si hace falta, pueden ${others.length} más` : '';
                return `${theTeam(label)} no tiene GK: ${good.length === 1 ? 'ataja bien' : 'atajan bien'} ${list(good)}${rest}.`;
            }
            return capable <= 3
                ? `${theTeam(label)} no tiene GK: pueden atajar ${list(others)}, ninguna muy bien.`
                : `${theTeam(label)} no tiene GK: pueden atajar ${capable}, ninguna muy bien.`;
        },
        attSentence: (team1, team2) => `El Rojo tiene ${team1} y el Negro, ${team2}.`,
        linksSentence: (wantsMet, wantsTotal, avoidsMet, avoidsTotal) => {
            const parts: string[] = [];
            if (wantsTotal > 0) parts.push(`Wants cumplidos: ${wantsMet} de ${wantsTotal}, juegan juntas.`);
            if (avoidsTotal > 0) parts.push(`Avoids cumplidos: ${avoidsMet} de ${avoidsTotal}, juegan separadas.`);
            return parts.length > 0 ? parts.join(' ') : 'No hay wants ni avoids entre estas diez.';
        },
        oneWaySplit: (penalty) =>
            `Para emparejar, se separaron estos wants de un solo lado (${penalty} puntos menos cada uno):`,
        wantsTogether: 'Juntas',
        avoidsApart: 'Separadas',

        comparison: 'Rojo vs Negro',
        comparisonHelp: 'Cada barra se inclina hacia el equipo más fuerte en eso; cuanto más larga, más diferencia.',
        rating: 'Rating',
        even: 'Iguales',

        scoreTitle: 'Cómo se calcula el score',
        scoreHelp:
            'Arranca en 100 y pierde puntos por cada diferencia entre los equipos; algunas reglas suman o restan un poco. Cuanto más alto, más parejo: 70 o más es muy parejo, 40 o más es parejo y 0 o más, jugable.',
        scoreStart: 'Arranca en',
        scoreRating: 'Diferencia de rating',
        scoreAttributes: 'Diferencias en los atributos, todas juntas',
        scorePace: 'La velocidad, que cuenta extra',
        scoreStamina: 'El aire, que cuenta extra',
        scoreDefense: 'La marca, que cuenta extra',
        scoreKeepers: 'Arqueras de emergencia',
        scoreKeepersHelp: '+4 por cada una buena, −12 por cada una que falta',
        scoreAtt: 'Reparto de ATT',
        scoreAttHelp: 'qué tan parejas quedan las ATT',
        scoreWants: 'Wants de un solo lado separados',
        scoreTimes: (value, weight) => `${value} × ${weight}`,
        scoreShort: {
            rating: 'la diferencia de rating',
            attributes: 'las diferencias de atributos',
            pace: 'la velocidad',
            stamina: 'el aire',
            defense: 'la marca',
            keepers: 'las arqueras de emergencia',
            att: 'el reparto de ATT',
            wants: 'los wants de un solo lado',
        },
        scoreNoEffect: (items) => `Esta vez no suman ni restan: ${list(items)}.`,
        scoreTotal: 'Score',

        showSecond: 'Ver otra opción',
        hideSecond: 'Ocultar otra opción',
        second: 'Otra opción',
        secondReason: 'El siguiente mejor reparto con las mismas reglas. Se ordena por score, después por social y después por diferencia de rating.',
        noSecond: 'No hay otra opción con estas reglas.',
        scoreDelta: 'Score',
        ratingDiffDelta: 'Dif. de rating',
        socialDelta: 'Social',
        movedTo: (label) => `Pasa al ${team(label)}`,
        noSwaps: 'Sin cambios',
        copySecond: 'Copiar otra opción',
    },

    store: {
        missingUrl: 'Falta VITE_APPS_SCRIPT_URL. Agregala en .env (local) o en las variables de entorno de Vercel.',
        duplicateIds: (list) =>
            `Hay ids de jugadora repetidos en Google Sheets: ${list}. Se muestra solo la primera fila; dale a cada fila su propio id.`,
        duplicateId: (id, firstRow, row) => `id ${id} (filas ${firstRow} y ${row})`,
        missingIds: (rows) =>
            `Hay jugadoras sin id en Google Sheets (filas ${rows}). Agregales un id en la planilla antes de editarlas acá.`,
        httpStatus: (status) => `Apps Script devolvió HTTP ${status}.`,
        keyRefused: 'La clave de acceso fue rechazada. Escribila de nuevo y reintentá.',
        answered: (text) => `Apps Script respondió: ${text || '(respuesta vacía)'}`,
        timeout: (seconds) => `Apps Script no respondió en ${seconds} s.`,
        couldntClear: (label) => `No se pudieron borrar ${CLEARED[label] ?? label} en Google Sheets.`,
        noValidPlayers: 'No hay jugadoras válidas en Google Sheets',
        teamsError: 'No se pudieron cargar los equipos desde Google Sheets',
        couldntRefresh: (detail) =>
            `No se pudo actualizar desde Google Sheets. ${detail} Ves la copia guardada en este dispositivo; para editar hace falta una lectura nueva.`,
        couldntLoad: (detail) => `No se pudieron cargar los datos desde Google Sheets. ${detail}`,
        couldntAdd: (nickname) => `No se pudo guardar a la jugadora nueva «${nickname}» en Google Sheets.`,
        couldntUpdate: (nickname) => `No se pudieron guardar los cambios de «${nickname}» en Google Sheets.`,
        couldntDelete: (label) => `No se pudo borrar a «${label}» en Google Sheets.`,
        rowWithoutId: 'Esta fila no tiene id en Google Sheets. Borrala ahí, o agregale un id primero.',
    },
};
