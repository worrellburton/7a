// Click-to-call helper. Any feather surface can trigger a dial through
// the globally-mounted <AircallDock/> by dispatching a CustomEvent — no
// import coupling, no prop drilling. The dock listens for 'aircall:dial'
// and forwards the number to the embedded Aircall workspace.
export const AIRCALL_DIAL_EVENT = 'aircall:dial';

export function dialAircall(number: string | null | undefined): void {
  if (typeof window === 'undefined' || !number) return;
  window.dispatchEvent(new CustomEvent(AIRCALL_DIAL_EVENT, { detail: { number } }));
}
