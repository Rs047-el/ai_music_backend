from flask import Flask, render_template, request, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

WORLD_OPTIONS = {
    "宇宙": "dreamy space atmosphere",
    "海": "calm ocean atmosphere",
    "森": "gentle forest atmosphere",
    "魔法の国": "magical fantasy atmosphere",
    "未来の町": "bright futuristic city atmosphere",
}

INSTRUMENT_OPTIONS = {
    "ピアノ": "soft piano",
    "ドラム": "light drums",
    "フルート": "warm flute",
    "シンセ": "bright synthesizer",
    "木琴": "cute xylophone",
}

SPEED_OPTIONS = {
    "ゆっくり": "slow tempo",
    "ふつう": "medium tempo",
    "はやい": "fast tempo",
}

FIXED_DURATION_LABEL = "20秒"
FIXED_DURATION_PROMPT = "20-second"

@app.route("/", methods=["GET"])
def index():
    return render_template(
        "index.html",
        worlds=list(WORLD_OPTIONS.keys()),
        instruments=list(INSTRUMENT_OPTIONS.keys()),
        speeds=list(SPEED_OPTIONS.keys()),
        duration=FIXED_DURATION_LABEL
    )

@app.route("/create", methods=["POST"])
def create_music():
    world = request.form.get("world", "")
    instrument = request.form.get("instrument", "")
    speed = request.form.get("speed", "")

    duration_label=FIXED_DURATION_LABEL
    duration_prompt=FIXED_DURATION_PROMPT

    if not all([world, instrument, speed]):
        return render_template(
            "index.html",
            worlds=list(WORLD_OPTIONS.keys()),
            instruments=list(INSTRUMENT_OPTIONS.keys()),
            speeds=list(SPEED_OPTIONS.keys()),
            duration=duration_label,
            error="すべてのカードを1つずつ選んでください。",
        )

    try:
        # 1. GeminiでLyria用プロンプトを作る
        prompt_data = build_music_prompt_with_gemini(
            world=world,
            instrument=instrument,
            speed=speed,
            duration=duration_prompt,
        )

        music_prompt = prompt_data["english_prompt"]
        japanese_request = prompt_data["japanese_request"]

        # 2. Lyriaで音楽生成
        audio_url = generate_music_with_lyria(music_prompt)

    except Exception as e:
        error_detail = str(e)

        if (
            "503" in error_detail
            or "UNAVAILABLE" in error_detail
            or "high demand" in error_detail
        ):
            error_message = "AIが少し混み合っています。少し時間をおいて、もう一度ためしてください。"
        else:
            error_message = "音楽を作れませんでした。スタッフに知らせてください。"

        print("ERROR:", error_detail)

        return render_template(
            "index.html",
            worlds=list(WORLD_OPTIONS.keys()),
            instruments=list(INSTRUMENT_OPTIONS.keys()),
            speeds=list(SPEED_OPTIONS.keys()),
            duration=duration_label,
            error=error_message,
        )

    return render_template(
        "result.html",
        world=world,
        instrument=instrument,
        speed=speed,
        duration=duration_label,
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
    app.run(host="0.0.0.0", port=5000, debug=True)