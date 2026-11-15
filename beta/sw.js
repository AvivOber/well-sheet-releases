// Well Sheet service worker: shows push notifications and opens the app when one is tapped.
// (No offline caching: the app always loads the newest version from the site.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch { m = { body: event.data && event.data.text() }; }
  const title = m.title || 'Well Sheet';
  event.waitUntil(self.registration.showNotification(title, {
    body: m.body || '',
    tag: m.tag || undefined,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { taskId: m.taskId || null, view: m.view || null },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { taskId, view } = event.notification.data || {};
  const url = new URL(taskId ? `./?task=${taskId}` : view ? `./?view=${view}` : './', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => w.url.startsWith(self.registration.scope));
    if (win) {
      await win.focus();
      win.postMessage({ type: 'ws-open', taskId, view });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
