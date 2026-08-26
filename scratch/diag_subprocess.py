import asyncio
import sys
import os
import traceback

print("Python version:", sys.version)
print("Executable:", sys.executable)
print("CWD:", os.getcwd())
print("Event Loop Policy:", type(asyncio.get_event_loop_policy()).__name__)

async def test():
    try:
        print("Spawning subprocess...")
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-c",
            "print('SUBPROCESS_OK')",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        print("Stdout:", stdout.decode().strip())
        print("Stderr:", stderr.decode().strip())
        print("Return code:", proc.returncode)
    except Exception as e:
        print("SUBPROCESS_ERROR_TYPE:", type(e).__name__)
        print("SUBPROCESS_ERROR_REPR:", repr(e))
        print("SUBPROCESS_ERROR_STR:", str(e))
        print("Traceback:")
        traceback.print_exc()

asyncio.run(test())
