import { AsyncLocalStorage } from 'async_hooks';
import { Types } from 'mongoose';

/**
 * Per-request context.
 *
 * Multi-tenancy is enforced here as well as in the authorisation layer: every
 * person-scoped query goes through `tenantFilter`, which reads the organisation
 * of the signed-in user from this store. There is deliberately no way to set it
 * from a request body — the auth middleware derives it from the User document.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  organizationId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(context: RequestContext, callback: () => T): T =>
  storage.run(context, callback);

export const currentContext = (): RequestContext | undefined => storage.getStore();

export const requestIdOf = (): string => storage.getStore()?.requestId ?? 'no-request';

export const contextUserId = (): string | undefined => storage.getStore()?.userId;

export const setContextUser = (userId: string): void => {
  const context = storage.getStore();
  if (context) context.userId = userId;
};

export const setContextOrganization = (organizationId?: string): void => {
  const context = storage.getStore();
  if (context && organizationId) context.organizationId = organizationId;
};

export const contextOrganizationId = (): string | undefined => storage.getStore()?.organizationId;

/**
 * The organisation as a query value. The auth middleware stores it as a string,
 * which Mongoose casts for `find`/`countDocuments` but not inside an
 * aggregation pipeline — there a string never equals the stored ObjectId and the
 * match silently returns nothing. So filters carry a real ObjectId.
 */
const organizationIdValue = (): Types.ObjectId | string | null => {
  const id = storage.getStore()?.organizationId;
  if (!id) return null;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
};

/**
 * Adds the caller's organisation to a query filter. Outside a request (seed
 * scripts, tests, background jobs) it is a no-op, so those paths keep working on
 * the whole database; inside a request a missing organisation matches nothing,
 * which fails closed rather than leaking every tenant's rows.
 */
/**
 * The return type is intentionally loose: Mongoose's filter types are generic
 * per model and a precise `Record<string, unknown>` is rejected by all of them.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tenantFilter = <T extends Record<string, unknown>>(filter: T = {} as T): any => {
  const context = storage.getStore();
  if (!context) return filter;
  return { ...filter, organizationId: organizationIdValue() };
};

/** Adds the caller's organisation to a document being created. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tenantFields = (): Record<string, any> => {
  const context = storage.getStore();
  if (!context || !context.organizationId) return {};
  return { organizationId: organizationIdValue() };
};
