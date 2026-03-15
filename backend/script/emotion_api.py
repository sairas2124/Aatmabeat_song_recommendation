from flask import Flask, request, jsonify
from flask_cors import CORS
from io import BytesIO
from PIL import Image
import numpy as np
import tensorflow as tf
import base64
import json
import cv2
import os
import joblib
import random
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId  # ✅ Added missing import

# ---------------- Flask setup ----------------
app = Flask(__name__)
CORS(app)

# ---------------- Paths ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

EMOTION_MODEL_PATH = os.path.join(MODEL_DIR, "emotion_cnn.keras")
LABELS_PATH = os.path.join(MODEL_DIR, "emotion_labels.json")
RECOMMENDER_PATH = os.path.join(MODEL_DIR, "song_recommender.joblib")
ENCODER_PATH = os.path.join(MODEL_DIR, "emotion_encoder.joblib")
CASCADE_PATH = os.path.join(BASE_DIR, "haarcascade_frontalface_default.xml")

# ---------------- Load emotion CNN ----------------
emotion_model = tf.keras.models.load_model(EMOTION_MODEL_PATH)

with open(LABELS_PATH, "r") as f:
    emotion_labels = json.load(f)

print("✅ Emotion CNN loaded")
print(f"🎭 Face emotions: {emotion_labels}")

# ---------------- Load recommender ----------------
song_recommender = joblib.load(RECOMMENDER_PATH)
emotion_encoder = joblib.load(ENCODER_PATH)

print("✅ Song recommender loaded")
print(f"🎵 Song emotions: {list(emotion_encoder.classes_)}")

# ---------------- Load face detector ----------------
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
if face_cascade.empty():
    raise RuntimeError("❌ Haar Cascade not loaded")

# ---------------- MongoDB ----------------
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=3000)
    db = client["musicDB"]
    songs_collection = db["songs"]
    print("✅ MongoDB connected successfully")
    
    # Check songs count
    total_songs = songs_collection.count_documents({})
    print(f"📊 Total songs in database: {total_songs}")
    
except Exception as e:
    print(f"❌ MongoDB error: {e}")
    songs_collection = None

# Session memory to track recently shown songs
session_history = {}  # {session_id: [song_ids]}
MAX_HISTORY = 20

# ---------------- Helpers ----------------
def decode_base64_image(b64_string):
    b64_string = b64_string.split(",")[-1]
    missing_padding = len(b64_string) % 4
    if missing_padding:
        b64_string += "=" * (4 - missing_padding)
    return base64.b64decode(b64_string)

def extract_face(pil_image):
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return img[y:y+h, x:x+w]

def preprocess_face(face_img):
    face_img = cv2.resize(face_img, (224, 224))
    face_img = face_img.astype(np.float32)
    face_img = tf.keras.applications.mobilenet_v2.preprocess_input(face_img)
    return np.expand_dims(face_img, axis=0)

def clean_filename_for_url(filename):
    """✅ FIX: Replace spaces with underscores and clean filename"""
    if not filename or not isinstance(filename, str):
        return f"song_{random.randint(1, 1000)}.mp3"
    
    # 1. Remove any path components
    filename = filename.strip()
    filename = filename.split('/')[-1].split('\\')[-1]
    
    # 2. ✅ REPLACE ALL SPACES WITH UNDERSCORES (MAIN FIX)
    filename = filename.replace(' ', '_')
    
    # 3. Ensure .mp3 extension
    if not filename.lower().endswith('.mp3'):
        # Remove any existing extension
        base = filename.split('.')[0]
        filename = base + '.mp3'
    
    return filename

def get_songs_with_audio(song_emotion=None):
    """Get songs that have valid audio filenames"""
    try:
        if songs_collection is None:
            return []
        
        # Build query to get songs with valid filenames
        query = {"filename": {"$exists": True, "$ne": ""}}
        
        # Add emotion filter if provided
        if song_emotion and song_emotion in ["happy", "sad", "neutral"]:
            query["song_emotion"] = song_emotion
        
        # Get songs with filenames
        songs = list(songs_collection.find(query))
        
        # Filter for valid filenames
        valid_songs = []
        for song in songs:
            filename = song.get("filename", "")
            if filename and isinstance(filename, str) and len(filename.strip()) > 0:
                # ✅ Use the cleaned filename
                clean_filename = clean_filename_for_url(filename)
                song['clean_filename'] = clean_filename
                valid_songs.append(song)
        
        print(f"📁 Found {len(valid_songs)} songs with valid filenames" + 
              (f" for emotion '{song_emotion}'" if song_emotion else ""))
        
        return valid_songs
        
    except Exception as e:
        print(f"❌ Error getting songs: {e}")
        return []

def select_varied_songs(available_songs, emotion, session_id=None, count=5):
    """Select varied songs ensuring audio availability"""
    if not available_songs:
        return []
    
    # Get previously shown songs for this session
    shown_songs = []
    if session_id and session_id in session_history:
        shown_songs = session_history[session_id]
    
    # Filter out already shown songs
    new_songs = []
    for song in available_songs:
        song_id = str(song.get("_id", ""))
        if song_id not in shown_songs:
            new_songs.append(song)
    
    print(f"📊 Available: {len(new_songs)} new, {len(shown_songs)} shown before")
    
    # Select songs
    selected_songs = []
    
    # Priority 1: New songs with matching emotion
    matching_new = [s for s in new_songs if s.get("song_emotion") == emotion]
    if matching_new:
        selected_songs.extend(random.sample(matching_new, min(3, len(matching_new))))
    
    # Priority 2: Other new songs
    remaining_new = [s for s in new_songs if s not in selected_songs]
    if remaining_new and len(selected_songs) < count:
        needed = count - len(selected_songs)
        selected_songs.extend(random.sample(remaining_new, min(needed, len(remaining_new))))
    
    # Priority 3: Previously shown songs if still not enough
    if len(selected_songs) < count and shown_songs:
        needed = count - len(selected_songs)
        # Get previously shown song objects
        shown_objects = []
        for song_id in shown_songs[-10:]:
            try:
                song = songs_collection.find_one({"_id": ObjectId(song_id)})
                if song and song not in selected_songs:
                    shown_objects.append(song)
            except:
                pass
        
        if shown_objects:
            selected_songs.extend(random.sample(shown_objects, min(needed, len(shown_objects))))
    
    # Priority 4: Any songs with audio
    if len(selected_songs) < count:
        needed = count - len(selected_songs)
        all_songs = list(songs_collection.find({"filename": {"$exists": True, "$ne": ""}}).limit(50))
        available = [s for s in all_songs if s not in selected_songs]
        if available:
            selected_songs.extend(random.sample(available, min(needed, len(available))))
    
    # Update session history
    if session_id:
        new_song_ids = [str(s.get("_id", "")) for s in selected_songs]
        if session_id not in session_history:
            session_history[session_id] = []
        session_history[session_id].extend(new_song_ids)
        session_history[session_id] = session_history[session_id][-MAX_HISTORY:]
    
    return selected_songs[:count]

def map_face_to_song_emotion(face_emotion):
    """Map face emotion to song emotion categories"""
    face_emotion_lower = face_emotion.lower()
    
    # Direct matches
    if face_emotion_lower in ["happy", "sad", "neutral"]:
        return face_emotion_lower
    
    # Map other common face emotions
    emotion_map = {
        "angry": "sad",
        "disgust": "sad", 
        "fear": "sad",
        "surprise": "happy",
        "contempt": "neutral",
    }
    
    return emotion_map.get(face_emotion_lower, "neutral")

# ---------------- API ----------------
@app.route("/api/scan-face", methods=["POST"])
def scan_face():
    """Scan face and return songs with audio URLs"""
    
    try:
        data = request.get_json()
        session_id = data.get("session_id", f"face_{datetime.now().timestamp()}")
        
        if not data or "image" not in data:
            return jsonify({
                "success": False,
                "error": "Image not provided",
                "emotion": "neutral",
                "songs": []
            }), 400

        # Decode image
        try:
            image_bytes = decode_base64_image(data["image"])
            image = Image.open(BytesIO(image_bytes))
            print("✅ Image decoded successfully")
        except Exception as e:
            print(f"❌ Image error: {e}")
            return jsonify({
                "success": False,
                "error": f"Invalid image: {str(e)}",
                "emotion": "neutral",
                "songs": []
            }), 400

        # Face detection
        face = extract_face(image)
        if face is None:
            print("⚠️ No face detected")
            face_emotion = "neutral"
            confidence = 0.0
        else:
            # Emotion prediction
            face_tensor = preprocess_face(face)
            preds = emotion_model.predict(face_tensor, verbose=0)
            
            emotion_idx = int(np.argmax(preds))
            face_emotion = emotion_labels[emotion_idx]
            confidence = float(preds[0][emotion_idx])
            
            print(f"🎭 Face emotion: {face_emotion} ({confidence:.1%} confidence)")

        # Map to song emotion
        song_emotion = map_face_to_song_emotion(face_emotion)
        print(f"🎵 Mapped to song emotion: {song_emotion}")
        print(f"🎯 Session ID: {session_id[:12]}...")

        # Check MongoDB connection
        if songs_collection is None:
            return jsonify({
                "success": False,
                "error": "MongoDB not connected",
                "emotion": song_emotion,
                "songs": []
            }), 200

        # Get songs with valid audio filenames
        songs_with_audio = get_songs_with_audio(song_emotion)
        
        # If not enough songs for this emotion, get any songs with audio
        if len(songs_with_audio) < 5:
            print(f"⚠️ Only {len(songs_with_audio)} songs for '{song_emotion}', getting all songs with audio")
            songs_with_audio = get_songs_with_audio()  # Get all songs with audio
        
        if not songs_with_audio:
            print("❌ No songs with audio filenames found")
            return jsonify({
                "success": False,
                "error": "No songs with audio files available",
                "emotion": song_emotion,
                "songs": []
            }), 200

        print(f"📝 Found {len(songs_with_audio)} songs with audio")

        # Select varied songs
        selected_songs = select_varied_songs(songs_with_audio, song_emotion, session_id, 5)
        
        if not selected_songs:
            # Fallback: random songs with audio
            print("⚠️ No songs selected, using random fallback")
            selected_songs = random.sample(songs_with_audio, min(5, len(songs_with_audio)))
        
        # SHUFFLE the selected songs
        random.shuffle(selected_songs)
        
        # Format songs EXACTLY like working_api.py
        result_songs = []
        for i, song in enumerate(selected_songs[:5]):  # Max 5 songs
            song_id = str(song.get("_id", f"song_{i}"))
            filename = song.get("clean_filename", "")
            
            if not filename:
                title = song.get("title", f"Song_{i}")
                filename = f"{title.replace(' ', '_').replace('.', '_')}.mp3"
            
            # ✅ No need to check .mp3 again, already done in clean_filename_for_url
            
            # Calculate score like working_api.py
            base_score = random.uniform(0.7, 0.95)
            if song_emotion == "happy":
                score = (song.get("valence", 0.5) * 0.4 + 
                        song.get("energy", 0.5) * 0.4 + 
                        song.get("danceability", 0.5) * 0.2)
            elif song_emotion == "sad":
                score = ((1 - song.get("valence", 0.5)) * 0.5 + 
                        (1 - song.get("energy", 0.5)) * 0.3 + 
                        song.get("acousticness", 0.5) * 0.2)
            else:  # neutral
                score = 0.5 + random.uniform(-0.2, 0.2)
            
            # Add some random variation
            final_score = max(0.1, min(0.99, score + random.uniform(-0.1, 0.1)))
            
            result_songs.append({
                "id": song_id,
                "title": song.get("title", f"Song {i+1}"),
                "artist": "Artist",
                "score": round(final_score, 3),
                "emotion": song.get("song_emotion", song_emotion),
                "filename": filename,
                "audio_url": f"http://192.168.18.240:3000/api/audio/play/{filename}",
                "features": {
                    "danceability": round(song.get("danceability", 0), 2),
                    "energy": round(song.get("energy", 0), 2),
                    "valence": round(song.get("valence", 0), 2),
                }
            })
        
        print(f"✅ Returning {len(result_songs)} SHUFFLED songs with audio URLs")
        for song in result_songs:
            print(f"   🎵 {song['title']} -> {song['filename']} (score: {song['score']})")
        
        return jsonify({
            "success": True,
            "emotion": song_emotion,
            "face_emotion": face_emotion,
            "confidence": round(confidence, 3),
            "songs": result_songs,
            "session_id": session_id,
            "total_songs_in_db": songs_collection.count_documents({}),
            "songs_with_audio": len(songs_with_audio),
            "message": f"Found {len(result_songs)} songs with audio for {song_emotion} mood"
        }), 200
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "emotion": "neutral",
            "songs": []
        }), 500

# ✅ NEW ENDPOINT: Fix database filenames
@app.route("/api/fix-filenames", methods=["GET"])
def fix_filenames():
    """Fix all filenames in database (replace spaces with underscores)"""
    if songs_collection is None:
        return jsonify({"error": "MongoDB not connected"}), 500
    
    try:
        all_songs = list(songs_collection.find({"filename": {"$exists": True}}))
        fixed_count = 0
        
        for song in all_songs:
            old_filename = song.get("filename", "")
            new_filename = clean_filename_for_url(old_filename)
            
            if old_filename != new_filename:
                songs_collection.update_one(
                    {"_id": song["_id"]},
                    {"$set": {"filename": new_filename}}
                )
                fixed_count += 1
                print(f"🔧 Fixed: '{old_filename}' → '{new_filename}'")
        
        return jsonify({
            "success": True,
            "fixed_count": fixed_count,
            "total_songs": len(all_songs),
            "message": f"Fixed {fixed_count} filenames (spaces → underscores)"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reset-session/<session_id>", methods=["GET"])
def reset_session(session_id):
    """Reset song history for a session"""
    if session_id in session_history:
        session_history[session_id] = []
        return jsonify({
            "success": True,
            "message": f"Session {session_id[:8]}... history cleared"
        }), 200
    return jsonify({
        "success": False,
        "message": "Session not found"
    }), 404

@app.route("/api/get-songs/<emotion>", methods=["GET"])
def get_songs_by_emotion(emotion):
    """Get all songs for an emotion (for testing)"""
    try:
        if songs_collection is None:
            return jsonify({"error": "MongoDB not connected"}), 500
        
        songs = list(songs_collection.find({"song_emotion": emotion}))
        
        return jsonify({
            "success": True,
            "emotion": emotion,
            "total_songs": len(songs),
            "song_titles": [s.get("title", "Unknown") for s in songs[:20]]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/test-audio", methods=["GET"])
def test_audio():
    """Test audio availability"""
    try:
        if songs_collection is None:
            return jsonify({"error": "MongoDB not connected"}), 500
        
        # Get songs with filenames
        songs_with_files = list(songs_collection.find({"filename": {"$exists": True, "$ne": ""}}))
        
        # Sample songs
        sample_songs = []
        for song in songs_with_files[:5]:
            filename = song.get("filename", "")
            clean_name = clean_filename_for_url(filename)
            
            sample_songs.append({
                "title": song.get("title", "Unknown"),
                "original_filename": filename,
                "clean_filename": clean_name,
                "audio_url": f"http://192.168.18.240:3000/api/audio/play/{clean_name}"
            })
        
        return jsonify({
            "success": True,
            "total_songs_with_filenames": len(songs_with_files),
            "sample_songs": sample_songs,
            "audio_server": "http://192.168.18.240:3000",
            "note": "Spaces replaced with underscores for URLs"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/test", methods=["GET"])
def test_api():
    """Test endpoint"""
    stats = {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "mongo_connected": songs_collection is not None,
        "total_songs": songs_collection.count_documents({}) if songs_collection else 0,
        "songs_with_filenames": songs_collection.count_documents({"filename": {"$exists": True, "$ne": ""}}) if songs_collection else 0,
        "active_sessions": len(session_history),
        "emotions": {
            "happy": songs_collection.count_documents({"song_emotion": "happy"}) if songs_collection else 0,
            "sad": songs_collection.count_documents({"song_emotion": "sad"}) if songs_collection else 0,
            "neutral": songs_collection.count_documents({"song_emotion": "neutral"}) if songs_collection else 0,
        }
    }
    return jsonify(stats), 200

# ---------------- Health check ----------------
@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    try:
        total_songs = songs_collection.count_documents({}) if songs_collection else 0
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "models": {
                "face_emotions": emotion_labels,
                "song_emotions": list(emotion_encoder.classes_),
            },
            "database": {
                "total_songs": total_songs,
                "songs_with_audio": songs_collection.count_documents({"filename": {"$exists": True, "$ne": ""}}) if songs_collection else 0,
            },
            "audio_server": "http://192.168.18.240:3000",
            "session": {
                "active_sessions": len(session_history),
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# ---------------- Run ----------------
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎵 EMOTION API - FIXED SPACES IN FILENAMES")
    print("="*60)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎭 Face emotions: {emotion_labels}")
    print(f"🎵 Song emotions: {list(emotion_encoder.classes_)}")
    
    if songs_collection is not None:
        total = songs_collection.count_documents({})
        with_audio = songs_collection.count_documents({"filename": {"$exists": True, "$ne": ""}})
        print(f"💿 Total songs: {total}")
        print(f"🔊 Songs with audio files: {with_audio} ({with_audio/total*100:.1f}%)")
        
        # Show BEFORE/AFTER example
        print("\n🔄 Filename transformation example:")
        sample = songs_collection.find_one()
        if sample:
            original = sample.get("filename", "test song.mp3")
            fixed = clean_filename_for_url(original)
            print(f"   Before: '{original}'")
            print(f"   After:  '{fixed}'")
            print(f"   URL:    http://192.168.18.240:3000/api/audio/play/{fixed}")
    
    print("\n✅ SPACES → UNDERSCORES in filenames")
    print("="*60)
    print("🌐 API Server: http://0.0.0.0:5000")
    print("🔊 Audio Server: http://192.168.18.240:3000")
    print("🔧 Endpoints:")
    print("   POST /api/scan-face     - Main endpoint")
    print("   GET  /api/fix-filenames - Fix all filenames in DB")
    print("   GET  /api/test-audio    - Test audio URLs")
    print("="*60 + "\n")
    
    # Seed random
    random.seed(datetime.now().timestamp())
    
    app.run(host="0.0.0.0", port=5000, debug=False)  # Changed to debug=False for stability