export type MomentItem = {
  id: string;
  content: string;
  location?: string;
  images?: string[];
  date: string;
};

export type ContentSyncEvent =
  | { type: 'moments:add'; moment: MomentItem }
  | { type: 'moments:remove'; id: string };

const EVENT_NAME = 'xhblogs-content-sync';

export function dispatchContentSync(event: ContentSyncEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

export function onContentSync(handler: (event: ContentSyncEvent) => void) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<ContentSyncEvent>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
