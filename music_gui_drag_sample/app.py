from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

OPTIONS = {
    "world": [
        {"id": "space", "label": "宇宙", "icon": "🚀"},
        {"id": "ocean", "label": "海", "icon": "🌊"},
        {"id": "forest", "label": "森", "icon": "🌳"},
        {"id": "magic", "label": "魔法の国", "icon": "🏰"},
    ],
    "instrument": [
        {"id": "piano", "label": "ピアノ", "icon": "🎹"},
        {"id": "drums", "label": "ドラム", "icon": "🥁"},
        {"id": "flute", "label": "フルート", "icon": "🪈"},
        {"id": "synth", "label": "シンセ", "icon": "🎛️"},
    ],
    "speed": [
        {"id": "slow", "label": "ゆっくり", "icon": "🐢"},
        {"id": "normal", "label": "ふつう", "icon": "🚶"},
        {"id": "fast", "label": "はやい", "icon": "⚡"},
    ],
    "image": [
        {"id": "bright", "label": "明るい", "icon": "☀️"},
        {"id": "mysterious", "label": "ふしぎ", "icon": "✨"},
        {"id": "cute", "label": "かわいい", "icon": "🧸"},
        {"id": "powerful", "label": "力強い", "icon": "🔥"},
    ],
}


@app.get("/")
def index():
    return render_template("index.html", options=OPTIONS)


@app.post("/api/generate")
def generate():
    data = request.get_json(silent=True) or {}
    required = ["world", "instrument", "speed", "image"]
    missing = [key for key in required if not data.get(key)]

    if missing:
        return jsonify({
            "success": False,
            "message": "選択されていない項目があります。",
            "missing": missing,
        }), 400

    return jsonify({
        "success": True,
        "message": "選んだ材料から、たのしい音楽ができました！",
        "selections": data,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
