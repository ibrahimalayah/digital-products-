// Which language a visitor gets, and the translated text of the site header and
// the main page's opening. The rest of the interface is English for now.
import { isLanguage, type LanguageId } from "./languages";

export const LANG_COOKIE = "kf_lang";

/** Names as their own speakers write them, for the picker. */
export const NATIVE_NAMES: Record<LanguageId, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  sv: "Svenska",
  da: "Dansk",
  no: "Norsk",
  ar: "العربية",
};

// Browser codes that mean one of ours under another name.
const ALIASES: Record<string, LanguageId> = { nb: "no", nn: "no" };

/**
 * A saved choice wins. Otherwise the browser's preferred languages are tried in
 * the visitor's own order ("sv-SE,sv;q=0.9,en;q=0.8" gives Swedish). The
 * browser's language is a better signal than location: someone in Sweden may
 * well read Arabic, and their browser says so.
 */
export function pickLanguage(saved: string | undefined | null, acceptLanguage: string | undefined | null): LanguageId {
  if (isLanguage(saved)) return saved;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { code: tag.toLowerCase().split("-")[0], q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((x) => x.code && x.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { code } of wanted) {
    const id = ALIASES[code] ?? code;
    if (isLanguage(id)) return id;
  }
  return "en";
}

export type SiteText = {
  how: string;
  store: string;
  pricing: string;
  signIn: string;
  openStudio: string;
  /** The headline in three parts; the middle one is emphasised. */
  title: [string, string, string];
  sub: string;
  startFree: string;
  browse: string;
  language: string;
};

const TEXT: Record<LanguageId, SiteText> = {
  en: {
    how: "How it works",
    store: "Store",
    pricing: "Pricing",
    signIn: "Sign in",
    openStudio: "Open studio",
    title: ["From one idea to a product that ", "sells itself", " daily."],
    sub: "Kitforge researches what to make, writes the full printable product, and promotes it every day on the budget you set. You approve; the agents do the rest.",
    startFree: "Start free",
    browse: "Browse the store",
    language: "Language",
  },
  es: {
    how: "Cómo funciona",
    store: "Tienda",
    pricing: "Precios",
    signIn: "Iniciar sesión",
    openStudio: "Abrir el estudio",
    title: ["De una idea a un producto que ", "se vende solo", " cada día."],
    sub: "Kitforge investiga qué crear, escribe el producto imprimible completo y lo promociona cada día con el presupuesto que tú fijas. Tú apruebas; los agentes hacen el resto.",
    startFree: "Empieza gratis",
    browse: "Ver la tienda",
    language: "Idioma",
  },
  fr: {
    how: "Comment ça marche",
    store: "Boutique",
    pricing: "Tarifs",
    signIn: "Se connecter",
    openStudio: "Ouvrir le studio",
    title: ["D'une idée à un produit qui ", "se vend tout seul", " chaque jour."],
    sub: "Kitforge cherche quoi créer, rédige le produit imprimable en entier et en fait la promotion chaque jour avec le budget que vous fixez. Vous validez ; les agents font le reste.",
    startFree: "Commencer gratuitement",
    browse: "Voir la boutique",
    language: "Langue",
  },
  de: {
    how: "So funktioniert es",
    store: "Shop",
    pricing: "Preise",
    signIn: "Anmelden",
    openStudio: "Studio öffnen",
    title: ["Von einer Idee zu einem Produkt, das ", "sich selbst verkauft", " – jeden Tag."],
    sub: "Kitforge findet heraus, was sich lohnt, schreibt das komplette druckfertige Produkt und bewirbt es täglich mit dem Budget, das du festlegst. Du gibst frei; die Agenten erledigen den Rest.",
    startFree: "Kostenlos starten",
    browse: "Zum Shop",
    language: "Sprache",
  },
  pt: {
    how: "Como funciona",
    store: "Loja",
    pricing: "Preços",
    signIn: "Entrar",
    openStudio: "Abrir o estúdio",
    title: ["De uma ideia a um produto que ", "se vende sozinho", " todos os dias."],
    sub: "O Kitforge pesquisa o que criar, escreve o produto imprimível completo e promove-o todos os dias com o orçamento que definir. Você aprova; os agentes fazem o resto.",
    startFree: "Começar grátis",
    browse: "Ver a loja",
    language: "Idioma",
  },
  it: {
    how: "Come funziona",
    store: "Negozio",
    pricing: "Prezzi",
    signIn: "Accedi",
    openStudio: "Apri lo studio",
    title: ["Da un'idea a un prodotto che ", "si vende da solo", " ogni giorno."],
    sub: "Kitforge studia cosa creare, scrive l'intero prodotto stampabile e lo promuove ogni giorno con il budget che decidi tu. Tu approvi; gli agenti fanno il resto.",
    startFree: "Inizia gratis",
    browse: "Vai al negozio",
    language: "Lingua",
  },
  nl: {
    how: "Zo werkt het",
    store: "Winkel",
    pricing: "Prijzen",
    signIn: "Inloggen",
    openStudio: "Studio openen",
    title: ["Van één idee naar een product dat ", "zichzelf verkoopt", ", elke dag."],
    sub: "Kitforge zoekt uit wat je kunt maken, schrijft het volledige printbare product en promoot het elke dag binnen het budget dat jij kiest. Jij keurt goed; de agents doen de rest.",
    startFree: "Gratis beginnen",
    browse: "Bekijk de winkel",
    language: "Taal",
  },
  sv: {
    how: "Så fungerar det",
    store: "Butik",
    pricing: "Priser",
    signIn: "Logga in",
    openStudio: "Öppna studion",
    title: ["Från en idé till en produkt som ", "säljer sig själv", " varje dag."],
    sub: "Kitforge tar reda på vad du ska skapa, skriver hela den utskrivbara produkten och marknadsför den varje dag inom den budget du väljer. Du godkänner; agenterna gör resten.",
    startFree: "Börja gratis",
    browse: "Se butiken",
    language: "Språk",
  },
  da: {
    how: "Sådan virker det",
    store: "Butik",
    pricing: "Priser",
    signIn: "Log ind",
    openStudio: "Åbn studiet",
    title: ["Fra én idé til et produkt, der ", "sælger sig selv", " hver dag."],
    sub: "Kitforge finder ud af, hvad du skal lave, skriver hele det printbare produkt og markedsfører det hver dag inden for det budget, du vælger. Du godkender; agenterne klarer resten.",
    startFree: "Start gratis",
    browse: "Se butikken",
    language: "Sprog",
  },
  no: {
    how: "Slik fungerer det",
    store: "Butikk",
    pricing: "Priser",
    signIn: "Logg inn",
    openStudio: "Åpne studioet",
    title: ["Fra én idé til et produkt som ", "selger seg selv", " hver dag."],
    sub: "Kitforge finner ut hva du bør lage, skriver hele det utskrivbare produktet og markedsfører det hver dag innenfor budsjettet du velger. Du godkjenner; agentene gjør resten.",
    startFree: "Start gratis",
    browse: "Se butikken",
    language: "Språk",
  },
  ar: {
    how: "كيف يعمل",
    store: "المتجر",
    pricing: "الأسعار",
    signIn: "تسجيل الدخول",
    openStudio: "افتح الاستوديو",
    title: ["من فكرة واحدة إلى منتج ", "يبيع نفسه", " كل يوم."],
    sub: "يبحث Kitforge عمّا يستحق أن تصنعه، ويكتب المنتج القابل للطباعة كاملًا، ويروّج له كل يوم ضمن الميزانية التي تحددها. أنت توافق، والوكلاء يتولّون الباقي.",
    startFree: "ابدأ مجانًا",
    browse: "تصفّح المتجر",
    language: "اللغة",
  },
};

export const siteText = (id: LanguageId): SiteText => TEXT[id];
