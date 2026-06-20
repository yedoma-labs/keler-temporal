export interface Clock {
  instant(): Temporal.Instant;
  zonedDateTimeISO(timezone?: string): Temporal.ZonedDateTime;
  plainDateISO(timezone?: string): Temporal.PlainDate;
  plainDateTimeISO(timezone?: string): Temporal.PlainDateTime;
  plainTimeISO(timezone?: string): Temporal.PlainTime;
  timeZoneId(): string;
}

class SystemClock implements Clock {
  instant(): Temporal.Instant {
    return Temporal.Now.instant();
  }

  zonedDateTimeISO(timezone?: string): Temporal.ZonedDateTime {
    return Temporal.Now.zonedDateTimeISO(timezone);
  }

  plainDateISO(timezone?: string): Temporal.PlainDate {
    return Temporal.Now.plainDateISO(timezone);
  }

  plainDateTimeISO(timezone?: string): Temporal.PlainDateTime {
    return Temporal.Now.plainDateTimeISO(timezone);
  }

  plainTimeISO(timezone?: string): Temporal.PlainTime {
    return Temporal.Now.plainTimeISO(timezone);
  }

  timeZoneId(): string {
    return Temporal.Now.timeZoneId();
  }
}

let activeClock: Clock = new SystemClock();

export function getClock(): Clock {
  return activeClock;
}

export function setClock(clock: Clock): void {
  activeClock = clock;
}

export function resetClock(): void {
  activeClock = new SystemClock();
}
