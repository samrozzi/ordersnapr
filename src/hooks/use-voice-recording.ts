import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export interface UseVoiceRecordingOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

const MAX_RECORDING_DURATION = 5 * 60 * 1000; // 5 minutes

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  // Auto-stop recording after max duration
  useEffect(() => {
    if (recordingState === 'recording' && startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = MAX_RECORDING_DURATION - elapsed;
      
      if (remaining > 0) {
        maxDurationTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Max recording duration (5 minutes) reached, stopping automatically');
          
          // Stop recording directly without calling the function to avoid recursion
          if (mediaRecorderRef.current && !isStoppingRef.current) {
            isStoppingRef.current = true;
            setRecordingState('processing');
            
            if (mediaRecorderRef.current.state === 'paused') {
              mediaRecorderRef.current.resume();
            }
            
            mediaRecorderRef.current.stop();
            
            if (durationIntervalRef.current) {
              clearInterval(durationIntervalRef.current);
              durationIntervalRef.current = null;
            }
            
            // Reset flag after a delay
            setTimeout(() => {
              isStoppingRef.current = false;
            }, 1000);
          }
        }, remaining);
      }
      
      return () => {
        if (maxDurationTimeoutRef.current) {
          clearTimeout(maxDurationTimeoutRef.current);
          maxDurationTimeoutRef.current = null;
        }
      };
    }
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Create audio context and analyser for real-time visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Create MediaRecorder - prioritize mp4 for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (options.onRecordingComplete) {
          options.onRecordingComplete(audioBlob);
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;

        setRecordingState('idle');
      };

      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      startTimeRef.current = Date.now();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      if (options.onError) {
        options.onError(err);
      }
      setRecordingState('idle');
    }
  }, [options]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [recordingState]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      // Restart duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, [recordingState]);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) {
      console.log('Stop already in progress, ignoring duplicate call');
      return;
    }
    
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      isStoppingRef.current = true;
      setRecordingState('processing');
      
      // Resume if paused before stopping (otherwise onstop won't fire with data)
      if (recordingState === 'paused') {
        mediaRecorderRef.current.resume();
      }
      
      mediaRecorderRef.current.stop();

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // Reset flag after a delay
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    }
  }, [recordingState]);

  const cancelRecording = useCallback(() => {
    // Stop media recorder without triggering onstop
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      if (recordingState === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Reset state
    chunksRef.current = [];
    setDuration(0);
    setAudioUrl(null);
    setRecordingState('idle');
  }, [recordingState]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setDuration(0);
    setRecordingState('idle');
  }, [audioUrl]);

  // Format duration as MM:SS
  const formattedDuration = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;

  return {
    recordingState,
    duration,
    formattedDuration,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    resetRecording,
    analyser: analyserRef.current,
  };
}
