from fastapi import status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from constants.error_codes import CODE_SUCCESS

def success(data=None, msg="操作成功"):
    encoded_data = jsonable_encoder(data)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": CODE_SUCCESS, "msg": msg, "data": encoded_data}
    )

def fail(code: int, msg: str):
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": code, "msg": msg, "data": None}
    )