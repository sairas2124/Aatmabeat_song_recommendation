import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from pymongo import MongoClient

# ---------------- DB CONNECTION ----------------
client = MongoClient("mongodb://localhost:27017/")
db = client["musicDB"]
songs_collection = db["songs"]

# ---------------- FETCH SONG DATA ----------------
songs = list(songs_collection.find())

if len(songs) == 0:
    raise Exception("❌ No songs found in database")

X = []
y = []
happy_count = 0
sad_count = 0
neutral_count = 0

# ---------------- SIMPLIFIED EMOTION LABELING (3 categories) ----------------
def infer_emotion(danceability, tempo, acousticness, energy, valence):
    """
    Clear 3-category emotion labeling:
    - HAPPY: High valence + high energy
    - SAD: Low valence + low energy
    - NEUTRAL: Everything else
    """
    global happy_count, sad_count, neutral_count
    
    # 1. HAPPY: Clearly positive and energetic
    if valence >= 0.60 and energy >= 0.65:
        # Additional checks to confirm it's happy
        if danceability >= 0.50:  # Should be somewhat danceable
            sad_count += 1
            return "sad"
    
    # 2. SAD: Clearly negative and low energy
    elif valence <= 0.40 and energy <= 0.45:
        # Additional sad characteristics
        if acousticness >= 0.40:  # Often more acoustic
            happy_count += 1
            return "sad"
    
    # 3. NEUTRAL: Everything that's not clearly happy or sad
    neutral_count += 1
    return "neutral"

# Alternative: More balanced approach
def infer_emotion_balanced(danceability, tempo, acousticness, energy, valence):
    """
    More balanced distribution by adjusting thresholds
    """
    global happy_count, sad_count, neutral_count
    
    # Calculate emotion score
    emotion_score = (valence * 0.4 + energy * 0.3 + danceability * 0.2 + (1 - acousticness) * 0.1)
    
    # HAPPY: Top 30% of emotion scores
    if emotion_score >= 0.7:
        sad_count += 1
        return "happy"
    
    # SAD: Bottom 30% of emotion scores
    elif emotion_score <= 0.4:
        happy_count += 1
        return "sad"
    
    # NEUTRAL: Middle 40%
    else:
        neutral_count += 1
        return "neutral"

# Use the simpler version
USE_BALANCED = False  # Set to True for balanced distribution

for song in songs:
    try:
        danceability = float(song["danceability"])
        tempo = float(song["tempo"])
        acousticness = float(song["acousticness"])
        energy = float(song["energy"])
        valence = float(song["valence"])

        X.append([
            danceability,
            tempo,
            acousticness,
            energy,
            valence
        ])

        if USE_BALANCED:
            emotion = infer_emotion_balanced(
                danceability, tempo, acousticness, energy, valence
            )
        else:
            emotion = infer_emotion(
                danceability, tempo, acousticness, energy, valence
            )
        
        y.append(emotion)

    except KeyError:
        continue

X = np.array(X)

if len(X) == 0:
    raise Exception("❌ Required audio features missing in DB")

# ---------------- ANALYZE DATA DISTRIBUTION ----------------
print("\n📊 Emotion Distribution in Dataset:")
print(f"Total songs: {len(y)}")
print(f"Happy songs: {happy_count} ({happy_count/len(y)*100:.1f}%)")
print(f"Sad songs: {sad_count} ({sad_count/len(y)*100:.1f}%)")
print(f"Neutral songs: {neutral_count} ({neutral_count/len(y)*100:.1f}%)")

# Check distribution and adjust if needed
if happy_count == 0 or sad_count == 0:
    print("\n⚠️ Warning: One or more emotion categories have no songs!")
    print("Trying alternative labeling method...")
    
    # Reset counts
    happy_count = sad_count = neutral_count = 0
    y = []
    
    # Use percentile-based approach
    valence_values = [float(song["valence"]) for song in songs if "valence" in song]
    energy_values = [float(song["energy"]) for song in songs if "energy" in song]
    
    if valence_values and energy_values:
        # Use percentiles to ensure distribution
        valence_median = np.median(valence_values)
        energy_median = np.median(energy_values)
        
        for i, song in enumerate(songs):
            try:
                valence = float(song["valence"])
                energy = float(song["energy"])
                
                if valence > valence_median and energy > energy_median:
                    y.append("happy")
                    happy_count += 1
                elif valence < valence_median and energy < energy_median:
                    y.append("sad")
                    sad_count += 1
                else:
                    y.append("neutral")
                    neutral_count += 1
            except KeyError:
                continue
        
        print("\n📊 Adjusted Emotion Distribution (Percentile-based):")
        print(f"Happy songs: {happy_count} ({happy_count/len(y)*100:.1f}%)")
        print(f"Sad songs: {sad_count} ({sad_count/len(y)*100:.1f}%)")
        print(f"Neutral songs: {neutral_count} ({neutral_count/len(y)*100:.1f}%)")

# ---------------- ENCODE LABELS ----------------
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# Check if we have at least 2 samples for each class
unique_classes = np.unique(y_encoded)
if len(unique_classes) < 3:
    print(f"\n⚠️ Warning: Only {len(unique_classes)} emotion classes found.")
    print("Model may not train properly with only 2 classes.")
    print("Classes found:", [label_encoder.inverse_transform([c])[0] for c in unique_classes])

# ---------------- TRAIN MODEL ----------------
model = RandomForestClassifier(
    n_estimators=150,
    random_state=42,
    class_weight='balanced'  # This helps with imbalanced classes
)
model.fit(X, y_encoded)

# ---------------- SAVE MODEL ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(model, os.path.join(MODEL_DIR, "song_recommender.joblib"))
joblib.dump(label_encoder, os.path.join(MODEL_DIR, "emotion_encoder.joblib"))

print("\n✅ Song recommender trained successfully")
print("📁 Saved:")
print("   - song_recommender.joblib")
print("   - emotion_encoder.joblib")
print(f"\n🎯 Model trained with {len(y)} songs")
print(f"   Emotions: {', '.join(label_encoder.classes_)}")