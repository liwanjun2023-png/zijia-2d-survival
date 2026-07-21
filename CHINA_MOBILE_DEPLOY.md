# 中国服务器手机版部署

这个版本有手机版专用入口：

```text
https://你的域名/mobile
```

电脑打开手机版入口会提示“只能用手机打开”，手机打开后直接使用横版触控版。

## 推荐服务器

优先选香港、新加坡、日本 VPS，国内访问通常比 Railway 稳，也不一定需要备案。

如果选中国大陆服务器，域名正式访问一般需要备案。

## 宝塔面板部署

1. 服务器安装 Node.js 18 或更新版本。
2. 上传整个项目文件夹到服务器，例如：

```text
/www/wwwroot/zijia-2d-survival
```

3. 在项目目录执行：

```bash
npm start
```

4. 宝塔里新建网站，反向代理到：

```text
http://127.0.0.1:8767
```

5. 给域名开启 HTTPS。

6. 手机打开：

```text
https://你的域名/mobile
```

## VPS 命令部署

```bash
cd /www/wwwroot/zijia-2d-survival
npm install --omit=dev
npm start
```

长期运行建议用 PM2：

```bash
npm install -g pm2
pm2 start server.mjs --name zijia-mobile
pm2 save
pm2 startup
```

## Nginx 反向代理

```nginx
location / {
    proxy_pass http://127.0.0.1:8767;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

联机需要 WebSocket，所以 `Upgrade` 和 `Connection` 这两行必须保留。
