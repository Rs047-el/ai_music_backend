import uuid
import json
import time
import os

from google import genai

APP_BASE_URL = os.getenv("APP_BASE_URL", "http://127.0.0.1:5000")
PROMPT_MODEL = os.getenv("PROMPT_MODEL", "gemini-2.5-flash-lite")
MUSIC_MODEL = os.getenv("MUSIC_MODEL", "lyria-3-clip-preview")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

def clean_json_text(text: str) -> str:
    text = text.strip()

    if text.startswith("```json"):
        text = text.removeprefix("```json").strip()
    elif text.startswith("```"):
        text = text.removeprefix("```").strip()

    if text.endswith("```"):
        text = text.removesuffix("```").strip()

    return text

def build_music_prompt_with_gemini(world: str, instrument: str, speed: str, duration: str) -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY が設定されていません。")

    instruction = f"""
    あなたは音楽生成AIに渡すプロンプトを作るアシスタントです。

    以下の条件をもとに、2種類の文章を作ってください。

    条件：
    - 世界観：{world}
    - 楽器：{instrument}
    - スピード：{speed}
    - 長さ：{duration}

    作るもの：
    1. english_prompt
    - 音楽生成AIに渡すための英語プロンプト
    - インストゥルメンタル、歌詞なし、ボーカルなし
    - 有名アーティスト名、既存曲名、既存キャラクター名は使わない

    2. japanese_request
    - 小学生の画面に表示する日本語のお願い文
    - 「〇〇な音楽を作って！」のように、子供にも分かる言い方にする
    - 1〜2文で短くする

    ルール：
    - 子供向けイベントで使う安全で明るい音楽にしてください。
    - 怖すぎる、暴力的、不快な表現は避けてください。
    - 出力は必ずJSON形式だけにしてください。
    - Markdownのコードブロックは使わないでください。
    - ```json のような記号は絶対に付けないでください。
    - JSON以外の説明文は書かないでください。

    出力形式：
    {{
    "english_prompt": "...",
    "japanese_request": "..."
    }}
    """.strip()

    response = gemini_client.models.generate_content(
        model=PROMPT_MODEL,
        contents=instruction,
    )

    try:
        cleaned_text = clean_json_text(response.text)
        data = json.loads(cleaned_text)
    except json.JSONDecodeError:
        raise RuntimeError(f"Geminiの返答をJSONとして読み取れませんでした: {response.text}")

    english_prompt = data.get("english_prompt", "").strip()
    japanese_request = data.get("japanese_request", "").strip()

    if not english_prompt:
        raise RuntimeError("英語プロンプトが空です。")

    if not japanese_request:
        japanese_request = "選んだカードをもとに、AIに音楽を作ってもらいます。"

    return {
        "english_prompt": english_prompt,
        "japanese_request": japanese_request,
    }

def fallback_music_prompt(world: str, instrument: str, speed: str) -> str:
    """
    Geminiでプロンプト作成に失敗した場合や、LLMを使わない場合の予備。
    """
    return (
        f"A {FIXED_DURATION_PROMPT} instrumental music clip with a {WORLD_OPTIONS[world]}. "
        f"Use {INSTRUMENT_OPTIONS[instrument]} as the main instrument. "
        f"{SPEED_OPTIONS[speed]}, cheerful and suitable for children. "
        f"No vocals, no lyrics, no famous artist style, no existing song references."
    )


def save_lyria_audio_response(response) -> str:
    """
    Lyriaのレスポンスから音声データを取り出して static/generated に保存し、
    ブラウザで使えるURLを返す。
    """

    save_dir = os.path.join("static", "generated")
    os.makedirs(save_dir, exist_ok=True)

    generated_texts = []

    # google-genai SDKのレスポンス形式に合わせて parts を探す
    parts = []

    if hasattr(response, "parts") and response.parts:
        parts = response.parts
    elif getattr(response, "candidates", None):
        for candidate in response.candidates:
            content = getattr(candidate, "content", None)
            if content and getattr(content, "parts", None):
                parts.extend(content.parts)

    for part in parts:
        text = getattr(part, "text", None)
        inline_data = getattr(part, "inline_data", None)

        if text:
            generated_texts.append(text)

        if inline_data is not None and getattr(inline_data, "data", None):
            filename = f"music_{uuid.uuid4().hex}.mp3"
            save_path = os.path.join(save_dir, filename)

            with open(save_path, "wb") as f:
                f.write(inline_data.data)

            return f"/static/generated/{filename}"

    # デバッグ用：テキストだけ返って音声がない場合に原因を出しやすくする
    if generated_texts:
        raise RuntimeError(
            "Lyriaから音声データが返ってきませんでした。返答テキスト: "
            + " / ".join(generated_texts)
        )

    raise RuntimeError("Lyriaのレスポンスから音声データを取得できませんでした。")


def generate_music_with_lyria(music_prompt: str) -> str:
    """
    Gemini APIのLyriaモデルで音楽を生成し、保存したmp3のURLを返す。
    混雑時の503に備えて、数回リトライする。
    """

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY が設定されていません。")

    if not MUSIC_MODEL:
        raise RuntimeError("MUSIC_MODEL が設定されていません。")

    max_retries = 3
    wait_seconds = 5

    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model=MUSIC_MODEL,
                contents=music_prompt,
            )

            audio_url = save_lyria_audio_response(response)
            return audio_url

        except Exception as e:
            error_text = str(e)

            # 503 / UNAVAILABLE / high demand のときだけ少し待って再試行
            is_busy_error = (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                or "high demand" in error_text
            )

            if is_busy_error and attempt < max_retries - 1:
                time.sleep(wait_seconds)
                wait_seconds *= 2
                continue

            raise