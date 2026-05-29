# Docker 一键部署

本仓库支持用 Docker Compose 启动完整栈，无需在本机安装 Node.js / Python / MySQL 客户端。

## 服务说明

| 服务 | 容器名 | 默认端口 | 说明 |
|------|--------|----------|------|
| mysql | xhblogs-mysql | 3306 | 数据库 |
| db-init | （一次性） | — | MySQL 就绪后自动建库、建表（幂等） |
| xhblogs | xhblogs-web | 3000 | 博客前台 |
| blog-manager | xhblogs-manager | 3001 | 管理后台 |
| cms-api | xhblogs-cms-api | 8000 | 图床上传、Git 部署等 Python API |

## 快速开始

### 1. 准备环境

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（含 Docker Compose）
- **不需要**在本机安装 Node.js / npm：依赖会在 `node:20-alpine` 镜像构建阶段由容器内的 npm 自动安装

若本机已有名为 `mysql` 的旧容器且占用 **3306**，请先停止，或在 `.env` 里改 `MYSQL_PORT=3307`。

**建库建表**：逻辑就是「MySQL 已启动 → 执行 `init_mysql.sql`」。`docker compose up` 会在 MySQL 健康检查通过后由 **db-init** 自动跑一遍（`CREATE DATABASE/TABLE IF NOT EXISTS`，可重复执行，不依赖空数据卷）。`docker compose build` 不会建表。

本机连库时：`.env` 里若写了 `MYSQL_PORT=3307`，应使用 **3307**（不是容器内的 3306）。例如：

```bash
docker exec -it xhblogs-mysql mysql -uroot -proot xhblogs -e "SHOW TABLES;"
```

若 MySQL 已在跑但表仍缺失，可任选其一：

```bash
docker compose run --rm db-init
# 或
bash scripts/migrations/apply_mysql_docker.sh
```

### 2. 配置

```powershell
cd D:\program\XinghuisamaBlogs
copy .env.example .env
```

按需修改 `.env` 中的密码与端口。

### 3. 构建并启动

```powershell
docker compose up -d --build
```

首次构建需下载镜像并编译 Next.js，约 5–15 分钟（依赖在镜像内通过 `npm install` 安装，**无需本机 npm**）。

### 4. 访问

- 前台：http://localhost:3000
- 后台：http://localhost:3001
- API 健康检查：http://localhost:8000/api/status

## 常用命令

```powershell
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f xhblogs
docker compose logs -f blog-manager

# 停止
docker compose down

# 停止并删除数据库卷（清空所有数据）
docker compose down -v
```

## 重置表结构

清空数据并重建：

```powershell
docker compose down
docker volume rm xhblogs_mysql_data
docker compose up -d --build
```

仅删表后重建（保留卷）：

```bash
docker exec -i xhblogs-mysql mysql -uroot -proot --default-character-set=utf8mb4 < scripts/migrations/reset_mysql.sql
bash scripts/migrations/apply_mysql_docker.sh
```

## 构建失败：`ECONNRESET` / network aborted

多为拉取 npm 包时网络中断。可依次尝试：

1. **直接重试**（经常是偶发）：
   ```powershell
   docker compose build --no-cache blog-manager
   docker compose up -d
   ```
2. **改用官方源**（在 `.env` 中设置后重新 build）：
   ```env
   NPM_REGISTRY=https://registry.npmjs.org
   ```
3. **分开构建**（减轻并发下载压力）：
   ```powershell
   docker compose build xhblogs
   docker compose build blog-manager
   docker compose up -d
   ```

默认已使用国内 npmmirror，并开启 npm 重试。

## 构建失败：无法连接 `fonts.gstatic.com`

前台与后台已改用系统字体栈（`globals.css`），构建时不再请求 Google Fonts。若你自行改回 `next/font/google`，需在能访问 `fonts.gstatic.com` 的环境构建，或配置代理。

## 网易云音乐（个人开发者 / CLI 密钥）

开放平台要求 RSA 密钥对，并将**单行公钥**上传到控制台。详见[官方 CLI 文档](https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514)。

### 方式 A：控制台已有私钥（推荐）

若创建应用时已在控制台生成密钥对，直接将 **AppID**、**AppSecret**、**PrivateKey（PKCS8 单行）** 写入 `.env`，然后：

```bash
node scripts/sync-netease-key.mjs   # 私钥写入 config/netease_private_key.pem 供 Docker 挂载
docker compose up -d --build
```

### 方式 B：本地 OpenSSL 生成新密钥对

```bash
# 1. 生成密钥对（需本机 openssl）
node scripts/netease-setup-keys.mjs generate

# 2. 将输出的单行公钥粘贴到网易云控制台 → 应用 → 接口加密方式

# 3. 在 .env 填写 NETEASE_APP_ID、NETEASE_APP_SECRET 后同步私钥
node scripts/netease-setup-keys.mjs sync-env

# 4. 重建并启动
docker compose up -d --build
```

在管理后台 **设置 → 音乐** 可查看匿名 token 状态。验证凭证是否生效：

- http://localhost:3001/api/music/netease/auth/debug（`clientTokenOk: true`、`authMode: cli-anonymous` 表示签名与匿名 token 正常）

个人开发者 CLI 不支持用户登录与 VIP 全曲播放，详见[个人开发者权限说明](https://developer.music.163.com/st/developer/document?docId=3b75ab8e475d41ca93d91ebd4dfd383f)。

## 说明

- 管理后台在浏览器中仍通过 `http://127.0.0.1:8000` 调用图床 API，因此 `CMS_API_PORT` 需与映射到宿主机的端口一致。
- Git 部署、SSH 等功能依赖宿主机环境，容器内可能受限；核心内容读写已走 MySQL + Next.js API。
- 生产环境请修改默认密码，并考虑用 Nginx 反代与 HTTPS。
