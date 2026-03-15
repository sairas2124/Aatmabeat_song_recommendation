import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import logo from "../../assets/images/aatmabeat.png";
import { useMusic } from "../../context/MusicContext";
import { useSession } from "../../context/SessionContext";
import validationSchema from "../../utils/authSchema";

const { width, height } = Dimensions.get("window");

const Signup = () => {
  const router = useRouter();
  const { stopMusic } = useMusic();
  const { signIn, signInAsGuest, isLoading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(50));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isFormValid, setIsFormValid] = useState(false);

  // Floating music notes animation
  const noteAnim1 = useRef(new Animated.Value(0)).current;
  const noteAnim2 = useRef(new Animated.Value(0)).current;
  const noteAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    stopMusic();

    // Logo pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Floating music notes animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(noteAnim1, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(noteAnim1, {
          toValue: 0,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(noteAnim2, {
          toValue: 1,
          duration: 4000,
          delay: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(noteAnim2, {
          toValue: 0,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(noteAnim3, {
          toValue: 1,
          duration: 3500,
          delay: 500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(noteAnim3, {
          toValue: 0,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleFormChange = (values) => {
    const isValid =
      values.email &&
      values.password &&
      values.email.includes("@") &&
      values.password.length >= 6;
    setIsFormValid(isValid);
  };

  // Show loading screen while session is being checked
  if (sessionLoading) {
    return (
      <LinearGradient
        colors={["#000000", "#0A0A0A", "#1A1A2E"]}
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        {/* Animated background elements */}
        <View style={styles.backgroundContainer}>
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.backgroundCircle,
                {
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: Math.random() * 100 + 50,
                  height: Math.random() * 100 + 50,
                  opacity: Math.random() * 0.1 + 0.05,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingLogo,
              {
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoRing}>
              <View style={styles.logoRingInner}>
                <Ionicons name="musical-notes" size={70} color="#6C63FF" />
              </View>
            </View>
            <View style={styles.logoGlowEffect} />
          </Animated.View>

          <Animated.View style={{ opacity: pulseAnim }}>
            <Text style={styles.loadingTitle}>aatmabeat</Text>
            <Text style={styles.loadingSubtitle}>
              Loading your musical journey...
            </Text>
            <ActivityIndicator
              size="large"
              color="#6C63FF"
              style={{ marginTop: 30 }}
            />
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  const handleSignin = async (values) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://192.168.1.103:3000/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await signIn(data.user);
        // Success animation before navigation
        alert("Login successful!");
      } else {
        alert(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Signin error:", error);
      alert("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#000000", "#0F0F23", "#1A1A3E"]}
      style={{ flex: 1 }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Animated Background Elements */}
      <View style={styles.animatedBackground}>
        {/* Floating Music Notes */}
        <Animated.View
          style={[
            styles.floatingNote,
            styles.note1,
            {
              transform: [
                {
                  translateY: noteAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -100],
                  }),
                },
              ],
              opacity: noteAnim1.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.8, 0.3],
              }),
            },
          ]}
        >
          <Ionicons
            name="musical-note"
            size={24}
            color="rgba(108, 99, 255, 0.3)"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingNote,
            styles.note2,
            {
              transform: [
                {
                  translateY: noteAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -150],
                  }),
                },
              ],
              opacity: noteAnim2.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.8, 0.3],
              }),
            },
          ]}
        >
          <Ionicons
            name="musical-notes"
            size={28}
            color="rgba(108, 99, 255, 0.3)"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.floatingNote,
            styles.note3,
            {
              transform: [
                {
                  translateY: noteAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -120],
                  }),
                },
              ],
              opacity: noteAnim3.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.8, 0.3],
              }),
            },
          ]}
        >
          <FontAwesome name="music" size={22} color="rgba(108, 99, 255, 0.3)" />
        </Animated.View>

        {/* Background Circles */}
        <View style={[styles.backgroundCircle, styles.circle1]} />
        <View style={[styles.backgroundCircle, styles.circle2]} />
        <View style={[styles.backgroundCircle, styles.circle3]} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.logoGlow} />
              <Image source={logo} style={styles.logo} resizeMode="contain" />
              <View style={styles.logoSparkle}>
                <Ionicons name="sparkles" size={20} color="#6C63FF" />
              </View>
            </Animated.View>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your musical journey
            </Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <Formik
              initialValues={{ email: "", password: "" }}
              validationSchema={validationSchema}
              onSubmit={handleSignin}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                setFieldTouched,
              }) => {
                // Update form validation on each change
                useEffect(() => {
                  handleFormChange(values);
                }, [values]);

                return (
                  <View style={styles.form}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputLabelContainer}>
                        <Ionicons
                          name="mail"
                          size={16}
                          color="rgba(255,255,255,0.7)"
                        />
                        <Text style={styles.labelText}>Email Address</Text>
                      </View>
                      <View
                        style={[
                          styles.inputWrapper,
                          touched.email && errors.email
                            ? styles.inputWrapperError
                            : null,
                          values.email && !errors.email
                            ? styles.inputWrapperSuccess
                            : null,
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your email"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onChangeText={(text) => {
                            handleChange("email")(text);
                            if (!touched.email) setFieldTouched("email", true);
                          }}
                          onBlur={() => {
                            handleBlur("email");
                            setFieldTouched("email", true);
                          }}
                          value={values.email}
                        />
                        {values.email && !errors.email && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#4CAF50"
                            style={styles.inputStatusIcon}
                          />
                        )}
                        {touched.email && errors.email && (
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#FF6B6B"
                            style={styles.inputStatusIcon}
                          />
                        )}
                      </View>
                      {touched.email && errors.email && (
                        <View style={styles.errorContainer}>
                          <Ionicons name="warning" size={14} color="#FF6B6B" />
                          <Text style={styles.errorText}>{errors.email}</Text>
                        </View>
                      )}
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <View style={styles.inputLabelContainer}>
                        <Ionicons
                          name="lock-closed"
                          size={16}
                          color="rgba(255,255,255,0.7)"
                        />
                        <Text style={styles.labelText}>Password</Text>
                      </View>
                      <View
                        style={[
                          styles.inputWrapper,
                          touched.password && errors.password
                            ? styles.inputWrapperError
                            : null,
                          values.password && !errors.password
                            ? styles.inputWrapperSuccess
                            : null,
                        ]}
                      >
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your password"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          onChangeText={(text) => {
                            handleChange("password")(text);
                            if (!touched.password)
                              setFieldTouched("password", true);
                          }}
                          onBlur={() => {
                            handleBlur("password");
                            setFieldTouched("password", true);
                          }}
                          value={values.password}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={20}
                            color="rgba(255,255,255,0.6)"
                          />
                        </TouchableOpacity>
                        {touched.password && errors.password && (
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#FF6B6B"
                            style={styles.inputStatusIcon}
                          />
                        )}
                      </View>
                      {touched.password && errors.password && (
                        <View style={styles.errorContainer}>
                          <Ionicons name="warning" size={14} color="#FF6B6B" />
                          <Text style={styles.errorText}>
                            {errors.password}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Sign In Button */}
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={isLoading || !isFormValid}
                      style={[
                        styles.signInButton,
                        isLoading && styles.signInButtonDisabled,
                        !isFormValid && styles.signInButtonInactive,
                      ]}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={
                          isFormValid
                            ? ["#6C63FF", "#8A84FF"]
                            : ["#4A4A4A", "#5A5A5A"]
                        }
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Text style={styles.signInButtonText}>Sign In</Text>
                            <Ionicons
                              name="log-in"
                              size={20}
                              color="#fff"
                              style={{ marginLeft: 8 }}
                            />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                      <View style={styles.divider} />
                      <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                      <View style={styles.divider} />
                    </View>

                    {/* Guest Access */}
                    <TouchableOpacity
                      style={styles.guestButton}
                      onPress={signInAsGuest}
                      activeOpacity={0.8}
                    >
                      <View style={styles.guestButtonContent}>
                        <MaterialIcons
                          name="person-outline"
                          size={24}
                          color="#fff"
                        />
                        <Text style={styles.guestButtonText}>
                          Continue as Guest
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="rgba(255,255,255,0.6)"
                      />
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <View style={styles.signUpContainer}>
                      <Text style={styles.signUpText}>
                        Don't have an account?{" "}
                      </Text>
                      <TouchableOpacity
                        style={styles.signUpLinkContainer}
                        onPress={() => router.push("/signup")}
                      >
                        <Text style={styles.signUpLink}>Sign Up</Text>
                        <Ionicons
                          name="arrow-forward-circle"
                          size={18}
                          color="#6C63FF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            </Formik>
          </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = {
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  animatedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  floatingNote: {
    position: "absolute",
  },
  note1: {
    top: height * 0.2,
    left: width * 0.1,
  },
  note2: {
    top: height * 0.6,
    right: width * 0.1,
  },
  note3: {
    top: height * 0.4,
    left: width * 0.7,
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 500,
    backgroundColor: "rgba(108, 99, 255, 0.05)",
  },
  circle1: {
    top: -200,
    right: -100,
    width: 400,
    height: 400,
  },
  circle2: {
    bottom: -150,
    left: -100,
    width: 300,
    height: 300,
    backgroundColor: "rgba(108, 99, 255, 0.03)",
  },
  circle3: {
    top: "40%",
    left: "20%",
    width: 200,
    height: 200,
    backgroundColor: "rgba(108, 99, 255, 0.02)",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingLogo: {
    marginBottom: 30,
    position: "relative",
  },
  logoRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(108, 99, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoRingInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoGlowEffect: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 80,
    backgroundColor: "rgba(108, 99, 255, 0.1)",
    zIndex: -1,
  },
  loadingTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 1,
  },
  loadingSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    width: "100%",
  },
  logoContainer: {
    marginBottom: 30,
    position: "relative",
    alignItems: "center",
  },
  logoGlow: {
    display: "none",
  },
  logoSparkle: {
    position: "absolute",
    top: -10,
    right: 40,
  },
  logo: {
    width: 280,
    height: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 15,
  },
  visualizerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
    justifyContent: "center",
    gap: 4,
    marginTop: 20,
  },
  visualizerBar: {
    width: 4,
    borderRadius: 2,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    marginBottom: 24,
    width: "100%",
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  labelText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(108, 99, 255, 0.2)",
    borderRadius: 14,
    overflow: "hidden",
  },
  inputWrapperError: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },
  inputWrapperSuccess: {
    borderColor: "#4CAF50",
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: "#9D9D9D",
    fontSize: 16,
    width: "100%",
    paddingRight: 50,
  },
  inputStatusIcon: {
    position: "absolute",
    right: 16,
    top: 18,
  },
  eyeIcon: {
    position: "absolute",
    right: 45,
    top: 18,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
  },
  forgotContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 30,
    gap: 4,
  },
  forgotText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    width: "100%",
    marginBottom: 24,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonInactive: {
    opacity: 0.5,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    width: "100%",
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    fontWeight: "500",
    marginHorizontal: 15,
    letterSpacing: 1,
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: "100%",
    marginBottom: 24,
  },
  guestButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 30,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  signUpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  signUpText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  signUpLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signUpLink: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "700",
  },
};

export default Signup;
