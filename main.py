from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from routers.todo import router as todo_router
from routers.auth import router as auth_router
from utils.exceptions import BizException
from utils.response import fail
from utils.logger import log_middleware
from constants.error_codes import CODE_SERVER_ERROR, CODE_DB_ERROR

app = FastAPI(title="Todo-ORM数据库版")

# CORS 中间件（解决前端跨域问题）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求日志中间件
app.middleware("http")(log_middleware)

# 注册路由
app.include_router(auth_router)
app.include_router(todo_router)

# 业务异常
@app.exception_handler(BizException)
async def biz_exception_handler(request: Request, exc: BizException):
    return fail(code=exc.code, msg=exc.msg)

# 数据库异常
@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    return fail(code=CODE_DB_ERROR, msg=f"数据库异常：{str(exc)}")

# 全局兜底
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return fail(code=CODE_SERVER_ERROR, msg=f"服务器内部错误：{str(exc)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)