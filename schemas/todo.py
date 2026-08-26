from pydantic import BaseModel, Field
from datetime import datetime

class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(None, max_length=500)

class TodoUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=500)
    is_done: bool | None = None

class TodoResponse(BaseModel):
    id: int
    title: str
    description: str | None
    is_done: bool
    create_time: datetime

    class Config:
        from_attributes = True