# 🌟 欢迎使用 XHBlogs！

这是一个采用 Next.js 构建的高颜值、毛玻璃（Glassmorphism）风格个人博客系统。前台（`XHBlogs`）与管理后台（`my-blog-manager`）**共用 MySQL 数据库**读写内容，不再依赖 `posts/`、`chatters/` 等本地 Markdown 文件目录。

本指南涵盖 Docker 部署、数据库结构说明，以及图床 / 评论等扩展配置。

---
## 语言

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_en.md)
[![中文](https://img.shields.io/badge/语言-中文-red.svg)](README.md)

## 写在前面

### 更新摘要 (版本0.3.1)

#### 1. 新增个人关于动态

> 关于动态类贡献度及日志显示

#### 2. 修复部分富文本编辑器bug

> 修补目前存在的编辑器bug，如超链接无法显示，引用无法显示等

#### 3. 新增灵境与等级系统

> 类创意工坊功能，等级系统可在 设置->个人名片设置 中关闭


## 一、快速开始部署

### 1. 推荐：Docker 一键启动

**无需在本机安装 Node.js / Python / MySQL 客户端。**

```powershell
cd 你的项目根目录
copy .env.example .env
docker compose up -d --build
```

| 服务 | 地址 |
|------|------|
| 博客前台 | http://localhost:3000 |
| 管理后台 | http://localhost:3001 |
| 图床等 API | http://localhost:8000 |

完整说明见 [DOCKER.md](./DOCKER.md)。建表脚本：`scripts/migrations/init_mysql.sql`。

### 2. 环境变量

两个 Next.js 项目使用同一数据库，在各自目录或 Compose 中配置：

```env
DATABASE_URL=mysql://root:你的密码@127.0.0.1:3306/xhblogs
```

也可拆分：`MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。

### 3. 部署前台到 Vercel（可选）

> 线上环境需配置可访问的 **MySQL**（如云数据库），在 Vercel 环境变量中设置 `DATABASE_URL`。仅推送静态文件、不连数据库的方式已不再适用。

> **提示**：本教程主要演示如何将项目部署至 Vercel，因为 Vercel 对 Next.js 框架有着最顶级的原生支持。
>
> **前提**：请确保已安装 Git，并拥有一个 GitHub 账号。**接下来的步骤请务必按顺序操作！**

> **请确保你已完成以下操作**：
>
> **第一步：本地全局配置**

设置用户名

`git config --global user.name "你的Github用户名"`

设置邮箱（必须是你在 GitHub 绑定的邮箱）

`git config --global user.email "你绑定在Github的邮箱@example.com"`

> **第二步：初始化本地仓库**
>
> 进入你的项目文件夹，执行以下CMD命令行操作：(及前端部署文件夹，这里是XHBlogs)

1. 初始化 Git 仓库，生成隐藏的 .git 文件夹
   `git init`
2. 将所有文件添加到暂存区（注意后面有个点）
   `git add .`
3. 提交到本地版本库，并添加备注
   `git commit -m "first commit"`

**1. 在 GitHub 创建私有仓库**
登录 GitHub，新建一个用于托管博客源码的仓库（建议设置为 **Private 私有仓库** 以保护数据隐私）。

![创建仓库](picture/Pasted%20image%2020260427112905.png)

仓库名称可自定义。

![仓库命名](picture/Pasted%20image%2020260427113030.png)

获取该仓库的 SSH 地址，并将其复制粘贴到控制台的“B线”配置中：

![复制SSH](picture/Pasted%20image%2020260427113120.png)

源码分支填写为 `main`。确认无误后，再次点击 **[保存双轨配置]**。

**2. 获取并配置部署密钥**
点击控制台中的 **[获取B线专属密钥]** 按钮：

![专属密钥](picture/98b965b5-6193-4690-a478-fe1a9abd594e.png)

进入你的 GitHub 仓库页面，导航至 `Settings` -> `Deploy keys` 界面：

![Deploy Keys](picture/Pasted%20image%2020260427113705.png)

将刚才复制的密钥填入 `Key` 框中，`Title` 可随意命名（例如：`XHBlogs-Deploy-Key`）。

> **🚨 严重警告**：下方的 **Allow write access** 选项必须勾选！！！
> 设置完毕后，点击 **Add key** 保存。

**3. 初始化并推送源码**
返回本地控制台，点击 **[智能初始化双轨环境]**，静待程序执行完毕。
完成后，点击 **[仅同步源码]** 按钮：

![仅同步源码](picture/Pasted%20image%2020260427121539.png)

程序将开始向 GitHub 推送代码。**在此期间，请千万不要切换页面或关闭窗口**：

![同步进度](picture/Pasted%20image%2020260427121702.png)

进度条完成后，说明前端源码已成功托管至 GitHub。

> **此处可能出现无法推送bug**：
>
> **请尝试**
>
> 将SSH仓库地址改成如下图所示再进行初始化及同步源码
>
> ![img.png](picture/img.png)

**4. 部署至 Vercel 平台**
访问 Vercel 官网，注册账号并绑定你的 GitHub 授权！

![绑定账号](picture/Pasted%20image%2020260427121844.png)

点击 `Add New...` 添加一个新的 Project，在 Import 列表中选择你刚刚推送到 GitHub 的仓库：

![导入项目](picture/Pasted%20image%2020260427121939.png)

例如我选择的是 `XHBlogS2`：

![选择项目](picture/Pasted%20image%2020260427122034.png)

在 Framework Preset（框架预设）中选择 **Next.js**，然后点击 **Deploy** 按钮开始部署：

![点击Deploy](picture/Pasted%20image%2020260427122141.png)

静候 Vercel 服务器构建你的博客~~

![部署中](picture/Pasted%20image%2020260427122245.png)

撒花！部署成功后，点击预览图即可直接访问你的专属网站！

![部署成功](picture/Pasted%20image%2020260427122338.png)

在项目仪表盘（Dashboard）中，你可以随时查看部署状态与详细日志：

![查看详情](picture/Pasted%20image%2020260427122453.png)

Vercel 默认会为你分配一个免费的二级域名：

![分配域名](picture/Pasted%20image%2020260427122553.png)

---

### 问题 1：我要怎么样绑定自己的专属域名？

**答：** 这里以“阿里云”购买的域名为例（其他服务商如腾讯云、Cloudflare 等操作逻辑基本一致）。

首先登录阿里云控制台，进入【域名管理】页面：

![域名管理](picture/Pasted%20image%2020260427123636.png)

点击对应域名右侧的【解析】按钮：

![点击解析](picture/Pasted%20image%2020260427123737.png)

接着回到 Vercel，进入你的项目仪表盘，点击 **Settings**（或者直接点击域名旁的加号）：

![点击加号](picture/Pasted%20image%2020260427123156.png)

![进入设置](picture/Pasted%20image%2020260427123838.png)

在 Domains 选项卡中，输入你购买的域名（例如我的是 `xinghuisama.top`），点击 **Add** 保存：

![输入域名](picture/afb9fe5f-bf1e-4a8a-ae6b-379938f0924d.png)

添加后，Vercel 会提供 `A` 记录和 `CNAME` 记录的配置参数。请将这些参数完整添加到阿里云的 DNS 解析设置中：

![添加记录](picture/Pasted%20image%2020260427124533.png)

> **注意**：添加记录时，请务必仔细核去记录类型和记录值（Value）！

配置完成后等待几分钟（DNS 传播需要时间），在 Vercel 页面点击 **Refresh** 刷新状态！！

![Refresh](picture/Pasted%20image%2020260427124625.png)

当状态显示为正常后，你就可以通过自己的专属域名访问博客了！（例如：`www.xinghuisama.top`）。

---

## 二、数据库结构说明

- **库名**：`xhblogs`
- **字符集**：`utf8mb4` / `utf8mb4_unicode_ci`
- **建表**：`scripts/migrations/init_mysql.sql`
- **清空业务表**：`scripts/migrations/reset_mysql.sql`（不可恢复，慎用）

### posts（博客文章主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 文章自增主键 |
| slug | VARCHAR(191) | 文章唯一标识，用于路由 `/posts/[slug]` |
| title | VARCHAR(255) | 文章标题 |
| description | TEXT | 文章摘要 |
| cover | TEXT | 封面图 URL |
| tags_json | JSON | 文章标签数组，如 `["技术","生活"]` |
| body_markdown | LONGTEXT | Markdown 正文 |
| published_at | DATETIME | 发布时间 |
| status | VARCHAR(20) | `draft` / `published`，默认 `published` |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### chatters（杂谈内容主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 杂谈自增主键 |
| slug | VARCHAR(191) | 杂谈唯一标识，用于路由 `/chatter/[slug]` |
| title | VARCHAR(255) | 杂谈标题 |
| mood | VARCHAR(100) | 心情 |
| cover | TEXT | 封面图 URL |
| tags_json | JSON | 杂谈标签数组 |
| body_markdown | LONGTEXT | Markdown 正文 |
| published_at | DATETIME | 发布时间 |
| status | VARCHAR(20) | `draft` / `published` |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### moments（说说动态表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 说说 ID（业务主键） |
| content | LONGTEXT | 说说正文 |
| location | VARCHAR(255) | 地理位置 |
| images_json | JSON | 图片 URL 数组 |
| published_at | DATETIME | 发布时间 |
| status | VARCHAR(20) | `draft` / `published` |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### friends（友链数据表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 友链 ID |
| name | VARCHAR(255) | 友链名称 |
| url | TEXT | 友链地址 |
| description | TEXT | 友链描述 |
| avatar | TEXT | 头像 URL |
| theme_color | VARCHAR(64) | 主题色 |
| sort_order | INT | 排序序号，越小越靠前 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### projects（项目展示表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 项目 ID |
| name | VARCHAR(255) | 项目名 |
| description | TEXT | 项目描述 |
| icon | VARCHAR(50) | 项目图标（如 emoji） |
| github_url | TEXT | GitHub 地址 |
| tags_json | JSON | 项目标签数组 |
| sort_order | INT | 排序序号 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### albums（相册主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 相册 ID |
| title | VARCHAR(255) | 相册标题 |
| description | TEXT | 相册描述 |
| cover | TEXT | 相册封面 URL |
| date_label | VARCHAR(50) | 展示日期标签，如 `2026.01` |
| sort_order | INT | 排序序号 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### album_photos（相册照片明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 照片自增主键 |
| album_id | VARCHAR(191) | 所属相册 ID，外键关联 `albums.id`，级联删除 |
| photo_url | TEXT | 照片 URL |
| caption | TEXT | 照片描述 |
| sort_order | INT | 排序序号 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### site_settings（站点配置键值表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT UNSIGNED | 设置自增主键 |
| setting_key | VARCHAR(191) | 设置键名（唯一） |
| value_text | LONGTEXT | 设置值：纯文本原样存储，对象/数组以 JSON 字符串存储 |
| updated_at | DATETIME | 更新时间 |

`setting_key` 与 `siteConfig.ts` 字段对应，运行时优先读数据库，无记录时回退 `siteConfig.ts` 默认值。读取时 `/api/config/get` 会对 `value_text` 尝试 `JSON.parse`。

| setting_key | 值类型 | 说明 |
|-------------|--------|------|
| about_markdown | 纯文本 | 关于页 Markdown 正文 |
| about_cover | 字符串 | 关于页封面图 URL |
| title | 字符串 | 站点完整标题 |
| navTitle, navSuffix, navAfter | 字符串 | 导航栏标题分段显示 |
| faviconUrl | 字符串 | 站点图标 URL |
| authorName, bio, avatarUrl | 字符串 | 博主名称、简介、头像 |
| bgImages | JSON 数组 | 背景图 URL 列表 |
| useGradient | 布尔 | 是否使用渐变背景 |
| themeColors | JSON 数组 | 渐变配色 |
| defaultPostCover | 字符串 | 文章无封面时的默认图 |
| photoWallImage | 字符串 | 首页照片墙预览图 |
| cloudMusicIds | JSON 数组 | 网易云歌曲 ID 列表 |
| social | JSON 对象 | GitHub、邮箱等社交链接 |
| gitalkConfig | JSON 对象 | Gitalk 评论配置（含 clientID 等） |
| geminiConfig | JSON 对象 | AI 小猫对话配置 |
| icpConfig | JSON 对象 | 备案号名称与链接 |
| danmakuList | JSON 数组 | 全局背景弹幕文案 |
| footerBadges | JSON 数组 | 页脚技术栈徽章 |
| footerConfig | JSON 对象 | 页脚聚合配置（buildDate、icp 等） |
| buildDate | 字符串 | 建站日期 ISO 字符串 |
| chatterTitle, chatterDescription | 字符串 | 杂谈区标题与描述 |
| picBedName, picBedUrl, picBedToken | 字符串 | 图床名称、API、Token（敏感） |
| enableLevelSystem | 布尔 | 是否启用灵境等级系统 |
| friendLinkApplyFormat | 字符串 | 友链申请模板文案 |

---

## 三、内容与配置管理

文章、杂谈、说说、友链、项目、相册等数据均在**管理后台**写入 MySQL，**前台即时读取同一数据库**，无需配置本地 Markdown 目录或文件镜像同步。

1. 打开 http://localhost:3001 进入管理后台  
2. 在编辑器 / 各管理页面保存内容（或通过操作队列「写入数据库」批量提交）  
3. 刷新 http://localhost:3000 即可看到更新  

草稿与发布状态由 `posts` / `chatters` / `moments` 表的 `status` 字段控制（`draft` / `published`）。

### CRUD API 映射（管理后台 → MySQL）

| 业务 | 读取 | 写入 / 删除 |
|------|------|-------------|
| 文章 | `content-store.getPosts` / `getPostBySlug` | `POST /api/drafts/save`、`POST /api/drafts/sync_local`（操作队列）、`POST /api/drafts/delete` |
| 杂谈 | `getChatters` / `getChatterBySlug` | 同上（`type: chatter`） |
| 说说 | `getMoments` | `POST /api/moments/save`、`POST /api/moments/delete` |
| 友链 | `getFriends` | `POST /api/friends/sync`（全量替换 `friends` 表） |
| 项目 | `getProjects` | `POST /api/projects/sync`（全量替换） |
| 相册 | `getAlbums` | `POST /api/gallery/sync`（全量替换 `albums` + `album_photos`） |
| 站点配置 | `GET /api/config/get` | `POST /api/config/update` |
| 关于页 | `getSiteSetting('about_markdown')` | `POST /api/drafts/save`（`type: about` 时写 `site_settings`） |

> `sync_local` 名称沿用历史路由，实际写入 MySQL，不写本地文件。

---

## 四、如何推送代码到线上？

若仍将前台部署在 Vercel，内容数据在 MySQL 中，**改文章不必再推送 Markdown 文件**；推送的是 Next.js 源码变更。确认 Vercel 已配置 `DATABASE_URL` 指向线上数据库后：

1. 在控制台打开同步 / 部署相关页面（或使用 Git 手动推送）  
2. 将 `XHBlogs` 目录变更推送到 GitHub  
3. 等待 Vercel 自动构建部署  

数据库变更（新文章等）随 MySQL 即时生效，与 Git 推送无关。

---

## 五、图床配置

为了优化写作体验，控制台深度整合了图床上传功能。本指南推荐使用“去不图床”（[https://7bu.top](https://7bu.top)）。
如果你习惯使用纯外链，工具台也完美支持直接插入图片 URL。如果想接入其他支持标准 API 的图床，也欢迎极客们自行尝试。

**配置流程：**

![图床配置](picture/Pasted%20image%2020260427124930.png)

填入对应的 API Token 等信息后，你可以点击 **[发送探针测试Token]**，实时检验图床接口是否畅通。

---

## 六、AI 猫猫助理设置

博客系统内置了一只聪明的 AI 猫猫助理（默认接入 Gemini 模型）。极客玩家也可以通过修改源码接入其他大语言模型。

首先，你需要申请一个 Gemini 的 API Key（申请教程网络资源丰富，在此不赘述）。拿到 API Key 后，在控制台进行如下配置：

![猫猫设置](picture/Pasted%20image%2020260427134211.png)

在本地设定好猫猫的专属系统提示词（性格）后，我们需要让线上环境也拥有调用 AI 的能力。请登录 Vercel：

![Vercel环境](picture/Pasted%20image%2020260427134538.png)

在项目设置中找到 `Environment Variables`（环境变量）：

![搜索变量](picture/Pasted%20image%2020260427134633.png)

进入你的博客工程详情：

![项目工程](picture/Pasted%20image%2020260427134703.png)

确保作用域（环境）包含线上环境，点击 **Add Environment Variables**：

![添加变量](picture/Pasted%20image%2020260427135004.png)

安全地注入你的密钥：

- **Key** 输入：`GEMINI_API_KEY`
- **Value** 输入：你的真实 API 密钥

![输入API](picture/Pasted%20image%2020260427135044.png)

点击保存。下一次重新部署时，猫猫助理就会在线上苏醒了。

---

## 七、评论系统配置

本博客的评论系统基于 GitHub Issues（Gitalk 等类似方案）。你需要在 GitHub 创建一个 **Public（公开）** 仓库来专门存储网友的留言。

在控制台评论设置中，填入你的 GitHub 用户名以及这个公开仓库的名称：

![评论设置](./picture/Pasted%20image%2020260427135357.png)

**接下来，配置 OAuth 授权以允许访客登录留言：**

1. 登录 GitHub，点击右上角个人头像，进入 **Settings**（设置）。
2. 滑动到左侧菜单栏最底部，点击 **Developer settings**。
3. 在左侧选择 **OAuth Apps**，点击右上角的 **New OAuth App**。

**关键应用信息填写指南：**


| 字段名称                       | 填写建议                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Application name**           | 自定义名称，例如：`My-Blog-Comments`                                               |
| **Homepage URL**               | 你的博客**首页完整地址** (例如 `https://www.xinghuisama.top`)                      |
| **Application description**    | 可选填                                                                             |
| **Authorization callback URL** | **核心参数**：必须填写你的博客域名。如果经常本地调试，可填 `http://localhost:3000` |

**提取核心密钥：**

1. 提交注册（Register application）。
2. 在跳转页面即可看到 **Client ID**，这是所需的第一项数据。
3. 点击下方的 **Generate a new client secret** 生成密钥。
4. **🚨 立刻将这串密钥复制并妥善保存！** 出于安全机制，离开此页面后该密钥将永远隐藏。

将这组 `Client ID` 和 `Client Secret` 准确填入控制台的对应栏目中，保存即可激活评论功能。

---

## 八、酷狗音乐挂件设置

音乐数据来自 [酷狗音乐开放平台](https://open.kugou.com/docs/iot-solution/#/OPENAPI/README) 相关接口（服务端代理请求，前端样式保持不变）。

### 配置歌单（推荐方式）

1. 打开管理后台 **设置 → 音乐播放设置**
2. **按歌名搜索**：输入「云月谣 兰音」等关键词 → 搜索 → 点 **添加**（无需手抄 ID）
3. **导入公开歌单**：把酷狗歌单分享链接粘贴到输入框 → **一键导入歌单到列表**
4. 点击 **暂存音乐修改** 并同步配置

### 如何导入「我的收藏」？

酷狗**没有**对个人开发者开放「直接读取账号收藏」的公开 API（需登录 token，本博客未接入）。

可行做法：

1. 打开酷狗 App / 网页，进入 **我的收藏**
2. 全选或整理后 **创建歌单** 或 **分享为歌单**（需设为可分享/公开）
3. 复制歌单分享链接，粘贴到后台 **导入酷狗公开歌单** 一栏

支持识别的链接形式包括：带 `specialid` 的链接、`collection_...` 收藏 ID、纯数字歌单 ID。

### 高级：手动 ID（可选）

| 格式 | 示例 | 说明 |
|------|------|------|
| `hash\|album_id` | `CB7EE97F4CC11C4EA7A1FA4B516A5D97\|1820033` | 播放最稳定 |
| 32 位 hash | `CB7EE97F4CC11C4EA7A1FA4B516A5D97` | 仅 hash |
| album_audio_id | 数字 ID | 自动解析 |

在 **高级：按 hash\|album_id 手动添加** 折叠区中使用。

### 接口说明

- 按歌名搜索：`GET /api/music/search?q=关键词`
- 导入歌单：`GET /api/music/playlist?url=分享链接`
- 前台播放：`GET /api/music/song/{id}`
- 后台校验：`GET /api/music/query/{id}`

参考 [酷狗音乐 IoT 开放平台](https://open.kugou.com/docs/iot-solution/#/OPENAPI/README)；当前实现通过服务端代理访问公开曲库接口，个人收藏需按上文转为公开歌单链接导入。

---

## 写在最后

XHBLogs 还有诸多隐藏的细节功能，期待你在实际使用中慢慢探索。本项目提供基于 MySQL 的前台展示与后台管理方案，可自行维护数据库与源码并按需扩展。

**如果你觉得这个项目对你有帮助，请务必在 GitHub 上为我点亮一颗 ⭐ Star！每一颗星都是博主持续维护更新的最大动力。谢谢大家！**

## 许可证

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

> 本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可协议。允许免费学习、分享和二次修改后发布（二次开源发布需提及原作者），但**严禁用于任何商业用途**。
