# Remove duplicate imports
from flask import Flask, request, jsonify
from flask_cors import CORS
from qdrant_client import QdrantClient, models
from qdrant_client.http import models as rest_models
from sentence_transformers import SentenceTransformer
import re
import uuid
import google.generativeai as genai
import os
import time
import logging
import json
from datetime import datetime
from supabase import create_client
from werkzeug.utils import secure_filename
from pydantic import BaseModel
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video.io.VideoFileClip import VideoFileClip
import speech_recognition as sr
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from pydub import AudioSegment
import io


app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


QDRANT_URL = os.getenv("QDRANT_URL","https://0eb2bc77-f3ea-4351-b6d5-4cb07cf499e9.europe-west3-0.gcp.cloud.qdrant.io/")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzQyMDgxMjcwfQ.CJIiGHpCopMYIr9B_gIlkulaJkazq5Y_YXNHxMxCMtk")

# Configure Gemini
genai.configure(api_key="AIzaSyBru5qfjU7IYRrLNOL-FiQrBjG1mO-w2aQ")
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

# Initialize clients
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nqncxdmlomcsgunxhtze.supabase.co")  # e.g., "https://xyzcompany.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbmN4ZG1sb21jc2d1bnhodHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTA1NTksImV4cCI6MjA1NzMyNjU1OX0.XSZRfBD8o_bzmeavime7MXcsNj6WLVkc4Ozssjzuhfs")  # e.g., "your-supabase-key" 
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def initialize():
    try:
        collections = client.get_collections().collections
        # Create collections if missing
        if not any(c.name == "videos" for c in collections):
            client.create_collection(
                collection_name="videos",
                vectors_config=rest_models.VectorParams(
                    size=384,
                    distance=rest_models.Distance.COSINE
                )
            )
        if not any(c.name == "video_chunks" for c in collections):
            client.create_collection(
                collection_name="video_chunks",
                vectors_config=rest_models.VectorParams(
                    size=384,
                    distance=rest_models.Distance.COSINE
                )
            )
        logger.info("Qdrant initialization complete")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

@app.route('/python/create-session', methods=['POST'])
def create_session():
    try:
        data = request.get_json()  # Get data directly from request
        session_id = str(uuid.uuid4())
        
        client.upsert(
            collection_name="videos",
            points=[
                rest_models.PointStruct(
                    id=session_id,
                    vector=embedding_model.encode(data['title']).tolist(),
                    payload={
                        "title": data['title'],
                        "category": data['category'],
                        "host_id": data.get('user_id'),
                        "transcript": "",
                        "upvotes": 0,
                        "status": "live",
                        "created_at": int(time.time()),
                        "participants": 0,
                        "link": f"/videos/live/{session_id}"
                    }
                )
            ]
        )
        return jsonify({"session_id": session_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/python/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    try:
        results = client.retrieve(
        collection_name="videos",
        ids=[session_id],
        with_payload=True
        )
        if not results or len(results) == 0:
            return jsonify({"error": "Session not found"}), 404
        # Use the first element from the returned list.
        session = results[0]
        return jsonify({
        "host_id": session.payload.get("host_id", ""),
        "title": session.payload.get("title", ""),
        "status": session.payload.get("status", ""),
        "link": session.payload.get("link", "")
        }), 200

    except Exception as e:
            logger.error(f"Session fetch failed: {str(e)}")
            return jsonify({"error": "Session fetch failed"}), 500


@app.route('/python/complete-session', methods=['POST'])
def complete_session():
    try:
        data = request.get_json()
        session_id = data['session_id']
        video_url = data.get("video_url")  # Video URL returned from the recording endpoint

        # Build the payload update for the session with new status and video link
        payload = {
            "status": "completed",
            "link":f"/videos/{session_id}",
            "completed_at": int(time.time())
        }

        # Update the session's payload in the 'videos' collection
        client.set_payload(
            collection_name="videos",
            points=[session_id],
            payload=payload
        )
        
        return jsonify({"status": "success"}), 200

    except Exception as e:
        logger.error(f"Session completion failed: {str(e)}")
        return jsonify({"error": str(e)}), 500


def process_transcript_chunks(session_id: str, transcript: str):
    try:
        video = client.retrieve(
            collection_name="videos",
            ids=[session_id],
            with_payload=True
        )[0]
        
        chunks = chunk_transcript(transcript)
        points = [
            rest_models.PointStruct(
                id=f"{session_id}_{i}",
                vector=embedding_model.encode(chunk).tolist(),
                payload={
                    "video_id": session_id,
                    "chunk_text": chunk,
                    "title": video.payload["title"],
                    "upvotes": video.payload["upvotes"],
                    "link": video.payload.get("link", "")
                }
            ) for i, chunk in enumerate(chunks)
        ]
        
        # Batch insert
        for i in range(0, len(points), 100):
            client.upsert(
                collection_name="video_chunks",
                points=points[i:i+100]
            )
            
    except Exception as e:
        logger.error(f"Transcript processing failed: {str(e)}")

def chunk_transcript(transcript: str, window_size: int = 2) -> list:
    sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', transcript)
    return [
        ' '.join(sentences[max(0,i-window_size):i+window_size+1])
        for i in range(len(sentences))
    ]


@app.route('/python/search', methods=['POST'])
def enhanced_search():
    try:
        data = request.get_json()
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        query = data.get('query', '')
        category = data.get('category', 'All')

        # Unpack the tuple: videos list and cursor
        all_videos, _ = client.scroll(
            collection_name="videos",
            with_payload=True,
            limit=100
        )

        if (query == ""):
            # Convert Record objects to dictionaries before returning
            processed_videos = []
            for video in all_videos:
                processed_videos.append({
                    "title": video.payload.get("title", ""),
                    "category": video.payload.get("category", ""),
                    "upvotes": video.payload.get("upvotes", 0),
                    "link": video.payload.get("link", ""),
                    "video_url": video.payload.get("video_url", ""),
                    "transcript": video.payload.get("transcript", ""),
                    "status": video.payload.get("status", "")
                })
            return jsonify({"results": processed_videos}), 200

        if len(all_videos) < 10:
            processed = []
            for video in all_videos:
                transcript = video.payload.get("transcript", "")
                excerpt = transcript[:200] + "..." if len(transcript) > 200 else transcript
                processed.append({
                    "title": video.payload.get("title", ""),
                    "relevant": excerpt,
                    "upvotes": video.payload.get("upvotes", 0),
                    "link": video.payload.get("link", ""),
                    "category": video.payload.get("category", "")
                })
            processed = sorted(processed, key=lambda x: -x['upvotes'])
            return jsonify({"results": processed}), 200

        # Otherwise, proceed with enhanced search algorithm
        try:
            prompt = f"""Generate 4 search query variations for: "{query}".Return ONLY a JSON array without any, no backticks, no extra text, just the array: ["query1", "query2", "query3", "query4"]"""
            response = gemini_model.generate_content(prompt)
            if response and response.candidates:
                raw_response = response.candidates.content.parts.text
                queries = json.loads(raw_response.strip('` \n').replace('json\n', ''))
                queries.append(query)
            else:
                queries = [query]
        except (json.JSONDecodeError, AttributeError) as e:
            logger.error(f"Gemini response error: {str(e)}")
            queries = [query]

        all_results = []
        for q in queries:
            query_vector = embedding_model.encode(q).tolist()
            filters = []
            if category != "All":
                filters.append(models.FieldCondition(
                    key="category",
                    match=models.MatchValue(value=category)
                ))
            search_results = client.search(
                collection_name="video_chunks",
                query_vector=query_vector,
                query_filter=models.Filter(must=filters),
                limit=10,
                with_payload=True
            )
            all_results.extend(search_results)

        video_map = {}
        for result in all_results:
            video_id = result.payload['video_id']
            if video_id not in video_map or result.score > video_map[video_id]['score']:
                video_map[video_id] = {
                    "video_data": result.payload,
                    "score": result.score
                }

        processed = []
        for video_id, data_dict in video_map.items():
            # Unpack the tuple from retrieve
            results = client.retrieve(
                collection_name="videos",
                ids=[video_id],
                with_payload=True
            )
            video = results
            chunks = chunk_transcript(video.payload["transcript"])
            best_chunk = max(chunks, key=lambda chunk: 
                embedding_model.encode(chunk).dot(
                    embedding_model.encode(query)
                )
            )
            highlighted = re.sub(
                f'({re.escape(query)})', 
                '<mark class="bg-purple-200 text-purple-900">\\1</mark>', 
                best_chunk, 
                flags=re.IGNORECASE
            )
            processed.append({
                "title": video.payload["title"],
                "relevant": highlighted,
                "upvotes": video.payload["upvotes"],
                "link": video.payload.get("link", ""),
                "category": video.payload["category"]
            })

        return jsonify({
            "results": sorted(processed, key=lambda x: -x['upvotes'])[:10]
        }), 200

    except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return jsonify({"error": "Search operation failed"}), 500

# Add CORS headers
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# Modify process_recording function
def process_recording(video_path, audio_path):
    try:
        video_clip = VideoFileClip(video_path)
        audio_clip = AudioFileClip(audio_path)
        
        # Synchronize durations
        final_duration = min(video_clip.duration, audio_clip.duration)
        final_clip = video_clip.subclip(0, final_duration)
        final_clip = final_clip.set_audio(audio_clip.subclip(0, final_duration))
        
        output_path = f"merged_{os.path.basename(video_path)}"
        final_clip.write_videofile(output_path, codec='libvpx', 
                                 audio_codec='libvorbis',
                                 threads=4)
        return output_path
    except Exception as e:
        logger.error(f"Merging failed: {str(e)}")
        raise
# MODIFY process_transcript TO HANDLE INCREMENTAL UPDATES
def process_transcript(audio_path: str) -> str:
    try:
        r = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            audio = r.record(source)
            return r.recognize_google(audio)
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        return ""

@app.route('/python/recordings/<session_id>', methods=['POST'])
def upload_recording(session_id):
    try:
        canvas_file = request.files.get('canvas')
        audio_file = request.files.get('audio')
        video_url = None
        if audio_file:
            audio_path = f"temp_{session_id}.webm"
            audio_file.save(audio_path)
            transcript = process_transcript(audio_path)
            os.remove(audio_path)
            # Retrieve the document to update its transcript.
            results = client.retrieve(
                collection_name="videos",
                ids=[session_id],
                with_payload=True
            )
            if results and len(results) > 0:
                video_record = results  # Unpack the first element.
                current = video_record.payload.get("transcript", "")
                # Update the transcript field by appending the new transcript.
                client.set_payload(
                    collection_name="videos",
                    points=[session_id],
                    payload={"transcript": f"{current}\n{transcript}"}
                )

        if canvas_file:
            canvas_path = f"temp_{session_id}_canvas.webm"
            canvas_file.save(canvas_path)
            # Upload the file to Supabase.
            supabase.storage.from_("temp_canvas").upload(
                f"{session_id}.webm", 
                open(canvas_path, 'rb')
            )
            os.remove(canvas_path)
            public_url = supabase.storage.from_("temp_canvas").get_public_url(f"{session_id}.webm")
            video_url = public_url
            video_url = video_url.replace("?", "")
            # Update the document to add the video_url attribute.
            client.set_payload(
                collection_name="videos",
                points=[session_id],
                payload={"video_url": video_url}
            )

        return jsonify({"status": "processed", "video_url": video_url}), 200



    except Exception as e:
        logger.error(f"Recording error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def merge_recordings(canvas_path, audio_path):
    try:
        video_clip = VideoFileClip(canvas_path)
        audio_clip = AudioFileClip(audio_path)
        
        # Synchronize durations
        final_duration = min(video_clip.duration, audio_clip.duration)
        final_clip = video_clip.subclip(0, final_duration)
        final_clip = final_clip.set_audio(audio_clip.subclip(0, final_duration))
        
        output_path = f"merged_{session_id}.webm"
        final_clip.write_videofile(output_path, 
                                 codec='libvpx', 
                                 audio_codec='libvorbis',
                                 threads=4,
                                 preset='ultrafast')
        return output_path
    finally:
        # Cleanup
        for path in [canvas_path, audio_path]:
            if os.path.exists(path):
                os.remove(path)

@app.route('/python/update-transcript/<session_id>', methods=['POST'])
def incremental_transcript(session_id):
    # Use simple filenames in current directory
    temp_input_path = f"input_{session_id}.webm"
    wav_path = f"output_{session_id}.wav"
    
    try:
        audio_chunk = request.get_data()
        r = sr.Recognizer()
        
        # Log detailed information
        logger.info(f"Received audio chunk size: {len(audio_chunk)} bytes")
        logger.info(f"Working directory: {os.getcwd()}")
        
        # Skip the in-memory approach entirely and go directly to file-based
        # First save the original audio
        with open(temp_input_path, "wb") as f:
            f.write(audio_chunk)
        
        logger.info(f"Saved audio to: {temp_input_path}")
        
        # Check if ffmpeg is available
        import subprocess
        try:
            # Use ffmpeg directly to convert the file
            cmd = ["ffmpeg", "-y", "-i", temp_input_path, wav_path]
            logger.info(f"Running command: {' '.join(cmd)}")
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"Conversion successful using ffmpeg")
        except Exception as e:
            logger.error(f"ffmpeg conversion failed: {str(e)}")
            return jsonify({"error": f"Audio conversion failed: {str(e)}"}), 400
        
        # Now process the converted WAV file
        with sr.AudioFile(wav_path) as source:
            audio_data = r.record(source)
            new_text = r.recognize_google(audio_data)
            logger.info(f"Transcription successful: '{new_text}'")
            
        # Retrieve the current document
        results = client.retrieve(
            collection_name="videos",
            ids=[session_id],
            with_payload=True
        )
        
        if not results or len(results) == 0:
            return jsonify({"error": "Session not found"}), 404
            
        video = results[0]  # Get the first element from results
        current = video.payload.get("transcript", "")
        
        # Update with new transcript text
        client.set_payload(
            collection_name="videos",
            points=[session_id],
            payload={"transcript": f"{current}\n{new_text}"}
        )
        
        return jsonify({"status": "updated", "text": new_text}), 200
    
    except Exception as e:
        logger.error(f"Incremental transcript failed: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temporary files even if an error occurs
        for path in [temp_input_path, wav_path]:
            if os.path.exists(path):
                try:
                    os.remove(path)
                    logger.info(f"Removed temporary file: {path}")
                except Exception as e:
                    logger.error(f"Failed to remove temporary file {path}: {str(e)}")

@app.route('/python/video/<session_id>', methods=['GET'])
def get_video_document(session_id):
    try:
        # First, try to retrieve the document by its ID.
        # Check if the session_id is a valid UUID format
        try:
            uuid_obj = uuid.UUID(session_id)
            results = client.retrieve(
                collection_name="videos",
                ids=[session_id],
                with_payload=True
            )
            # Check if the document exists
            if results and len(results) > 0:
                video = results[0]
                # If the document's link is present, return it immediately.
                if video.payload.get("link", ""):
                    return jsonify({
                        "title": video.payload.get("title", ""),
                        "link": video.payload.get("video_url", ""),
                        "transcript": video.payload.get("transcript", ""),
                        "status": video.payload.get("status", "")
                    }), 200
        except (ValueError, Exception) as e:
            # If session_id is not a valid UUID or retrieval fails, continue to alternative search
            logger.info(f"Direct retrieval failed or invalid UUID: {str(e)}")
            pass

        # Use scroll to look for a document whose link field matches "/videos/{session_id}".
        alt_filter = rest_models.Filter(
            must=[
                rest_models.FieldCondition(
                    key="link",
                    match=rest_models.MatchValue(value=f"/videos/{session_id}")
                )
            ]
        )
        # Use scroll_filter with the constructed filter.
        alt_results, _ = client.scroll(
            collection_name="videos",
            with_payload=True,
            scroll_filter=alt_filter,
            limit=1
        )
        if alt_results and len(alt_results) > 0:
            video = alt_results[0]
            return jsonify({
                "title": video.payload.get("title", ""),
                "link": video.payload.get("video_url", ""),
                "transcript": video.payload.get("transcript", ""),
                "status": video.payload.get("status", "")
            }), 200

        # If no document is found using either approach, return a 404 error.
        return jsonify({"error": "Video not found"}), 404

    except Exception as e:
        logger.error(f"Video fetch failed: {str(e)}")
        return jsonify({"error": "Video fetch failed"}), 500


@app.route('/python/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        # Unpack the returned tuple: records and cursor (if any)
        videos, _ = client.scroll(
        collection_name="videos",
        with_payload=True,
        limit=1000
        )
        print(videos)
        host_points = {}
        for video in videos:
            # Each record's data is inside the payload attribute
            payload = video.payload
            host = payload.get("host_id", "unknown")
            upvotes = payload.get("upvotes", 0)
        # Add the video's upvotes to its host's points
        host_points[host] = host_points.get(host, 0) + upvotes
    
        # Prepare leaderboard list sorted descending by points
        leaderboard = [{"name": host, "points": points} for host, points in host_points.items()]
        leaderboard.sort(key=lambda x: x["points"], reverse=True)
        
        return jsonify(leaderboard), 200

    except Exception as e:
        logger.error(f"Leaderboard fetch failed: {str(e)}")
        return jsonify({"error": "Leaderboard fetch failed"}), 500


@app.route('/python/upload-videos-batch', methods=['POST'])
def upload_videos_batch():
    try:
        # Expecting a JSON array of video objects
        videos = request.get_json()
        if not isinstance(videos, list):
            return jsonify({"error": "Expected a JSON array of videos"}), 400
        
        points = []
        for video in videos:
            # Verify that required fields are present
            if "title" not in video:
                continue  # Skip video if no title
            
            # Use provided id or generate a new one using uuid
            vid = video.get("id", str(uuid.uuid4()))
            
            # Compute the vector from the video's title
            vector = embedding_model.encode(video["title"]).tolist()
            
            # Build payload with supplied or default values
            payload = {
                "title": video.get("title"),
                "category": video.get("category", ""),
                "host_id": video.get("host_id", ""),
                "transcript": video.get("transcript", ""),
                "upvotes": video.get("upvotes", 0),
                "status": video.get("status", "pending"),
                "created_at": video.get("created_at", int(time.time())),
                "participants": video.get("participants", 0),
                "link": f'/videos/{str(uuid.uuid4())}',
                "video_url": video.get("link",""),
                "completed_at": video.get("completed_at")
            }
            
            points.append(
                rest_models.PointStruct(
                    id=vid,
                    vector=vector,
                    payload=payload
                )
            )
        
        # Upsert the batch of video points into the "videos" collection
        client.upsert(
            collection_name="videos",
            points=points
        )
        return jsonify({"status": "success", "uploaded": len(points)}), 200
    except Exception as e:
        logger.error(f"Batch upload failed: {str(e)}")
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    initialize()
    app.run(debug=True)


