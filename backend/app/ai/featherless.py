import asyncio
import os
from typing import Optional
from dotenv import load_dotenv
import httpx


class FeatherlessError(Exception):
    """Exception raised for errors during Featherless API interaction."""
    pass


async def chat_completion(
    messages: list[dict],
    model: Optional[str] = None,
    max_tokens: int = 500,
    temperature: float = 0.2,
) -> str:
    """Send a chat completion request to Featherless API.
    
    Reads configuration via os.getenv at call time.
    Retries once on 429, 5xx, or network timeouts with 1-second backoff.
    Raises FeatherlessError on any failure without leaking the API key.
    """
    if os.getenv("FEATHERLESS_API_KEY") is None:
        load_dotenv()

    api_key = os.getenv("FEATHERLESS_API_KEY")
    if not api_key or not api_key.strip():
        raise FeatherlessError("FEATHERLESS_API_KEY is not set")

    base_url = (os.getenv("FEATHERLESS_BASE_URL") or "https://api.featherless.ai/v1").rstrip("/")
    target_url = f"{base_url}/chat/completions"
    selected_model = model or os.getenv("FEATHERLESS_MODEL") or "Qwen/Qwen2.5-7B-Instruct"

    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": selected_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    last_error_msg = "Unknown error"

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(target_url, json=payload, headers=headers)

                # Check for retryable HTTP status codes (429 or 5xx)
                if response.status_code == 429 or response.status_code >= 500:
                    last_error_msg = f"HTTP {response.status_code}: {response.reason_phrase}"
                    if attempt == 0:
                        await asyncio.sleep(1.0)
                        continue
                    raise FeatherlessError(f"Featherless API error: status {response.status_code}")

                # Non-retryable HTTP error status codes (e.g. 400, 401, 403, 404)
                if response.status_code != 200:
                    raise FeatherlessError(f"Featherless API error: status {response.status_code}")

                try:
                    data = response.json()
                except Exception:
                    raise FeatherlessError("Malformed JSON response from Featherless API")

                if not isinstance(data, dict):
                    raise FeatherlessError("Invalid response format from Featherless API")

                choices = data.get("choices")
                if not isinstance(choices, list) or not choices:
                    raise FeatherlessError("Featherless response missing choices")

                first_choice = choices[0]
                if not isinstance(first_choice, dict):
                    raise FeatherlessError("Featherless response choice is not a dictionary")

                message = first_choice.get("message")
                if not isinstance(message, dict):
                    raise FeatherlessError("Featherless response missing message dictionary")

                content = message.get("content")
                if content is None:
                    raise FeatherlessError("Featherless response message missing content")

                return str(content)

        except (httpx.TimeoutException, httpx.NetworkError) as net_err:
            last_error_msg = f"Network error: {type(net_err).__name__}"
            if attempt == 0:
                await asyncio.sleep(1.0)
                continue
            raise FeatherlessError(f"Featherless request timed out or failed: {type(net_err).__name__}")
        except FeatherlessError:
            raise
        except Exception as exc:
            safe_msg = str(exc).replace(api_key, "[REDACTED]")
            raise FeatherlessError(f"Featherless request error: {safe_msg}")

    raise FeatherlessError(f"Featherless request failed after retry: {last_error_msg}")
