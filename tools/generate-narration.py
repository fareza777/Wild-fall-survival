"""Generate offline prologue speech. The ElevenLabs key is never written to disk."""
import argparse
import getpass
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
MODEL_ID = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.62, "similarity_boost": 0.75, "style": 0.15,
            "use_speaker_boost": True, "speed": 0.94}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", action="store_true")
    args = parser.parse_args()
    key = getpass.getpass("ElevenLabs API key (hidden): ").strip()
    if not key:
        raise SystemExit("No API key supplied.")

    def request(path, body=None):
        headers = {"xi-api-key": key, "Accept": "application/json" if body is None else "audio/mpeg"}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
        try:
            with urlopen(Request("https://api.elevenlabs.io/v1/" + path, data=data, headers=headers), timeout=120) as response:
                return response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace").replace(key, "[redacted]")
            try:
                detail = json.loads(detail).get("detail", {})
                message = detail.get("message", detail.get("status", "Request rejected")) if isinstance(detail, dict) else str(detail)
            except (ValueError, AttributeError):
                message = "Request rejected"
            raise SystemExit(f"ElevenLabs HTTP {error.code}: {message[:400]}") from None

    if args.inspect:
        voices = json.loads(request("voices")).get("voices", [])
        stock = [v for v in voices if v.get("category") in ("premade", "default")]
        print(json.dumps({"narrators": [{"id": v["voice_id"], "name": v["name"], "labels": v.get("labels", {})} for v in stock],
                          "ttsModels": [m["model_id"] for m in json.loads(request("models")) if m.get("can_do_text_to_speech")]}, indent=2))
        return

    story_file = ROOT / "web/data/story.json"
    story = json.loads(story_file.read_text(encoding="utf-8"))
    output = ROOT / "web/assets/audio/narration"
    output.mkdir(parents=True, exist_ok=True)
    metadata_file = output / "manifest.json"
    metadata = json.loads(metadata_file.read_text(encoding="utf-8")) if metadata_file.exists() else {
        "provider": "ElevenLabs", "voice": "George", "voiceId": VOICE_ID, "model": MODEL_ID,
        "format": "mp3_44100_128", "settings": SETTINGS, "music": False, "clips": {}}
    for scene in story:
        variants = {"default": scene["text"], **scene.get("variants", {})}
        for variant, text in variants.items():
            clip_id = scene["id"] + ("" if variant == "default" else "_" + variant)
            script = scene["title"] + " " + text
            body = {"text": script, "model_id": MODEL_ID, "voice_settings": SETTINGS}
            digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode("utf-8")).hexdigest()
            path = output / (clip_id + ".mp3")
            previous = metadata["clips"].get(clip_id, {})
            if not (path.exists() and previous.get("requestHash") == digest):
                print("Generating " + clip_id + " (speech only)...", flush=True)
                audio = request("text-to-speech/" + VOICE_ID + "?output_format=mp3_44100_128", body)
                if len(audio) < 1024 or not (audio.startswith(b"ID3") or audio[0] == 0xff):
                    raise SystemExit("Unexpected speech response; no file saved.")
                path.write_bytes(audio)
                metadata["clips"][clip_id] = {"script": script, "requestHash": digest,
                    "sha256": hashlib.sha256(audio).hexdigest(), "bytes": len(audio),
                    "generatedAt": datetime.now(timezone.utc).isoformat()}
                metadata_file.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
            runtime_path = "assets/audio/narration/" + path.name
            if variant == "default":
                scene["voice"] = runtime_path
            else:
                scene.setdefault("voiceVariants", {})[variant] = runtime_path
            print(clip_id + ": " + str(path.stat().st_size) + " bytes", flush=True)
    story_file.write_text(json.dumps(story, indent=2) + "\n", encoding="utf-8")
    print("Seven offline speech clips saved. API key was not saved.", flush=True)


if __name__ == "__main__":
    main()
