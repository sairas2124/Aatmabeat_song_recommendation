import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMusic } from "../context/MusicContext";
import { useSession } from "../context/SessionContext";

const { width, height } = Dimensions.get("window");

// Emotion emoji mapping
const emotionEmojis = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprise: "😲",
  fear: "😨",
  disgust: "🤢",
  neutral: "😐",
  excited: "🤩",
  calm: "😌",
  relaxed: "🕊️",
};

// Main Component
export default function FaceDetection() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [songs, setSongs] = useState([]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const {
    playSound,
    currentlyPlayingId,
    isPlaying,
    stopMusic,
    saveToRecentlyPlayed,
  } = useMusic();

  const { user } = useSession();

  // Check camera permission
  useEffect(() => {
    if (permission) {
      setHasPermission(permission.granted);
    }
  }, [permission]);

  // In FaceDetection.jsx, replace the handleScanFace function (around line 61-165)

  const handleScanFace = async () => {
    // Check permission first
    if (!hasPermission) {
      Alert.alert(
        "Camera Permission Required",
        "Please grant camera permission to scan your face",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Grant Permission", onPress: requestPermission },
        ],
      );
      return;
    }

    try {
      setLoading(true);
      setEmotion(null);
      setSongs([]);

      // IMPORTANT: Force stop any playing music
      console.log("🛑 Stopping all music before scanning...");
      await stopMusic();

      // Wait a bit to ensure audio is stopped
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("✅ Music stopped, showing camera...");

      // Show camera for scanning
      setCameraVisible(true);

      // Wait for camera to initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!cameraRef.current) {
        throw new Error("Camera not ready");
      }

      console.log("📸 Taking photo...");

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });

      console.log("✅ Photo taken successfully");

      // Hide camera after taking photo
      setCameraVisible(false);

      console.log("🌐 Calling REAL emotion detection API...");

      // ✅ FIXED: Call the CORRECT API endpoint from emotion_api.py
      const response = await fetch("http://192.168.1.103:5000/api/scan-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${photo.base64}`, // ✅ Proper format
        }),
      });

      const data = await response.json();
      console.log("🎵 API Response:", data);

      // ✅ Handle response from emotion_api.py
      if (data.error) {
        Alert.alert("Detection Error", data.error);
        return;
      }

      // Set detected emotion
      setEmotion(data.emotion || data.face_emotion);

      // Process songs from API response
      if (data.songs && Array.isArray(data.songs)) {
        const sessionId = Date.now().toString();

        // ✅ Process songs from emotion_api.py format
        const processedSongs = data.songs.map((song, index) => ({
          id: `face-${sessionId}-${index}`,
          title: song.title || "Unknown Song",
          artist: song.artist || "Unknown Artist",
          filename: song.title
            ? `${song.title.replace(/\s+/g, "_")}.mp3`
            : `song_${index}.mp3`,
          score: song.score || 0,
          emotion: data.emotion,
          danceability: song.danceability || 0,
          energy: song.energy || 0,
          valence: song.valence || 0,
          source: "face-detection",
        }));

        console.log(
          `✅ Processed ${processedSongs.length} songs from emotion detection`,
        );

        setSongs(processedSongs);

        Alert.alert(
          "Face Analyzed! 🎭",
          `Detected Emotion: ${data.face_emotion || data.emotion}\n` +
            `Confidence: ${(data.confidence * 100).toFixed(1)}%\n\n` +
            `Found ${data.songs.length} matching songs\n\n` +
            `Click PLAY to listen`,
        );
      } else {
        setSongs([]);
        Alert.alert(
          "No Songs Found",
          "Could not find matching songs for your mood. Please try again.",
        );
      }
    } catch (err) {
      console.error("❌ Scan error:", err);
      setCameraVisible(false);

      if (err.message.includes("Camera not ready")) {
        Alert.alert("Camera Error", "Camera is not ready. Please try again.", [
          { text: "OK", onPress: () => setCameraVisible(false) },
        ]);
      } else if (err.message.includes("Network request failed")) {
        Alert.alert(
          "Connection Error",
          "Cannot connect to the emotion detection server. Make sure emotion_api.py is running on port 5000.",
        );
      } else {
        Alert.alert("Scan Failed", `Error: ${err.message}. Please try again.`);
      }

      // Clear any previous data on failure
      setEmotion(null);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (song) => {
    if (!song.filename) {
      Alert.alert("No Audio", "Song has no audio file");
      return;
    }

    await playSound(song);
    await saveToRecentlyPlayed(song, user?.id || "guest");
  };

  const closeCamera = () => {
    setCameraVisible(false);
    setLoading(false);
  };

  if (!permission) {
    return (
      <LinearGradient
        colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
        style={styles.center}
      >
        <Text style={styles.text}>Loading permissions...</Text>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
        style={styles.center}
      >
        <Text style={styles.text}>Camera permission required</Text>
        <LinearGradient
          colors={["#7C4DFF", "#8A84FF"]}
          style={styles.permissionBtn}
        >
          <TouchableOpacity onPress={requestPermission}>
            <Text style={styles.permissionText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
        </LinearGradient>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
      style={styles.container}
    >
      {/* Camera Modal */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeCamera}
      >
        <LinearGradient
          colors={["#0A0A0A", "#1A1A1A"]}
          style={styles.cameraModalContainer}
        >
          <StatusBar barStyle="light-content" />

          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={closeCamera} style={styles.closeButton}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>SCAN YOUR FACE</Text>
            <View style={{ width: 40 }} />
          </View>

          {cameraVisible && (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(error) => {
                console.error("Camera mount error:", error);
                Alert.alert("Camera Error", "Failed to start camera");
                setCameraVisible(false);
              }}
            />
          )}

          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <Text style={styles.scanGuide}>
              Align your face within the frame
            </Text>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleScanFace}
              disabled={loading}
            >
              <LinearGradient
                colors={["#7C4DFF", "#8A84FF"]}
                style={styles.captureInner}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="scan" size={30} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Mood Music</Text>
            <LinearGradient
              colors={["#7C4DFF", "#8A84FF"]}
              style={styles.titleUnderline}
            />
          </View>

          <LinearGradient
            colors={["#7C4DFF", "#8A84FF"]}
            style={styles.testButton}
          >
            <TouchableOpacity
              onPress={async () => {
                try {
                  setLoading(true);
                  setEmotion(null);
                  setSongs([]);

                  await stopMusic();
                  await new Promise((resolve) => setTimeout(resolve, 300));

                  const response = await fetch(
                    "http://192.168.1.103:5000/api/working-scan",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ test: true }),
                    },
                  );

                  const data = await response.json();
                  if (data.success) {
                    setEmotion(data.emotion);

                    if (data.songs && Array.isArray(data.songs)) {
                      const sessionId = Date.now().toString();
                      const processedSongs = data.songs.map((song, index) => ({
                        ...song,
                        id: song.id || `test-${sessionId}-${index}`,
                        filename: song.filename?.endsWith(".mp3")
                          ? song.filename
                          : `${song.filename}.mp3`,
                        source: "test",
                      }));
                      const shuffledSongs = [...processedSongs].sort(
                        () => Math.random() - 0.5,
                      );
                      setSongs(shuffledSongs);
                      Alert.alert(
                        "Test Success",
                        `Got ${data.songs.length} songs`,
                      );
                    }
                  }
                } catch (err) {
                  Alert.alert(
                    "Connection Error",
                    "Cannot connect to Flask server",
                  );
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || cameraVisible}
            >
              <Text style={styles.testText}>QUICK TEST</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Emotion Display */}
        {emotion && (
          <LinearGradient
            colors={["rgba(124, 77, 255, 0.15)", "rgba(124, 77, 255, 0.05)"]}
            style={styles.emotionDisplay}
          >
            <View style={styles.emotionContent}>
              <Text style={styles.emotionLabel}>CURRENT MOOD</Text>
              <View style={styles.emotionRow}>
                <Text style={styles.emotionValue}>{emotion.toUpperCase()}</Text>
                <View style={styles.emotionIcon}>
                  <Text style={styles.emotionEmoji}>
                    {emotionEmojis[emotion] || emotionEmojis.neutral}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Songs List */}
        {loading && !cameraVisible ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C4DFF" />
            <Text style={styles.loadingText}>
              Analyzing mood and getting songs...
            </Text>
          </View>
        ) : songs.length > 0 ? (
          <ScrollView style={styles.songsList}>
            <View style={styles.sectionHeader}>
              <Text style={styles.songsTitle}>Recommended Songs</Text>
              <Text style={styles.songsCount}>({songs.length})</Text>
            </View>
            {songs.map((song, index) => (
              <LinearGradient
                key={song.id || `song-${index}`}
                colors={
                  currentlyPlayingId === song.filename
                    ? ["rgba(124, 77, 255, 0.2)", "rgba(124, 77, 255, 0.1)"]
                    : ["rgba(30, 30, 30, 0.9)", "rgba(42, 42, 42, 0.9)"]
                }
                style={[
                  styles.songCard,
                  currentlyPlayingId === song.filename && styles.playingCard,
                ]}
              >
                <View style={styles.songInfo}>
                  <View style={styles.songHeader}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title || `Song ${index + 1}`}
                    </Text>
                    <Text style={styles.songEmoji}>
                      {emotionEmojis[song.emotion] || emotionEmojis.neutral}
                    </Text>
                  </View>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist || "Unknown Artist"}
                  </Text>
                  <View style={styles.songMeta}>
                    <View style={styles.languageTag}>
                      <Ionicons name="language" size={12} color="#FFFFFF" />
                      <Text style={styles.songLang}>
                        {song.language || "Unknown"}
                      </Text>
                    </View>
                    {song.score && (
                      <LinearGradient
                        colors={["#4CAF50", "#66BB6A"]}
                        style={styles.similarityTag}
                      >
                        <Ionicons name="pulse" size={12} color="#FFFFFF" />
                        <Text style={styles.songSim}>
                          {(song.score * 100).toFixed(1)}% Match
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>

                <LinearGradient
                  colors={
                    currentlyPlayingId === song.filename
                      ? ["#FF4081", "#FF6B6B"]
                      : ["#7C4DFF", "#8A84FF"]
                  }
                  style={styles.playButton}
                >
                  <TouchableOpacity
                    onPress={() => handlePlaySong(song)}
                    style={styles.playButtonInner}
                  >
                    <Ionicons
                      name={
                        currentlyPlayingId === song.filename && isPlaying
                          ? "pause"
                          : "play"
                      }
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.playText}>
                      {currentlyPlayingId === song.filename && isPlaying
                        ? " Pause"
                        : " Play"}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </LinearGradient>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={["rgba(124, 77, 255, 0.2)", "rgba(124, 77, 255, 0.1)"]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="face" size={64} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Songs Yet</Text>
            <Text style={styles.emptyDescription}>
              Scan your face to get personalized music recommendations based on
              your mood
            </Text>
            <Text style={styles.emptySubtext}>
              Your camera will open when you click "SCAN FACE"
            </Text>
          </View>
        )}

        {/* Scan Button */}
        <View style={styles.footer}>
          <LinearGradient
            colors={["#7C4DFF", "#8A84FF"]}
            style={styles.scanButton}
          >
            <TouchableOpacity
              onPress={handleScanFace}
              disabled={loading || cameraVisible}
              style={styles.scanButtonInner}
            >
              <Ionicons name="scan" size={24} color="#fff" />
              <Text style={styles.scanButtonText}>
                {cameraVisible
                  ? "SCANNING..."
                  : loading
                    ? "PROCESSING..."
                    : "SCAN FACE FOR MOOD"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <Text style={styles.scanNote}>
            {cameraVisible
              ? "Camera is open - Look at the camera"
              : "Click to open camera and scan your face"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Camera Modal Styles
  cameraModalContainer: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "System",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#7C4DFF",
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#7C4DFF",
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#7C4DFF",
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#7C4DFF",
    borderBottomRightRadius: 10,
  },
  scanGuide: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 280,
    textAlign: "center",
    fontFamily: "System",
  },
  captureButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
  },
  captureInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  // Main Content Styles
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    fontFamily: "System",
  },
  titleUnderline: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  testButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  testText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontFamily: "System",
  },
  emotionDisplay: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(124, 77, 255, 0.3)",
  },
  emotionContent: {
    alignItems: "center",
  },
  emotionLabel: {
    color: "#B0B0B0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    fontFamily: "System",
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  emotionValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginRight: 15,
    fontFamily: "System",
  },
  emotionIcon: {
    backgroundColor: "rgba(124, 77, 255, 0.2)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(124, 77, 255, 0.4)",
  },
  emotionEmoji: {
    fontSize: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: "#B0B0B0",
    fontSize: 16,
    marginTop: 20,
    fontFamily: "System",
  },
  songsList: {
    flex: 1,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  songsTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginRight: 10,
    fontFamily: "System",
  },
  songsCount: {
    color: "#7C4DFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "System",
  },
  // Song Card Styles
  songCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(124, 77, 255, 0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playingCard: {
    borderColor: "rgba(124, 77, 255, 0.5)",
  },
  songInfo: {
    flex: 1,
    marginRight: 15,
  },
  songHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  songTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
    fontFamily: "System",
  },
  songArtist: {
    color: "#B0B0B0",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "System",
  },
  songMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  languageTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 77, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  songLang: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: "System",
  },
  similarityTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  songSim: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    fontFamily: "System",
  },
  songEmoji: {
    fontSize: 20,
  },
  playButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  playButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
  },
  playText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
    fontFamily: "System",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(124, 77, 255, 0.3)",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: "System",
  },
  emptyDescription: {
    color: "#B0B0B0",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 30,
    marginBottom: 8,
    fontFamily: "System",
  },
  emptySubtext: {
    color: "#757575",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: "System",
  },
  footer: {
    marginTop: "auto",
  },
  scanButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  scanButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    marginLeft: 12,
    fontFamily: "System",
  },
  scanNote: {
    color: "#757575",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: "System",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    fontFamily: "System",
  },
  permissionBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  permissionText: {
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontFamily: "System",
  },
});
