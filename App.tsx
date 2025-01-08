import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useScanBarcodes, useFrameProcessor, Frame } from 'react-native-vision-camera';
import { Face, scanFaces } from 'vision-camera-face-detector';
import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

const App: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.front;

  // Initialize sound with remote URL
  const alertSound = useRef(
    new Sound(
      'https://github.com/Maxey1950/wakeupmom/raw/refs/heads/main/alert.mp3',
      '',  // Empty string for remote URL
      (error) => {
        if (error) {
          console.error('Failed to load sound:', error);
        } else {
          console.log('Sound loaded successfully');
          setSoundLoaded(true);
        }
      }
    )
  ).current;

  // Cleanup sound on component unmount
  useEffect(() => {
    return () => {
      if (alertSound) {
        alertSound.release();
      }
    };
  }, []);

  // Request camera permissions on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasCameraPermission(permission === 'authorized');
  };

  // Frame processor for face detection
  const frameProcessor = useFrameProcessor((frame: Frame) => {
    'worklet';
    if (!isTracking) return;

    const faces = scanFaces(frame);
    if (faces && faces.length > 0) {
      const face = faces[0];
      // Check if eyes are closed using leftEyeOpenProbability and rightEyeOpenProbability
      if (face.leftEyeOpenProbability < 0.2 && face.rightEyeOpenProbability < 0.2) {
        runOnJS(playAlertSound)();
      }
    }
  }, [isTracking]);

  const startTracking = async () => {
    if (!hasCameraPermission) {
      await requestCameraPermission();
      if (!hasCameraPermission) {
        Alert.alert('Camera permission is required');
        return;
      }
    }
    
    if (!soundLoaded) {
      Alert.alert('Warning', 'Sound is still loading. Alert sound might not work immediately.');
    }
    
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (alertSound) {
      alertSound.stop();
    }
  };

  const playAlertSound = () => {
    if (alertSound && soundLoaded) {
      alertSound.stop(() => {
        alertSound.play((success) => {
          if (!success) {
            console.error('Failed to play sound');
          }
        });
      });
    }
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>No front camera available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Alertness Monitor</Text>
      <Camera
        style={styles.camera}
        ref={cameraRef}
        device={device}
        isActive={isTracking}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      />
      <View style={styles.buttons}>
        <Button 
          title={isTracking ? "Stop Monitoring" : "Start Monitoring"} 
          onPress={isTracking ? stopTracking : startTracking}
        />
      </View>
      {!soundLoaded && (
        <Text style={styles.warning}>Loading alert sound...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
    marginVertical: 20,
  },
  buttons: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  warning: {
    color: 'orange',
    textAlign: 'center',
    padding: 10,
  },
});

export default App;