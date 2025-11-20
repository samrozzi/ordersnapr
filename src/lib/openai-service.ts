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
 * Transcribe audio using Lovable AI
 * @param audioBlob - The audio file to transcribe
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<TranscriptionResult> {
  try {
    // Detect the actual mime type and set correct extension
    const extension = audioBlob.type.includes('mp4') ? 'mp4' 
      : audioBlob.type.includes('webm') ? 'webm' 
      : audioBlob.type.includes('wav') ? 'wav'
      : 'mp3';
    
    // Convert blob to File with correct extension
    const audioFile = new File([audioBlob], `recording.${extension}`, {
      type: audioBlob.type,
    });

    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile);

    // Call Lovable Cloud edge function
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
      
      throw new Error(
        error.error || `Transcription failed: ${response.statusText}`
      );
    }

    const result = await response.json();

    return {
      text: result.text,
    };
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to transcribe audio');
  }
}

// Legacy functions kept for backwards compatibility but deprecated
// Lovable AI doesn't require API keys from users
