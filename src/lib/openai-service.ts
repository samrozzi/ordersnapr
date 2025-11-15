/**
 * OpenAI API service for voice transcription using Whisper
 */

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

export interface TranscriptionError {
  message: string;
  code?: string;
}

/**
 * Transcribe audio using OpenAI Whisper API
 * @param audioBlob - The audio file to transcribe
 * @param apiKey - OpenAI API key
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string
): Promise<TranscriptionResult> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  try {
    // Convert blob to File (required by OpenAI API)
    const audioFile = new File([audioBlob], 'recording.webm', {
      type: audioBlob.type,
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Can be made configurable
    formData.append('response_format', 'json');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Transcription failed: ${response.statusText}`
      );
    }

    const result = await response.json();

    return {
      text: result.text,
      duration: result.duration,
    };
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Get OpenAI API key from environment or localStorage
 * Priority: 1. Environment variable, 2. localStorage
 */
export function getOpenAIApiKey(): string | null {
  // First check environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Fallback to localStorage (user can set it in settings)
  const localKey = localStorage.getItem('openai_api_key');
  return localKey;
}

/**
 * Save OpenAI API key to localStorage
 */
export function saveOpenAIApiKey(apiKey: string): void {
  if (apiKey) {
    localStorage.setItem('openai_api_key', apiKey);
  } else {
    localStorage.removeItem('openai_api_key');
  }
}

/**
 * Check if OpenAI API key is configured
 */
export function hasOpenAIApiKey(): boolean {
  return !!getOpenAIApiKey();
}
