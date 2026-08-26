from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from db.base import Base

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    is_done = Column(Boolean, default=False)
    create_time = Column(DateTime, server_default=func.now(), default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("sys_user.id"), nullable=False)
    user = relationship("User", back_populates="todos")