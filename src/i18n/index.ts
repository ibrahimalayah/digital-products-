// One dictionary per language: { "English text": "translation" }. English needs none.
import type { Dict } from "@/lib/i18n";
import type { LanguageId } from "@/lib/languages";
import es from "./es.json";
import fr from "./fr.json";
import de from "./de.json";
import pt from "./pt.json";
import it from "./it.json";
import nl from "./nl.json";
import sv from "./sv.json";
import da from "./da.json";
import no from "./no.json";
import ar from "./ar.json";

export const DICTS: Record<LanguageId, Dict> = { en: {}, es, fr, de, pt, it, nl, sv, da, no, ar };

export const dictFor = (lang: LanguageId): Dict => DICTS[lang] ?? {};
