// This allows CSS imports without type errors
declare module '*.css' {
  const content: string;
  export default content;
}

// IPC global API declarations
interface Window {
  vyapara: {
    getAppInfo: () => Promise<{ name: string; version: string; platform: string }>;
    getEnvironmentStatus: () => Promise<{ online: boolean }>;
  };
}