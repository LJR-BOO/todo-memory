from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from db.base import get_db
from models.user import User
from schemas.user import UserCreate, UserResponse, Token
from utils.auth import get_password_hash, verify_password, create_access_token
from utils.exceptions import BizException
from constants.error_codes import CODE_PARAM_ERROR

router = APIRouter(prefix="/auth", tags=["用户认证"])

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if len(user.password.encode("utf-8")) > 72:
        raise BizException(code=CODE_PARAM_ERROR, msg="密码过长，最多72字节（约24个中文字符）")
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise BizException(code=CODE_PARAM_ERROR, msg="用户名已存在")
    hashed = get_password_hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise BizException(code=CODE_PARAM_ERROR, msg="用户名或密码错误")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}