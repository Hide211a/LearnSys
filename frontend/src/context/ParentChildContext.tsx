import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import api from '../api/client';

export type ChildUser = {
  id: string;
  firstName: string;
  lastName: string;
  classGroup?: { id: string; name: string } | null;
};

type ParentChildContextValue = {
  isParent: boolean;
  children: ChildUser[];
  childId: string;
  setChildId: (id: string) => void;
  childParams: { params: { childId: string } };
  childQuery: string;
  pathWithChild: (path: string) => string;
};

const ParentChildContext = createContext<ParentChildContextValue | null>(null);

const STORAGE_KEY = 'parentSelectedChildId';

export function ParentChildProvider({ children: node }: { children: ReactNode }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { data: childList = [] } = useQuery({
    queryKey: ['children'],
    queryFn: async () => (await api.get('/student/children')).data as ChildUser[],
    enabled: isParent,
  });

  const childIdFromUrl = searchParams.get('childId') ?? '';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : '';
  const childId =
    childIdFromUrl ||
    stored ||
    childList[0]?.id ||
    '';

  useEffect(() => {
    if (!isParent || !childList.length) return;
    const valid = childList.some((c) => c.id === childId);
    const next = valid ? childId : childList[0].id;
    if (next && next !== childIdFromUrl && location.pathname.startsWith('/parent')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('childId', next);
      setSearchParams(nextParams, { replace: true });
    }
    if (next) localStorage.setItem(STORAGE_KEY, next);
  }, [isParent, childList, childId, childIdFromUrl, location.pathname, searchParams, setSearchParams]);

  const setChildId = useCallback(
    (id: string) => {
      localStorage.setItem(STORAGE_KEY, id);
      const next = new URLSearchParams(searchParams);
      next.set('childId', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const value = useMemo<ParentChildContextValue>(
    () => ({
      isParent: !!isParent,
      children: childList,
      childId,
      setChildId,
      childParams: { params: { childId } },
      childQuery: childId ? `childId=${encodeURIComponent(childId)}` : '',
      pathWithChild: (path: string) => {
        if (!childId) return path;
        const sep = path.includes('?') ? '&' : '?';
        return `${path}${sep}childId=${encodeURIComponent(childId)}`;
      },
    }),
    [isParent, childList, childId, setChildId]
  );

  return <ParentChildContext.Provider value={value}>{node}</ParentChildContext.Provider>;
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext);
  if (!ctx) {
    return {
      isParent: false,
      children: [] as ChildUser[],
      childId: '',
      setChildId: () => {},
      childParams: { params: { childId: '' } },
      childQuery: '',
      pathWithChild: (path: string) => path,
    };
  }
  return ctx;
}
