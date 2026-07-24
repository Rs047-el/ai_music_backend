# AI音楽づくり ドラッグ操作サンプル

## 起動方法

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:5000
```

## 確認できること

- 4項目を1画面で選択
- カテゴリ切り替え
- タップ選択
- ドラッグ＆ドロップ選択
- タブレット向けPointer Events
- sessionStorageへの選択保存
- 全項目選択後にボタン有効化
- Flask APIへのJSON送信
- モック生成結果表示

`/api/generate` の中身を実際の generation_service 呼び出しへ置き換えれば、
Gemini/Lyriaと接続できます。
