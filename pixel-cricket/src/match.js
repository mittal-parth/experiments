/** Innings scorebook. Pure state, no rendering. */

export function freshInnings(batting, bowling) {
  return {
    batting,
    bowling,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    freeHit: false,
    striker: 0,
    non: 1,
    next: 2,
    bowlerIndex: 0,
    batter: batting.players.map((pl) => ({
      id: pl.id,
      name: pl.short,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: null,
      how: "",
    })),
    bowler: bowling.attack.map((id) => {
      const pl = bowling.players.find((p) => p.id === id);
      return { id, name: pl.short, balls: 0, runs: 0, wickets: 0 };
    }),
    thisOver: [],
    log: [],
  };
}

export function strikerIndex(inn) {
  return inn.striker;
}

export function bowlerRecord(inn) {
  return inn.bowler[inn.bowlerIndex % inn.bowler.length];
}

export function currentStriker(inn) {
  return inn.batting.players[inn.striker];
}

export function currentNon(inn) {
  return inn.batting.players[inn.non];
}

export function currentBowler(inn) {
  const id = inn.bowling.attack[inn.bowlerIndex % inn.bowling.attack.length];
  const pl = inn.bowling.players.find((p) => p.id === id);
  if (!pl || !pl.bowl) throw new Error(`No bowler for ${id}`);
  return pl;
}

export function oversText(legalBalls) {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
}

export function runRate(runs, legalBalls) {
  if (legalBalls <= 0) return 0;
  return (runs / legalBalls) * 6;
}

function swap(inn) {
  const s = inn.striker;
  inn.striker = inn.non;
  inn.non = s;
}

function token(result) {
  if (result.wicket && result.extraType === "noball") return "nb";
  if (result.wicket) return "W";
  if (result.extraType === "wide") return "wd";
  if (result.extraType === "noball") {
    return result.runsOffBat > 0 ? `${result.runsOffBat}nb` : "nb";
  }
  if (result.boundary === "6") return "6";
  if (result.boundary === "4") return "4";
  if (result.runsOffBat > 0) return String(result.runsOffBat);
  return "·";
}

export function howOut(result, bowlerName) {
  if (!result.wicket) return "";
  switch (result.wicket.type) {
    case "bowled":
      return `b ${bowlerName}`;
    case "lbw":
      return `lbw b ${bowlerName}`;
    case "caught":
      return `c ${result.wicket.fielder} b ${bowlerName}`;
    default: {
      const never = result.wicket.type;
      throw new Error(`Unknown dismissal ${never}`);
    }
  }
}

/**
 * Fold one delivery into the innings.
 * `target` is the score the chasing side must reach (first innings + 1), or null.
 */
export function applyBall(inn, result, bowlerName, target) {
  const bat = inn.batter[inn.striker];
  const bowl = bowlerRecord(inn);
  const offBat = result.runsOffBat || 0;
  const extras = result.extras || 0;

  inn.runs += offBat + extras;
  bat.runs += offBat;
  bowl.runs += offBat + extras;
  if (result.legal) {
    bat.balls += 1;
    bowl.balls += 1;
    inn.legalBalls += 1;
  }
  if (result.boundary === "4") bat.fours += 1;
  if (result.boundary === "6") bat.sixes += 1;

  inn.thisOver.push(token(result));
  inn.log.push({ token: token(result), text: result.commentary });

  if (result.wicket) {
    bat.out = result.wicket.type;
    bat.how = howOut(result, bowlerName);
    if (result.wicket.bowlerCredit) bowl.wickets += 1;
    inn.wickets += 1;
    if (inn.wickets < 10) {
      inn.striker = inn.next;
      inn.next += 1;
    }
  } else if (offBat % 2 === 1) {
    swap(inn);
  }

  inn.freeHit = Boolean(result.freeHitNext);

  const overEnd = Boolean(result.legal) && inn.legalBalls % 6 === 0 && inn.legalBalls > 0;
  let reason = null;
  if (target != null && inn.runs >= target) reason = "chase";
  else if (inn.wickets >= 10) reason = "allout";
  else if (inn.legalBalls >= 30) reason = "overs";

  if (overEnd && !reason) {
    swap(inn);
    inn.bowlerIndex += 1;
  }

  return { overEnd: overEnd && !reason, inningsEnd: Boolean(reason), reason };
}

export function ballsLeft(inn) {
  return Math.max(0, 30 - inn.legalBalls);
}

export function needText(inn, target) {
  if (target == null) return "";
  const need = target - inn.runs;
  if (need <= 0) return "TARGET REACHED";
  const balls = ballsLeft(inn);
  return `NEED ${need} FROM ${balls}`;
}
