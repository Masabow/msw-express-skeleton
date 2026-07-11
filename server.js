const path = require('node:path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// public/ には mockServiceWorker.js や css などの静的ファイルを置く
app.use(express.static(path.join(__dirname, 'public')));
// src/ 配下の MSW セットアップ & アプリコードをブラウザから ES Module として読み込めるようにする
app.use('/src', express.static(path.join(__dirname, 'src')));

app.use(express.json());

// 1. 最初にアクセスしたときに MSW をロードする HTML をレスポンスする
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
