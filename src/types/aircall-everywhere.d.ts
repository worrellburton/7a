// Minimal ambient types for the (untyped) aircall-everywhere SDK.
// Mirrors the v2 API we use: construct AircallWorkspace, listen for
// call events, and send the dial_number action.
declare module 'aircall-everywhere' {
  export interface AircallWorkspaceOptions {
    onLogin?: (settings: unknown) => void;
    onLogout?: () => void;
    domToLoadWorkspace?: string;
    integrationToLoad?: string;
    size?: 'big' | 'small' | 'auto';
    debug?: boolean;
  }

  export default class AircallWorkspace {
    constructor(options: AircallWorkspaceOptions);
    on(event: string, handler: (data: unknown) => void): void;
    removeListener(event: string): void;
    send(event: string, data?: unknown, callback?: (success: boolean, data: unknown) => void): void;
    isLoggedIn(callback: (loggedIn: boolean) => void): void;
  }
}
