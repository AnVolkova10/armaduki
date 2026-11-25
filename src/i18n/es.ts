// Castellano rioplatense: voseo, y con x para nombrar personas (jugadorxs, elegidxs), porque en los
// grupos juegan personas de distintas identidades (25/11). Los roles quedan con sus
// códigos (GK, DEF, MID, ATT, FLEX), que son los de la planilla.
import type { Attributes, BalanceLabel, FallbackCause, HardRule, RuleIssue, TeamLabel } from '../types/index.ts';
import type { Dict } from './en.ts';

// Los dos equipos se llaman por el color de la pechera (25/11): T1 es ROJO y T2, NEGRO, sin artículo.
const team = (label: TeamLabel): string => (label === 'T1' ? 'ROJO' : 'NEGRO');

/** Where a sentence names a side: the result draws {T1} and {T2} as the names, in their colours. */
const tok = (label: TeamLabel): string => (label === 'T1' ? '{T1}' : '{T2}');


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
        title: 'Jugadorxs',
        addPlayer: '+ Sumar jugadorx',
        addPlayerWaits: 'Primero tienen que cargar lxs jugadorxs desde Google Sheets',
        selected: 'elegidxs',
        clear: 'Limpiar',
        clearSelection: 'Limpiar selección',
        clearFilters: 'Limpiar filtros',
        clearWants: 'Borrar wants',
        clearAvoids: 'Borrar avoids',
        clearLinks: 'Borrar links',
        generate: 'Armar equipos',
        dismissError: 'Cerrar aviso',
        loading: 'Cargando jugadorxs desde Google Sheets',
        empty: 'Todavía no hay jugadorxs.',
        emptyHint: 'Los datos vienen de Google Sheets. Podés sumar jugadorxs acá o editar la planilla.',
        noMatch: 'Ningunx jugadorx coincide con la búsqueda y los filtros.',
        noMatchFiltered: 'Probá con otro comienzo de nombre o con otro filtro de rol o score.',
        noMatchSorted: 'Probá cambiando la búsqueda, el filtro o el orden.',
        updating: 'Actualizando desde Google Sheets...',
        savedCopyRefresh: 'Copia guardada · Actualizar',
        showing: (shown, total) => `${shown} de ${total} jugadorxs`,
        total: (total) => `Total: ${total} jugadorxs`,
        inactiveTotal: (total) => `Inactivxs: ${total}`,
        selectExactly: (selected) => `Elegí exactamente 10 jugadorxs. Elegidxs: ${selected}`,
        couldNotGenerate: 'No se pudieron armar equipos válidos. Revisá los roles y quién puede atajar.',
    },

    confirm: {
        deleteTitle: '¿Borrar jugadorx?',
        deleteMessage: 'Se borra de la app y de la planilla.',
        deleteLabel: 'Borrar',
        linksTitle: '¿Borrar los links?',
        linksMessage: 'Se borran todos los wants y los avoids de todxs lxs jugadorxs.',
        linksLabel: 'Borrar links',
        wantsTitle: '¿Borrar los wants?',
        wantsMessage: 'Se borran los wants de todxs lxs jugadorxs.',
        wantsLabel: 'Borrar wants',
        avoidsTitle: '¿Borrar los avoids?',
        avoidsMessage: 'Se borran los avoids de todxs lxs jugadorxs.',
        avoidsLabel: 'Borrar avoids',
    },

    controls: {
        search: 'Buscar jugadorxs por apodo o nombre',
        role: 'Rol',
        score: 'Score',
        sort: 'Orden',
        all: 'Todos',
        sortDefault: 'Normal',
        sortSelected: 'Elegidxs',
        sortScore: 'Score',
        sortPosition: 'Puesto',
        inactive: 'Inactivxs',
        filterByRole: 'Filtrar por rol',
        filterByScore: 'Filtrar por score',
        sortPlayers: 'Ordenar jugadorxs',
        highToLow: 'Score: de mayor a menor',
        lowToHigh: 'Score: de menor a mayor',
    },

    card: {
        select: (nickname) => `Elegir a ${nickname}`,
        edit: 'Editar',
        editPlayer: (nickname) => `Editar a ${nickname}`,
        delete: 'Borrar',
        deletePlayer: (nickname) => `Borrar a ${nickname}`,
        secondRole: (role) => `Segundo puesto: ${role}`,
        age: (years, exact) => (exact ? `${years} años` : `~${years} años`),
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
        scene: 'Unx arquerx en su línea, esperando un penal',
        keyLabel: 'Clave de acceso',
        keyPlaceholder: 'Clave',
        shoot: 'Patear',
    },

    form: {
        newPlayer: 'Jugadorx nuevx',
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
        secondPosition: 'Segundo puesto',
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
        wantsYou: (nickname) => `${nickname} quiere jugar con ellx`,
        avoidsYou: (nickname) => `${nickname} lx evita`,
        extraInfo: 'Más datos',
        save: 'Guardar cambios',
        add: 'Sumar jugadorx',
        active: 'Activx',
        activeHint: 'Apagado: no aparece en la lista ni se puede elegir. No se borra nada.',
        notes: 'Notas',
        notesHint: 'Solo para vos. Privacy mode las oculta.',
        birthDate: 'Nacimiento',
        birthDay: 'Día',
        birthMonth: 'Mes',
        birthYear: 'Año',
        birthPlaceholder: { day: 'DD', month: 'MM', year: 'AAAA' },
        birthDateInvalid: 'Revisá la fecha. Con el año alcanza.',
        age: (years, exact) => (exact ? `${years} años` : `unos ${years} años`),
        groups: 'Grupos',
        groupsEmpty: 'Todavía no hay grupos',
        newItem: '+ Nuevo',
        newTeam: 'Equipo nuevo',
        newGroup: 'Grupo nuevo',
        newTeamName: 'Nombre del equipo',
        newGroupName: 'Nombre del grupo',
        create: 'Crear',
        teamColor1: 'Color principal',
        teamColor2: 'Segundo color',
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
        ratingDiff: (diff, favors) => `rating +${diff} para ${tok(favors)}`,
        ratingEven: 'rating igual',
        social: 'Social',
        wantsKept: (met, total) => `Wants ${met}/${total}`,
        avoidsKept: (met, total) => `Avoids ${met}/${total}`,
        noLinks: 'No hay links entre ellxs',
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
                    return `Hay ${cause.count} GK elegidxs y el máximo es ${cause.maxPerTeam} por equipo.`;
                case 'tooManyDEF':
                    return `Hay ${cause.count} DEF elegidxs y el máximo es ${cause.maxPerTeam} por equipo.`;
                case 'fewKeepers':
                    return `Hay ${cause.gkCount} GK elegidxs y solo ${cause.capable} arquerxs de emergencia: cada equipo sin GK necesita ${cause.neededPerTeam}.`;
                case 'wantsChain':
                    return `Los wants mutuos encadenan a ${cause.nicknames.length} jugadorxs (${cause.nicknames.join(', ')}) y en un equipo entran ${cause.teamSize}.`;
                case 'avoidInChain':
                    return `${cause.from} evita a ${cause.to}, pero los wants mutuos lxs encadenan en el mismo equipo.`;
            }
        },
        issue: (issue: RuleIssue): string => {
            switch (issue.kind) {
                case 'avoidTogether':
                    return issue.link.mutual
                        ? `${issue.link.from} y ${issue.link.to} se evitan y quedaron juntxs.`
                        : `${issue.link.from} evita a ${issue.link.to} y quedaron juntxs.`;
                case 'wantSplit':
                    return `${issue.link.from} y ${issue.link.to} quieren jugar juntxs y quedaron separadxs.`;
                case 'ownerOnStronger':
                    return `${issue.nickname} quedó en el equipo más fuerte.`;
                case 'defSplit':
                    return `Lxs 2 DEF van unx por equipo: ${tok('T1')} tiene ${issue.team1} y ${tok('T2')}, ${issue.team2}.`;
                case 'attSplit':
                    return `Lxs ATT pueden diferir en 1 como mucho: ${tok('T1')} tiene ${issue.team1} y ${tok('T2')}, ${issue.team2}.`;
                case 'tooManyGK':
                    return `${tok(issue.team)} quedó con ${issue.count} GK (máximo ${issue.max}).`;
                case 'tooManyDEF':
                    return `${tok(issue.team)} quedó con ${issue.count} DEF (máximo ${issue.max}).`;
                case 'fewKeepers':
                    return `${tok(issue.team)} no tiene GK y tiene ${issue.capable} de lxs ${issue.needed} arquerxs de emergencia que necesita.`;
            }
        },

        showAnalysis: 'Análisis completo',
        hideAnalysis: 'Ocultar análisis',

        inWords: 'En palabras',
        lead: {
            balance: 'Parejo',
            rating: 'Rating',
            attributes: 'Atributos',
            keepers: 'Arquerxs',
            att: 'ATT',
            cover: 'Puestos',
            links: 'Links',
        },
        balanceSentence: (label, score) => `${BALANCE_SENTENCE[label]} Score ${signed(score)}: cuanto más alto, más parejo.`,
        ratingSentence: (diff, favors, totals) => {
            const detail = totals ? ` (${totals[0]} a ${totals[1]})` : '';
            if (favors === 'Even') return `Los dos equipos suman el mismo rating${detail}.`;
            return `${tok(favors)} suma ${diff} ${diff === 1 ? 'punto' : 'puntos'} más de rating${detail}.`;
        },
        attributesSentence: (team1, team2, even) => {
            const parts: string[] = [];
            if (team1.length > 0) parts.push(`${tok('T1')} es mejor en ${list(team1)}`);
            if (team2.length > 0) parts.push(team1.length > 0 ? `${tok('T2')}, en ${list(team2)}` : `${tok('T2')} es mejor en ${list(team2)}`);
            if (parts.length === 0) return 'Iguales en todos los atributos.';
            return `${parts.join('; ')}.${even.length > 0 ? ` Iguales en ${list(even)}.` : ''}`;
        },
        keepersEach: 'Cada equipo tiene su GK.',
        keepersTeam: (label, gkCount, good, others, needed) => {
            if (gkCount === 1) return `${tok(label)} tiene su GK.`;
            if (gkCount > 1) return `${tok(label)} tiene ${gkCount} GK.`;
            const capable = good.length + others.length;
            if (capable === 0) return `${tok(label)} no tiene GK ni quien ataje (necesita ${needed}).`;
            if (capable < needed) {
                const can = capable === 1 ? 'puede' : 'pueden';
                return `${tok(label)} no tiene GK y solo ${can} atajar ${list([...good, ...others])} (necesita ${needed}).`;
            }
            if (good.length > 0) {
                const rest = others.length > 0 ? `; si hace falta, pueden ${others.length} más` : '';
                return `${tok(label)} no tiene GK: ${good.length === 1 ? 'ataja bien' : 'atajan bien'} ${list(good)}${rest}.`;
            }
            return capable <= 3
                ? `${tok(label)} no tiene GK: pueden atajar ${list(others)}, ningunx muy bien.`
                : `${tok(label)} no tiene GK: pueden atajar ${capable}, ningunx muy bien.`;
        },
        attSentence: (team1, team2) => `${tok('T1')} tiene ${team1} y ${tok('T2')}, ${team2}.`,
        coverSentence: (label, role, second) => {
            if (second.length === 0) return `${tok(label)} no tiene ${role}, y nadie ahí juega de ${role} como segundo puesto.`;
            const one = second.length === 1;
            const verb = role === 'DEF' ? (one ? 'defiende' : 'defienden') : one ? 'ataca' : 'atacan';
            return `${tok(label)} no tiene ${role}: ${verb} ${list(second)}, que también ${one ? 'juega' : 'juegan'} de ${role}.`;
        },
        linksSentence: (wantsMet, wantsTotal, avoidsMet, avoidsTotal) => {
            const parts: string[] = [];
            if (wantsTotal > 0) parts.push(`Wants cumplidos: ${wantsMet} de ${wantsTotal}, juegan juntxs.`);
            if (avoidsTotal > 0) parts.push(`Avoids cumplidos: ${avoidsMet} de ${avoidsTotal}, juegan separadxs.`);
            return parts.length > 0 ? parts.join(' ') : 'No hay wants ni avoids entre estxs diez.';
        },
        oneWaySplit: (penalty) =>
            `Para emparejar, se separaron estos wants de un solo lado (${penalty} puntos menos cada uno):`,
        wantsTogether: 'Juntxs',
        avoidsApart: 'Separadxs',

        comparison: '{T1} vs {T2}',
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
        scoreKeepers: 'Arquerxs de emergencia',
        scoreKeepersHelp: '+4 por cada unx buenx, −12 por cada unx que falta',
        scoreAtt: 'Reparto de ATT',
        scoreAttHelp: 'qué tan parejxs quedan lxs ATT',
        scoreWants: 'Wants de un solo lado separados',
        scoreCover: 'Equipos sin quien cubra DEF o ATT',
        scoreTimes: (value, weight) => `${value} × ${weight}`,
        scoreShort: {
            rating: 'la diferencia de rating',
            attributes: 'las diferencias de atributos',
            pace: 'la velocidad',
            stamina: 'el aire',
            defense: 'la marca',
            keepers: 'lxs arquerxs de emergencia',
            att: 'el reparto de ATT',
            wants: 'los wants de un solo lado',
            cover: 'la cobertura de DEF/ATT',
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
        movedTo: (label) => `Pasa a ${tok(label)}`,
        noSwaps: 'Sin cambios',
        copySecond: 'Copiar otra opción',
    },

    store: {
        missingUrl: 'Falta VITE_APPS_SCRIPT_URL. Agregala en .env (local) o en las variables de entorno de Vercel.',
        duplicateIds: (list) =>
            `Hay ids de jugadorx repetidos en Google Sheets: ${list}. Se muestra solo la primera fila; dale a cada fila su propio id.`,
        duplicateId: (id, firstRow, row) => `id ${id} (filas ${firstRow} y ${row})`,
        missingIds: (rows) =>
            `Hay jugadorxs sin id en Google Sheets (filas ${rows}). Agregales un id en la planilla antes de editarlxs acá.`,
        httpStatus: (status) => `Apps Script devolvió HTTP ${status}.`,
        keyRefused: 'La clave de acceso fue rechazada. Escribila de nuevo y reintentá.',
        answered: (text) => `Apps Script respondió: ${text || '(respuesta vacía)'}`,
        timeout: (seconds) => `Apps Script no respondió en ${seconds} s.`,
        couldntClear: (label) => `No se pudieron borrar ${CLEARED[label] ?? label} en Google Sheets.`,
        noValidPlayers: 'No hay jugadorxs válidxs en Google Sheets',
        teamsError: 'No se pudieron cargar los equipos desde Google Sheets',
        couldntRefresh: (detail) =>
            `No se pudo actualizar desde Google Sheets. ${detail} Ves la copia guardada en este dispositivo; para editar hace falta una lectura nueva.`,
        couldntLoad: (detail) => `No se pudieron cargar los datos desde Google Sheets. ${detail}`,
        couldntAdd: (nickname) => `No se pudo guardar a lx jugadorx nuevx «${nickname}» en Google Sheets.`,
        couldntUpdate: (nickname) => `No se pudieron guardar los cambios de «${nickname}» en Google Sheets.`,
        couldntDelete: (label) => `No se pudo borrar a «${label}» en Google Sheets.`,
        rowWithoutId: 'Esta fila no tiene id en Google Sheets. Borrala ahí, o agregale un id primero.',
        groupsError: 'No se pudieron cargar los grupos desde Google Sheets',
        couldntAddTeam: (name) => `No se pudo guardar el equipo nuevo «${name}» en Google Sheets.`,
        couldntAddGroup: (name) => `No se pudo guardar el grupo nuevo «${name}» en Google Sheets.`,
    },
};
