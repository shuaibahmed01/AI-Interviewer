import asyncio
import os
import sys
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMMessagesFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.openai import OpenAILLMService
from pipecat.transports.network.websocket_server import (
    WebsocketServerParams,
    WebsocketServerTransport,
)
from loguru import logger
from dotenv import load_dotenv

load_dotenv(override=True)
logger.remove(0)
logger.add(sys.stderr, level="DEBUG")

class SafeWebsocketTransport(WebsocketServerTransport):
    async def _client_handler(self, websocket):
        try:
            self._websocket = websocket
            await super()._client_handler(websocket)
        except Exception as e:
            logger.error(f"Client handler error: {e}")
        finally:
            if hasattr(self, '_websocket') and self._websocket:
                try:
                    await self._websocket.close()
                except:
                    pass
            self._websocket = None

async def main():
    # Initialize transport with VAD
    transport = SafeWebsocketTransport(
        params=WebsocketServerParams(
            audio_out_sample_rate=16000,
            audio_out_enabled=True,
            add_wav_header=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
        )
    )

    # Initialize services
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4-turbo-preview"
    )

    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY")
    )

    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        voice_id="91b4cf29-5166-44eb-8054-30d40ecc8081",
        sample_rate=16000,
    )

    # Initialize context with single system message
    initial_messages = [{
        "role": "system",
        "content": "You are an interviewer conducting a mock interview, first ask the user what role they are interviewing for, then ask them questions relevant to that role. Make sure to ask one question at a time. So ask a question, wait for a response, then ask the next question, like a typical interview."
    }]
    
    context = OpenAILLMContext(initial_messages)
    context_aggregator = llm.create_context_aggregator(context)

    # Create pipeline
    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True
        )
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        try:
            greeting = LLMMessagesFrame([{
                "role": "system",
                "content": "Hello! I'm your AI interviewer. Shall we begin?"
            }])
            await task.queue_frames([greeting])
        except Exception as e:
            logger.error(f"Error in client connection handler: {e}")

    runner = PipelineRunner()
    try:
        await runner.run(task)
    except Exception as e:
        logger.error(f"Runner error: {e}")
    finally:
        await runner.cancel()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    except Exception as e:
        logger.error(f"Main error: {e}")