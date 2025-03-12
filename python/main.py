# python/main.py
from fastapi import FastAPI, Query, BackgroundTasks, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient, models
from qdrant_client.http import models as rest_models
from sentence_transformers import SentenceTransformer
import re
import uuid
import httpx
import os
import time
from pydantic import BaseModel
from typing import Optional
import logging
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

QDRANT_URL = os.getenv("QDRANT_URL", "https://0eb2bc77-f3ea-4351-b6d5-4cb07cf499e9.europe-west3-0.gcp.cloud.qdrant.io")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwiZXhwIjoxNzQyMDgxMjcwfQ.CJIiGHpCopMYIr9B_gIlkulaJkazq5Y_YXNHxMxCMtk")

# Initialize Qdrant client
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Zoom API configuration
ZOOM_API_KEY = os.getenv("ZOOM_API_KEY", "your_zoom_api_key")
ZOOM_API_SECRET = os.getenv("ZOOM_API_SECRET", "zDVYd0MjN1awSDAdqw9Un0sbAem4wWFf")
ZOOM_ACCOUNT_ID = os.getenv("ZOOM_ACCOUNT_ID", "Tn6CeQOaS2-3bXa1_sIyKw")
GEMINI_API_KEY = "AIzaSyBru5qfjU7IYRrLNOL-FiQrBjG1mO-w2aQ"

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)
generation_config = {
    "temperature": 0.2,
    "top_p": 0.8,
    "top_k": 16,
    "max_output_tokens": 2048,
}
safety_settings = {
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# Initialize Gemini model
model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    safety_settings=safety_settings
)

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBru5qfjU7IYRrLNOL-FiQrBjG1mO-w2aQ")

# Models
class ZoomSessionRequest(BaseModel):
    title: str
    duration: Optional[int] = 60  # in minutes

class TranscriptUpdateRequest(BaseModel):
    session_id: str
    transcript: str

class SessionCompleteRequest(BaseModel):
    session_id: str
    participant_count: int
    final_transcript: str
    recording_link: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    # Create videos collection if it doesn't exist
    try:
        logger.info(f"Connecting to Qdrant Cloud at {QDRANT_URL}")
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        if "videos" not in collection_names:
            logger.info("Creating 'videos' collection in Qdrant Cloud")
            client.create_collection(
                collection_name="videos",
                vectors_config=rest_models.VectorParams(
                    size=384,  # Size for all-MiniLM-L6-v2
                    distance=rest_models.Distance.COSINE
                )
            )
            logger.info("'videos' collection created successfully")
        
        # Rest of the function remains the same
        
        logger.info(f"Qdrant Cloud dashboard available at your Qdrant Cloud console")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")

@app.post("/api/create-zoom-session")
async def create_zoom_session(request: ZoomSessionRequest):
    print("found")
    # Generate a unique session ID
    session_id = str(uuid.uuid4())
    
    try:
        # Get Zoom API credentials
        zoom_api_key = os.getenv("ZOOM_API_KEY")
        zoom_api_secret = os.getenv("ZOOM_API_SECRET")
        
        if not zoom_api_key or not zoom_api_secret:
            raise ValueError("Zoom API credentials not configured")
        
        # Use Gemini to generate Zoom API request structure
        prompt = f"""
        I need to create a Zoom meeting with the following details:
        - Title: {request.title}
        - Duration: {request.duration} minutes
        
        Please provide the exact JSON payload I should send to the Zoom API endpoint POST /v2/users/me/meetings.
        Return only the JSON with no explanation.
        """
        
        # Generate Zoom API request payload with Gemini
        gemini_response = model.generate_content(prompt)
        
        try:
            # Extract JSON from Gemini response
            zoom_request_payload = json.loads(gemini_response.text)
        except json.JSONDecodeError:
            # Fall back to a simple payload if Gemini doesn't return valid JSON
            zoom_request_payload = {
                "topic": request.title,
                "type": 2,  # Scheduled meeting
                "duration": request.duration,
                "settings": {
                    "host_video": True,
                    "participant_video": True,
                    "join_before_host": True,
                    "mute_upon_entry": False,
                    "auto_recording": "cloud",
                    "waiting_room": False
                }
            }
        
        # Generate JWT token for Zoom API authentication
        async with httpx.AsyncClient() as client_http:
            # Get Zoom JWT token (simplified - implement proper JWT generation)
            auth_response = await client_http.post(
                "https://zoom.us/oauth/token",
                auth=( zoom_api_secret),
                data={"grant_type": "client_credentials", "account_id": os.getenv("ZOOM_ACCOUNT_ID")}
            )
            auth_data = auth_response.json()
            access_token = auth_data.get("access_token")
            
            # Create Zoom meeting using the payload from Gemini
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Real Zoom API call
            zoom_api_response = await client_http.post(
                "https://api.zoom.us/v2/users/me/meetings",
                headers=headers,
                json=zoom_request_payload
            )
            
            if not zoom_api_response.is_success:
                raise HTTPException(
                    status_code=zoom_api_response.status_code,
                    detail=f"Zoom API Error: {zoom_api_response.text}"
                )
            
            zoom_response = zoom_api_response.json()
        
        # Store initial meeting data in Qdrant
        embedding = model.encode(request.title).tolist()
        
        client.upsert(
            collection_name="videos",
            points=[
                rest_models.PointStruct(
                    id=session_id,
                    vector=embedding,
                    payload={
                        "title": request.title,
                        "transcript": "",
                        "upvotes": 0,
                        "link": zoom_response["join_url"],
                        "created_at": int(time.time()),
                        "zoom_meeting_id": zoom_response["id"],
                        "password": zoom_response.get("password", "")
                    }
                )
            ]
        )
        
        return {
            "session_id": session_id,
            "join_url": zoom_response["join_url"],
            "start_url": zoom_response.get("start_url"),
            "password": zoom_response.get("password", ""),
            "meeting_id": zoom_response["id"]
        }
        
    except Exception as e:
        logger.error(f"Error creating Zoom session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create Zoom session: {str(e)}")

@app.post("/api/update-transcript")
async def update_transcript(request: TranscriptUpdateRequest):
    try:
        # Get existing document
        results = client.retrieve(
            collection_name="videos",
            ids=[request.session_id],
            with_payload=True
        )
        
        if not results:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update transcript
        client.set_payload(
            collection_name="videos",
            ids=[request.session_id],
            payload={"transcript": request.transcript}
        )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error updating transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/complete-session")
async def complete_session(request: SessionCompleteRequest, background_tasks: BackgroundTasks):
    try:
        # Update session with final data
        client.set_payload(
            collection_name="videos",
            ids=[request.session_id],
            payload={
                "transcript": request.final_transcript,
                "upvotes": request.participant_count,
                "link": request.recording_link or f"https://zoom.us/rec/{request.session_id}",
                "completed_at": int(time.time())
            }
        )
        
        # Process transcript into chunks in the background
        background_tasks.add_task(
            process_transcript_chunks, 
            request.session_id,
            request.final_transcript
        )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error completing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_transcript_chunks(session_id: str, transcript: str):
    try:
        # Retrieve the video document
        video = client.retrieve(
            collection_name="videos",
            ids=[session_id],
            with_payload=True
        )[0]
        
        # Split transcript into chunks
        chunks = chunk_transcript(transcript)
        
        # Generate embeddings and store chunks
        points = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{session_id}_{i}"
            embedding = model.encode(chunk).tolist()
            
            points.append(
                rest_models.PointStruct(
                    id=chunk_id,
                    vector=embedding,
                    payload={
                        "video_id": session_id,
                        "chunk_text": chunk,
                        "title": video.payload["title"],
                        "upvotes": video.payload["upvotes"],
                        "link": video.payload["link"]
                    }
                )
            )
        
        # Batch insert chunks
        for i in range(0, len(points), 100):
            batch = points[i:i+100]
            client.upsert(
                collection_name="video_chunks",
                points=batch
            )
            
    except Exception as e:
        logger.error(f"Error processing transcript chunks: {e}")

def chunk_transcript(transcript: str, window_size: int = 2) -> list:
    sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', transcript)
    chunks = [
        ' '.join(sentences[max(0,i-window_size):i+window_size+1])
        for i in range(len(sentences))
    ]
    return chunks

@app.get("/api/search")
async def search_videos(q: str = Query(...)):
    # Generate query embedding
    query_vector = model.encode(q).tolist()
    
    # Hybrid search with Qdrant
    search_results = client.search(
        collection_name="video_chunks",
        query_vector=query_vector,
        query_filter=models.Filter(
            should=[models.FieldCondition(
                key="chunk_text",
                match=models.MatchText(text=q)
            )]
        ),
        limit=20,
        with_payload=True,
        with_vectors=False
    )
    
    # Process and deduplicate results
    video_map = {}
    for result in search_results:
        video_id = result.payload['video_id']
        if video_id not in video_map or result.score > video_map[video_id]['score']:
            video_map[video_id] = {
                "title": result.payload['title'],
                "chunk": result.payload['chunk_text'],
                "score": result.score,
                "upvotes": result.payload['upvotes'],
                "link": result.payload['link']
            }
    
    # Highlight relevant text
    processed = []
    for video in video_map.values():
        start_idx = video['chunk'].lower().find(q.lower())
        if start_idx == -1:
            continue
            
        context_start = max(0, start_idx - 50)
        context_end = min(len(video['chunk']), start_idx + len(q) + 50)
        excerpt = video['chunk'][context_start:context_end]
        
        highlighted = re.sub(
            f'({re.escape(q)})', 
            '<mark class="bg-purple-200 text-purple-900">\\1</mark>', 
            excerpt, 
            flags=re.IGNORECASE
        )
        
        processed.append({
            "title": video['title'],
            "relevant": highlighted,
            "upvotes": video['upvotes'],
            "link": video['link']
        })

    return {"results": sorted(processed, key=lambda x: -x['upvotes'])[:10] if processed else []}
