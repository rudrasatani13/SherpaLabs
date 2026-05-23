import type { EntityId, IsoDateString } from './common';

export type SubscriptionPlan = 'free' | 'pro-individual' | 'pro-team' | 'enterprise';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'paused';

export type BillingInterval = 'month' | 'year';

export interface User {
  readonly id: EntityId;
  readonly email: string;
  readonly displayName?: string;
  readonly avatarUrl?: string;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
}

export interface Workspace {
  readonly id: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly ownerId: EntityId;
  readonly plan: SubscriptionPlan;
  readonly seatLimit?: number;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
}

export type RepoProvider = 'github' | 'gitlab' | 'bitbucket' | 'local' | 'unknown';

export interface Repo {
  readonly id: EntityId;
  readonly workspaceId: EntityId;
  readonly provider: RepoProvider;
  readonly name: string;
  readonly fullName: string;
  readonly url?: string;
  readonly defaultBranch?: string;
  readonly connectedAt?: IsoDateString;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
}

export type SubscriptionProvider = 'paddle';

export interface Subscription {
  readonly id: EntityId;
  readonly plan: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  readonly provider: SubscriptionProvider;
  readonly workspaceId?: EntityId;
  readonly userId?: EntityId;
  readonly providerCustomerId?: string;
  readonly providerSubscriptionId?: string;
  readonly billingInterval?: BillingInterval;
  readonly currentPeriodStart?: IsoDateString;
  readonly currentPeriodEnd?: IsoDateString;
  readonly trialEndsAt?: IsoDateString;
  readonly cancelAtPeriodEnd?: boolean;
  readonly createdAt: IsoDateString;
  readonly updatedAt: IsoDateString;
}
