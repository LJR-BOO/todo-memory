import logging
import time
from fastapi import Request

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

async def log_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    cost = round(time.time() - start, 3)
    logger.info(f"{request.method} {request.url.path} | 状态:{response.status_code} | 耗时:{cost}s")
    return response