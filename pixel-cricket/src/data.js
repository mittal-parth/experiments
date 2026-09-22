/** Era sides from the mid-2000s, the years EA Cricket 07 lived on every PC. */

export const PITCH_LEN = 20.12;
export const CONTACT_Y = PITCH_LEN - 1.22;
export const STUMP_Y = PITCH_LEN;
export const STUMP_H = 0.71;
export const STUMP_HALF = 0.15;
export const OVERS = 5;
export const BALLS_PER_OVER = 6;

export const TEAMS = [
  {
    id: "ind",
    name: "India",
    short: "IND",
    city: "Mumbai",
    jersey: "#1F4FD0",
    jerseyDark: "#0E2E86",
    pants: "#F4F6FB",
    accent: "#FF8A1E",
    trim: "#138808",
    skinBase: "#E0A56A",
    players: [
      p("sehwag", "Virender Sehwag", "Sehwag", "R", "bat", 92, null, face("#C68642", "#1A120B", "short", "stubble", { build: "broad" }), 44),
      p("sachin", "Sachin Tendulkar", "Tendulkar", "R", "bat", 97, null, face("#D49A6A", "#140E0A", "curly", "none", { build: "slim" }), 10),
      p("dravid", "Rahul Dravid", "Dravid", "R", "bat", 93, null, face("#C68642", "#1A120B", "short", "none", { build: "normal" }), 19),
      p("ganguly", "Sourav Ganguly", "Ganguly", "L", "bat", 88, bowl("swing", 34, 0.35, 62), face("#E0A56A", "#24160E", "parted", "none", { build: "normal" }), 99),
      p("yuvraj", "Yuvraj Singh", "Yuvraj", "L", "bat", 90, bowl("offspin", 30, 0, 70), face("#C68642", "#1A120B", "short", "none", { build: "broad" }), 12),
      p("dhoni", "MS Dhoni", "Dhoni", "R", "wk", 89, null, face("#A86B45", "#1A120B", "long", "stubble", { sunglasses: true, build: "broad" }), 7),
      p("irfan", "Irfan Pathan", "Pathan", "L", "all", 72, bowl("swing", 37, 0.85, 82), face("#C68642", "#140E0A", "short", "beard", { build: "slim" }), 56),
      p("bhajji", "Harbhajan Singh", "Harbhajan", "R", "bowl", 48, bowl("offspin", 28, 0, 88), face("#A86B45", "#1A120B", "short", "beard", { patka: true, build: "broad" }), 3),
      p("zaheer", "Zaheer Khan", "Zaheer", "R", "bowl", 42, bowl("swing", 38, -0.9, 90), face("#E0A56A", "#1A120B", "short", "stubble", { build: "slim" }), 34),
      p("kumble", "Anil Kumble", "Kumble", "R", "bowl", 40, bowl("legspin", 27, 0, 92), face("#D49A6A", "#3A2414", "short", "mustache", { glasses: true, build: "slim" }), 18),
      p("sree", "S. Sreesanth", "Sreesanth", "R", "bowl", 28, bowl("pace", 40, 0.25, 76), face("#A86B45", "#140E0A", "curly", "stubble", { build: "slim" }), 5),
    ],
    attack: ["zaheer", "sree", "bhajji", "kumble", "irfan"],
  },
  {
    id: "aus",
    name: "Australia",
    short: "AUS",
    city: "Melbourne",
    jersey: "#F0C410",
    jerseyDark: "#C49600",
    pants: "#1F6B32",
    accent: "#0E6B32",
    trim: "#0E6B32",
    skinBase: "#F0C4A0",
    players: [
      p("hayden", "Matthew Hayden", "Hayden", "R", "bat", 90, null, face("#F3C7A4", "#6B4226", "short", "stubble", { build: "broad" }), 28),
      p("gilly", "Adam Gilchrist", "Gilchrist", "L", "wk", 91, null, face("#F6D2B4", "#C4A06A", "short", "none", { build: "normal" }), 18),
      p("ponting", "Ricky Ponting", "Ponting", "R", "bat", 94, null, face("#F3C7A4", "#8A5A32", "short", "none", { build: "normal" }), 14),
      p("martyn", "Damien Martyn", "Martyn", "R", "bat", 84, null, face("#F6D2B4", "#3A2418", "short", "none", { build: "slim" }), 9),
      p("symonds", "Andrew Symonds", "Symonds", "R", "all", 82, bowl("pace", 35, 0.1, 68), face("#E0A56A", "#1A120B", "short", "stubble", { build: "broad" }), 63),
      p("hussey", "Michael Hussey", "Hussey", "L", "bat", 86, null, face("#F6D2B4", "#6B4226", "short", "none", { build: "normal" }), 48),
      p("watson", "Shane Watson", "Watson", "R", "all", 74, bowl("pace", 36, 0.2, 74), face("#F3C7A4", "#C4A06A", "short", "none", { build: "broad" }), 33),
      p("lee", "Brett Lee", "Lee", "R", "bowl", 36, bowl("pace", 42, 0.15, 88), face("#F6D2B4", "#E6C878", "spiky", "none", { build: "slim" }), 58),
      p("mcgrath", "Glenn McGrath", "McGrath", "R", "bowl", 22, bowl("swing", 39, 0.95, 96), face("#F6D2B4", "#6B4226", "short", "none", { build: "slim" }), 11),
      p("warne", "Shane Warne", "Warne", "R", "bowl", 52, bowl("legspin", 28, 0, 97), face("#F3C7A4", "#E0B45A", "short", "none", { sunglasses: true, build: "broad" }), 23),
      p("bracken", "Nathan Bracken", "Bracken", "L", "bowl", 24, bowl("swing", 36, -0.7, 80), face("#F6D2B4", "#3A2418", "short", "none", { build: "slim" }), 59),
    ],
    attack: ["lee", "mcgrath", "warne", "watson", "bracken"],
  },
  {
    id: "eng",
    name: "England",
    short: "ENG",
    city: "Lord's",
    jersey: "#142A5C",
    jerseyDark: "#0A1838",
    pants: "#F4F6FB",
    accent: "#D01C2E",
    trim: "#D01C2E",
    skinBase: "#F6D2B4",
    players: [
      p("tres", "Marcus Trescothick", "Trescothick", "L", "bat", 86, null, face("#F6D2B4", "#6B4226", "short", "none", { build: "broad" }), 2),
      p("strauss", "Andrew Strauss", "Strauss", "L", "bat", 85, null, face("#F8DCC4", "#A87848", "short", "none", { build: "normal" }), 14),
      p("vaughan", "Michael Vaughan", "Vaughan", "R", "bat", 84, null, face("#F6D2B4", "#3A2418", "short", "none", { build: "slim" }), 4),
      p("kp", "Kevin Pietersen", "Pietersen", "R", "bat", 91, null, face("#F3C7A4", "#E6C878", "spiky", "stubble", { build: "broad" }), 24),
      p("colly", "Paul Collingwood", "Collingwood", "R", "all", 78, bowl("pace", 33, 0.3, 64), face("#F6D2B4", "#3A2418", "short", "none", { build: "normal" }), 5),
      p("freddie", "Andrew Flintoff", "Flintoff", "R", "all", 80, bowl("pace", 38, 0.2, 86), face("#F6D2B4", "#A87848", "short", "stubble", { build: "broad" }), 11),
      p("jones", "Geraint Jones", "Jones", "R", "wk", 70, null, face("#F8DCC4", "#6B4226", "short", "none", { build: "normal" }), 9),
      p("giles", "Ashley Giles", "Giles", "L", "bowl", 32, bowl("offspin", 27, 0, 74), face("#F6D2B4", "#3A2418", "short", "none", { build: "slim" }), 16),
      p("harmy", "Steve Harmison", "Harmison", "R", "bowl", 18, bowl("pace", 41, 0.1, 84), face("#F8DCC4", "#1A120B", "short", "stubble", { build: "broad" }), 13),
      p("hoggy", "Matthew Hoggard", "Hoggard", "R", "bowl", 20, bowl("swing", 37, 0.8, 82), face("#F6D2B4", "#E0B45A", "curly", "none", { build: "normal" }), 19),
      p("jimmy", "James Anderson", "Anderson", "L", "bowl", 26, bowl("swing", 38, 1, 85), face("#F8DCC4", "#6B4226", "short", "none", { build: "slim" }), 9),
    ],
    attack: ["harmy", "hoggy", "giles", "jimmy", "freddie"],
  },
];

function face(skin, hair, hairStyle, beard, extra) {
  return {
    skin,
    hair,
    hairStyle,
    beard,
    glasses: false,
    patka: false,
    sunglasses: false,
    build: "normal",
    ...extra,
  };
}

function bowl(type, speed, swing, skill) {
  return { type, speed, swing, skill };
}

function p(id, name, short, hand, role, batSkill, bowlInfo, faceInfo, number) {
  return {
    id,
    name,
    short,
    hand,
    role,
    batSkill,
    bowl: bowlInfo,
    face: faceInfo,
    number,
  };
}

export function getTeam(id) {
  const team = TEAMS.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team ${id}`);
  return team;
}

export function playerById(team, id) {
  const player = team.players.find((pl) => pl.id === id);
  if (!player) throw new Error(`Unknown player ${id}`);
  return player;
}

/** Nine fielders plus keeper and bowler, in striker-relative space (+x off, 0° straight). */
export const FIELD_SLOTS = [
  { id: "slip", label: "Slip", angle: 158, dist: 14, speed: 7.2, hands: 1.9 },
  { id: "point", label: "Point", angle: 105, dist: 24, speed: 8.2, hands: 1.65 },
  { id: "cover", label: "Cover", angle: 52, dist: 27, speed: 8.4, hands: 1.6 },
  { id: "long-off", label: "Long-off", angle: 8, dist: 50, speed: 8.6, hands: 1.7 },
  { id: "long-on", label: "Long-on", angle: -8, dist: 50, speed: 8.6, hands: 1.7 },
  { id: "midwicket", label: "Midwicket", angle: -48, dist: 28, speed: 8.3, hands: 1.6 },
  { id: "square", label: "Square leg", angle: -100, dist: 23, speed: 8.1, hands: 1.6 },
  { id: "fine", label: "Fine leg", angle: -152, dist: 46, speed: 8.4, hands: 1.7 },
  { id: "third", label: "Third man", angle: 148, dist: 46, speed: 8.4, hands: 1.7 },
];

export const LENGTHS = [
  { id: "fulltoss", max: 0.2, label: "FULL TOSS" },
  { id: "yorker", max: 1.7, label: "YORKER" },
  { id: "full", max: 3.6, label: "FULL" },
  { id: "good", max: 6.6, label: "GOOD LENGTH" },
  { id: "short", max: 9.6, label: "SHORT" },
  { id: "bouncer", max: 99, label: "BOUNCER" },
];

export function lengthLabel(length) {
  for (const band of LENGTHS) {
    if (length < band.max) return band.label;
  }
  return "BOUNCER";
}

export function lineLabel(line) {
  const a = Math.abs(line);
  if (a < 0.07) return "MIDDLE";
  if (a < 0.2) return line > 0 ? "OFF STUMP" : "LEG STUMP";
  if (a < 0.55) return line > 0 ? "OUTSIDE OFF" : "OUTSIDE LEG";
  if (a < 1.05) return line > 0 ? "WIDE OUTSIDE OFF" : "DOWN LEG";
  return line > 0 ? "MILES OUTSIDE OFF" : "MILES DOWN LEG";
}
