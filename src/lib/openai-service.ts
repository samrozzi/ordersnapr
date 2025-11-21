/**
 * OpenAI Whisper transcription service - Direct API integration
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
 * Transcribe audio using OpenAI Whisper API with retry logic
 */
async function transcribeWithOpenAI(
  audioBlob: Blob, 
  apiKey: string,
  retryCount = 0
): Promise<TranscriptionResult> {
  const MAX_RETRIES = 2;
  
  console.log(`[OpenAI] Transcription attempt ${retryCount + 1}/${MAX_RETRIES + 1}, blob:`, {
    size: audioBlob.size,
    type: audioBlob.type,
    sizeInMB: (audioBlob.size / 1024 / 1024).toFixed(2)
  });
  
  if (!apiKey || !apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
  
  const extension = audioBlob.type.includes('mp4') ? 'mp4' 
    : audioBlob.type.includes('webm') ? 'webm' 
    : audioBlob.type.includes('wav') ? 'wav'
    : 'mp3';
  
  const audioFile = new File([audioBlob], `recording.${extension}`, {
    type: audioBlob.type,
  });

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('[OpenAI] Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[OpenAI] API Error:', response.status, errorBody);
      
      // Retry on server errors or rate limits
      if ((response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES) {
        console.log(`[OpenAI] Retrying after ${response.status} error...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return transcribeWithOpenAI(audioBlob, apiKey, retryCount + 1);
      }
      
      const error = JSON.parse(errorBody || '{}');
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[OpenAI] Transcription successful:', result.text?.substring(0, 100) + '...');
    return { text: result.text };
    
  } catch (error) {
    // Retry on network failures
    if (retryCount < MAX_RETRIES && error instanceof TypeError) {
      console.log('[OpenAI] Network error, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return transcribeWithOpenAI(audioBlob, apiKey, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Main transcription function - Uses OpenAI Whisper API directly
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  try {
    console.log('[Transcription] Starting OpenAI Whisper transcription, blob:', {
      size: audioBlob.size,
      type: audioBlob.type,
      sizeInMB: (audioBlob.size / 1024 / 1024).toFixed(2)
    });
    
    // Validate audio blob
    if (audioBlob.size === 0) {
      throw new Error('Audio recording is empty');
    }
    
    if (audioBlob.size > 25 * 1024 * 1024) { // 25MB OpenAI limit
      throw new Error('Audio file too large (max 25MB)');
    }
    
    // Get user's OpenAI API key
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: prefs, error } = await supabase
      .from('user_preferences')
      .select('openai_api_key_encrypted')
      .eq('user_id', user.id)
      .single();

    console.log('[Transcription] Retrieved API key:', {
      hasKey: !!prefs?.openai_api_key_encrypted,
      keyValid: prefs?.openai_api_key_encrypted?.startsWith('sk-'),
      error: error?.message
    });

    if (!prefs?.openai_api_key_encrypted) {
      throw new Error('OpenAI API key not found. Please configure in Settings > Profile > AI Assistant.');
    }

    if (!prefs.openai_api_key_encrypted.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Please reconfigure in Settings.');
    }

    // Call OpenAI Whisper directly
    return await transcribeWithOpenAI(audioBlob, prefs.openai_api_key_encrypted);
    
  } catch (error) {
    console.error('[Transcription] Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to transcribe audio');
  }
}
