import asyncio
import io
import shutil
import tempfile
from pathlib import Path
from app.services.storage_service import StorageService
from app.utils.logger import get_logger


logger = get_logger(__name__)

RENDITIONS = [
    {
        "name": "240p",
        "resolution": "426x240",
        "v_bitrate": "400k",
        "maxrate": "500k",
        "bufsize": "750k",
        "a_bitrate": "64k",
    },
    {
        "name": "360p",
        "resolution": "640x360",
        "v_bitrate": "800k",
        "maxrate": "1000k",
        "bufsize": "1500k",
        "a_bitrate": "96k",
    },
    {
        "name": "480p",
        "resolution": "854x480",
        "v_bitrate": "1400k",
        "maxrate": "1750k",
        "bufsize": "2625k",
        "a_bitrate": "128k",
    },
    {
        "name": "720p",
        "resolution": "1280x720",
        "v_bitrate": "2800k",
        "maxrate": "3500k",
        "bufsize": "5250k",
        "a_bitrate": "128k",
    },
    {
        "name": "1080p",
        "resolution": "1920x1080",
        "v_bitrate": "5000k",
        "maxrate": "6250k",
        "bufsize": "9375k",
        "a_bitrate": "192k",
    }
]

class TranscodingService:

    def __init__(self, storage_service: StorageService) -> None:
        self._storage = storage_service

    async def transcode_to_hls(self, video_id: str, file_data: bytes, filename: str) -> str:
        temp_dir = tempfile.mkdtemp()
        temp_path = Path(temp_dir)

        try:
            input_file = temp_path / filename
            input_file.write_bytes(file_data)
            logger.info("Saved uploaded file to temp: %s (%d bytes)", input_file, len(file_data))

            output_dir = temp_path / "hls"
            output_dir.mkdir()

            for rendition in RENDITIONS:
                await self._transcode_rendition(input_file, output_dir,rendition)

            self._generate_master_playlist(output_dir)

            master_url = self._upload_hls_files(output_dir,video_id)
            return master_url

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info("Deleted temp dir: %s", temp_dir)


    async def _transcode_rendition(self, input_file: Path, output_dir: Path, rendition: dict) -> None:

        name = rendition["name"]

        rendition_dir = output_dir / name
        rendition_dir.mkdir()

        playlist_path = rendition_dir / "playlist.m3u8"

        command = [
            "ffmpeg",
            "-i", str(input_file),

            "-vf", f"scale={rendition['resolution'].replace('x', ':')}",

            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-threads", "0",
            "-b:v", rendition["v_bitrate"],
            "-maxrate", rendition["maxrate"],
            "-bufsize", rendition["bufsize"],

            "-c:a", "aac",
            "-b:a", rendition["a_bitrate"],
            "-ar", "44100",

            "-g", "48",
            "-keyint_min", "48",
            "-sc_threshold", "0",

            "-hls_time", "4",
            "-hls_list_size", "0",
            "-hls_segment_filename", str(rendition_dir / "segment%03d.ts"),

            "-f", "hls",
            str(playlist_path),
        ]

        logger.info("Transcoding %s rendition for: %s", name, input_file.name)

        import subprocess
        
        def run_ffmpeg():
            return subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

        process = await asyncio.to_thread(run_ffmpeg)

        if process.returncode != 0:
            error_msg = process.stderr.decode() if process.stderr else "Unknown ffmpeg error"
            logger.error("FFmpeg failed for %s (exit code %d): %s", name, process.returncode,error_msg)
            raise  RuntimeError(f"FFmpeg failed for {name} : {error_msg}")

        logger.info("Transcoding %s rendition completed successfully", name)


    def _generate_master_playlist(self, output_dir: Path) -> None:

        master_content = "#EXTM3U\n"

        for rendition in RENDITIONS:
            bitrate_str = rendition["v_bitrate"].replace("k", "")
            bandwidth = int(bitrate_str) *1000

            master_content += (
                f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},"
                f"RESOLUTION={rendition['resolution']}\n"
                f"{rendition['name']}/playlist.m3u8\n"
            )

        master_path = output_dir / "master.m3u8"
        master_path.write_text(master_content)
        logger.info("Generated master playlist at: %s", master_path)

    def _upload_hls_files(self, output_dir: Path, video_id: str) -> str:
        master_url = ""
        r2_prefix = f"videos/{video_id}"

        for file_path in output_dir.rglob("*"):
            if file_path.is_dir():
                continue
            if file_path.suffix ==".m3u8":
                content_type = "application/vnd.apple.mpegurl"
            elif file_path.suffix == ".ts":
                content_type = "video/mp2t"
            else:
                content_type = "application/octet-stream"

            relative_path = file_path.relative_to(output_dir)
            r2_key = f"{r2_prefix}/{relative_path.as_posix()}"

            file_bytes = file_path.read_bytes()
            file_obj = io.BytesIO(file_bytes)

            url = self._storage.upload_file(
                file_obj = file_obj,
                key=r2_key,
                content_type = content_type,
            )

            if file_path.name == "master.m3u8":
                master_url = url
                logger.info("Master playlist url: %s", master_url)

        return master_url