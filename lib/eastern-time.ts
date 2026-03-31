const easternTimeZone = "America/New_York";

type EasternDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: easternTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
}

export function getEasternParts(date: Date) {
  const parts = getFormatter().formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
    hour: Number(byType.get("hour")),
    minute: Number(byType.get("minute")),
    second: Number(byType.get("second"))
  } satisfies EasternDateParts;
}

function getEasternOffsetMilliseconds(date: Date) {
  const parts = getEasternParts(date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

export function createEasternDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getEasternOffsetMilliseconds(utcGuess);
  return new Date(utcGuess.getTime() - offset);
}

export function formatEasternDateKey(date: Date) {
  const parts = getEasternParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getLeagueGameWindow(matchDate: string, timeLabel: string) {
  const [time, meridiem] = timeLabel.split(" ");
  const [rawHour, rawMinute] = time.split(":").map(Number);
  let hour = rawHour % 12;

  if (meridiem === "PM") {
    hour += 12;
  }

  const [year, month, day] = matchDate.split("-").map(Number);

  return {
    opensAt: createEasternDate(year, month, day, hour, rawMinute, 0),
    closesAt: createEasternDate(year, month, day, 23, 59, 59)
  };
}

export function isAfterEasternMidnightForMatch(now: Date, matchDate: string) {
  const [year, month, day] = matchDate.split("-").map(Number);
  const midnightAfterMatch = createEasternDate(year, month, day + 1, 0, 0, 0);
  return now >= midnightAfterMatch;
}

export function isAtOrAfterEasternHour(now: Date, hour: number) {
  return getEasternParts(now).hour >= hour;
}

