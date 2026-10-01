"""CI 辅助:伪造 Tauri CLI 的移动端选项通道。

`tauri ios xcode-script` 会从 $TMPDIR/{identifier}-server-addr 读取 WebSocket 地址,
连接后通过 JSON-RPC 方法 `options` 获取构建选项(CliOptions)。手动 xcodebuild 时
没有官方 `tauri ios build` 前置流程写入该文件,本脚本提供一个最小可用服务端,
返回与 `CliOptions::default()` 等价的选项,使「禁用签名 + 手动归档」的 CI 流程成立。
"""

import asyncio
import json

import websockets

# 对应 crates/tauri-cli/src/mobile/mod.rs 的 CliOptions(Default)
# 注意：features 必须为数组（CLI 反序列化不接受 null）
RESPONSE = {
    "dev": False,
    "features": [],
    "args": ["--lib"],
    "noise_level": "normal",
    "vars": {},
    "config": [],
    "target_device": None,
}


async def handler(ws):
    async for raw in ws:
        request = json.loads(raw)
        await ws.send(
            json.dumps({"jsonrpc": "2.0", "id": request.get("id"), "result": RESPONSE})
        )


async def main():
    async with websockets.serve(handler, "127.0.0.1", 9876):
        await asyncio.Future()


asyncio.run(main())
