/**
 * OpenAI API service for voice transcription using Whisper
 */

import { supabase } from '@/integrations/supabase/client';

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
    // Detect the actual mime type and set correct extension
    const extension = audioBlob.type.includes('mp4') ? 'mp4' 
      : audioBlob.type.includes('webm') ? 'webm' 
      : audioBlob.type.includes('wav') ? 'wav'
      : 'mp3';
    
    // Convert blob to File (required by OpenAI API) with correct extension
    const audioFile = new File([audioBlob], `recording.${extension}`, {
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
 * Get OpenAI API key from database or environment or localStorage
 * Priority: 1. Database, 2. Environment variable, 3. localStorage (legacy)
 */
export async function getOpenAIApiKey(): Promise<string | null> {
  // First try to get from database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.openai_api_key) {
        return data.openai_api_key;
      }
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }

  // Fallback to environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Last fallback to localStorage (legacy support)
  const localKey = localStorage.getItem('openai_api_key');
  return localKey;
}

/**
 * Synchronous version for backwards compatibility
 * Only checks localStorage and environment
 */
export function getOpenAIApiKeySync(): string | null {
  // Check environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Fallback to localStorage
  const localKey = localStorage.getItem('openai_api_key');
  return localKey;
}

/**
 * Save OpenAI API key to database (preferred) and localStorage (fallback)
 */
export async function saveOpenAIApiKey(apiKey: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Save to database
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        openai_api_key: apiKey || null,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      // Check if it's a column doesn't exist error (migration not applied yet)
      if (error.message?.includes('column') || error.code === '42703') {
        console.warn('⚠️ Database column not ready yet. Migration pending. Using localStorage for now.');
        console.warn('Error details:', error);
      } else {
        console.error('❌ Error saving API key to database:', error);
      }

      // Fall back to localStorage if database save fails
      if (apiKey) {
        localStorage.setItem('openai_api_key', apiKey);
      } else {
        localStorage.removeItem('openai_api_key');
      }
      return false;
    }

    console.log('✅ API key saved to database successfully');

    // Also save to localStorage for offline access
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }

    return true;
  } catch (error) {
    console.error('❌ Error saving API key:', error);
    // Fall back to localStorage
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
    return false;
  }
}

/**
 * Check if OpenAI API key is configured (synchronous check)
 */
export function hasOpenAIApiKey(): boolean {
  return !!getOpenAIApiKeySync();
}

/**
 * Check if OpenAI API key is configured (async check including database)
 */
export async function hasOpenAIApiKeyAsync(): Promise<boolean> {
  const key = await getOpenAIApiKey();
  return !!key;
}
