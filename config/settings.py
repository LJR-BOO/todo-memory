from pydantic import Field, model_validator
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # MySQL
    DB_HOST: str = Field(default="127.0.0.1")
    DB_PORT: int = Field(default=3306)
    DB_USER: str = Field(default="root")
    DB_PASSWORD: str = Field(default="")
    DB_NAME: str = Field(default="todo_db")

    # Redis
    REDIS_HOST: str = Field(default="127.0.0.1")
    REDIS_PORT: int = Field(default=6379)
    REDIS_DB: int = Field(default=0)
    REDIS_PASSWORD: str = Field(default="")

    # JWT
    SECRET_KEY: str = Field(default="your-secret-key-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def _reject_insecure_secret(self):
        # 禁止使用默认/示例 JWT 密钥，避免 token 被伪造
        if self.SECRET_KEY in ("your-secret-key-change-me", "change-me-in-production", ""):
            raise ValueError("SECRET_KEY 未配置或仍为默认值，请在 .env 中设置强随机密钥")
        return self

    @property
    def database_url(self):
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

settings = Settings()