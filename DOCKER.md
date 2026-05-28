# Docker 一键部署

本仓库支持用 Docker Compose 启动完整栈，无需在本机安装 Node.js / Python / MySQL 客户端。

## 服务说明

| 服务 | 容器名 | 默认端口 | 说明 |
|------|--------|----------|------|
| mysql | xhblogs-mysql | 3306 | 数据库，首次启动自动执行 `init_mysql.sql` |
| xhblogs | xhblogs-web | 3000 | 博客前台 |
| blog-manager | xhblogs-manager | 3001 | 管理后台 |
| cms-api | xhblogs-cms-api | 8000 | 图床上传、部署、音乐等 Python API |

## 快速开始

### 1. 准备环境

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（含 Docker Compose）

若本机已有名为 `mysql` 的旧容器且占用 **3306**，请先停止，或在 `.env` 里改 `MYSQL_PORT=3307`。

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

首次构建需下载镜像并编译 Next.js，约 5–15 分钟。

### 4. 访问

- 前台：http://localhost:3000
- 后台：http://localhost:3001
- API 健康检查：http://localhost:8000/api/status

### 5.（可选）导入本地 Markdown 数据

```powershell
docker compose --profile tools run --rm migrator
```

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

## 重置表结构（已有数据卷时）

`init_mysql.sql` 仅在**首次**创建 MySQL 卷时执行。若需重建表：

```powershell
docker compose down
docker volume rm xhblogs_mysql_data
docker compose up -d --build
```

或进入 MySQL 容器手动执行 `reset_mysql.sql` + `init_mysql.sql`（须带 `--default-character-set=utf8mb4`）。

## 说明

- 管理后台在浏览器中仍通过 `http://127.0.0.1:8000` 调用图床 API，因此 `CMS_API_PORT` 需与映射到宿主机的端口一致。
- Git 部署、SSH 等功能依赖宿主机环境，容器内可能受限；核心内容读写已走 MySQL + Next.js API。
- 生产环境请修改默认密码，并考虑用 Nginx 反代与 HTTPS。
