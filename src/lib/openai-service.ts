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
 * Get user's AI provider preference
 */
async function getAIProvider(): Promise<{ provider: 'lovable' | 'openai'; apiKey?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('ai_provider, ai_provider_configured, openai_api_key_encrypted')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log('[AI Provider] User preferences:', {
    provider: prefs?.ai_provider,
    configured: prefs?.ai_provider_configured,
    hasOpenAIKey: !!prefs?.openai_api_key_encrypted
  });

  // If user explicitly chose OpenAI and has a key
  if (prefs?.ai_provider === 'openai' && prefs?.openai_api_key_encrypted) {
    return { provider: 'openai', apiKey: prefs.openai_api_key_encrypted };
  }

  // Default to Lovable AI
  return { provider: 'lovable' };
}

/**
 * Transcribe audio using Lovable AI
 */
async function transcribeWithLovableAI(audioBlob: Blob): Promise<TranscriptionResult> {
  console.log('[Lovable AI] Starting transcription, blob:', {
    size: audioBlob.size,
    type: audioBlob.type,
    sizeInMB: (audioBlob.size / 1024 / 1024).toFixed(2)
  });
  
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await supabase.functions.invoke('transcribe-audio', {
    body: formData,
  });

  if (response.error) {
    console.error('[Lovable AI] Error:', response.error);
    throw new Error(response.error.message || 'Transcription failed');
  }

  console.log('[Lovable AI] Success:', response.data);
  return { text: response.data.text };
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
 * Main transcription function - Routes to appropriate AI provider
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  try {
    console.log('[Transcription] Starting transcription, blob:', {
      size: audioBlob.size,
      type: audioBlob.type,
      sizeInMB: (audioBlob.size / 1024 / 1024).toFixed(2)
    });
    
    // Validate audio blob
    if (audioBlob.size === 0) {
      throw new Error('Audio recording is empty');
    }
    
    // Get user's AI provider preference
    const { provider, apiKey } = await getAIProvider();
    console.log('[Transcription] Using provider:', provider);

    // Route to appropriate provider
    if (provider === 'openai' && apiKey) {
      if (audioBlob.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large for OpenAI (max 25MB)');
      }
      return await transcribeWithOpenAI(audioBlob, apiKey);
    } else {
      // Use Lovable AI as default/fallback
      return await transcribeWithLovableAI(audioBlob);
    }
    
  } catch (error) {
    console.error('[Transcription] Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to transcribe audio');
  }
}
