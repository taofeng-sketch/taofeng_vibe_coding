export const groups = {
  A: [["Mexico", "墨西哥", "🇲🇽", 15, 77, "Santiago Giménez"], ["South Africa", "南非", "🇿🇦", 61, 61, "Lyle Foster"], ["South Korea", "韩国", "🇰🇷", 22, 73, "Son Heung-min"], ["Czechia", "捷克", "🇨🇿", 44, 66, "Patrik Schick"]],
  B: [["Canada", "加拿大", "🇨🇦", 27, 72, "Alphonso Davies"], ["Bosnia & Herzegovina", "波黑", "🇧🇦", 71, 59, "Ermedin Demirović"], ["Qatar", "卡塔尔", "🇶🇦", 51, 64, "Akram Afif"], ["Switzerland", "瑞士", "🇨🇭", 17, 76, "Granit Xhaka"]],
  C: [["Brazil", "巴西", "🇧🇷", 5, 88, "Vinícius Júnior"], ["Morocco", "摩洛哥", "🇲🇦", 11, 82, "Achraf Hakimi"], ["Haiti", "海地", "🇭🇹", 84, 55, "Duckens Nazon"], ["Scotland", "苏格兰", "🏴", 36, 69, "Scott McTominay"]],
  D: [["United States", "美国", "🇺🇸", 14, 81, "Christian Pulisic"], ["Paraguay", "巴拉圭", "🇵🇾", 39, 66, "Miguel Almirón"], ["Australia", "澳大利亚", "🇦🇺", 26, 70, "Jackson Irvine"], ["Türkiye", "土耳其", "🇹🇷", 25, 74, "Arda Güler"]],
  E: [["Germany", "德国", "🇩🇪", 9, 85, "Jamal Musiala"], ["Curaçao", "库拉索", "🇨🇼", 82, 54, "Juninho Bacuna"], ["Ivory Coast", "科特迪瓦", "🇨🇮", 31, 72, "Simon Adingra"], ["Ecuador", "厄瓜多尔", "🇪🇨", 23, 75, "Moisés Caicedo"]],
  F: [["Netherlands", "荷兰", "🇳🇱", 7, 84, "Cody Gakpo"], ["Japan", "日本", "🇯🇵", 18, 79, "Takefusa Kubo"], ["Sweden", "瑞典", "🇸🇪", 43, 68, "Alexander Isak"], ["Tunisia", "突尼斯", "🇹🇳", 40, 65, "Ellyes Skhiri"]],
  G: [["Belgium", "比利时", "🇧🇪", 8, 81, "Jérémy Doku"], ["Egypt", "埃及", "🇪🇬", 34, 71, "Mohamed Salah"], ["Iran", "伊朗", "🇮🇷", 20, 73, "Mehdi Taremi"], ["New Zealand", "新西兰", "🇳🇿", 86, 52, "Chris Wood"]],
  H: [["Spain", "西班牙", "🇪🇸", 1, 91, "Lamine Yamal"], ["Cape Verde", "佛得角", "🇨🇻", 68, 58, "Ryan Mendes"], ["Saudi Arabia", "沙特阿拉伯", "🇸🇦", 60, 63, "Salem Al-Dawsari"], ["Uruguay", "乌拉圭", "🇺🇾", 16, 80, "Federico Valverde"]],
  I: [["France", "法国", "🇫🇷", 3, 90, "Kylian Mbappé"], ["Senegal", "塞内加尔", "🇸🇳", 19, 77, "Sadio Mané"], ["Iraq", "伊拉克", "🇮🇶", 58, 62, "Ali Jasim"], ["Norway", "挪威", "🇳🇴", 29, 78, "Erling Haaland"]],
  J: [["Argentina", "阿根廷", "🇦🇷", 2, 90, "Lionel Messi"], ["Algeria", "阿尔及利亚", "🇩🇿", 35, 70, "Riyad Mahrez"], ["Austria", "奥地利", "🇦🇹", 24, 76, "Marcel Sabitzer"], ["Jordan", "约旦", "🇯🇴", 66, 59, "Mousa Al-Taamari"]],
  K: [["Portugal", "葡萄牙", "🇵🇹", 6, 86, "Cristiano Ronaldo"], ["DR Congo", "刚果（金）", "🇨🇩", 56, 64, "Yoane Wissa"], ["Uzbekistan", "乌兹别克斯坦", "🇺🇿", 50, 67, "Eldor Shomurodov"], ["Colombia", "哥伦比亚", "🇨🇴", 13, 80, "Luis Díaz"]],
  L: [["England", "英格兰", "🏴", 4, 88, "Jude Bellingham"], ["Croatia", "克罗地亚", "🇭🇷", 10, 79, "Joško Gvardiol"], ["Ghana", "加纳", "🇬🇭", 72, 63, "Mohammed Kudus"], ["Panama", "巴拿马", "🇵🇦", 30, 67, "Adalberto Carrasquilla"]]
};

export const teams = Object.entries(groups).flatMap(([group, entries]) =>
  entries.map(([name, zh, flag, rank, power, star], index) => ({
    id: name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, ""),
    name, zh, flag, rank, power, star, group, seed: index + 1,
    form: Math.max(48, Math.min(94, power + ((rank * 7) % 13) - 5)),
    supporters: 18 + ((power * rank) % 79)
  }))
);

const findTeam = (name) => teams.find((team) => team.name === name);

export const matchDays = {
  yesterday: [
    { home: "Mexico", away: "South Africa", time: "FT", venue: "Mexico City", score: "2 — 0", status: "finished" },
    { home: "South Korea", away: "Czechia", time: "FT", venue: "Guadalajara", score: "2 — 1", status: "finished" },
    { home: "United States", away: "Paraguay", time: "FT", venue: "Los Angeles", score: "4 — 1", status: "finished" },
    { home: "Canada", away: "Bosnia & Herzegovina", time: "FT", venue: "Toronto", score: "1 — 1", status: "finished" }
  ],
  today: [
    { home: "Qatar", away: "Switzerland", time: "12:00", venue: "San Francisco Bay Area", status: "upcoming" },
    { home: "Brazil", away: "Morocco", time: "15:00", venue: "New York / New Jersey", status: "featured" },
    { home: "Haiti", away: "Scotland", time: "18:00", venue: "Boston", status: "upcoming" },
    { home: "Australia", away: "Türkiye", time: "21:00", venue: "Vancouver", status: "upcoming" }
  ],
  tomorrow: [
    { home: "Germany", away: "Curaçao", time: "13:00", venue: "Houston", status: "upcoming" },
    { home: "Netherlands", away: "Japan", time: "16:00", venue: "Dallas", status: "featured" },
    { home: "Ivory Coast", away: "Ecuador", time: "19:00", venue: "Philadelphia", status: "upcoming" },
    { home: "Sweden", away: "Tunisia", time: "22:00", venue: "Monterrey", status: "upcoming" }
  ]
};

export function hydrateMatch(match) {
  return { ...match, homeTeam: findTeam(match.home), awayTeam: findTeam(match.away) };
}
