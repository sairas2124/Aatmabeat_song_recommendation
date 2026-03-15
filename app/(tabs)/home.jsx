import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMusic } from "../../context/MusicContext";
import { useSession } from "../../context/SessionContext";

const { width, height } = Dimensions.get("window");

// Custom Slider Component
const CustomSlider = ({
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style,
}) => {
  const [sliderWidth, setSliderWidth] = useState(width - 120);
  const [isSeeking, setIsSeeking] = useState(false);

  const onLayout = (event) => {
    setSliderWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (event) => {
    const x = event.nativeEvent.locationX;
    const newValue =
      (x / sliderWidth) * (maximumValue - minimumValue) + minimumValue;
    setIsSeeking(true);
    onValueChange(Math.max(minimumValue, Math.min(maximumValue, newValue)));
    setTimeout(() => setIsSeeking(false), 100);
  };

  const progress =
    maximumValue > 0
      ? (value - minimumValue) / (maximumValue - minimumValue)
      : 0;
  const thumbPosition = progress * sliderWidth;

  return (
    <View style={[styles.sliderContainer, style]} onLayout={onLayout}>
      <View
        style={[styles.track, { backgroundColor: maximumTrackTintColor }]}
      />
      <View
        style={[
          styles.progress,
          {
            backgroundColor: minimumTrackTintColor,
            width: thumbPosition,
          },
        ]}
      />
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbTintColor,
            left: thumbPosition - 8,
          },
        ]}
      />
      <TouchableOpacity
        style={styles.sliderTouchable}
        activeOpacity={1}
        onPress={handlePress}
        disabled={isSeeking}
      />
    </View>
  );
};

// Compact Recently Played Item Component
const RecentlyPlayedItem = ({
  item,
  index,
  onPress,
  onPlay,
  isCurrentlyPlaying,
  onDelete,
}) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showDeleteOption, setShowDeleteOption] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 80),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleCardPress = () => {
    onPress(item);
  };

  const handlePlayPress = (e) => {
    e.stopPropagation();
    onPlay(item);
  };

  const handleMorePress = (e) => {
    e.stopPropagation();
    setShowDeleteOption(!showDeleteOption);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(item);
    setShowDeleteOption(false);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const playedAt = new Date(dateString);
      const now = new Date();
      const diffMs = now - playedAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `${diffMins} min ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else {
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      }
    } catch (error) {
      return "Recently";
    }
  };

  return (
    <TouchableOpacity onPress={handleCardPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.recentlyPlayedItem,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Album Art with Gradient */}
        <LinearGradient
          colors={
            isCurrentlyPlaying
              ? ["#6C63FF", "#8A84FF"]
              : ["rgba(108, 99, 255, 0.1)", "rgba(108, 99, 255, 0.05)"]
          }
          style={[
            styles.recentAlbumArt,
            isCurrentlyPlaying && styles.playingAlbumArt,
          ]}
        >
          <Ionicons
            name={isCurrentlyPlaying ? "musical-notes" : "musical-note"}
            size={20}
            color={isCurrentlyPlaying ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
          />
        </LinearGradient>

        {/* Song Info */}
        <View style={styles.recentItemInfo}>
          <View style={styles.recentTitleRow}>
            <Text
              style={[
                styles.recentItemTitle,
                isCurrentlyPlaying && styles.nowPlayingTitle,
              ]}
              numberOfLines={1}
            >
              {item.title || "Unknown Song"}
            </Text>
            {isCurrentlyPlaying && (
              <LinearGradient
                colors={["#FF6B6B", "#FF8E8E"]}
                style={styles.liveIndicator}
              >
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={styles.recentItemArtist} numberOfLines={1}>
            {item.artist || "Unknown Artist"}
          </Text>
          <Text style={styles.recentItemTime}>
            {formatTimeAgo(item.playedAt)}
          </Text>
        </View>

        {/* Play Button */}
        <LinearGradient
          colors={
            isCurrentlyPlaying ? ["#FF6B6B", "#FF8E8E"] : ["#6C63FF", "#8A84FF"]
          }
          style={styles.recentPlayButton}
        >
          <TouchableOpacity onPress={handlePlayPress}>
            <Ionicons
              name={isCurrentlyPlaying ? "pause" : "play"}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* More Options */}
        <View style={styles.moreOptionsContainer}>
          <TouchableOpacity
            style={styles.recentMoreButton}
            onPress={handleMorePress}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={16}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
          {showDeleteOption && (
            <LinearGradient
              colors={["rgba(255,107,107,0.95)", "rgba(255,142,142,0.95)"]}
              style={styles.deleteOptionButton}
            >
              <TouchableOpacity
                onPress={handleDelete}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.deleteOptionText}>Remove</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Animated Song Card Component
const AnimatedSongCard = ({
  item,
  index,
  musicWaveAnim,
  isCurrentlyPlaying,
  isFeatured = false,
  onPlay,
  onCardPress,
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 150),
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (isFeatured) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, []);

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const cardOpacity = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const handlePlay = () => {
    onPlay(item);
  };

  const handleCardPress = () => {
    onCardPress(item);
  };

  return (
    <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9}>
      <Animated.View
        style={[
          isFeatured ? styles.featuredCard : styles.songCard,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }, { scale: scaleAnim }],
          },
        ]}
      >
        {isFeatured && (
          <Animated.View
            style={[styles.glowEffect, { opacity: glowOpacity }]}
          />
        )}

        <View style={styles.songHeader}>
          <View style={styles.songInfo}>
            <View style={styles.titleRow}>
              <Text
                style={isFeatured ? styles.featuredTitle : styles.songTitle}
              >
                {item.title}
              </Text>
              {isFeatured && (
                <LinearGradient
                  colors={["#FFD700", "#FFED4E"]}
                  style={styles.featuredBadge}
                >
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.songMeta}>
              <View style={styles.languageTag}>
                <Ionicons name="language" size={12} color="#FFFFFF" />
                <Text style={styles.songLang}>
                  {item.language || "Unknown"}
                </Text>
              </View>

              {isFeatured && item.similarity && (
                <LinearGradient
                  colors={["#1DB954", "#2AF56C"]}
                  style={styles.similarityTag}
                >
                  <Ionicons name="pulse" size={12} color="#FFFFFF" />
                  <Text style={styles.songSim}>
                    {(item.similarity * 100).toFixed(1)}% Match
                  </Text>
                </LinearGradient>
              )}
            </View>
          </View>

          <View style={styles.musicWave}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: isFeatured ? 20 : 12,
                    backgroundColor: isFeatured ? "#FFD700" : "#6C63FF",
                    transform: [
                      {
                        scaleY: isCurrentlyPlaying
                          ? musicWaveAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.2, 1.5],
                            })
                          : 0.2,
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <LinearGradient
          colors={
            isCurrentlyPlaying
              ? ["#FF6B6B", "#FF8E8E"]
              : isFeatured
                ? ["#FFD700", "#FFED4E"]
                : ["#6C63FF", "#8A84FF"]
          }
          style={[
            styles.playButton,
            isFeatured && styles.featuredPlayButton,
            { width: isFeatured ? "100%" : "100%" }, // Ensure full width for both
          ]}
        >
          <TouchableOpacity
            onPress={handlePlay}
            style={styles.playButtonInner}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isCurrentlyPlaying ? "pause" : "play"}
              size={isFeatured ? 20 : 18}
              color="#fff"
              style={styles.playIcon}
            />
            <Text
              style={[styles.playText, isFeatured && styles.featuredPlayText]}
            >
              {isCurrentlyPlaying ? "Pause" : "Play Now"}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Full Screen Music Player Component
const FullScreenPlayer = ({
  visible,
  song,
  isPlaying,
  onPlayPause,
  onClose,
  onSeek,
  currentPosition,
  duration,
  onSkipForward,
  onSkipBackward,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const formatTime = (milliseconds) => {
    if (!milliseconds || isNaN(milliseconds)) return "0:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!visible || !song) return null;

  return (
    <Animated.View style={[styles.fullScreenPlayer, { opacity: fadeAnim }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.playerContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.playerHeader}>
          <TouchableOpacity style={styles.minimizeButton} onPress={onClose}>
            <Ionicons name="chevron-down" size={30} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.playerTitle}>Now Playing</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Album Art with Gradient */}
        <View style={styles.albumArtContainer}>
          <LinearGradient
            colors={["#6C63FF", "#8A84FF", "#6C63FF"]}
            style={styles.albumArt}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="musical-notes" size={120} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Song Info */}
        <View style={styles.songInfoContainer}>
          <Text style={styles.playerSongTitle}>{song.title}</Text>
          <Text style={styles.playerArtist}>Unknown Artist</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
          <CustomSlider
            value={currentPosition}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            onValueChange={onSeek}
            minimumTrackTintColor="#6C63FF"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#FFFFFF"
            style={styles.progressBar}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onSkipBackward}
          >
            <Ionicons name="play-skip-back" size={30} color="#fff" />
          </TouchableOpacity>

          <LinearGradient
            colors={["#6C63FF", "#8A84FF"]}
            style={styles.playPauseButton}
          >
            <TouchableOpacity onPress={onPlayPause}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={40}
                color="#fff"
              />
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={onSkipForward}
          >
            <Ionicons name="play-skip-forward" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Additional Controls */}
        <View style={styles.additionalControls}>
          <TouchableOpacity style={styles.smallControlButton}>
            <Ionicons name="shuffle" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallControlButton}>
            <Ionicons name="repeat" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallControlButton}>
            <Feather name="heart" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// Animated Section Header
const AnimatedSectionHeader = ({
  title,
  icon,
  delay = 0,
  showSeeAll = false,
  onSeeAll,
}) => {
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sectionHeader,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleContainer}>
          {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
          <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
        {showSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={16} color="#6C63FF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.headerUnderline} />
    </Animated.View>
  );
};

// Exit Confirmation Modal
const ExitConfirmationModal = ({ visible, onConfirm, onCancel }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.modalHeader}>
            <LinearGradient
              colors={["#FF6B6B", "#FF8E8E"]}
              style={styles.modalIconContainer}
            >
              <Ionicons name="log-out-outline" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.modalTitle}>Exit App</Text>
          </View>

          <Text style={styles.modalMessage}>
            Are you sure you want to exit? Any playing music will be stopped.
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={["#FF6B6B", "#FF8E8E"]}
              style={[styles.modalButton, styles.confirmButton]}
            >
              <TouchableOpacity onPress={onConfirm}>
                <Text style={styles.confirmButtonText}>Yes, Exit</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Recently Played Modal
const RecentlyPlayedModal = ({
  visible,
  onClose,
  recentlyPlayedList,
  onPlay,
  onDelete,
  currentlyPlayingId,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isSongPlaying = (song) => {
    if (!song || !song.filename) return false;
    return currentlyPlayingId === song.filename;
  };

  const renderRecentlyPlayedItem = ({ item, index }) =>
    item ? (
      <Animated.View
        style={[
          styles.recentlyPlayedItem,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={
            isSongPlaying(item)
              ? ["#6C63FF", "#8A84FF"]
              : ["rgba(108, 99, 255, 0.1)", "rgba(108, 99, 255, 0.05)"]
          }
          style={styles.recentAlbumArt}
        >
          <Ionicons
            name={isSongPlaying(item) ? "musical-notes" : "musical-note"}
            size={20}
            color={isSongPlaying(item) ? "#FFFFFF" : "rgba(255,255,255,0.7)"}
          />
        </LinearGradient>

        <View style={styles.recentItemInfo}>
          <View style={styles.recentTitleRow}>
            <Text
              style={[
                styles.recentItemTitle,
                isSongPlaying(item) && styles.nowPlayingTitle,
              ]}
              numberOfLines={1}
            >
              {item.title || "Unknown Song"}
            </Text>
            {isSongPlaying(item) && (
              <LinearGradient
                colors={["#FF6B6B", "#FF8E8E"]}
                style={styles.liveIndicator}
              >
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={styles.recentItemArtist} numberOfLines={1}>
            {item.artist || "Unknown Artist"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <LinearGradient
            colors={["#6C63FF", "#8A84FF"]}
            style={styles.playButton}
          >
            <TouchableOpacity onPress={() => onPlay(item)} activeOpacity={0.7}>
              <Ionicons
                name={isSongPlaying(item) ? "pause-circle" : "play-circle"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(255,107,107,0.9)", "rgba(255,142,142,0.9)"]}
            style={styles.deleteButton}
          >
            <TouchableOpacity
              onPress={() => onDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>
    ) : null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={["rgba(10,10,10,0.95)", "rgba(26,26,26,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.fullScreenModalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Modal Header */}
          <LinearGradient
            colors={["rgba(108, 99, 255, 0.2)", "rgba(108, 99, 255, 0.1)"]}
            style={styles.modalHeaderTop}
          >
            <Text style={styles.modalHeaderTitle}>
              Recently Played ({recentlyPlayedList.length})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Recently Played List */}
          {recentlyPlayedList.length > 0 ? (
            <FlatList
              data={recentlyPlayedList}
              keyExtractor={(item, index) =>
                `modal-recent-${item.id || item.filename || index}-${index}`
              }
              renderItem={renderRecentlyPlayedItem}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.modalListContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={["rgba(108, 99, 255, 0.2)", "rgba(108, 99, 255, 0.1)"]}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.emptyText}>No recently played songs</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const Home = () => {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullScreenPlayerVisible, setFullScreenPlayerVisible] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showRecentlyPlayedModal, setShowRecentlyPlayedModal] = useState(false);
  const router = useRouter();

  // Session management
  const { isAuthenticated, user, isLoading: sessionLoading } = useSession();

  // Music context with recently played functionality
  const {
    playSound,
    stopMusic,
    currentlyPlayingId,
    playbackStatus,
    recentlyPlayed: contextRecentlyPlayed,
    removeFromRecentlyPlayed,
    loadRecentlyPlayed,
  } = useMusic();

  // Use recently played from context with local state
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  // Load recently played when user changes or component mounts
  useEffect(() => {
    const loadRecent = async () => {
      const userId = user?.id || "guest";
      await loadRecentlyPlayed(userId);
    };
    loadRecent();
  }, [user?.id, forceRefresh]);

  // Update local state when context changes
  useEffect(() => {
    if (contextRecentlyPlayed && Array.isArray(contextRecentlyPlayed)) {
      setRecentlyPlayed(contextRecentlyPlayed);
    } else {
      setRecentlyPlayed([]);
    }
  }, [contextRecentlyPlayed]);

  // Handle delete from recently played
  const handleDeleteFromRecentlyPlayed = async (songToDelete) => {
    const userId = user?.id || "guest";
    await removeFromRecentlyPlayed(songToDelete.filename, userId);
    setForceRefresh((prev) => prev + 1);
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const musicWaveAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-100)).current;
  const resultsScaleAnim = useRef(new Animated.Value(0)).current;

  // Header animation sequence
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Music wave animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(musicWaveAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(musicWaveAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Pulse animation for search button when loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isAuthenticated) {
          if (result) {
            handleBackToHome();
          } else {
            setShowExitModal(true);
          }
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [isAuthenticated, result]),
  );

  // Show loading while session is being checked
  if (sessionLoading) {
    return (
      <LinearGradient
        colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Loading...</Text>
      </LinearGradient>
    );
  }

  const handlePlayWithHistory = async (song) => {
    await playSound(song);
  };

  const handleCardPress = (song) => {
    setCurrentSong(song);
    setFullScreenPlayerVisible(true);
    if (currentlyPlayingId !== song.filename) {
      playSound(song);
    }
  };

  const handleRecentlyPlayedPress = (song) => {
    setCurrentSong(song);
    setFullScreenPlayerVisible(true);
  };

  const handleFullScreenPlayPause = async () => {
    if (currentSong) {
      playSound(currentSong);
    }
  };

  const handleSeek = async (value) => {
    console.log("Seek to:", value);
  };

  const handleSkipForward = async () => {
    console.log("Skip forward");
  };

  const handleSkipBackward = async () => {
    console.log("Skip backward");
  };

  const handleCloseFullScreen = () => {
    setFullScreenPlayerVisible(false);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      const shakeAnim = new Animated.Value(0);
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 15,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -15,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const API_BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.103:3000";
      const res = await fetch(
        `${API_BASE_URL}/recommend?song=${encodeURIComponent(searchText)}`,
      );

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      const hasValidResults =
        data &&
        ((data.searched_song &&
          data.recommendations &&
          data.recommendations.length > 0) ||
          (data.recommendations && data.recommendations.length > 0) ||
          data.searched_song);

      if (hasValidResults) {
        setResult(data);
        Animated.spring(resultsScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      } else {
        setResult({
          error:
            "No results found for '" +
            searchText +
            "'. Try a different song name or check the spelling.",
        });
      }
    } catch (err) {
      console.error("Error fetching recommendation:", err);
      setResult({
        error:
          "Failed to get song recommendations. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceDetection = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push("/FaceDetection");
    });
  };

  const handleBackToHome = async () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(resultsScaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResult(null);
      setSearchText("");
      slideAnim.setValue(0);
      resultsScaleAnim.setValue(0);
    });
  };

  const handleConfirmExit = async () => {
    await stopMusic();
    setShowExitModal(false);
    router.back();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleSeeAllRecentlyPlayed = () => {
    setShowRecentlyPlayedModal(true);
  };

  const isSongPlaying = (song) => {
    if (!song || !song.filename) return false;
    return currentlyPlayingId === song.filename;
  };

  const renderSong = ({ item, index }) =>
    item ? (
      <AnimatedSongCard
        item={item}
        index={index}
        musicWaveAnim={musicWaveAnim}
        isCurrentlyPlaying={isSongPlaying(item)}
        onPlay={handlePlayWithHistory}
        onCardPress={handleCardPress}
      />
    ) : null;

  const renderRecentlyPlayedItem = ({ item, index }) => (
    <RecentlyPlayedItem
      item={item}
      index={index}
      onPress={handleRecentlyPlayedPress}
      onPlay={handlePlayWithHistory}
      onDelete={handleDeleteFromRecentlyPlayed}
      isCurrentlyPlaying={isSongPlaying(item)}
    />
  );

  const hasValidSearchResults =
    result &&
    !result.error &&
    (result.searched_song ||
      (result.recommendations && result.recommendations.length > 0));

  return (
    <LinearGradient
      colors={["#0A0A0A", "#1A1A1A", "#2A2A2A"]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateX: headerSlideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Aatmabeat</Text>
              <LinearGradient
                colors={["#6C63FF", "#8A84FF"]}
                style={styles.titleUnderline}
              />
            </View>
            <Text style={styles.subtitle}>
              Find music that matches your mood
            </Text>
          </View>
        </Animated.View>

        {/* Back to Home Button */}
        {result && (
          <View style={styles.backButtonContainer}>
            <Animated.View
              style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToHome}
              >
                <Ionicons name="arrow-back" size={18} color="#fff" />
                <Text style={styles.backButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* Search Section */}
        <Animated.View
          style={[
            styles.searchSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={["rgba(26, 26, 26, 0.9)", "rgba(42, 42, 42, 0.9)"]}
              style={styles.searchInputContainer}
            >
              <Ionicons
                name="search"
                size={20}
                color="#6C63FF"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for songs..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
              />
            </LinearGradient>
            <LinearGradient
              colors={["#FF6B6B", "#FF8E8E"]}
              style={styles.faceButton}
            >
              <TouchableOpacity onPress={handleFaceDetection}>
                <MaterialIcons name="face" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={["#6C63FF", "#8A84FF"]}
              style={[styles.searchBtn, loading && styles.searchBtnLoading]}
            >
              <TouchableOpacity onPress={handleSearch} disabled={loading}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : (
                  <Text style={styles.searchBtnText}>Search Music</Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Recently Played Section */}
        {!result && recentlyPlayed.length > 0 && (
          <View style={styles.recentlyPlayedSection}>
            <AnimatedSectionHeader
              title="Recently Played"
              icon="🕒"
              delay={200}
              showSeeAll={recentlyPlayed.length > 4}
              onSeeAll={handleSeeAllRecentlyPlayed}
            />
            <FlatList
              data={recentlyPlayed.slice(0, 4)}
              keyExtractor={(item, index) =>
                `recent-${item.id || item.filename || index}-${index}`
              }
              renderItem={renderRecentlyPlayedItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.recentlyPlayedList}
            />
            {recentlyPlayed.length > 4 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={handleSeeAllRecentlyPlayed}
              >
                <Text style={styles.showMoreText}>
                  Show {recentlyPlayed.length - 4} more
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6C63FF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results Section */}
        {result && (
          <Animated.View
            style={[
              styles.resultSection,
              {
                opacity: resultsScaleAnim,
                transform: [{ scale: resultsScaleAnim }],
              },
            ]}
          >
            {result.error ? (
              <View style={styles.noResultsContainer}>
                <LinearGradient
                  colors={[
                    "rgba(108, 99, 255, 0.2)",
                    "rgba(108, 99, 255, 0.1)",
                  ]}
                  style={styles.noResultsIcon}
                >
                  <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.noResultsTitle}>No Results Found</Text>
                <Text style={styles.noResultsText}>{result.error}</Text>
                <LinearGradient
                  colors={["#6C63FF", "#8A84FF"]}
                  style={styles.tryAgainButton}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setResult(null);
                      setSearchText("");
                    }}
                  >
                    <Text style={styles.tryAgainText}>Try Another Song</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : hasValidSearchResults ? (
              <>
                {result.searched_song && (
                  <>
                    <AnimatedSectionHeader
                      title="Your Searched Song"
                      delay={200}
                    />
                    <AnimatedSongCard
                      item={result.searched_song}
                      index={0}
                      musicWaveAnim={musicWaveAnim}
                      isCurrentlyPlaying={isSongPlaying(result.searched_song)}
                      onPlay={handlePlayWithHistory}
                      onCardPress={handleCardPress}
                      isFeatured={true}
                    />
                  </>
                )}
                {result.recommendations &&
                  result.recommendations.length > 0 && (
                    <>
                      <AnimatedSectionHeader
                        title="Recommended For You"
                        delay={400}
                      />
                      <View style={styles.recommendationsContainer}>
                        <FlatList
                          data={result.recommendations}
                          keyExtractor={(item, index) =>
                            item?.filename || index.toString()
                          }
                          renderItem={renderSong}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                        />
                      </View>
                    </>
                  )}
              </>
            ) : (
              <View style={styles.noResultsContainer}>
                <LinearGradient
                  colors={[
                    "rgba(108, 99, 255, 0.2)",
                    "rgba(108, 99, 255, 0.1)",
                  ]}
                  style={styles.noResultsIcon}
                >
                  <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.noResultsTitle}>No Results Found</Text>
                <Text style={styles.noResultsText}>
                  No songs found for your search. Try a different song name.
                </Text>
                <LinearGradient
                  colors={["#6C63FF", "#8A84FF"]}
                  style={styles.tryAgainButton}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setResult(null);
                      setSearchText("");
                    }}
                  >
                    <Text style={styles.tryAgainText}>Try Another Song</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        )}

        {/* Empty State */}
        {!result && recentlyPlayed.length === 0 && !loading && (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View style={styles.emptyStateIcon}>
              <LinearGradient
                colors={["rgba(108, 99, 255, 0.3)", "rgba(108, 99, 255, 0.1)"]}
                style={styles.emptyIconGradient}
              >
                <FontAwesome5 name="search" size={60} color="#FFFFFF" />
              </LinearGradient>
              <Animated.View
                style={[
                  styles.pulseCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
            </View>
            <Text style={styles.emptyStateTitle}>Discover New Music</Text>
            <Text style={styles.emptyStateText}>
              Search for your favorite songs or use face detection to find music
              that matches your mood
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Full Screen Music Player */}
      <FullScreenPlayer
        visible={fullScreenPlayerVisible}
        song={currentSong}
        isPlaying={isSongPlaying(currentSong)}
        onPlayPause={handleFullScreenPlayPause}
        onClose={handleCloseFullScreen}
        onSeek={handleSeek}
        currentPosition={playbackStatus?.positionMillis || 0}
        duration={playbackStatus?.durationMillis || 0}
        onSkipForward={handleSkipForward}
        onSkipBackward={handleSkipBackward}
      />

      {/* Exit Confirmation Modal */}
      <ExitConfirmationModal
        visible={showExitModal}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      {/* Recently Played Modal */}
      <RecentlyPlayedModal
        visible={showRecentlyPlayedModal}
        onClose={() => setShowRecentlyPlayedModal(false)}
        recentlyPlayedList={recentlyPlayed}
        onPlay={handlePlayWithHistory}
        onDelete={handleDeleteFromRecentlyPlayed}
        currentlyPlayingId={currentlyPlayingId}
      />
    </LinearGradient>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 25,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1.5,
    textShadowColor: "rgba(108, 99, 255, 0.4)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  backButtonContainer: {
    alignSelf: "flex-start",
    marginBottom: 15,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 42, 42, 0.9)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  searchSection: {
    marginBottom: 25,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    padding: 0,
    fontWeight: "500",
  },
  faceButton: {
    borderRadius: 18,
    padding: 16,
    marginLeft: 12,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  searchBtn: {
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  searchBtnLoading: {
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginLeft: 10,
    fontWeight: "600",
    fontSize: 16,
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  recentlyPlayedSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
    fontSize: 20,
  },
  sectionHeaderText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.4,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seeAllText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  headerUnderline: {
    width: 60,
    height: 3,
    backgroundColor: "#6C63FF",
    borderRadius: 2,
  },
  recentlyPlayedList: {
    paddingBottom: 8,
  },
  recentlyPlayedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 26, 0.7)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
    justifyContent: "space-between",
  },
  recentAlbumArt: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  playingAlbumArt: {
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  recentItemTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  nowPlayingTitle: {
    color: "#6C63FF",
    fontWeight: "700",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recentItemArtist: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginBottom: 3,
  },
  recentItemTime: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "500",
  },
  recentPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  moreOptionsContainer: {
    position: "relative",
  },
  recentMoreButton: {
    padding: 8,
  },
  deleteOptionButton: {
    position: "absolute",
    top: -40,
    right: 0,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  deleteOptionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 6,
  },
  showMoreText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  resultSection: {
    marginTop: 5,
  },
  featuredCard: {
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(108, 99, 255, 0.5)",
    overflow: "hidden",
    position: "relative",
  },
  glowEffect: {
    position: "absolute",
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: "#6C63FF",
    borderRadius: 30,
    opacity: 0.3,
  },
  songCard: {
    backgroundColor: "rgba(26, 26, 26, 0.7)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  songHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  songInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  songMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  languageTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 99, 255, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  similarityTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  songLang: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  songSim: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  musicWave: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 24,
    marginLeft: 12,
    paddingBottom: 2,
  },
  waveBar: {
    width: 3,
    marginHorizontal: 1.4,
    borderRadius: 2,
  },
  playButton: {
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
    width: "100%", // Full width
    minWidth: "100%", // Ensure minimum width
    alignSelf: "stretch", // Stretch to fill container
  },
  playButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the content
    width: "100%", // Take full width
  },
  playIcon: {
    marginRight: 8, // Add spacing between icon and text
  },
  playText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center", // Center the text
    flex: 1, // Allow text to take available space
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  noResultsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noResultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
    marginBottom: 12,
    textAlign: "center",
  },
  noResultsText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  tryAgainButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tryAgainText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyStateIcon: {
    position: "relative",
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseCircle: {
    position: "absolute",
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    borderRadius: 56,
    borderWidth: 2,
    borderColor: "rgba(108, 99, 255, 0.4)",
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  // Full Screen Player Styles
  fullScreenPlayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  playerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  minimizeButton: {
    padding: 10,
  },
  playerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  albumArtContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  albumArt: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  songInfoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  playerSongTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  playerArtist: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  timeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    width: 50,
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  controlButton: {
    padding: 20,
  },
  playPauseButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 30,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  additionalControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  smallControlButton: {
    padding: 16,
    marginHorizontal: 12,
  },
  // Custom Slider Styles
  sliderContainer: {
    height: 40,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progress: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6C63FF",
    position: "absolute",
    left: 0,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: "50%",
    marginTop: -9,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
    backdropFilter: "blur(10px)",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 16,
  },
  confirmButton: {
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Recently Played Modal Styles
  fullScreenModalContent: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 60,
    overflow: "hidden",
  },
  modalHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(108, 99, 255, 0.2)",
  },
  modalHeaderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  modalListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  playButton: {
    padding: 12,
    marginHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    width: 44,
    height: 44,
  },
  deleteButton: {
    padding: 12,
    marginHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    width: 44,
    height: 44,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    marginTop: 16,
  },
});
