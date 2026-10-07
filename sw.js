/* RAZ 阅读器 · 离线外壳
   只负责把"页面本身"（这一个 html + 图标 + 词典 + 测验语音）留在设备上，
   书的内容不走这里——书存在浏览器数据库里，由页面自己读取。
   这样电脑关着、没有网络，也能把这个页面打开。 */
var CACHE = 'raz-shell-v12';
var SHELL = ['./', './index.html', './shelf.json', './dic.txt',
             './quiz_ok.mp3', './quiz_err.mp3'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(new Request(u, {cache: 'reload'})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var u;
  try{ u = new URL(req.url); }catch(err){ return; }
  if(u.origin !== self.location.origin) return;
  var p = u.pathname;
  // 这些一律走网络，不缓存：切片、接口、下载、临时自测页
  if(p === '/m' || p.indexOf('/api/') === 0 || p.indexOf('/dl') === 0 ||
     /\.icanx$/.test(p) ||
     p === '/setup' || (p.charAt(1) === '_' && /\.html$/.test(p))) return;

  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        try{
          if(res && res.status === 200 && res.type === 'basic'){
            var cp = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, cp); }).catch(function(){});
          }
        }catch(err){}
        return res;
      }).catch(function(){
        // 断网兜底：至少把主页面顶上去
        return caches.match('./index.html').then(function(h){
          return h || new Response('离线', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
        });
      });
    })
  );
});
