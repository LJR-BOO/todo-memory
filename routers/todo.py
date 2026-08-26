import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.base import get_db
from db.redis_client import redis_client
from models.todo import Todo
from schemas.todo import TodoCreate, TodoUpdate, TodoResponse
from utils.exceptions import BizException
from constants.error_codes import CODE_NOT_FOUND
from utils.response import success
from utils.auth import get_current_user_id

router = APIRouter(prefix="/todo", tags=["待办事项管理"])

CACHE_PREFIX = "todo:"
CACHE_EXPIRE = 1800  # 30分钟

def get_cache_key(todo_id, user_id):
    return f"{CACHE_PREFIX}{user_id}:{todo_id}"

@router.post("/")
def create_todo(todo_data: TodoCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db_todo = Todo(**todo_data.model_dump(), user_id=user_id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return success(data=TodoResponse.model_validate(db_todo), msg="创建成功")

@router.get("/")
def get_page(page_num: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100), db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    offset = (page_num - 1) * page_size
    query = db.query(Todo).filter(Todo.user_id == user_id).order_by(Todo.create_time.desc()).offset(offset).limit(page_size).all()
    total = db.query(Todo).filter(Todo.user_id == user_id).count()
    return success(data={
        "list": [TodoResponse.model_validate(t) for t in query],
        "page_num": page_num,
        "page_size": page_size,
        "total": total
    })

# 注意：必须放在 /{todo_id} 之前注册，否则 DELETE /todo/clear 会被 /{todo_id} 匹配而返回 422
@router.delete("/clear")
def clear_all(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    db.query(Todo).filter(Todo.user_id == user_id).delete()
    db.commit()
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=f"{CACHE_PREFIX}{user_id}:*", count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break
    return success(msg="清空成功")

@router.get("/{todo_id}")
def get_one(todo_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    cache_key = get_cache_key(todo_id, user_id)
    cached = redis_client.get(cache_key)
    if cached:
        return success(data=json.loads(cached))
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    if not todo:
        raise BizException(code=CODE_NOT_FOUND, msg="待办不存在")
    resp = TodoResponse.model_validate(todo)
    redis_client.setex(cache_key, CACHE_EXPIRE, resp.model_dump_json())
    return success(data=resp)

@router.put("/{todo_id}")
def update_todo(todo_id: int, todo_data: TodoUpdate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    if not todo:
        raise BizException(code=CODE_NOT_FOUND, msg="待办不存在")
    for k, v in todo_data.model_dump(exclude_unset=True).items():
        setattr(todo, k, v)
    db.commit()
    db.refresh(todo)
    redis_client.delete(get_cache_key(todo_id, user_id))
    return success(data=TodoResponse.model_validate(todo), msg="修改成功")

@router.delete("/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    todo = db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    if not todo:
        raise BizException(code=CODE_NOT_FOUND, msg="待办不存在")
    db.delete(todo)
    db.commit()
    redis_client.delete(get_cache_key(todo_id, user_id))
    return success(msg="删除成功")