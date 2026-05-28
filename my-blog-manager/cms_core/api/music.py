from fastapi import APIRouter
import requests

router = APIRouter()


@router.get("/query/{song_id}")
def query_netease_music(song_id: str):
    """通过网易云公开接口查询歌曲详情"""
    try:
        api_url = f"https://music.163.com/api/song/detail/?id={song_id}&ids=[{song_id}]"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": "https://music.163.com/",
        }
        response = requests.get(api_url, headers=headers, timeout=8)
        data = response.json()

        if data.get("songs") and len(data["songs"]) > 0:
            song = data["songs"][0]
            return {
                "success": True,
                "data": {
                    "id": song_id,
                    "name": song["name"],
                    "artist": song["artists"][0]["name"],
                    "album": song["album"]["name"],
                    "cover": song["album"]["picUrl"],
                },
            }
        return {"success": False, "message": "未找到该歌曲，可能是 VIP 歌曲或 ID 错误"}

    except Exception as e:
        return {"success": False, "message": f"后端请求失败: {str(e)}"}
