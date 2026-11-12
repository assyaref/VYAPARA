import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type UserRole = 'admin' | 'user' | 'viewer';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  loginAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<void>;
}

const useAuth = create<AuthState>()(
  persist(
    set => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        // TODO: Implement actual authentication against SQLite database
        // For now, mock login for admin account
        if (email === 'admin@vyapara.com' && password === 'admin123') {
          set({
            user: {
              id: '1',
              name: 'Administrator',
              email: 'admin@vyapara.com',
              role: 'admin' as UserRole,
              loginAt: new Date().toISOString(),
            },
            isAuthenticated: true,
          });
          return true;
        }
        return false;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      checkSession: async () => {
        // TODO: Check session validity from SQLite
        set({ isLoading: false });
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