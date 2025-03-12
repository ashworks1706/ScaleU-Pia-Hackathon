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
        result = client.retrieve(
            collection_name="videos",
            ids=[session_id],
            with_payload=True
        )
        if not result:
            return jsonify({"error": "Session not found"}), 404
            
        return jsonify({
            "host_id": result[0].payload.get("host_id"),
            "title": result[0].payload.get("title"),
            "status": result[0].payload.get("status")
        }), 200
        
    except Exception as e:
        logger.error(f"Session fetch failed: {str(e)}")
        return jsonify({"error": "Session fetch failed"}), 500

@app.route('/python/complete-session', methods=['POST'])
def complete_session():
    try:
        data = request.get_json()
        session_id = data['session_id']
        
        # Mark session as completed
        client.set_payload(
            collection_name="videos",
            points=[session_id],
            payload={
                "status": "completed",
                "completed_at": int(time.time())
            }
        )
        
        # Clear active transcript updates
        # Add Redis or database flag if using persistent storage
        
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
    print("recieved")
    try:
        
        data = request.get_json()
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        query = data.get('query', '')
        category = data.get('category', 'All')

        # Generate query variations with Gemini
        try:
            prompt = f"""Generate 4 search query variations for: "{query}". 
            Return ONLY a JSON array without any formatting: ["query1", "query2", "query3", "query4"]"""
            
            response = gemini_model.generate_content(prompt)
            
            # Extract text from response object
            if response and response.candidates:
                raw_response = response.candidates[0].content.parts[0].text
                queries = json.loads(raw_response.strip('` \n').replace('json\n', ''))
                queries.append(query)
            else:
                queries = [query]

        except (json.JSONDecodeError, AttributeError) as e:
            logger.error(f"Gemini response error: {str(e)}")
            queries = [query]


        # Search for all query variations
        all_results = []
        for q in queries:
            query_vector = embedding_model.encode(q).tolist()
            
            # Build category filter
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

        # Process and deduplicate results
        video_map = {}
        for result in all_results:
            video_id = result.payload['video_id']
            if video_id not in video_map or result.score > video_map[video_id]['score']:
                video_map[video_id] = {
                    "video_data": result.payload,
                    "best_score": result.score
                }

        # Get full transcripts and find relevant chunks
        processed = []
        for video_id, data in video_map.items():
            video = client.retrieve(
                collection_name="videos",
                ids=[video_id],
                with_payload=True
            )[0]
            
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
@app.post("/python/process-transcript", methods=["POST"])
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
        # Handle both files in single endpoint
        canvas_file = request.files.get('canvas')
        audio_file = request.files.get('audio')
        
        # Immediately process audio for transcript
        if audio_file:
            audio_path = f"temp_{session_id}.webm"
            audio_file.save(audio_path)
            transcript = process_transcript(audio_path)  # Use existing function
            os.remove(audio_path)
            
            # Update transcript incrementally
            current = client.retrieve("videos", [session_id])[0].payload.get("transcript", "")
            client.set_payload(
                collection_name="videos",
                points=[session_id],
                payload={"transcript": f"{current}\n{transcript}"}
            )

        # Handle canvas separately
        if canvas_file:
            canvas_path = f"temp_{session_id}_canvas.webm"
            canvas_file.save(canvas_path)
            # Store canvas temporarily for later merge
            supabase.storage.from_("temp_canvas").upload(
    f"{session_id}.webm", 
    open(canvas_path, 'rb')
)

            os.remove(canvas_path)

        return jsonify({"status": "processed"}), 200

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

@app.route('/python/update-transcript/<session_id>', methods=['PATCH'])
def incremental_transcript(session_id):
    try:
        audio_chunk = request.get_data()
        
        # Convert chunk to text
        r = sr.Recognizer()
        with open(f"temp_{session_id}.wav", "wb") as f:
            f.write(audio_chunk)
            
        with sr.AudioFile(f"temp_{session_id}.wav") as source:
            audio = r.record(source)
            new_text = r.recognize_google(audio)
            
        # Get existing transcript
        current = client.retrieve("videos", [session_id])[0].payload.get("transcript", "")
        
        # Update Qdrant
        client.set_payload(
            collection_name="videos",
            points=[session_id],
            payload={"transcript": f"{current}\n{new_text}"}
        )
        
        return jsonify({"status": "updated"}), 200
        
    except Exception as e:
        logger.error(f"Incremental transcript failed: {str(e)}")
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    initialize()
    app.run(debug=True)


