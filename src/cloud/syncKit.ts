/**
 * Helpers for the tests of the sync engine. Not imported by the app.
 *
 * {@link LocalDevice} is the progress on one phone. The rest is a tiny
 * in-memory stand-in for Firestore.
 *
 * One {@link FakeServer} holds the documents; each {@link FakeClient} is a
 * device with its own `sdk` (the handful of functions the engine uses), its
 * own idea of whether it is online, and its own queue of writes waiting to be
 * sent. It keeps the behaviour the engine leans on: a write shows up at once
 * in the writer's own snapshots as `hasPendingWrites`, is confirmed (and
 * reaches everybody else) when the device is online, and waits in the queue
 * while it is not; listeners only hear from the server while online, and say
 * `fromCache` while they cannot.
 */
import type { Firestore } from 'firebase/firestore';
import { emptyProgressState, mergeProgress, type ProgressState } from '@/progress';
import type { SyncLocal } from './sync';

/** The progress on one phone: what the engine reads, merges into, and what the person's play changes. */
export class LocalDevice implements SyncLocal {
  state: ProgressState;
  /** Times a merge from the cloud actually changed the progress. */
  mergesApplied = 0;

  constructor(state: ProgressState = emptyProgressState()) {
    this.state = state;
  }

  get = (): ProgressState => this.state;

  merge = (remote: ProgressState): ProgressState => {
    const merged = mergeProgress(this.state, remote);
    if (JSON.stringify(merged) !== JSON.stringify(this.state)) {
      this.state = merged;
      this.mergesApplied += 1;
    }
    return this.state;
  };

  /** The person plays: the progress becomes `change(progress)`. */
  play(change: (state: ProgressState) => ProgressState): void {
    this.state = change(this.state);
  }
}

type Data = Record<string, unknown>;
type Path = string;

type Meta = { fromCache: boolean; hasPendingWrites: boolean };
export type FakeSnapshot = {
  exists: () => boolean;
  data: () => Data | undefined;
  metadata: Meta;
};

type Listener = { path: Path; next: (snapshot: FakeSnapshot) => void; error: (error: { code: string }) => void };
type Pending = {
  path: Path;
  op: 'set' | 'delete';
  data?: Data;
  resolve: () => void;
  reject: (error: Error) => void;
};

const SERVER_TIME = Symbol('serverTimestamp');

export class FakeServer {
  readonly docs = new Map<Path, Data>();
  readonly clients = new Set<FakeClient>();
  /** Writes (sets and deletes) the server has accepted. */
  accepted = 0;
  /** When set, the server refuses every write with this error code. */
  refuseWritesWith: string | null = null;
  /** When set, the server keeps this version of what is written instead (a damaged or hostile copy). */
  rewrite: ((data: Data) => Data) | null = null;
  private clock = 0;

  /** Applies a write and tells every device that can hear it. */
  apply(pending: Pending): void {
    if (this.refuseWritesWith !== null) {
      pending.reject(Object.assign(new Error('refused'), { code: this.refuseWritesWith }));
      return;
    }
    this.accepted += 1;
    if (pending.op === 'delete') this.docs.delete(pending.path);
    else {
      this.clock += 1;
      const written = structuredClone(pending.data) as Data;
      const stamped = { ...(this.rewrite === null ? written : this.rewrite(written)), updatedAt: this.clock };
      this.docs.set(pending.path, stamped);
    }
    pending.resolve();
    for (const client of this.clients) client.hear(pending.path);
  }
}

export class FakeClient {
  online = true;
  readonly db = { fake: true } as unknown as Firestore;
  /** What this device last heard from the server, per document: its offline cache. */
  private readonly cache = new Map<Path, Data | undefined>();
  private readonly queue: Pending[] = [];
  private readonly listeners = new Set<Listener>();
  /** Listeners attached, ever; lets a test see that one was torn down and another attached. */
  listensStarted = 0;
  /** Setting this makes new listeners fail with it instead of hearing anything. */
  listenError: string | null = null;

  readonly server: FakeServer;

  constructor(server: FakeServer) {
    this.server = server;
    server.clients.add(this);
  }

  /** The functions of the Firestore SDK that the engine uses. */
  readonly sdk = {
    doc: (_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` }),
    serverTimestamp: () => SERVER_TIME,
    setDoc: (ref: { path: Path }, data: Data) =>
      this.enqueue({ path: ref.path, op: 'set', data: stripStamp(data) }),
    deleteDoc: (ref: { path: Path }) => this.enqueue({ path: ref.path, op: 'delete' }),
    onSnapshot: (
      ref: { path: Path },
      _options: unknown,
      next: Listener['next'],
      error: Listener['error'],
    ) => {
      const listener: Listener = { path: ref.path, next, error };
      this.listensStarted += 1;
      this.listeners.add(listener);
      queueMicrotask(() => {
        if (!this.listeners.has(listener)) return;
        if (this.listenError !== null) {
          this.listeners.delete(listener);
          error({ code: this.listenError });
          return;
        }
        if (this.online) this.cache.set(ref.path, this.server.docs.get(ref.path));
        // Offline with nothing cached, Firestore stays quiet rather than claim the document is missing.
        if (this.online || this.cache.has(ref.path)) this.emit(listener);
      });
      return () => this.listeners.delete(listener);
    },
  };

  /** Goes offline or back online; coming back sends what queued up. */
  setOnline(online: boolean): void {
    if (this.online === online) return;
    this.online = online;
    if (!online) {
      for (const listener of this.listeners) this.emit(listener);
      return;
    }
    for (const pending of this.queue.splice(0)) this.server.apply(pending);
    for (const path of new Set([...this.listeners].map((listener) => listener.path))) this.hear(path);
  }

  /** Pending writes that have not reached the server. */
  get queued(): number {
    return this.queue.length;
  }

  /** The server changed (or this device reconnected): refresh the cache and tell the listeners. */
  hear(path: Path): void {
    if (!this.online) return;
    this.cache.set(path, this.server.docs.get(path));
    for (const listener of this.listeners) if (listener.path === path) this.emit(listener);
  }

  private enqueue(pending: Omit<Pending, 'resolve' | 'reject'>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const entry: Pending = { ...pending, resolve, reject };
      this.queue.push(entry);
      this.hearOwn(entry.path);
      if (!this.online) return;
      queueMicrotask(() => {
        const at = this.queue.indexOf(entry);
        if (at === -1) return;
        this.queue.splice(at, 1);
        entry.reject = (error) => {
          reject(error);
          this.hearOwn(entry.path);
        };
        this.server.apply(entry);
      });
    });
  }

  /** The device's own write changed what it sees, before the server has said anything. */
  private hearOwn(path: Path): void {
    for (const listener of this.listeners) if (listener.path === path) this.emit(listener);
  }

  private emit(listener: Listener): void {
    const writes = this.queue.filter((pending) => pending.path === listener.path);
    const last = writes[writes.length - 1];
    const data = last === undefined ? this.cache.get(listener.path) : last.op === 'set' ? last.data : undefined;
    const exists = data !== undefined;
    listener.next({
      exists: () => exists,
      data: () => (exists ? structuredClone(data) : undefined),
      metadata: { fromCache: !this.online, hasPendingWrites: writes.length > 0 },
    });
  }
}

/** The server timestamp placeholder is not data; the server adds the real one. */
function stripStamp(data: Data): Data {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== SERVER_TIME));
}
