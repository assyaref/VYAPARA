import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type UserRole = 'admin' | 'cashier' | 'viewer';

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

        if (!result.success || !result.user) {
          return false;
        }

        set({
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            permissions: result.user.permissions,
            mustChangePassword: result.user.mustChangePassword,
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
        if (result?.success && result.user) {
          set({
            user: {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              role: result.user.role,
              permissions: result.user.permissions,
              mustChangePassword: result.user.mustChangePassword,
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
        if (result.success && result.user) {
          set({
            user: {
              id: result.user.id,
              name: result.user.name,
              email: result.user.email,
              role: result.user.role,
              permissions: result.user.permissions,
              mustChangePassword: result.user.mustChangePassword,
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