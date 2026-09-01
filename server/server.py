import os
import gc
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
from mflux.models.seedvr2 import SeedVR2

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
            # model_config=ModelConfig.z_image_turbo(),
            # quantize=4,
            # OR
            model_config=ModelConfig.z_image_turbo(),
            model_path="filipstrand/Z-Image-Turbo-mflux-4bit",
            quantize=None
        )
    elif model_name in ["flux2", "flux2-klein", "flux2-klein-4b"]:
        active_model = Flux2Klein(
            model_config=ModelConfig.flux2_klein_4b(),
            model_path="mlx-community/flux2-klein-4b-8bit",
            quantize=None
        )
    elif model_name in ["flux2-klein-9b", "flux2-9b"]:
        active_model = Flux2Klein(
            model_config=ModelConfig.flux2_klein_9b(),
            quantize=None
        )
    elif model_name in ["flux2-klein-base-9b"]:
        active_model = Flux2Klein(
            model_config=ModelConfig.flux2_klein_base_9b(),
            quantize=None
        )
    elif model_name in ["flux1-schnell", "schnell"]:
        active_model = Flux1.from_name(
            model_name="schnell",
            quantize=4
        )
    elif model_name in ["flux1-dev", "dev"]:
        active_model = Flux1.from_name(
            model_name="dev",
            quantize=4
        )
    else:
        raise ValueError(f"Unsupported model variant: {model_name}")

    current_model_name = model_name
    print(f"[MFLUX Server] '{model_name}' loaded successfully.\n")
    return active_model


def load_or_get_upscale_model():
    global current_model_name, active_model
    if current_model_name == "seedvr2-upscale" and active_model is not None:
        return active_model

    cleanup_memory()
    print("[MFLUX Server] Loading SeedVR2 upscale model...")
    active_model = SeedVR2(
        model_config=ModelConfig.seedvr2_3b(),
        model_path="mlx-community/SeedVR2-3B-mlx-int8"
    )
    current_model_name = "seedvr2-upscale"
    print("[MFLUX Server] SeedVR2 loaded successfully.\n")
    return active_model


class MfluxModel(str, Enum):
    Z_IMAGE_TURBO = "z-image-turbo"
    FLUX2_KLEIN = "flux2-klein"
    FLUX2_KLEIN_9B = "flux2-klein-9b"
    FLUX2_KLEIN_BASE_9B = "flux2-klein-base-9b"
    FLUX1_SCHNELL = "flux1-schnell"
    FLUX1_DEV = "flux1-dev"

class GenerateRequest(BaseModel):
    model: MfluxModel
    prompt: str
    seed: int
    output_path: str
    steps: int | None = None
    quantize: int = 4

class UpscaleRequest(BaseModel):
    image_path: str
    output_path: str
    resolution: int = 2160
    softness: float = 0.5
    seed: int = 42

@app.post("/generate")
def generate(req: GenerateRequest):
    with generation_lock:
        try:
            model = load_or_get_model(req.model, req.quantize)

            steps = req.steps
            if steps is None:
                if req.model == "z-image-turbo":
                    steps = 9
                elif req.model in ["flux2", "flux2-klein","flux2-klein-9b", "flux2-9b", "flux1-schnell", "schnell"]:
                    steps = 4
                elif req.model in ["flux1-dev", "dev", "flux2-klein-base-9b"]:
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


@app.post("/upscale")
def upscale(req: UpscaleRequest):
    with generation_lock:
        try:
            model = load_or_get_upscale_model()

            image = model.generate_image(
                seed=req.seed,
                image_path=req.image_path,
                resolution=req.resolution,
                softness=req.softness,
            )

            os.makedirs(os.path.dirname(req.output_path), exist_ok=True)
            image.save(req.output_path)

            return {"status": "success", "path": req.output_path}

        except Exception as e:
            print(f"\n❌ [MFLUX Server Error] Upscale failed: {e}")
            mx.clear_cache()
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/unload")
def unload():
    with generation_lock:
        cleanup_memory()
    return {"status": "unloaded"}