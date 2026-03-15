import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import React, { createContext, useContext, useEffect, useState } from "react";

export const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  const [sound, setSound] = useState(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  // Stop music completely
  const stopMusic = async () => {
    console.log("🛑 stopMusic called");
    try {
      if (sound) {
        console.log("🛑 Sound exists, stopping...");
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setCurrentlyPlayingId(null);
        setIsPlaying(false);
        setCurrentSong(null);
        console.log("✅ Music stopped successfully");
      } else {
        console.log("🛑 No sound to stop");
        setCurrentlyPlayingId(null);
        setIsPlaying(false);
        setCurrentSong(null);
      }
    } catch (err) {
      console.error("❌ Failed to stop music:", err);
      // Reset state even if error
      setCurrentlyPlayingId(null);
      setIsPlaying(false);
      setCurrentSong(null);
    }
  };

  // Pause music (keep loaded)
  const pauseMusic = async () => {
    try {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Failed to pause music:", err);
    }
  };

  // Resume paused music
  const resumeMusic = async () => {
    try {
      if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to resume music:", err);
    }
  };

  // Play or toggle music
  const playSound = async (song) => {
    if (!song?.filename) {
      console.error("❌ No filename provided");
      return;
    }

    console.log(`▶️ Request to play: ${song.title || song.filename}`);
    console.log(`📊 Currently playing: ${currentlyPlayingId}`);
    console.log(`🎵 Is playing: ${isPlaying}`);

    try {
      // If clicking the same song that's playing, pause it
      if (currentlyPlayingId === song.filename && isPlaying) {
        console.log("⏸️ Pausing current song");
        await pauseMusic();
        return;
      }

      // If clicking the same song that's paused, resume it
      if (currentlyPlayingId === song.filename && !isPlaying) {
        console.log("▶️ Resuming paused song");
        await resumeMusic();
        return;
      }

      // If a different song is playing, stop it first
      if (sound && currentlyPlayingId !== song.filename) {
        console.log("🔄 Stopping current song to play new one");
        await stopMusic();
        // Small delay to ensure cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`🎵 Creating new sound for: ${song.filename}`);

      // Create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        {
          uri: `http://192.168.1.103:3000/api/audio/play/${encodeURIComponent(song.filename)}`,
        },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          console.log("📊 Status update:", status);
          setPlaybackStatus({
            positionMillis: status.positionMillis || 0,
            durationMillis: status.durationMillis || 0,
            isLoaded: status.isLoaded,
          });
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            console.log("🎵 Song finished playing");
            setCurrentlyPlayingId(null);
            setIsPlaying(false);
            setCurrentSong(null);
          }
        },
      );

      // Set the new sound
      setSound(newSound);
      setCurrentlyPlayingId(song.filename);
      setCurrentSong(song);
      setIsPlaying(true);

      // ✅ CRITICAL: Save to recently played
      // Get user ID from your session context (you'll need to pass this)
      // For now, we'll use 'guest' as default
      const userId = "guest"; // You should get this from your auth system
      await saveToRecentlyPlayed(song, userId);

      console.log(
        "✅ New song playing and saved to recently played:",
        song.title || song.filename,
      );
    } catch (err) {
      console.error("❌ Failed to play song:", err);
      // Reset state on error
      setCurrentlyPlayingId(null);
      setIsPlaying(false);
      setCurrentSong(null);
    }
  };

  // Save to recently played
  const saveToRecentlyPlayed = async (song, userId = "guest") => {
    console.log(
      "💾 Saving to recently played:",
      song.title || song.filename,
      "for user:",
      userId,
    );

    try {
      const songWithMetadata = {
        ...song,
        id:
          song.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: song.title || "Unknown Song",
        artist: song.artist || "Unknown Artist",
        filename: song.filename,
        playedAt: new Date().toISOString(),
        source: song.source || "search",
        userId: userId,
      };

      if (userId === "guest") {
        // For guest users, save to AsyncStorage
        const key = "guest_recently_played";
        const existing = await AsyncStorage.getItem(key);
        let songs = existing ? JSON.parse(existing) : [];

        // Remove if already exists (avoid duplicates)
        songs = songs.filter((s) => s.filename !== song.filename);

        // Add to beginning
        songs.unshift(songWithMetadata);

        // Keep only last 10
        songs = songs.slice(0, 10);

        await AsyncStorage.setItem(key, JSON.stringify(songs));
        setRecentlyPlayed(songs);

        console.log(
          "✅ Saved to guest recently played. Total songs:",
          songs.length,
        );
      } else {
        // For logged-in users, save to backend
        try {
          const response = await fetch(
            "http://192.168.1.103:3000/api/recently-played",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                song: songWithMetadata,
              }),
            },
          );

          if (response.ok) {
            // Update local state
            const newSongs = [
              songWithMetadata,
              ...recentlyPlayed.filter((s) => s.filename !== song.filename),
            ].slice(0, 10);

            setRecentlyPlayed(newSongs);
            console.log("✅ Saved to backend recently played");
          }
        } catch (error) {
          console.error("❌ Error saving to backend:", error);
          // Fallback to AsyncStorage if backend fails
          const key = `user_${userId}_recently_played`;
          const existing = await AsyncStorage.getItem(key);
          let songs = existing ? JSON.parse(existing) : [];

          songs = songs.filter((s) => s.filename !== song.filename);
          songs.unshift(songWithMetadata);
          songs = songs.slice(0, 10);

          await AsyncStorage.setItem(key, JSON.stringify(songs));
          setRecentlyPlayed(songs);

          console.log("✅ Saved to AsyncStorage fallback");
        }
      }
    } catch (error) {
      console.error("❌ Error saving to recently played:", error);
    }
  };

  // Load recently played
  const loadRecentlyPlayed = async (userId = "guest") => {
    console.log("📂 Loading recently played for user:", userId);

    try {
      if (userId === "guest") {
        // Load from AsyncStorage for guest
        const key = "guest_recently_played";
        const existing = await AsyncStorage.getItem(key);
        const songs = existing ? JSON.parse(existing) : [];
        setRecentlyPlayed(songs);
        console.log("📊 Loaded", songs.length, "songs for guest");
      } else {
        // Load from backend for logged-in users
        try {
          const response = await fetch(
            `http://192.168.1.103:3000/api/recently-played/${userId}`,
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.songs) {
              setRecentlyPlayed(data.songs);
              console.log("📊 Loaded", data.songs.length, "songs from backend");
            } else {
              console.log(
                "📊 No songs from backend, trying AsyncStorage fallback",
              );
              // Try AsyncStorage fallback
              const key = `user_${userId}_recently_played`;
              const existing = await AsyncStorage.getItem(key);
              const songs = existing ? JSON.parse(existing) : [];
              setRecentlyPlayed(songs);
            }
          } else {
            // Fallback to AsyncStorage
            const key = `user_${userId}_recently_played`;
            const existing = await AsyncStorage.getItem(key);
            const songs = existing ? JSON.parse(existing) : [];
            setRecentlyPlayed(songs);
            console.log(
              "📊 Loaded",
              songs.length,
              "songs from AsyncStorage fallback",
            );
          }
        } catch (error) {
          console.error("❌ Error loading from backend:", error);
          // Fallback to AsyncStorage
          const key = `user_${userId}_recently_played`;
          const existing = await AsyncStorage.getItem(key);
          const songs = existing ? JSON.parse(existing) : [];
          setRecentlyPlayed(songs);
          console.log(
            "📊 Loaded",
            songs.length,
            "songs from AsyncStorage (backend error)",
          );
        }
      }
    } catch (error) {
      console.error("❌ Error loading recently played:", error);
      setRecentlyPlayed([]);
    }
  };

  // Remove from recently played
  const removeFromRecentlyPlayed = async (filename, userId = "guest") => {
    console.log("🗑️ Removing song:", filename, "for user:", userId);

    try {
      if (userId === "guest") {
        const key = "guest_recently_played";
        const existing = await AsyncStorage.getItem(key);
        if (existing) {
          const songs = JSON.parse(existing);
          const filteredSongs = songs.filter(
            (song) => song.filename !== filename,
          );
          await AsyncStorage.setItem(key, JSON.stringify(filteredSongs));
          setRecentlyPlayed(filteredSongs);
          console.log("✅ Removed from guest recently played");
        }
      } else {
        // For logged-in users, remove from backend
        try {
          await fetch(
            `http://192.168.1.103:3000/api/recently-played/${userId}/${filename}`,
            {
              method: "DELETE",
            },
          );

          // Update local state
          const filteredSongs = recentlyPlayed.filter(
            (song) => song.filename !== filename,
          );
          setRecentlyPlayed(filteredSongs);
          console.log("✅ Removed from backend");
        } catch (error) {
          console.error("❌ Error removing from backend:", error);
          // Fallback to AsyncStorage
          const key = `user_${userId}_recently_played`;
          const existing = await AsyncStorage.getItem(key);
          if (existing) {
            const songs = JSON.parse(existing);
            const filteredSongs = songs.filter(
              (song) => song.filename !== filename,
            );
            await AsyncStorage.setItem(key, JSON.stringify(filteredSongs));
            setRecentlyPlayed(filteredSongs);
            console.log("✅ Removed from AsyncStorage fallback");
          }
        }
      }
    } catch (error) {
      console.error("❌ Error removing from recently played:", error);
    }
  };

  // Clear all recently played
  const clearRecentlyPlayed = async (userId = "guest") => {
    console.log("🧹 Clearing recently played for user:", userId);

    try {
      if (userId === "guest") {
        await AsyncStorage.removeItem("guest_recently_played");
      } else {
        await AsyncStorage.removeItem(`user_${userId}_recently_played`);
      }
      setRecentlyPlayed([]);
      console.log("✅ Cleared recently played");
    } catch (error) {
      console.error("❌ Error clearing recently played:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up MusicProvider");
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  return (
    <MusicContext.Provider
      value={{
        playSound,
        stopMusic,
        pauseMusic,
        resumeMusic,
        currentlyPlayingId,
        isPlaying,
        playbackStatus,
        saveToRecentlyPlayed,
        loadRecentlyPlayed,
        removeFromRecentlyPlayed,
        clearRecentlyPlayed,
        recentlyPlayed,
        currentSong,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

// ✅ Export a custom hook for easy usage
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
