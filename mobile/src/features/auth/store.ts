import { create } from 'zustand';
import { request, setUnauthorizedHandler } from '../../api/http';
import { deleteToken, loadToken, saveToken } from '../../services/session';
import type { Session, User } from '../../types/models';

interface AuthState { user: User | null; hydrating: boolean; connectionError: string; hydrate: () => Promise<void>; enter: (session: Session) => Promise<void>; refresh: () => Promise<void>; signOut: () => Promise<void>; }
function validateUser(user: User) {
  if (!user || !['usuario', 'admin', 'mecanico'].includes(user.rol) || user.estado !== 'activo') throw new Error('Tu cuenta no tiene un rol activo válido.');
}
export const useAuth = create<AuthState>((set, get) => ({
  user: null, hydrating: true, connectionError: '',
  hydrate: async () => {
    set({ hydrating: true, connectionError: '' });
    try {
      if (await loadToken()) { const { user } = await request<{ user: User }>('/api/auth/me'); validateUser(user); set({ user }); }
    } catch (e) { set({ user: null, connectionError: e instanceof Error ? e.message : 'No se pudo verificar tu sesión.' }); }
    finally { set({ hydrating: false }); }
  },
  enter: async session => { validateUser(session.user); await saveToken(session.token); set({ user: session.user, connectionError: '' }); },
  refresh: async () => { const { user } = await request<{ user: User }>('/api/auth/me'); validateUser(user); if (user.rol !== get().user?.rol) set({ user: null }); set({ user }); },
  signOut: async () => { set({ user: null, connectionError: '' }); await deleteToken(); },
}));
setUnauthorizedHandler(() => { void useAuth.getState().signOut().catch(() => {}); });
