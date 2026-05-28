from fastapi import APIRouter
import hashlib
import json
import re
import uuid
import requests

router = APIRouter()

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def _mid():
    return hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()


def _parse_kugou_json(text: str):
    text = text.strip()
    if text.startswith("{"):
        return json.loads(text)
    match = re.match(r"^[^(]+\(([\s\S]*)\)\s*;?$", text)
    if match:
        return json.loads(match.group(1))
    raise ValueError("无法解析酷狗接口响应")


def _parse_song_id(raw_id: str):
    raw_id = raw_id.strip()
    if "|" in raw_id:
        hash_val, album_id = raw_id.split("|", 1)
        return hash_val.strip().upper(), album_id.strip(), ""
    if re.fullmatch(r"[a-fA-F0-9]{32}", raw_id):
        return raw_id.upper(), "", ""
    return "", "", raw_id


def _play_get_data(hash_val: str, album_id: str):
    params = {
        "r": "play/getdata",
        "hash": hash_val,
        "appid": "1014",
        "mid": _mid(),
        "platid": "4",
        "album_id": album_id or "0",
        "format": "json",
    }
    response = requests.get(
        "https://wwwapi.kugou.com/yy/index.php",
        params=params,
        headers={"User-Agent": UA, "Referer": "https://www.kugou.com/"},
        timeout=8,
    )
    return _parse_kugou_json(response.text)


@router.get("/query/{song_id}")
def query_kugou_music(song_id: str):
    """通过酷狗接口查询歌曲详情（兼容管理后台旧调用路径）"""
    print(f"\n[API] 🎵 收到查询酷狗音乐请求, ID: {song_id}")
    try:
        hash_val, album_id, album_audio_id = _parse_song_id(song_id)

        if not hash_val and album_audio_id:
            search_url = "http://mobilecdn.kugou.com/api/v3/search/song"
            search_res = requests.get(
                search_url,
                params={
                    "format": "json",
                    "keyword": album_audio_id,
                    "page": 1,
                    "pagesize": 1,
                    "showtype": 1,
                },
                headers={"User-Agent": UA, "Referer": "https://m.kugou.com/"},
                timeout=8,
            )
            search_json = _parse_kugou_json(search_res.text)
            items = search_json.get("data", {}).get("lists") or search_json.get("data", {}).get("info") or []
            if not items:
                return {"success": False, "message": "未找到该歌曲，请检查酷狗 ID"}
            first = items[0]
            hash_val = (first.get("FileHash") or first.get("hash") or "").upper()
            album_id = str(first.get("AlbumID") or first.get("album_id") or "")

        if not hash_val:
            return {"success": False, "message": "歌曲 ID 格式无效"}

        play_json = _play_get_data(hash_val, album_id)
        data = play_json.get("data") or {}
        if not data.get("play_url"):
            return {"success": False, "message": "未找到可播放资源，可能是 VIP 或版权限制"}

        cover = data.get("img") or ""
        if cover and "{size}" in cover:
            cover = cover.replace("{size}", "400")

        print(f"[API] ✅ 查询成功: {data.get('song_name') or data.get('audio_name')}")
        return {
            "success": True,
            "data": {
                "id": song_id,
                "name": data.get("song_name") or data.get("audio_name") or "未知歌曲",
                "artist": data.get("author_name") or data.get("singer_name") or "未知歌手",
                "album": data.get("album_name") or "",
                "cover": cover,
            },
        }
    except Exception as e:
        print(f"[API] 💥 酷狗接口发生错误: {str(e)}")
        return {"success": False, "message": f"后端请求失败: {str(e)}"}
