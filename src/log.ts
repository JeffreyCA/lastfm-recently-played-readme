/**
 * Structured logging for Workers Logs.
 *
 * Workers Logs indexes the fields of an object passed to `console.*`, so a
 * single object argument is queryable where `console.log('failed', reason)` is
 * only greppable text. Event and field names match the Spotify Worker.
 *
 * Nothing here repeats the invocation log (method, URL, query, status, colo,
 * country, user agent, wall/CPU time) or the traces (subrequest timings). What
 * neither can show is whether the card *worked*: an error card is a valid SVG
 * at HTTP 200, so every failure looks like `status: 200` from outside. That is
 * what `card` is for, and why it fires on success too.
 */

type Level = 'info' | 'warn' | 'error';

/** Field values Workers Logs can index. `undefined` keys are dropped. */
export type LogValue = string | number | boolean | string[] | null | undefined;

export type LogFields = Record<string, LogValue>;

function emit(level: Level, event: string, fields: LogFields): void {
  const line: Record<string, Exclude<LogValue, undefined>> = { event };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) line[key] = value;
  }

  // One object, no leading message string: `console.log(msg, obj)` is flattened
  // into a single text message and loses every field.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function logInfo(event: string, fields: LogFields = {}): void {
  emit('info', event, fields);
}

export function logWarn(event: string, fields: LogFields = {}): void {
  emit('warn', event, fields);
}

export function logError(event: string, fields: LogFields = {}): void {
  emit('error', event, fields);
}

/** An unknown catch value as a groupable class name plus free text. */
export function errFields(err: unknown): { err: string; detail: string } {
  if (err instanceof Error) return { err: err.name, detail: err.message };
  return { err: 'unknown', detail: String(err) };
}

/* -------------------------------------------------------------------------- */
/* Who is asking                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How the card was reached: through the legacy Vercel deployment, embedded in a
 * README pointing straight here, opened in a browser (mostly the configurator),
 * or anything else.
 *
 * The raw user agent is already in the invocation log, but it is high
 * cardinality; this collapses it to four values so "how much traffic still
 * comes via Vercel" is a group-by.
 */
export const CLIENTS = ['vercel', 'camo', 'browser', 'other'] as const;
export type Client = (typeof CLIENTS)[number];

export function clientOf(request: Request): Client {
  const ua = request.headers.get('user-agent') ?? '';

  // Wins over Camo on purpose: a README embedding the old Vercel URL goes
  // reader -> Camo -> Vercel -> here, and the question is which deployment the
  // markdown points at. Vercel stamps `x-vercel-id`; the proxy sets its own UA.
  if (request.headers.has('x-vercel-id') || /-vercel-proxy\b/i.test(ua)) return 'vercel';

  if (/camo/i.test(ua) || /camo/i.test(request.headers.get('via') ?? '')) return 'camo';
  if (ua.startsWith('Mozilla/')) return 'browser';
  return 'other';
}

/* -------------------------------------------------------------------------- */
/* The card event                                                             */
/* -------------------------------------------------------------------------- */

/** Closed set, so the field can be grouped by. Shared with the Spotify Worker. */
export type CardReason =
  | 'bad_options'
  | 'not_configured'
  | 'user_not_found'
  | 'no_tracks'
  | 'upstream'
  | 'unhandled';

/**
 * Failures meaning the *service* is unhealthy rather than that one request
 * could not be served, so an alert on `level = "error"` does not fire on every
 * typo'd username. `upstream` is excluded deliberately: a Last.fm outage is
 * real but no deploy fixes it, and it would drown the genuine faults.
 */
const SERVICE_FAULTS = new Set<CardReason>(['not_configured', 'unhandled']);

export interface CardTrace {
  client: Client;
  user: string | null;
  path: string;
  startedAt: number;
}

export function startCard(request: Request, url: URL): CardTrace {
  return {
    client: clientOf(request),
    // Raw, before validation: a card that failed because the username was junk
    // is the one worth looking up.
    user: url.searchParams.get('user'),
    path: url.pathname,
    startedAt: Date.now(),
  };
}

export type CardResult =
  | { outcome: 'ok'; tracks: number }
  | { outcome: 'error'; reason: CardReason; err?: unknown };

/** One line per card request, exception included, so a failure is one row. */
export function logCard(trace: CardTrace, result: CardResult): void {
  const fields: LogFields = {
    outcome: result.outcome,
    client: trace.client,
    user: trace.user,
    path: trace.path,
    ms: Date.now() - trace.startedAt,
  };

  if (result.outcome === 'ok') {
    fields.tracks = result.tracks;
    logInfo('card', fields);
    return;
  }

  fields.reason = result.reason;

  if (result.err !== undefined) {
    const { err, detail } = errFields(result.err);
    fields.err = err;
    fields.detail = detail;
    // Only where it points at our own code; an upstream error's stack is the
    // same fetch wrapper every time, and stacks dominate a log's size.
    if (result.reason === 'unhandled' && result.err instanceof Error) {
      fields.stack = result.err.stack ?? null;
    }
  }

  if (SERVICE_FAULTS.has(result.reason)) logError('card', fields);
  else logWarn('card', fields);
}
