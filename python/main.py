# backend/api.py
from fastapi import FastAPI, Query
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
import re

app = FastAPI()
client = QdrantClient("localhost", port=6333)
model = SentenceTransformer('all-MiniLM-L6-v2')

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

    return {"results": sorted(processed, key=lambda x: -x['upvotes'])[:10]}
