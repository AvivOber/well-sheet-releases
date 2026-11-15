// Well Sheet service worker: shows push notifications and opens the app when one is tapped.
// (No offline caching: the app always loads the newest version from the site.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function updateBadge() {
  try {
    const n = (await self.registration.getNotifications()).length;
    if (self.navigator.setAppBadge) await (n ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge());
  } catch { /* badges not supported */ }
}

self.addEventListener('push', (event) => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch { m = { body: event.data && event.data.text() }; }
  const title = m.title || 'Well Sheet';
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: m.body || '',
      tag: m.tag || undefined,
      renotify: Boolean(m.tag),        // sound/vibrate again even if it replaces an older one
      requireInteraction: true,        // stays on screen until handled (where the system allows)
      silent: false,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { taskId: m.taskId || null, view: m.view || null, ack: m.ack || null },
    });
    await updateBadge();
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { taskId, view, ack } = event.notification.data || {};
  const qs = new URLSearchParams();
  if (taskId) qs.set('task', taskId); else if (view) qs.set('view', view);
  if (ack) qs.set('ack', ack);
  const url = new URL('./' + (qs.toString() ? '?' + qs : ''), self.registration.scope).href;
  event.waitUntil((async () => {
    await updateBadge();
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => w.url.startsWith(self.registration.scope));
    if (win) {
      await win.focus();
      win.postMessage({ type: 'ws-open', taskId, view, ack });
      return;
    }
    await self.clients.openWindow(url);
  })());
});

self.addEventListener('notificationclose', (event) => event.waitUntil(updateBadge()));
