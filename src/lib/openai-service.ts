/**
 * AI transcription service supporting both Lovable AI and OpenAI Whisper
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
 * Get the user's configured AI provider
 */
async function getAIProvider(): Promise<{ provider: 'lovable' | 'openai'; apiKey?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  console.log('[Transcription] Getting AI provider for user:', user?.id);
  
  if (!user) {
    console.log('[Transcription] No user found, defaulting to Lovable');
    return { provider: 'lovable' };
  }

  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('ai_provider, openai_api_key_encrypted')
    .eq('user_id', user.id)
    .single();

  console.log('[Transcription] User preferences:', {
    provider: prefs?.ai_provider,
    hasApiKey: !!prefs?.openai_api_key_encrypted,
    apiKeyFormat: prefs?.openai_api_key_encrypted?.startsWith('sk-') ? 'valid' : 'invalid',
    error: error?.message
  });

  if (!prefs || !prefs.ai_provider) {
    console.log('[Transcription] No provider configured, defaulting to Lovable');
    return { provider: 'lovable' };
  }

  if (prefs.ai_provider === 'openai' && !prefs.openai_api_key_encrypted) {
    console.error('[Transcription] OpenAI selected but no API key found!');
    throw new Error('OpenAI API key not found. Please reconfigure your AI provider.');
  }

  if (prefs.ai_provider === 'openai' && !prefs.openai_api_key_encrypted?.startsWith('sk-')) {
    console.error('[Transcription] Invalid OpenAI API key format');
    throw new Error('Invalid OpenAI API key format. Please reconfigure your provider.');
  }

  console.log('[Transcription] Using provider:', prefs.ai_provider);
  return {
    provider: prefs.ai_provider as 'lovable' | 'openai',
    apiKey: prefs.openai_api_key_encrypted || undefined,
  };
}

/**
 * Transcribe audio using OpenAI Whisper API directly
 */
async function transcribeWithOpenAI(audioBlob: Blob, apiKey: string): Promise<TranscriptionResult> {
  console.log('[OpenAI] Starting transcription, blob size:', audioBlob.size, 'type:', audioBlob.type);
  
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

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  console.log('[OpenAI] API Response status:', response.status);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[OpenAI] API Error:', response.status, errorBody);
    const error = JSON.parse(errorBody || '{}');
    throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('[OpenAI] Transcription successful:', result.text?.substring(0, 50) + '...');
  return { text: result.text };
}

/**
 * Transcribe audio using Lovable AI
 */
async function transcribeWithLovableAI(audioBlob: Blob): Promise<TranscriptionResult> {
  const extension = audioBlob.type.includes('mp4') ? 'mp4' 
    : audioBlob.type.includes('webm') ? 'webm' 
    : audioBlob.type.includes('wav') ? 'wav'
    : 'mp3';
  
  const audioFile = new File([audioBlob], `recording.${extension}`, {
    type: audioBlob.type,
  });

  const formData = new FormData();
  formData.append('file', audioFile);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits in Settings > Workspace.');
    }
    
    throw new Error(error.error || `Transcription failed: ${response.statusText}`);
  }

  const result = await response.json();
  return { text: result.text };
}

/**
 * Main transcription function - routes to appropriate provider
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  try {
    console.log('[Transcription] Starting, blob:', {
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
    
    const { provider, apiKey } = await getAIProvider();

    if (provider === 'openai') {
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please update your settings.');
      }
      return await transcribeWithOpenAI(audioBlob, apiKey);
    }

    return await transcribeWithLovableAI(audioBlob);
  } catch (error) {
    console.error('Transcription error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to transcribe audio');
  }
}
