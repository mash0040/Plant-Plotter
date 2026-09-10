'use client';
import { useLayoutEffect, useMemo } from 'react';

// Each selection gets its own lifetime, including when returning to the same garden.
// Keep the API client unchanged: superseded requests may finish, but cannot apply results.
export default function useTrackerRequestScope(scopeKey) {
  const scope = useMemo(() => {
    let isActive = false;
    let requestSequence = 0;

    return {
      key: scopeKey,
      activate() { isActive = true; },
      deactivate() { isActive = false; requestSequence += 1; },
      isActive: () => isActive,
      startRequest() {
        const sequence = ++requestSequence;
        return () => isActive && sequence === requestSequence;
      }
    };
  }, [scopeKey]);

  useLayoutEffect(() => {
    scope.activate();
    return () => scope.deactivate();
  }, [scope]);

  return scope;
}
