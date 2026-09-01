# Todo 任务管理系统

基于 **FastAPI + MySQL + Redis** 的待办事项管理后端，支持用户注册登录、JWT 认证、用户数据隔离、Redis 缓存、Docker 容器化部署和数据库迁移。

## 技术栈
- 后端框架：FastAPI (0.115)
- 数据库：MySQL 8.0 + SQLAlchemy 2.0 ORM
- 缓存：Redis
- 迁移工具：Alembic
- 容器化：Docker & Docker Compose
- 认证：JWT (python-jose) + bcrypt（直接使用 `bcrypt` 库，不再依赖已停止维护的 passlib）
- 前端：原神风格页面（原生 HTML/CSS/JS，由 FastAPI 直接托管，无需构建工具）

## 功能
- 用户注册 / 登录（JWT 认证）
- 待办 CRUD（增删改查）、分页查询
- Redis 缓存（单条查询）
- 用户数据隔离（每个用户只能看到自己的待办）
- 全局异常处理、请求日志中间件
- 统一响应格式 `{code, msg, data}`
- 原神风格前端页面（登录/注册 + 待办管理，米白+金+靛蓝配色，角色立绘装饰）

## 项目结构
```
.
├── main.py               # 应用入口、路由注册、全局异常处理
├── config/               # 配置（Settings，从 .env 读取）
├── models/               # SQLAlchemy 模型
├── schemas/              # Pydantic 模型（请求/响应）
├── routers/              # 路由（auth、todo）
├── utils/                # 认证、异常、响应、日志
├── db/                   # 数据库会话、Redis 客户端
├── constants/            # 错误码
├── alembic/              # 数据库迁移
├── .env.example          # 环境变量示例（复制为 .env 使用）
└── docker-compose.yml    # 一键部署（MySQL + Redis + API）
```

## 本地启动

### 1. 环境准备
```bash
# 创建并激活虚拟环境（已存在则跳过）
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/macOS

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境变量
```bash
# 复制示例配置并填写真实值
cp .env.example .env
# 务必修改 SECRET_KEY 为强随机值（生产环境）
```

### 3. 初始化数据库并启动
```bash
# 执行数据库迁移
alembic upgrade head

# 启动服务
uvicorn main:app --reload --port 8000
```

访问接口文档：http://127.0.0.1:8000/docs
访问前端页面：http://127.0.0.1:8000/

## 前端页面（原神风格）
- 纯原生 HTML/CSS/JS，由 FastAPI 直接托管（`static/` 目录），**无需构建工具**。
- 页面：登录/注册 + 待办管理（增删改查、分页、完成勾选、清空）。
- 素材：`static/images/` 下的原神角色图（横幅、立绘、头像），配色为"米白 + 金 + 靛蓝"。
- 登录接口用表单提交、注册用 JSON；登录后 token 存于 `localStorage`，请求自动携带 `Authorization: Bearer`。

## Docker Compose 一键部署
```bash
cp .env.example .env   # 先准备好 .env（含 SECRET_KEY）
docker-compose up -d --build
```

## 主要 API
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 注册（JSON） | 否 |
| POST | `/auth/login` | 登录，返回 access_token（表单） | 否 |
| POST | `/todo/` | 新建待办 | 是 |
| GET | `/todo/` | 分页查询待办 | 是 |
| GET | `/todo/{id}` | 查询单条（带缓存） | 是 |
| PUT | `/todo/{id}` | 修改待办 | 是 |
| DELETE | `/todo/{id}` | 删除待办 | 是 |
| DELETE | `/todo/clear` | 清空当前用户待办 | 是 |

> 登录返回 `{"access_token": "...", "token_type": "bearer"}`，之后请求需携带请求头 `Authorization: Bearer <access_token>`。

## 说明
- `.env` 含敏感信息（数据库密码、JWT 密钥），**不要提交到版本库**，本仓库已在 `.gitignore` 中忽略。
- 密码使用 bcrypt 加密，单字段最长 72 字节；超长会返回业务错误（code 400）而非 500。
