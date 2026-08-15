import asyncio
import base64
import io
import json
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from phone_agent.actions.handler import parse_action
from phone_agent.config import APP_PACKAGES, get_system_prompt
from phone_agent.model import ModelClient, ModelConfig
from phone_agent.model.client import MessageBuilder, ModelResponse
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"
ADB_KEYBOARD_APK = BASE_DIR / "ADBKeyboard.apk"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

def _adb_prefix(device_id: str | None = None) -> list[str]:
    adb_path = os.getenv("PHONE_AGENT_ADB_PATH")
    base = [adb_path] if adb_path else ["adb"]
    if device_id:
        return base + ["-s", device_id]
    return base


def _adb_shell(command: str, device_id: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        _adb_prefix(device_id) + ["shell", command],
        capture_output=True,
        text=True,
        timeout=10,
    )


def _list_devices() -> list[dict[str, str]]:
    result = subprocess.run(_adb_prefix() + ["devices"], capture_output=True, text=True, timeout=5)
    devices: list[dict[str, str]] = []
    for line in result.stdout.splitlines()[1:]:
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 2:
            devices.append({"id": parts[0], "status": parts[1]})
    return devices


def _current_package(device_id: str | None) -> str:
    result = _adb_shell("dumpsys window", device_id)
    for line in result.stdout.splitlines():
        if "mCurrentFocus" in line or "mFocusedApp" in line:
            match = re.search(r"\s([\w\.]+)\/", line)
            if match:
                return match.group(1)
    return ""


def _current_activity(device_id: str | None) -> tuple[str, str]:
    result = _adb_shell("dumpsys window", device_id)
    patterns = [
        r"mCurrentFocus.*?\s([\w\.]+)\/([^\s\}]+)",
        r"mFocusedApp.*?\s([\w\.]+)\/([^\s\}]+)",
        r"ResumedActivity.*?\s([\w\.]+)\/([^\s\}]+)",
    ]
    for line in result.stdout.splitlines():
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1), match.group(2)
    return "", ""


@dataclass
class AgentSession:
    lang: str = "cn"
    max_steps: int = 100
    step_count: int = 0
    context: list[dict[str, Any]] = field(default_factory=list)
    model_config: ModelConfig = field(default_factory=ModelConfig)
    model_client: ModelClient = field(default_factory=ModelClient)

    def reset(self) -> None:
        self.step_count = 0
        self.context = []

    def configure(self, config: dict[str, Any]) -> None:
        base_url = config.get("base_url", self.model_config.base_url)
        api_key = config.get("api_key", self.model_config.api_key)
        model_name = config.get("model", self.model_config.model_name)
        self.lang = config.get("lang", self.lang)
        self.max_steps = int(config.get("max_steps", self.max_steps))

        extra_body = config.get("extra_body", self.model_config.extra_body) or {}
        if isinstance(extra_body, str):
            try:
                extra_body = json.loads(extra_body)
            except Exception:
                extra_body = {}

        self.model_config = ModelConfig(
            base_url=base_url,
            api_key=api_key,
            model_name=model_name,
            max_tokens=int(config.get("max_tokens", self.model_config.max_tokens)),
            temperature=float(config.get("temperature", self.model_config.temperature)),
            top_p=float(config.get("top_p", self.model_config.top_p)),
            frequency_penalty=float(
                config.get("frequency_penalty", self.model_config.frequency_penalty)
            ),
            extra_body=extra_body,
        )
        self.model_client = ModelClient(self.model_config)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/apps")
def apps() -> JSONResponse:
    return JSONResponse({"apps": APP_PACKAGES})
@app.get("/api/bridge/devices")
def bridge_devices() -> JSONResponse:
    return JSONResponse({"devices": _list_devices()})


@app.post("/api/bridge/shell")
def bridge_shell(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    command = payload.get("command", "")
    device_id = payload.get("device_id")
    if not command:
        return JSONResponse({"error": "command is required"})
    try:
        result = _adb_shell(command, device_id)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})
    output = (result.stdout or "") + (result.stderr or "")
    return JSONResponse({"output": output})


@app.post("/api/bridge/pair")
def bridge_pair(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    address = (payload.get("address") or "").strip()
    code = (payload.get("code") or "").strip()
    if not address or not code:
        return JSONResponse({"error": "address and code are required"})
    try:
        result = subprocess.run(
            _adb_prefix() + ["pair", address, code],
            capture_output=True,
            text=True,
            timeout=20,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        return JSONResponse({"error": output.strip() or "adb pair failed"})
    return JSONResponse({"output": output.strip()})


@app.post("/api/bridge/connect")
def bridge_connect(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    address = (payload.get("address") or "").strip()
    if not address:
        return JSONResponse({"error": "address is required"})
    try:
        result = subprocess.run(
            _adb_prefix() + ["connect", address],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        return JSONResponse({"error": output.strip() or "adb connect failed"})
    return JSONResponse({"output": output.strip()})


@app.post("/api/bridge/disconnect")
def bridge_disconnect(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    address = (payload.get("address") or "").strip()
    args = ["disconnect"]
    if address:
        args.append(address)
    try:
        result = subprocess.run(
            _adb_prefix() + args,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        return JSONResponse({"error": output.strip() or "adb disconnect failed"})
    return JSONResponse({"output": output.strip()})


@app.post("/api/bridge/install_keyboard")
def bridge_install_keyboard(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    device_id = payload.get("device_id")
    if not ADB_KEYBOARD_APK.exists():
        return JSONResponse({"error": f"ADBKeyboard.apk 未找到：{ADB_KEYBOARD_APK}"})
    try:
        result = subprocess.run(
            _adb_prefix(device_id) + ["install", "-r", str(ADB_KEYBOARD_APK)],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})
    output = (result.stdout or "") + (result.stderr or "")
    if result.returncode != 0:
        return JSONResponse({"error": output.strip() or "ADB Keyboard 安装失败"})
    return JSONResponse({"output": output.strip()})


@app.get("/api/bridge/activity")
def bridge_activity(device_id: str | None = None) -> JSONResponse:
    pkg, activity = _current_activity(device_id)
    return JSONResponse({"package": pkg, "activity": activity})


@app.post("/api/bridge/screen")
def bridge_screen(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    device_id = payload.get("device_id")
    target_width = int(payload.get("target_width", 0) or 0)
    image_format = str(payload.get("format", "png") or "png").lower()
    if image_format == "jpg":
        image_format = "jpeg"
    if image_format not in {"png", "jpeg"}:
        image_format = "png"
    jpeg_quality = int(payload.get("jpeg_quality", 70) or 70)
    jpeg_quality = max(40, min(90, jpeg_quality))
    include_package = bool(payload.get("include_package"))
    try:
        result = subprocess.run(
            _adb_prefix(device_id) + ["exec-out", "screencap", "-p"],
            capture_output=True,
            timeout=8,
        )
        if result.returncode != 0:
            return JSONResponse({"error": result.stderr.decode(errors="ignore")})
        raw = result.stdout
        if not raw:
            return JSONResponse({"error": "empty screenshot"})

        image = Image.open(io.BytesIO(raw))
        device_width = image.width
        device_height = image.height
        resized = False
        if target_width and image.width > target_width:
            scale = target_width / image.width
            target_height = max(1, int(image.height * scale))
            image = image.resize((target_width, target_height), Image.BILINEAR)
            resized = True

        if image_format == "jpeg":
            buffer = io.BytesIO()
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            image.save(buffer, format="JPEG", quality=jpeg_quality, optimize=False)
            raw = buffer.getvalue()
            mime = "image/jpeg"
        else:
            if resized:
                buffer = io.BytesIO()
                image.save(buffer, format="PNG", optimize=False, compress_level=3)
                raw = buffer.getvalue()
            mime = "image/png"

        encoded = base64.b64encode(raw).decode("utf-8")
        response_payload = {
            "image": encoded,
            "width": image.width,
            "height": image.height,
            "device_width": device_width,
            "device_height": device_height,
            "format": image_format,
            "mime": mime,
        }
        if include_package:
            response_payload["current_package"] = _current_package(device_id)
        return JSONResponse(response_payload)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)})


def resolve_app_name(current_app: str | None, current_package: str | None) -> str:
    if current_app:
        return current_app
    if current_package:
        for name, package in APP_PACKAGES.items():
            if package == current_package:
                return name
        return current_package
    return "System Home"


def build_screen_info(screen: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    image_b64 = screen.get("image") or ""
    current_app = resolve_app_name(screen.get("current_app"), screen.get("current_package"))
    info = MessageBuilder.build_screen_info(
        current_app,
        width=screen.get("width"),
        height=screen.get("height"),
        current_package=screen.get("current_package"),
    )
    return image_b64, {"info": info}


async def stream_model(session: AgentSession, websocket: WebSocket) -> ModelResponse:
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    result: dict[str, Any] = {"response": None, "error": None}

    def on_delta(text: str) -> None:
        if not text:
            return
        asyncio.run_coroutine_threadsafe(queue.put(text), loop)

    def run_request() -> None:
        try:
            result["response"] = session.model_client.request_stream(
                session.context, on_thinking_delta=on_delta
            )
        except Exception as exc:  # noqa: BLE001
            result["error"] = exc
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    task = asyncio.create_task(asyncio.to_thread(run_request))

    while True:
        item = await queue.get()
        if item is None:
            break
        await websocket.send_json({"type": "thinking_delta", "delta": item})

    await task
    if result["error"]:
        raise result["error"]
    return result["response"]


async def handle_step(
    session: AgentSession,
    websocket: WebSocket,
    screen: dict[str, Any],
    task: str | None = None,
    user_text: str | None = None,
) -> None:
    session.step_count += 1
    if session.step_count > session.max_steps:
        await websocket.send_json(
            {
                "type": "action",
                "action": {"_metadata": "finish", "message": "达到最大步数"},
                "raw_action": "finish(message=\"达到最大步数\")",
                "thinking": "",
                "step": session.step_count,
            }
        )
        return

    image_b64, screen_payload = build_screen_info(screen)

    if not session.context:
        system_prompt = get_system_prompt(session.lang)
        session.context.append(MessageBuilder.create_system_message(system_prompt))

    if task:
        content = f"{task}\n\n{screen_payload['info']}"
    elif user_text:
        content = f"{user_text}\n\n{screen_payload['info']}"
    else:
        content = f"** Screen Info **\n\n{screen_payload['info']}"

    session.context.append(
        MessageBuilder.create_user_message(text=content, image_base64=image_b64)
    )

    response = await stream_model(session, websocket)

    session.context.append(
        MessageBuilder.create_assistant_message(response.raw_content)
    )

    # Reduce context size by removing old images
    if len(session.context) > 8:
        for message in session.context[:-4]:
            MessageBuilder.remove_images_from_message(message)

    try:
        action = parse_action(response.action)
    except Exception:
        action = {"_metadata": "finish", "message": response.action}

    await websocket.send_json(
        {
            "type": "action",
            "action": action,
            "raw_action": response.action,
            "thinking": response.thinking,
            "step": session.step_count,
        }
    )


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    session = AgentSession()

    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")

            if msg_type == "configure":
                session.configure(payload.get("config", {}))
                await websocket.send_json({"type": "status", "message": "配置已更新"})
                continue

            if msg_type == "start_task":
                session.reset()
                await websocket.send_json({"type": "status", "message": "任务已启动"})
                await handle_step(
                    session,
                    websocket,
                    payload.get("screen", {}),
                    task=payload.get("task", ""),
                )
                continue

            if msg_type == "user_message":
                await handle_step(
                    session,
                    websocket,
                    payload.get("screen", {}),
                    user_text=payload.get("text", ""),
                )
                continue

            if msg_type == "step":
                await handle_step(session, websocket, payload.get("screen", {}))
                continue

            if msg_type == "finish":
                session.reset()
                await websocket.send_json(
                    {
                        "type": "action",
                        "action": {"_metadata": "finish", "message": payload.get("message")},
                        "raw_action": "finish(message=\"用户结束\")",
                        "thinking": "",
                        "step": session.step_count,
                    }
                )
                continue

            await websocket.send_json(
                {"type": "error", "message": f"Unknown message type: {msg_type}"}
            )

    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        await websocket.send_json({"type": "error", "message": str(exc)})









