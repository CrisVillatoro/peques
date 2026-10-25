// Two languages, one flat dictionary. German is the default in Berlin;
// English is there for anyone reading this as a portfolio piece.
//
// Adding a language later means adding one block here — nothing in the
// components needs to change.

export const LANGS = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
];

const STRINGS = {
  de: {
    tagline: "Schöne Ideen für die Kleinen, in Berlin",
    "greeting.morning": "Guten Morgen.",
    "greeting.afternoon": "Guten Tag.",
    "greeting.evening": "Guten Abend.",
    "greeting.question": "Was machen wir?",

    "where.change": "ändern",
    "where.locating": "suche dich…",
    "where.near": "In deiner Nähe",
    "where.berlin": "Berlin (ungefähr)",
    "where.search": "Straße, Kiez oder Ort in Berlin",
    "where.searchButton": "Suchen",
    "where.useLocation": "📍 Meinen Standort nutzen",
    "where.nothing": "Dazu wurde in Berlin nichts gefunden.",
    "where.unavailable": "Die Suche ist gerade nicht erreichbar — nimm unten einen Bezirk.",

    "loading.title": "Orte werden geladen…",
    "loading.sub": "{percent}% von {size} — einmalig, danach liegt alles im Browser.",
    "loading.subPlain": "Lade die Orte aus OpenStreetMap — einmalig, danach liegt alles im Browser.",
    "loading.ready": "{count} Orte geladen.",
    "controls.show": "Ändern",
    "controls.hide": "Fertig",
    "kids.none": "niemand ausgewählt",
    "filter.label": "Was für ein Ort?",
    "filter.all": "Alles",
    "browse.title": "Alle {count} Orte",
    "browse.more": "Weitere {count} anzeigen",
    "browse.showing": "{shown} von {total} angezeigt",
    "browse.open": "Öffnen",
    "far.label": "Wie weit?",
    "far.all": "Ganz Berlin",

    "when.label": "Wann?",
    "when.today": "Heute",
    "when.tomorrow": "Morgen",
    "when.now": "Jetzt gleich",
    "when.morning": "Vormittag",
    "when.midday": "Mittag",
    "when.afternoon": "Nachmittag",
    "when.late": "Später Nachmittag",
    "when.pickDate": "Anderes Datum wählen",
    "when.atTime": "heute um {time}",
    "when.rightNow": "jetzt gleich ({time})",
    "when.tomorrowAt": "morgen um {time}",
    "when.noForecast": "Mehr als {days} Tage im Voraus — dafür gibt es noch keine Vorhersage, das Wetter wird also nicht berücksichtigt.",

    "kids.label": "Wer kommt mit?",
    "kids.little": "Kleines",
    "kids.friend": "Freund:in",
    "kids.add": "Dazu",
    "kids.promptBirth": "Geburtsmonat des Kindes (JJJJ-MM). Namen brauchen wir nicht.",
    "kids.promptName": "Kurzer Name dafür (optional)",
    "kids.defaultName": "Kind",

    "setting.label": "Drinnen oder draußen?",
    "setting.indoor": "Drinnen",
    "setting.auto": "Wetter entscheidet",
    "setting.outdoor": "Draußen",
    "setting.onlyIndoor": "Nur Orte drinnen.",
    "setting.outdoorRain": "Draußen also — ich zeige dir zusätzlich etwas Überdachtes.",
    "setting.outdoorFirst": "Zuerst Orte draußen.",

    "find.button": "Etwas finden",
    "find.sub": "{count} Orte offen {when}",
    "find.subOne": "{count} Ort offen {when}",
    "find.loading": "lade Orte…",

    "results.pick": "Euer Vorschlag für {when}",
    "results.none": "Nichts offen {when}",
    "results.from": "ab {place}{radius}",
    "results.radius": " · im Umkreis von {km} km",
    "results.allBerlin": " · ganz Berlin",
    "results.list": "Liste",
    "results.map": "Karte",
    "results.top": "Top-Tipp",
    "results.empty":
      "Nichts passt {when} im Umkreis von {radius}. Versuch einen größeren Umkreis, eine andere Tageszeit oder „Wetter entscheidet“.",
    "results.placeholder":
      "Wähle Ort, Zeit und wer mitkommt — dann tippe auf {button}.",

    "card.indoor": "Drinnen",
    "card.outdoor": "Draußen",
    "card.mixed": "Gemischt",
    "card.walk": "Min. zu Fuß",
    "card.transit": "Min. mit Öffis",
    "card.fitGreat": "Passt super",
    "card.fitGood": "Passt gut",
    "card.fitOk": "Passt",
    "card.typical": "meist",
    "card.why": "Warum:",
    "card.changing": "Wickeltisch",
    "card.stroller": "Kinderwagen",
    "card.highchair": "Hochstuhl",
    "card.playArea": "Spielecke",
    "card.yes": "ja",
    "card.no": "nein",
    "card.unknown": "unbekannt",
    "card.toilets": "Toiletten",
    "card.noFacts": "Keine Angaben zur Ausstattung — das heißt nicht, dass es nichts gibt.",
    "card.alwaysOpen": "immer offen",
    "card.free": "Gratis",
    "card.thenWhat": "Und danach?",
    "card.minWalk": "Min. zu Fuß",
    "card.withHighchair": " · Hochstuhl",
    "card.withChanging": " · Wickeltisch",
    "card.directions": "Route",
    "card.hours": "Öffnungszeiten",
    "card.more": "Mehr",
    "card.less": "Weniger",

    "why.indoorFull": "Komplett drinnen",
    "why.indoorMostly": "Überwiegend überdacht",
    "why.water": "Wasser und Schatten",
    "why.coolInside": "Drinnen und kühl",
    "why.outdoor": "Draußen",
    "why.outdoorShelter": "Draußen, mit Unterstand in der Nähe",
    "why.travelWalk": "{minutes} Min. zu Fuß",
    "why.travelTransit": "{minutes} Min. mit Öffis",
    "why.fitsAll": "passt allen, die mitkommen",
    "why.fitsGroup": "passt zu euch",
    "why.free": "kostenlos",
    "why.wellEquipped": "Wickeltisch und Hochstuhl sind da.",
    "why.changing": "Wickeltisch vorhanden.",
    "why.hoursKnown": "Öffnungszeiten laut OSM: {hours}.",
    "why.fromAge": "Laut Karte ab {age} Jahren.",

    "weather.none": "Keine Vorhersage für die Zeit — ich zeige dir Gemischtes.",
    "weather.indoorRain": "Drinnen: Regen ist wahrscheinlich ({temp}).",
    "weather.indoorCold": "Drinnen: {temp} und ungemütlich draußen.",
    "weather.hot": "Heiß ({temp}): Wasser und Schatten zuerst.",
    "weather.cool": "Trocken, aber kühl ({temp}): kurz raus, Café in der Nähe.",
    "weather.dry": "Trocken und {temp}: zuerst nach draußen.",
    "weather.checking": "prüfe Wetter…",
    "weather.noTime": "Kein Wetter für die Zeit",
    "weather.tooFar": "So weit im Voraus gibt es keine Vorhersage (ca. {days} Tage)",

    "footer.searching":
      "Durchsucht {total} Orte: {curated} von Hand geschrieben, {osm} aus OpenStreetMap importiert.",
    "footer.seedOnly":
      "Nur die {curated} von Hand geschriebenen Orte sind geladen — führe {command} aus, um den Rest zu holen.",
    "footer.about":
      "Peques v0.1 · Öffnungszeiten sind Richtwerte, schau immer auf der Seite des Orts nach. Wetter von {weather}. Adresssuche und importierte Orte von {osm}. Geburtsmonate und dein letzter Ort bleiben in diesem Browser; nichts wird an einen Server geschickt.",
  },

  en: {
    tagline: "Good things to do with the little ones, in Berlin",
    "greeting.morning": "Good morning.",
    "greeting.afternoon": "Good afternoon.",
    "greeting.evening": "Good evening.",
    "greeting.question": "What shall we do?",

    "where.change": "change",
    "where.locating": "finding you…",
    "where.near": "Near you",
    "where.berlin": "Berlin (approx.)",
    "where.search": "Street, Kiez or place in Berlin",
    "where.searchButton": "Search",
    "where.useLocation": "📍 Use my location",
    "where.nothing": "Nothing found in Berlin for that.",
    "where.unavailable": "Search is unavailable right now — try a district below.",

    "loading.title": "Loading places…",
    "loading.sub": "{percent}% of {size} — once only, then it stays in your browser.",
    "loading.subPlain": "Fetching the places from OpenStreetMap — once only, then it stays in your browser.",
    "loading.ready": "{count} places loaded.",
    "controls.show": "Change",
    "controls.hide": "Done",
    "kids.none": "nobody selected",
    "filter.label": "What kind of place?",
    "filter.all": "Everything",
    "browse.title": "All {count} places",
    "browse.more": "Show {count} more",
    "browse.showing": "showing {shown} of {total}",
    "browse.open": "Open",
    "far.label": "How far?",
    "far.all": "All Berlin",

    "when.label": "When?",
    "when.today": "Today",
    "when.tomorrow": "Tomorrow",
    "when.now": "Right now",
    "when.morning": "Morning",
    "when.midday": "Midday",
    "when.afternoon": "Afternoon",
    "when.late": "Late afternoon",
    "when.pickDate": "Pick another date",
    "when.atTime": "today at {time}",
    "when.rightNow": "right now ({time})",
    "when.tomorrowAt": "tomorrow at {time}",
    "when.noForecast": "More than {days} days ahead, so there is no forecast yet — results ignore the weather.",

    "kids.label": "Who's coming?",
    "kids.little": "Little one",
    "kids.friend": "Friend",
    "kids.add": "Add",
    "kids.promptBirth": "Birth month of the child (YYYY-MM). No names needed.",
    "kids.promptName": "A short label for them (optional)",
    "kids.defaultName": "Child",

    "setting.label": "Inside or outside?",
    "setting.indoor": "Indoor",
    "setting.auto": "Weather decides",
    "setting.outdoor": "Outdoor",
    "setting.onlyIndoor": "Only indoor places.",
    "setting.outdoorRain": "Outdoor it is — I will show a covered option too.",
    "setting.outdoorFirst": "Outdoor places first.",

    "find.button": "Find something",
    "find.sub": "{count} places open {when}",
    "find.subOne": "{count} place open {when}",
    "find.loading": "loading places…",

    "results.pick": "Your pick for {when}",
    "results.none": "Nothing open {when}",
    "results.from": "from {place}{radius}",
    "results.radius": " · within {km} km",
    "results.allBerlin": " · all Berlin",
    "results.list": "List",
    "results.map": "Map",
    "results.top": "Top pick",
    "results.empty":
      "Nothing matches {when} within {radius}. Try a wider radius, another time of day, or “Weather decides”.",
    "results.placeholder": "Pick where you are, when you're going and who's coming — then tap {button}.",

    "card.indoor": "Indoor",
    "card.outdoor": "Outdoor",
    "card.mixed": "Mixed",
    "card.walk": "min walk",
    "card.transit": "min by transit",
    "card.fitGreat": "Great fit",
    "card.fitGood": "Good fit",
    "card.fitOk": "OK fit",
    "card.typical": "typical",
    "card.why": "Why:",
    "card.changing": "Changing table",
    "card.stroller": "Stroller",
    "card.highchair": "High chair",
    "card.playArea": "Play area",
    "card.yes": "yes",
    "card.no": "no",
    "card.unknown": "unknown",
    "card.toilets": "Toilets",
    "card.noFacts": "Nothing recorded about the facilities — which doesn't mean there are none.",
    "card.alwaysOpen": "always open",
    "card.free": "Free",
    "card.thenWhat": "Then what?",
    "card.minWalk": "min walk",
    "card.withHighchair": " · high chair",
    "card.withChanging": " · changing table",
    "card.directions": "Directions",
    "card.hours": "Opening hours",
    "card.more": "More",
    "card.less": "Less",

    "why.indoorFull": "Fully indoors",
    "why.indoorMostly": "Mostly under cover",
    "why.water": "Water and shade",
    "why.coolInside": "Cool inside",
    "why.outdoor": "Outdoors",
    "why.outdoorShelter": "Outdoors with shelter nearby",
    "why.travelWalk": "{minutes} min on foot",
    "why.travelTransit": "{minutes} min by public transport",
    "why.fitsAll": "a good match for everyone coming",
    "why.fitsGroup": "suits your group",
    "why.free": "free",
    "why.wellEquipped": "Changing table and high chair are there.",
    "why.changing": "There is a changing table.",
    "why.hoursKnown": "Opening hours per OSM: {hours}.",
    "why.fromAge": "Mapped as suitable from age {age}.",

    "weather.none": "No forecast for that time, so I am showing a mix.",
    "weather.indoorRain": "Indoors: rain is likely ({temp}).",
    "weather.indoorCold": "Indoors: {temp} and uncomfortable outside.",
    "weather.hot": "Hot ({temp}): water and shade first.",
    "weather.cool": "Dry but cool ({temp}): outdoors, keep it short, café nearby.",
    "weather.dry": "Dry and {temp}: outdoors first.",
    "weather.checking": "checking weather…",
    "weather.noTime": "No weather for that time",
    "weather.tooFar": "No forecast that far ahead (about {days} days)",

    "footer.searching":
      "Searching {total} places: {curated} written by hand, {osm} imported from OpenStreetMap.",
    "footer.seedOnly": "Only the {curated} hand-written places are loaded — run {command} to add the rest.",
    "footer.about":
      "Peques v0.1 · Opening hours are typical values, always check the venue's own page. Weather from {weather}. Address search and imported places from {osm}. Your children's birth months and your last location stay in this browser; nothing is sent to a server.",
  },
};

export const DEFAULT_LANG = "de";

/** German unless the browser clearly prefers English. */
export function detectLang() {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  const pref = (navigator.languages || [navigator.language || ""])[0] || "";
  return pref.toLowerCase().startsWith("en") ? "en" : DEFAULT_LANG;
}

/** t("find.sub", { count: 12, when: "heute" }) */
export function translator(lang) {
  const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  return function t(key, vars) {
    let s = dict[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
