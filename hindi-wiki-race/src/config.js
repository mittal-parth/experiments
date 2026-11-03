export const MAX_HOPS = 10;
export const SHORTLIST = 48;
export const RACE_COUNT = 16;

export const JEV_USD_PER_MTOK = 0.042;
export const PRISM_INR_PER_MTOK = 4;

export const INSTRUCTIONS =
  "इन कड़ियों में से कौन सी कड़ी लक्ष्य लेख के सबसे करीब ले जाती है?";

export function hopState(current, target) {
  return `आप हिन्दी विकिपीडिया के लेख "${current}" पर हैं। लक्ष्य लेख: "${target}"।`;
}
