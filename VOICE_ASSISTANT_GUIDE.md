# Voice Assistant Feature - User Guide

## What's New? 🎤

Your OrderSnapr app now has a **Voice Assistant** feature! You can click a button, talk into your microphone, and it will automatically create a note with your transcribed speech.

## What Was Built

### 1. **Floating AI Button**
- Purple/pink gradient button in the bottom-right corner (to the left of the Quick Add button)
- Click it to open the voice assistant modal

### 2. **Voice Recording**
- Click "Start Recording" to begin speaking
- Real-time duration counter shows how long you've been recording
- Click "Stop Recording" when finished

### 3. **AI Transcription**
- Uses OpenAI's Whisper API to convert speech to text
- Supports high-quality transcription with noise suppression
- Works in English (configurable for other languages)

### 4. **Automatic Note Creation**
- After transcription, click "Create Note"
- Automatically creates a new note titled "Voice Note" with your transcribed text
- Takes you directly to the note for editing

## How to Set Up

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)

### Step 2: Add API Key to Your App

**Option A: Environment Variable (Recommended for Development)**

Add this line to your `.env` file:
```bash
VITE_OPENAI_API_KEY="sk-your-api-key-here"
```

**Option B: Browser Storage (User Settings)**

The app will check localStorage for the key `openai_api_key`. You can add this through browser console:
```javascript
localStorage.setItem('openai_api_key', 'sk-your-api-key-here');
```

Or you can extend the Settings page to include an API key input field.

### Step 3: Restart Your App

```bash
npm run dev
```

## How to Use

1. **Open the App** - Navigate to any page
2. **Click the Purple AI Button** - Bottom-right corner
3. **Click "Start Recording"** - Allow microphone access when prompted
4. **Speak Your Note** - Talk naturally (try to speak clearly)
5. **Click "Stop Recording"** - When you're done
6. **Wait for Transcription** - Takes a few seconds
7. **Review & Create Note** - Check the transcription and click "Create Note"
8. **Edit Your Note** - You'll be taken to the note editor

## Cost Estimation

OpenAI Whisper API pricing:
- **$0.006 per minute** of audio
- Example: 5-minute recording = ~$0.03
- Very affordable for personal use!

## Features & Details

### What Was Created

**New Files:**
- `src/hooks/use-voice-recording.ts` - Voice recording hook with Web Audio API
- `src/lib/openai-service.ts` - OpenAI Whisper API integration
- `src/components/VoiceAssistantButton.tsx` - Floating AI button component
- `src/components/VoiceAssistantModal.tsx` - Voice recording & transcription UI

**Modified Files:**
- `src/components/AppLayout.tsx` - Added VoiceAssistantButton
- `.env` - Added OpenAI API key configuration

### Technical Features

✅ **Web Audio API** - High-quality microphone recording
✅ **Noise Suppression** - Echo cancellation and noise reduction
✅ **Real-time Duration** - Shows recording time (MM:SS format)
✅ **Visual Feedback** - Animated recording indicator
✅ **Error Handling** - Graceful error messages
✅ **API Key Management** - Supports both env vars and localStorage
✅ **Free Tier Compatible** - Respects note creation limits
✅ **Mobile Friendly** - Works on desktop and mobile browsers

### Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires HTTPS (or localhost) for microphone access

## Troubleshooting

### "OpenAI API key is not configured"
- Make sure you've added `VITE_OPENAI_API_KEY` to your `.env` file
- Restart the dev server after adding the key

### "Permission denied" when recording
- Click "Allow" when browser asks for microphone permission
- Check browser settings to ensure microphone access is enabled

### Transcription fails
- Check your OpenAI API key is valid
- Ensure you have credits in your OpenAI account
- Check browser console for error messages

### No audio recorded
- Make sure microphone is working (test in other apps)
- Try a different browser
- Check that you're on HTTPS or localhost

## Future Enhancements (Not Yet Built)

Here are ideas for expanding this feature:

### Phase 2 - Enhanced Voice Notes
- ⏸️ Pause/resume recording
- 🔊 Audio playback before transcription
- 💾 Save audio files with notes
- 🎨 Custom note templates for voice notes

### Phase 3 - Smart Form Filling
- 📝 Auto-detect form fields from speech
- 🤖 AI extracts structured data (names, dates, amounts)
- ✍️ Fill work orders, invoices via voice
- ✅ Confirmation UI before submitting

### Phase 4 - Advanced AI Features
- 💬 Conversational mode (back-and-forth chat)
- 🎯 Smart commands ("Create invoice for John Doe")
- 📊 Context awareness (knows what page you're on)
- 🔍 Voice search through existing data

## Cost Breakdown for Full Build

**Phase 1 MVP (Already Built):** ~2-3 weeks
**Phase 2:** +1-2 weeks
**Phase 3:** +3-4 weeks
**Phase 4:** +2-3 weeks

**Total for all phases:** 8-12 weeks

## Questions?

The feature is ready to test! Just add your OpenAI API key and try it out.

For issues or questions, check:
- Browser console for error messages
- OpenAI API dashboard for usage/errors
- Network tab to see API requests
