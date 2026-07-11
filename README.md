# msw-express-skeleton

MSW (Mock Service Worker) を Express 上で動かしながら、ブラウザ側で
「ドキュメント全体を丸ごと書き換える」実験を行うためのスケルトンです。

## 何を試したか

1. **MSW起動 → ドキュメント全体の上書き**
   [public/index.html](public/index.html) で MSW の `worker.start()` が完了した後、
   `public/contents.html` を `fetch` し、`document.open()` / `document.write()` /
   `document.close()` でページ全体を書き換えています。

2. **書き換え後も `DOMContentLoaded` は発火する**
   `document.write` で作られた新しいドキュメントに対しても、パース完了時に
   改めて `DOMContentLoaded` が発火することを [src/mock/inner.js](src/mock/inner.js)
   で確認しています。`contents.html` はこの `inner.js` を
   `<script type="module">` として読み込みます。

3. **MSWでモックしたAPIをフェッチしてbodyに出力**
   `inner.js` は `DOMContentLoaded` 後に `https://api` へ `fetch` し、
   [src/mocks/handlers.js](src/mocks/handlers.js) で定義した MSW のモックレスポンス
   (`{ message: 'Hello from MSW!' }`) を受け取って `<pre>` として `body` に追記します。
   Service Worker はドキュメントが書き換わってもオリジン単位で登録され続けるため、
   書き換え後のページの `fetch` もそのまま MSW に横取りされます。

4. **バンドラなしでの `msw/browser` 読み込み対応**
   ブラウザは `import { setupWorker } from 'msw/browser'` のような bare specifier を
   ネイティブ解決できません（MSW内部はさらに `@mswjs/interceptors` /
   `tough-cookie` / `graphql` など多数のパッケージを bare import しており、
   import map を手書きするのは非現実的でした）。そこで `esbuild` で
   [src/mocks/browser.js](src/mocks/browser.js) を依存込みで
   `public/mocks/browser.js` に事前バンドルし、それを `index.html` から読み込む
   構成にしています（`npm run build:mocks`）。

## 構成

```
public/
  index.html        MSWを起動し、起動完了後にcontents.htmlで上書きする
  contents.html      上書き先のドキュメント。inner.jsを読み込む
  mocks/browser.js    esbuildでバンドル済みのMSW browser worker (生成物)
  mockServiceWorker.js MSWのService Workerスクリプト (msw init で生成)
src/
  main.js             (未使用: 上書き前の旧エントリポイント)
  mock/inner.js        書き換え後のドキュメントで動くスクリプト
  mocks/browser.js     MSW worker のセットアップ (バンドル前のソース)
  mocks/handlers.js    MSWのモックハンドラ定義 (https://api)
server.js               静的ファイルを配信するExpressサーバー
```

## セットアップ

```bash
npm install
npm run msw:init   # public/mockServiceWorker.js を生成
```

## 起動

```bash
npm start   # または npm run dev (ファイル監視)
```

`http://localhost:3000` にアクセスすると、MSW起動 → `contents.html` への
書き換え → `https://api` のモック結果表示、という流れが確認できます。

`src/mocks/handlers.js` や `src/mocks/browser.js` を変更した場合は、
`npm run build:mocks` (または `start`/`dev` の実行) で
`public/mocks/browser.js` を再生成してください。
