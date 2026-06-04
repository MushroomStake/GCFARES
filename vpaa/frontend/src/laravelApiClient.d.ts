export type LaravelApiSession = {
  access_token: string;
  token_type?: string;
  user?: LaravelApiUser | null;
} | null;

export type LaravelApiUser = {
  id?: string | number;
  user_id?: string | number;
  domain_email?: string;
  email?: string;
  role?: string;
  name_first?: string;
  name_last?: string;
  name_middle?: string | null;
  department_id?: string | number | null;
  current_rank?: string | null;
  nature_of_appointment?: string | null;
  is_first_login?: boolean;
  [key: string]: unknown;
};

export interface LaravelApiResult<T = any> {
  data: T;
  error: unknown;
}

export interface LaravelApiAuth {
  getSession(): Promise<{ data: { session: LaravelApiSession } }>;
  getUser(): Promise<LaravelApiResult<{ user: LaravelApiUser | null }>>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<LaravelApiResult<{ user: LaravelApiUser | null; session: LaravelApiSession }>>;
  signOut(): Promise<LaravelApiResult<null>>;
  updateUser(payload: { password?: string }): Promise<LaravelApiResult<{ user: LaravelApiUser | null }>>;
  onAuthStateChange(callback: (event: string, session: LaravelApiSession) => void): { data: { subscription: { unsubscribe(): void } } };
}

export interface LaravelApiRealtimePayload {
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

export interface LaravelApiRealtimeChannel {
  on(eventType: string, criteria: unknown, callback: (payload: LaravelApiRealtimePayload) => void): LaravelApiRealtimeChannel;
  subscribe(): LaravelApiRealtimeChannel;
  unsubscribe(): void;
}

export interface LaravelApiQueryBuilder<T = any> extends PromiseLike<LaravelApiResult<T>> {
  select(columns?: string): LaravelApiQueryBuilder<T>;
  update(values: Record<string, unknown>): LaravelApiQueryBuilder<T>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): LaravelApiQueryBuilder<T>;
  delete(): LaravelApiQueryBuilder<T>;
  eq(column: string, value: unknown): LaravelApiQueryBuilder<T>;
  not(column: string, operator: string, value: unknown): LaravelApiQueryBuilder<T>;
  in(column: string, value: unknown[]): LaravelApiQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): LaravelApiQueryBuilder<T>;
  limit(count: number): LaravelApiQueryBuilder<T>;
  maybeSingle(): LaravelApiQueryBuilder<T | null>;
  single(): LaravelApiQueryBuilder<T | null>;
}

export interface LaravelApiClientLike {
  laravelApiBaseUrl: string;
  auth: LaravelApiAuth;
  from<T = any>(table: string): LaravelApiQueryBuilder<T>;
  channel(name: string): LaravelApiRealtimeChannel;
  removeChannel(channel: { unsubscribe?: () => void }): unknown;
}

export const laravelApiClient: LaravelApiClientLike;
export const supabase: LaravelApiClientLike;
export const laravelApiBaseUrl: string;
