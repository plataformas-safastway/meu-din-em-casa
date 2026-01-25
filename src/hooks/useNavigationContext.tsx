import { useState, useCallback, createContext, useContext, ReactNode } from "react";

export type NavigationSource = 
  | 'home_onboarding'   // From Home > Primeiros Passos
  | 'settings'          // From Settings page
  | 'dashboard'         // From Dashboard directly
  | 'default';          // Default/unknown origin

interface NavigationContextValue {
  sourceContext: NavigationSource;
  setSourceContext: (source: NavigationSource) => void;
  getBackDestination: (defaultTab: string) => string;
  navigateWithContext: (source: NavigationSource, callback: () => void) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    // Return a default implementation if outside provider
    return {
      sourceContext: 'default' as NavigationSource,
      setSourceContext: () => {},
      getBackDestination: (defaultTab: string) => defaultTab,
      navigateWithContext: (_source: NavigationSource, callback: () => void) => callback(),
    };
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [sourceContext, setSourceContext] = useState<NavigationSource>('default');

  const getBackDestination = useCallback((defaultTab: string): string => {
    switch (sourceContext) {
      case 'home_onboarding':
        return 'dashboard'; // Returns to dashboard, focus maintained via URL param
      case 'settings':
        return 'settings';
      case 'dashboard':
        return 'dashboard';
      default:
        return defaultTab;
    }
  }, [sourceContext]);

  const navigateWithContext = useCallback((source: NavigationSource, callback: () => void) => {
    setSourceContext(source);
    callback();
  }, []);

  return (
    <NavigationContext.Provider value={{
      sourceContext,
      setSourceContext,
      getBackDestination,
      navigateWithContext,
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Helper to determine back destination based on source
export function getBackDestinationForSource(source: NavigationSource, defaultTab: string): string {
  switch (source) {
    case 'home_onboarding':
      return 'dashboard';
    case 'settings':
      return 'settings';
    case 'dashboard':
      return 'dashboard';
    default:
      return defaultTab;
  }
}
