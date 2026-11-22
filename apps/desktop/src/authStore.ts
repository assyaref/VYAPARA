import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type UserRole = string;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  mustChangePassword: boolean;
  loginAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const useAuth = create<AuthState>()(
  persist(
    set => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        // Send login request to main process via IPC
        const result = await (window as any).vyapara.authLogin(email, password);
        const loggedIn = result?.data?.user;

        if (!result?.success || !loggedIn) {
          return false;
        }

        set({
          user: {
            id: loggedIn.id,
            name: loggedIn.name,
            email: loggedIn.email,
            role: loggedIn.role,
            permissions: loggedIn.permissions,
            mustChangePassword: loggedIn.mustChangePassword,
            loginAt: new Date().toISOString(),
          },
          isAuthenticated: true,
          isLoading: false,
        });

        return true;
      },

      logout: () => {
        // Notify main process to revoke session
        const state = useAuth.getState?.();
        if (state?.user?.id) {
          (window as any).vyapara.authLogout?.(state.user.id);
        }
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      checkSession: async () => {
        // Check session validity from main process
        const result = await (window as any).vyapara.authSession?.();
        const sessionUser = result?.data?.user;
        if (result?.success && sessionUser) {
          set({
            user: {
              id: sessionUser.id,
              name: sessionUser.name,
              email: sessionUser.email,
              role: sessionUser.role,
              permissions: sessionUser.permissions,
              mustChangePassword: sessionUser.mustChangePassword,
              loginAt: new Date().toISOString(),
            },
            isAuthenticated: true,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
        set({ isLoading: false });
      },

      refreshSession: async () => {
        const state = useAuth.getState?.();
        if (!state?.user?.id) return false;
        const result = await (window as any).vyapara.authLogin(state.user.email, '');
        const refreshed = result?.data?.user;
        if (result?.success && refreshed) {
          set({
            user: {
              id: refreshed.id,
              name: refreshed.name,
              email: refreshed.email,
              role: refreshed.role,
              permissions: refreshed.permissions,
              mustChangePassword: refreshed.mustChangePassword,
              loginAt: new Date().toISOString(),
            },
          });
          return true;
        }
        return false;
      },
    }),

    {
      name: 'vyapara-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuth;
export type { AuthState, UserRole, User };