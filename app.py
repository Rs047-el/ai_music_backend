from flask import (
    Flask,
    render_template,
    request,
    send_from_directory,
)
from dotenv import load_dotenv

load_dotenv()

from services.generation_service import (
    build_music_prompt_with_gemini,
    generate_music_with_lyria,
)

app = Flask(__name__)


WORLD_OPTIONS = [
    {
        "id": "space",
        "label": "宇宙",
        "icon": "🚀",
        "prompt": "dreamy space atmosphere",
    },
    {
        "id": "ocean",
        "label": "海",
        "icon": "🌊",
        "prompt": "calm ocean atmosphere",
    },
    {
        "id": "forest",
        "label": "森",
        "icon": "🌲",
        "prompt": "gentle forest atmosphere",
    },
]

INSTRUMENT_OPTIONS = [
    {
        "id": "piano",
        "label": "ピアノ",
        "icon": "🎹",
        "prompt": "soft piano",
    },
    {
        "id": "drums",
        "label": "ドラム",
        "icon": "🥁",
        "prompt": "light drums",
    },
    {
        "id": "flute",
        "label": "フルート",
        "icon": "🪈",
        "prompt": "warm flute",
    },
    {
        "id": "synth",
        "label": "シンセ",
        "icon": "🎛️",
        "prompt": "bright synthesizer",
    },
]

SPEED_OPTIONS = [
    {
        "id": "slow",
        "label": "ゆっくり",
        "icon": "🐢",
        "prompt": "slow tempo",
    },
    {
        "id": "normal",
        "label": "ふつう",
        "icon": "🚶",
        "prompt": "medium tempo",
    },
    {
        "id": "fast",
        "label": "はやい",
        "icon": "⚡",
        "prompt": "fast tempo",
    },
]

CATEGORIES = [
    {
        "id": "world",
        "title": "世界観",
        "description": "どんな世界の音楽にする？",
        "cards": WORLD_OPTIONS,
    },
    {
        "id": "instrument",
        "title": "楽器",
        "description": "どんな楽器を使う？",
        "cards": INSTRUMENT_OPTIONS,
    },
    {
        "id": "speed",
        "title": "スピード",
        "description": "どれくらいの速さにする？",
        "cards": SPEED_OPTIONS,
    },
]


FIXED_DURATION_LABEL = "20秒"
FIXED_DURATION_PROMPT = "20-second"

def find_card(
    category_id: str,
    card_id: str,
) -> dict | None:
    category = next(
        (
            category
            for category in CATEGORIES
            if category["id"] == category_id
        ),
        None,
    )

    if category is None:
        return None

    return next(
        (
            card
            for card in category["cards"]
            if card["id"] == card_id
        ),
        None,
    )


def render_index(error: str | None = None):
    return render_template(
        "index.html",
        categories=CATEGORIES,
        duration=FIXED_DURATION_LABEL,
        error=error,
    )


@app.route("/", methods=["GET"])
def index():
    return render_index()


@app.route("/create", methods=["POST"])
def create_music():
    world_id = request.form.get("world", "")
    instrument_id = request.form.get(
        "instrument",
        "",
    )
    speed_id = request.form.get("speed", "")

    world_card = find_card(
        "world",
        world_id,
    )
    instrument_card = find_card(
        "instrument",
        instrument_id,
    )
    speed_card = find_card(
        "speed",
        speed_id,
    )

    if not all(
        [
            world_card,
            instrument_card,
            speed_card,
        ]
    ):
        return render_index(
            "すべてのカードを1つずつ選んでください。"
        )

    world = world_card["label"]
    instrument = instrument_card["label"]
    speed = speed_card["label"]

    try:
        prompt_data = (
            build_music_prompt_with_gemini(
                world=world,
                instrument=instrument,
                speed=speed,
                duration=FIXED_DURATION_PROMPT,
            )
        )

        music_prompt = (
            prompt_data["english_prompt"]
        )
        japanese_request = (
            prompt_data["japanese_request"]
        )

        audio_url = (
            generate_music_with_lyria(
                music_prompt
            )
        )

    except Exception as error:
        error_detail = str(error)

        if (
            "503" in error_detail
            or "UNAVAILABLE" in error_detail
            or "high demand" in error_detail
        ):
            error_message = (
                "AIが少し混み合っています。"
                "少し時間をおいて、"
                "もう一度ためしてください。"
            )
        else:
            error_message = (
                "音楽を作れませんでした。"
                "スタッフに知らせてください。"
            )

        print("ERROR:", error_detail)

        return render_index(error_message)

    return render_template(
        "result.html",
        world=world,
        instrument=instrument,
        speed=speed,
        duration=FIXED_DURATION_LABEL,
        music_prompt=music_prompt,
        japanese_request=japanese_request,
        audio_url=audio_url,
    )


@app.route("/download/sample")
def download_sample():
    return send_from_directory(
        directory="static/music",
        path="sample.mp3",
        as_attachment=True,
        download_name="ai_music_sample.mp3",
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )