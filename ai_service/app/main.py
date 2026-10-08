import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.staticfiles import StaticFiles  # type: ignore
from .core.config import config
from .core.resource_mgr import resource_manager
from .core.model_manager import model_manager
from .api.routes import router
from .api.visual_math import router as visual_math_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

# Background memory monitor: unloads idle models + checks RAM
async def background_memory_monitor():
    while True:
        try:
            await asyncio.sleep(30)
            await resource_manager.auto_unload_check()
            model_manager.tick_idle_unload()   # NEW: also tick model_manager
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
app.include_router(visual_math_router)   # NEW: visual math recognition

@app.get("/health")
async def health_check():
    hw = model_manager.status()
    return {
        "status": "HEALTHY",
        "service": "AI Document Intelligence & Math Extraction Engine",
        "version": "2.0.0",
        "hardware_profile": "UNIVERSAL (minimum: i3 2nd Gen / 6 GB RAM / CPU-only)",
        "ram_available_mb": hw["ram_available_mb"],
        "ram_used_pct": hw["ram_used_pct"],
        "loaded_models": hw["loaded"],
        "cpu_threads": hw["cpu_threads"],
    }

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("ai_service.app.main:app", host="127.0.0.1", port=8010, reload=False)
