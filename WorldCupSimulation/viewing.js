export const viewingRegions = {
  gb: {
    name: "United Kingdom", zh: "英国", flag: "🇬🇧", status: "available",
    providers: [
      { name: "BBC iPlayer", url: "https://www.bbc.co.uk/iplayer/categories/sport/featured" },
      { name: "ITVX", url: "https://www.itv.com/football" }
    ]
  },
  us: {
    name: "United States", zh: "美国", flag: "🇺🇸", status: "available",
    providers: [
      { name: "FOX Sports", url: "https://www.foxsports.com/soccer/fifa-world-cup" },
      { name: "Telemundo Deportes", url: "https://www.telemundo.com/deportes" }
    ]
  },
  ca: {
    name: "Canada", zh: "加拿大", flag: "🇨🇦", status: "available",
    providers: [
      { name: "CTV / TSN", url: "https://www.tsn.ca/soccer/fifa-world-cup" },
      { name: "RDS", url: "https://www.rds.ca/soccer" }
    ]
  },
  au: {
    name: "Australia", zh: "澳大利亚", flag: "🇦🇺", status: "available",
    providers: [{ name: "SBS On Demand", url: "https://www.sbs.com.au/ondemand/sport" }]
  },
  de: {
    name: "Germany", zh: "德国", flag: "🇩🇪", status: "available",
    providers: [
      { name: "ARD", url: "https://www.ardmediathek.de/sport" },
      { name: "ZDF", url: "https://www.zdf.de/sport" },
      { name: "MagentaTV", url: "https://www.magentatv.de/" }
    ]
  },
  fr: {
    name: "France", zh: "法国", flag: "🇫🇷", status: "available",
    providers: [
      { name: "M6+", url: "https://www.m6.fr/" },
      { name: "beIN Sports", url: "https://www.beinsports.com/fr-fr" }
    ]
  },
  es: {
    name: "Spain", zh: "西班牙", flag: "🇪🇸", status: "available",
    providers: [
      { name: "RTVE Play", url: "https://www.rtve.es/play/" },
      { name: "DAZN", url: "https://www.dazn.com/" }
    ]
  },
  it: {
    name: "Italy", zh: "意大利", flag: "🇮🇹", status: "available",
    providers: [
      { name: "RaiPlay", url: "https://www.raiplay.it/dirette" },
      { name: "DAZN", url: "https://www.dazn.com/" }
    ]
  },
  il: {
    name: "Israel", zh: "以色列", flag: "🇮🇱", status: "available",
    providers: [
      { name: "KAN 11", url: "https://www.kan.org.il/live/" },
      { name: "Charlton", url: "https://www.sport1.co.il/" }
    ]
  },
  cn: { name: "China", zh: "中国", flag: "🇨🇳", status: "unverified", providers: [] },
  other: { name: "Other region", zh: "其他地区", flag: "🌍", status: "unverified", providers: [] }
};

const ukAssignments = {
  1: "ITV1 / ITVX",
  3: "BBC One / BBC iPlayer",
  6: "BBC One / BBC iPlayer",
  7: "BBC One / BBC iPlayer",
  22: "ITV1 / ITVX"
};

const timezoneRegions = [
  [/^Europe\/London$/, "gb"],
  [/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana|Kentucky|North_Dakota)/, "us"],
  [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)/, "ca"],
  [/^Australia\//, "au"],
  [/^Europe\/Berlin$/, "de"],
  [/^Europe\/Paris$/, "fr"],
  [/^Europe\/Madrid$/, "es"],
  [/^Europe\/Rome$/, "it"],
  [/^Asia\/Jerusalem$/, "il"],
  [/^Asia\/Shanghai$/, "cn"]
];

export function detectViewingRegion(timeZone = "", language = "") {
  const match = timezoneRegions.find(([pattern]) => pattern.test(timeZone));
  if (match) return match[1];
  const locale = language.toLowerCase();
  if (locale.includes("-gb")) return "gb";
  if (locale.includes("-us")) return "us";
  if (locale.includes("-ca")) return "ca";
  if (locale.startsWith("zh")) return "cn";
  if (locale.startsWith("he")) return "il";
  return "other";
}

export function matchDateTime(match) {
  return new Date(match.startTime || `${match.date}T${match.time}:00+01:00`);
}

export function dateKeyForMatch(match, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone
  }).formatToParts(matchDateTime(match));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formattedMatchTime(match, timeZone, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone, timeZoneName: "short"
  }).format(matchDateTime(match));
}

export function broadcasterFor(match, regionKey) {
  const region = viewingRegions[regionKey] || viewingRegions.other;
  if (region.status !== "available") {
    return { status: "unverified", label: null, providers: [] };
  }
  const label = regionKey === "gb"
    ? ukAssignments[match.id] || "BBC / ITV · check listing"
    : region.providers.map((provider) => provider.name).join(" / ");
  const providers = regionKey !== "gb" || label.startsWith("BBC / ITV")
    ? region.providers
    : region.providers.filter((provider) => label.includes(provider.name === "ITVX" ? "ITV" : "BBC"));
  return {
    status: "available",
    label,
    providers
  };
}
