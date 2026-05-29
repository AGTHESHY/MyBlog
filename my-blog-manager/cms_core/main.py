from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cms_core.api import picbed, deploy

app = FastAPI(title="等一瞥惊鸿 CMS Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
def get_status():
    return {"status": "online", "message": "中枢神经已连接"}

app.include_router(picbed.router, prefix="/api/picbed", tags=["PicBed"])
app.include_router(deploy.router, prefix="/api/deploy", tags=["Deploy"])
