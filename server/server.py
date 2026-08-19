import gc
import os
import threading
from enum import Enum
from contextlib import asynccontextmanager
import mlx.core as mx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from mflux.models.common.config import ModelConfig
from mflux.models.z_image import ZImageTurbo
from mflux.models.flux2.variants import Flux2Klein
from mflux.models.flux.variants.txt2img.flux import Flux1

current_model_name = None
active_model = None
generation_lock = threading.Lock()

def cleanup_memory():
    """Unloads active model and releases Metal GPU cache back to macOS."""
    global current_model_name, active_model
    if active_model is not None or current_model_name is not None:
        print(f"\n[MFLUX Server] Unloading '{current_model_name}' and clearing GPU memory...")
        active_model = None
        current_model_name = None
        gc.collect()
        mx.clear_cache()
        print("[MFLUX Server] GPU memory successfully freed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[MFLUX Server] Server started and listening for requests.")
    yield
    print("\n[MFLUX Server] Graceful shutdown initiated...")
    cleanup_memory()
    print("[MFLUX Server] Shutdown complete.")


app = FastAPI(lifespan=lifespan)


def load_or_get_model(model_name: str, quantize: int = 4):
    global current_model_name, active_model

    if current_model_name == model_name and active_model is not None:
        return active_model

    cleanup_memory()

    print(f"\n[MFLUX Server] Unloading '{current_model_name}' and clearing Metal RAM...")

    active_model = None
    gc.collect()
    mx.clear_cache()

    print(f"[MFLUX Server] Loading model '{model_name}'...")

    if model_name == "z-image-turbo":
        active_model = ZImageTurbo(
            quantize=quantize,
            model_config=ModelConfig.z_image_turbo()
        )
    elif model_name in ["flux2", "flux2-klein-4b"]:
        active_model = Flux2Klein(
            quantize=quantize,
            model_config=ModelConfig.flux2_klein_4b()
        )
    elif model_name == "flux2-klein-9b":
        active_model = Flux2Klein(
            quantize=quantize,
            model_config=ModelConfig.flux2_klein_9b()
        )
    elif model_name in ["flux1-schnell", "schnell"]:
        active_model = Flux1.from_name(
            model_name="schnell",
            quantize=quantize
        )
    elif model_name == "dev":
        active_model = Flux1.from_name(
            model_name="dev",
            quantize=quantize
        )
    else:
        raise ValueError(f"Unsupported model variant: {model_name}")

    current_model_name = model_name
    print(f"[MFLUX Server] '{model_name}' loaded successfully.\n")
    return active_model

class MfluxModel(str, Enum):
    Z_IMAGE_TURBO = "z-image-turbo"
    FLUX2 = "flux2"
    FLUX2_KLEIN_4B = "flux2-klein-4b"
    FLUX2_KLEIN_9B = "flux2-klein-9b"
    FLUX1_SCHNELL = "flux1-schnell"
    DEV = "dev"

class GenerateRequest(BaseModel):
    model: MfluxModel
    prompt: str
    seed: int
    output_path: str
    steps: int | None = None
    quantize: int = 4

@app.post("/generate")
def generate(req: GenerateRequest):
    with generation_lock:
        try:
            model = load_or_get_model(req.model, req.quantize)

            steps = req.steps
            if steps is None:
                if req.model == "z-image-turbo":
                    steps = 9
                elif req.model in ["flux2", "flux2-klein-4b", "flux2-klein-9b", "flux1-schnell", "schnell"]:
                    steps = 4
                elif req.model == "dev":
                    steps = 25
                else:
                    steps = 4

            result = model.generate_image(
                prompt=req.prompt,
                seed=req.seed,
                num_inference_steps=steps
            )

            os.makedirs(os.path.dirname(req.output_path), exist_ok=True)
            result.save(req.output_path)

            return {
                "status": "success",
                "model_used": req.model,
                "steps": steps,
                "path": req.output_path
            }

        except Exception as e:
            print(f"\n❌ [MFLUX Server Error] Generation failed: {e}")
            mx.clear_cache()
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/unload")
def unload():
    with generation_lock:
        cleanup_memory()
    return {"status": "unloaded"}