import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EventInput, TournamentState } from './types';
import { repository, type NewsInput, type Result } from './services';

type Applied = Promise<Result<TournamentState>>;

const SNAPSHOT_KEY = 'azm-league:last-state';

/** آخر نسخة ناجحة من البيانات الحية: تُعرض عند انقطاع النت */
function saveSnapshot(s: TournamentState) {
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
  } catch {
    // التخزين غير متاح: نتجاهل
  }
}
function readSnapshot(): TournamentState | null {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    const v = raw ? (JSON.parse(raw) as TournamentState) : null;
    return v && Array.isArray(v.matches) && Array.isArray(v.teams) ? v : null;
  } catch {
    return null;
  }
}

export interface Actions {
  addEvent(input: EventInput): Applied;
  updateEvent(eventId: string, input: EventInput): Applied;
  deleteEvent(eventId: string): Applied;
  setScore(matchId: string, home: number, away: number): Applied;
  completeMatch(matchId: string): Applied;
  setManOfMatch(matchId: string, playerId: string | null): Applied;
  reset(): Applied;
  resetMatch(matchId: string): Applied;
  saveLineup(matchId: string, teamId: string, playerIds: string[]): Applied;
  addNews(input: NewsInput): Applied;
  deleteNews(id: string): Applied;
}

interface TournamentContextValue {
  state: TournamentState | null;
  offline: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
  actions: Actions;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TournamentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const stateRef = useRef<TournamentState | null>(null);
  stateRef.current = state;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    repository
      .load()
      .then((s) => {
        setState(s);
        setOffline(false);
        if (repository.kind === 'supabase') saveSnapshot(s);
      })
      .catch((e) => {
        console.warn('[azm] تعذّر تحميل البيانات من الخادم:', e);
        const cached = repository.kind === 'supabase' ? readSnapshot() : null;
        if (cached) {
          setState(cached);
          setOffline(true);
        } else {
          setError('تعذّر تحميل بيانات الدوري. حاول تحديث الصفحة.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // في النسخة الحية: تحديث صامت كل 30 ثانية ليرى الزوار النتائج الجديدة
  useEffect(() => {
    if (repository.kind !== 'supabase') return;
    let tick = 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      tick++;
      // كل 10 ثوانٍ لو توجد مباراة جارية، وإلا كل 30 ثانية
      const live = stateRef.current?.matches.some((m) => m.status === 'live') ?? false;
      if (!live && tick % 3 !== 0) return;
      repository
        .load()
        .then((s) => {
          setState(s);
          setOffline(false);
          saveSnapshot(s);
        })
        .catch((e) => console.warn('[azm] فشل التحديث الصامت:', e));
    }, 10000);
    return () => window.clearInterval(id);
  }, []);

  // عند عودة الاتصال نحدّث البيانات فوراً
  useEffect(() => {
    const onOnline = () => {
      if (repository.kind !== 'supabase') return;
      repository.load().then((s) => { setState(s); setOffline(false); saveSnapshot(s); }).catch(() => undefined);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const apply = useCallback(async (promise: Applied) => {
    const result = await promise;
    if (result.ok) setState(result.data);
    return result;
  }, []);

  const actions = useMemo<Actions>(
    () => ({
      addEvent: (input) => apply(repository.addEvent(input)),
      updateEvent: (id, input) => apply(repository.updateEvent(id, input)),
      deleteEvent: (id) => apply(repository.deleteEvent(id)),
      setScore: (matchId, home, away) => apply(repository.setScore(matchId, home, away)),
      completeMatch: (matchId) => apply(repository.completeMatch(matchId)),
      setManOfMatch: (matchId, playerId) => apply(repository.setManOfMatch(matchId, playerId)),
      reset: () => apply(repository.reset()),
      resetMatch: (matchId) => apply(repository.resetMatch(matchId)),
      saveLineup: (matchId, teamId, playerIds) => apply(repository.saveLineup(matchId, teamId, playerIds)),
      addNews: (input) => apply(repository.addNews(input)),
      deleteNews: (id) => apply(repository.deleteNews(id)),
    }),
    [apply],
  );

  const value = useMemo(
    () => ({ state, offline, loading, error, reload, actions }),
    [state, offline, loading, error, reload, actions],
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used inside TournamentProvider');
  return ctx;
}

/** يرجع حالة الدوري (مضمونة غير فارغة داخل الصفحات لأن App ينتظر التحميل) */
export function useData(): TournamentState {
  const { state } = useTournament();
  if (!state) throw new Error('بيانات الدوري غير محمّلة بعد');
  return state;
}
