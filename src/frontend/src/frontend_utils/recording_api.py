import os
import glob
import re
import signal
import subprocess
import time
from datetime import datetime
from flask import jsonify, request, send_file, abort, render_template


class RecordingRoutes:
    def __init__(self, app, logger, rtsp_urls):
        self.app = app
        self.logger = logger
        self.rtsp_urls = rtsp_urls  # camera name -> RTSP URL, e.g. "camera1" -> "rtsp://127.0.0.1:8554/camera1"
        self.recording = {}  # camera name -> {"process": ffmpeg process, "started": start time}
        self.register_routes()

    @staticmethod
    def camera_name(camera):
        """Accept "1" or "camera1" (or "cv_camera") and return the camera name"""
        return f"camera{camera}" if camera.isdigit() else camera

    def register_routes(self):
        """Register all recording-related routes with the Flask app"""

        # Recording works by running one ffmpeg process per camera that copies the
        # camera's RTSP stream (from go2rtc) into videos/<camera>_<time>.mp4

        @self.app.route("/api/record/start/<camera>", methods=["POST"])
        def start_recording(camera):
            name = self.camera_name(camera)
            if name not in self.rtsp_urls:
                return jsonify({"success": False, "message": f"Unknown camera: {camera}"})
            if name in self.recording:
                return jsonify({"success": True})  # already recording

            videos_dir = os.path.join(os.getcwd(), "videos")
            os.makedirs(videos_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            output_path = os.path.join(videos_dir, f"{name}_{timestamp}.mp4")

            command = ["ffmpeg", "-rtsp_transport", "tcp", "-i", self.rtsp_urls[name], "-c", "copy", output_path]
            try:
                process = subprocess.Popen(
                    command, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
            except FileNotFoundError:
                return jsonify({"success": False, "message": "ffmpeg is not installed"})

            self.recording[name] = {"process": process, "started": time.time()}
            self.logger.info(f"Started recording {name} -> {output_path}")
            return jsonify({"success": True})

        @self.app.route("/api/record/stop/<camera>", methods=["POST"])
        def stop_recording(camera):
            name = self.camera_name(camera)
            entry = self.recording.pop(name, None)
            if entry:
                # SIGINT lets ffmpeg finish writing the file so the .mp4 is playable
                entry["process"].send_signal(signal.SIGINT)
                try:
                    entry["process"].wait(timeout=5)
                except subprocess.TimeoutExpired:
                    entry["process"].kill()
                self.logger.info(f"Stopped recording {name}")
            return jsonify({"success": True})

        @self.app.route("/api/record/status")
        def recording_status():
            # Forget any ffmpeg that already exited (e.g. the camera stream wasn't available)
            for name in list(self.recording):
                if self.recording[name]["process"].poll() is not None:
                    self.logger.warning(f"Recording of {name} stopped unexpectedly")
                    del self.recording[name]
            # { "camera1": <start time in seconds>, ... }
            return jsonify({name: entry["started"] for name, entry in self.recording.items()})

        @self.app.route("/api/recordings")
        def get_recordings():
            # Get all MP4 files in the videos directory using absolute path
            videos_dir = os.path.join(os.getcwd(), "videos")
            mp4_files = glob.glob(os.path.join(videos_dir, "*.mp4"))

            # Create a list of recording objects with metadata
            recordings = []
            for file in mp4_files:
                # Parse the filename to get camera and timestamp
                filename = os.path.basename(file)

                # Get file creation time
                creation_time = os.path.getctime(file)

                # Get video duration using ffprobe
                duration = "00:00"
                try:
                    result = subprocess.run(
                        [
                            "ffprobe",
                            "-v",
                            "error",
                            "-show_entries",
                            "format=duration",
                            "-of",
                            "default=noprint_wrappers=1:nokey=1",
                            file,
                        ],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                    )

                    if result.stdout:
                        # Convert seconds to MM:SS format
                        seconds = float(result.stdout)
                        minutes = int(seconds // 60)
                        seconds = int(seconds % 60)
                        duration = f"{minutes:02d}:{seconds:02d}"
                except Exception as e:
                    self.logger.error(f"Error getting video duration: {str(e)}")

                # Extract date from filename
                date_match = re.search(
                    r"(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})", filename
                )
                date = (
                    date_match.group(1)
                    if date_match
                    else datetime.fromtimestamp(creation_time).strftime(
                        "%Y-%m-%d_%H-%M-%S"
                    )
                )

                recordings.append(
                    {
                        "id": filename,  # Use filename directly as ID
                        "filename": filename,
                        "date": date,
                        "creation_time": creation_time,
                        "size": os.path.getsize(file),
                        "duration": duration,
                    }
                )

            # Sort by creation time, newest first
            recordings.sort(key=lambda x: x["creation_time"], reverse=True)

            return jsonify(recordings)

        @self.app.route("/api/recordings/<path:filename>/thumbnail")
        def get_recording_thumbnail(filename):
            self.logger.info(f"Getting thumbnail for recording: {filename}")
            # Use absolute path for the video file
            file_path = os.path.join(os.getcwd(), "videos", filename)
            self.logger.info(f"Path: {file_path}")
            if not os.path.exists(file_path):
                self.logger.error(f"Recording not found: {filename}")
                abort(404)

            thumbnail_dir = os.path.join(os.getcwd(), "videos", "thumbnails")
            os.makedirs(thumbnail_dir, exist_ok=True)
            thumbnail_path = os.path.join(
                thumbnail_dir, f"{os.path.splitext(filename)[0]}.jpg"
            )

            if not os.path.exists(thumbnail_path):
                try:
                    subprocess.run(
                        [
                            "ffmpeg",
                            "-y",
                            "-i",
                            file_path,
                            "-ss",
                            "00:00:01.000",
                            "-vframes",
                            "1",
                            thumbnail_path,
                        ],
                        check=True,
                    )
                except Exception as e:
                    self.logger.error(f"Error generating thumbnail: {str(e)}")
                    abort(500)

            return send_file(thumbnail_path, mimetype="image/jpeg")

        @self.app.route("/api/recordings/<path:filename>/play")
        def play_recording(filename):
            # Construct the absolute path
            filename = os.path.join(os.getcwd(), "videos", filename)

            if not os.path.exists(filename):
                self.logger.error(f"Recording not found: {filename}")
                abort(404)

            return send_file(filename, mimetype="video/mp4")

        @self.app.route("/api/recordings/<path:filename>/download")
        def download_recording(filename):
            # Construct the absolute path
            filename = os.path.join(os.getcwd(), "videos", filename)

            if not os.path.exists(filename):
                self.logger.error(f"Recording not found: {filename}")
                abort(404)

            video_path = os.path.abspath(filename)
            return send_file(video_path, mimetype="video/mp4", as_attachment=True)

        @self.app.route("/api/recordings/<path:filename>", methods=["DELETE"])
        def delete_recording(filename):
            # Construct the absolute path
            filepath = os.path.join(os.getcwd(), "videos", filename)
            if not os.path.exists(filepath):
                return jsonify({"success": False, "message": "Recording not found"})

            try:
                # Delete the recording file
                os.remove(filepath)
                self.logger.info(f"Deleted recording: {filepath}")

                # Delete the thumbnail if it exists
                name = os.path.splitext(filename)[0]
                thumbnail_filepath = os.path.join(
                    os.getcwd(), "videos", "thumbnails", f"{name}.jpg"
                )
                if os.path.exists(thumbnail_filepath):
                    os.remove(thumbnail_filepath)
                    self.logger.info(f"Deleted thumbnail: {thumbnail_filepath}")

                return jsonify({"success": True})
            except Exception as e:
                return jsonify({"success": False, "message": str(e)})
