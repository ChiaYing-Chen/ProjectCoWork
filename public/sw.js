const CACHE_NAME = 'project-scheduler-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Vite 在建置時會產生動態雜湊的檔案名稱，
  // Service Worker 通常需要與建置工具（如 Vite PWA 插件）整合才能可靠地快取這些檔案。
  // 在這個手動設定中，我們快取根路徑，並在 fetch 事件中動態快取其他資源。
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已開啟');
        return cache.addAll(urlsToCache);
      })
  );
});

// 啟用 Service Worker，並清除舊的快取
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', event => {
  // 對於非 GET 請求或包含 'api' 的路徑，我們總是從網路獲取
  if (event.request.method !== 'GET' || event.request.url.includes('api')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 使用快取優先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有對應的回應，則直接回傳
        if (response) {
          return response;
        }

        // 否則，從網路獲取資源
        return fetch(event.request).then(
          response => {
            // 如果請求失敗，或回應不是成功的 (status 200)，則直接回傳
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 複製一份回應，因為 request 和 cache 只能使用一次
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // 將新的資源存入快取
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
