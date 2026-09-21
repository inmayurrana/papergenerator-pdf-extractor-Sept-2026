import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.staticfiles import StaticFiles  # type: ignore
from .core.config import config
from .core.resource_mgr import resource_manager
from .api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

# Background model auto-unloading worker
async def background_memory_monitor():
    while True:
        try:
            await asyncio.sleep(30)
            await resource_manager.auto_unload_check()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in memory monitor: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Document Intelligence & Vision Microservice...")
    monitor_task = asyncio.create_task(background_memory_monitor())
    yield
    logger.info("Shutting down AI Microservice, releasing memory...")
    monitor_task.cancel()
    resource_manager.unload_all_models()

app = FastAPI(
    title="Offline Document Intelligence & OMR AI Service",
    version="1.0.0",
    description="Resource-aware Document AI, Mathematical/Scientific Extraction, and OMR Evaluation",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local data directory for static asset viewing
app.mount("/data", StaticFiles(directory=str(config.DATA_DIR)), name="data")
app.mount("/storage", StaticFiles(directory=str(config.DATA_DIR)), name="storage")

# Register API routes
app.include_router(router)

@app.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "AI Document Intelligence & OMR Engine",
        "version": "1.0.0",
        "hardware_profile": "LOW_END_OPTIMIZED (i3 / 8GB RAM / 4GB VRAM)",
    }

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("ai_service.app.main:app", host="127.0.0.1", port=8001, reload=False)
