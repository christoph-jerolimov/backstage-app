import { useMemo } from 'react';

import { useBackstage } from './backstage/provider';

export type Ownership = {
  /** True when a non-expired session provides an identity. */
  signedIn: boolean;
  /** The signed-in user's entity ref, or undefined when signed out. */
  userRef?: string;
  /** Every entity ref the user owns through, including their own; empty when signed out. */
  ownershipRefs: string[];
  /** The `group:` subset of the ownership refs. */
  groupRefs: string[];
};

const EMPTY: string[] = [];

/**
 * What the signed-in identity says the user owns. Empty when signed out or expired.
 * The result is memoized because consumers use the arrays as effect dependencies.
 */
export function useOwnership(): Ownership {
  const { session, signedIn } = useBackstage();
  const identity = signedIn ? session : undefined;

  return useMemo(() => {
    if (!identity) return { signedIn: false, ownershipRefs: EMPTY, groupRefs: EMPTY };
    const ownershipRefs = identity.ownershipEntityRefs ?? EMPTY;
    return {
      signedIn: true,
      userRef: identity.userEntityRef,
      ownershipRefs,
      groupRefs: ownershipRefs.filter((ref) => ref.toLowerCase().startsWith('group:')),
    };
  }, [identity]);
}
