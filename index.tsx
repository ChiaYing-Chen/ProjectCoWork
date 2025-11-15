
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("找不到根元素來掛載應用程式");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 註冊 Service Worker 以啟用 PWA 功能
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker 註冊成功，範圍：', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker 註冊失敗：', error);
      });
  });
}