# Peptide Chat - Hybrid HeyGen AI & SMS-Anchored Chat System

## Project Overview

This is a Next.js application implementing a hybrid chat system that combines:
- **HeyGen AI Video Avatar** for automated AI responses
- **SMS-anchored human chat** via Twilio for direct representative communication
- **Cloud Firestore** for persistent conversation history

## Architecture

### Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Cloud Firestore
- **Backend**: Next.js API Routes (Serverless)
- **External Services**: Twilio (SMS), HeyGen (AI Video Avatar)
- **Animation**: Framer Motion

### Key Features

1. **Dual Chat Modes**
   - `HUMAN`: SMS-bridged chat with sales representatives
   - `AI`: HeyGen-powered AI assistant with video avatar

2. **Fallback System**: If HeyGen API fails, gracefully degrades to text-only AI mode

3. **Mobile-Anchored History**: Conversations persist and are retrievable by user's mobile number

4. **Real-time Updates**: Firestore's `onSnapshot` provides instant message sync

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── init-chat/        # Initialize human chat
│   │   ├── init-ai-chat/     # Initialize AI chat
│   │   ├── send-message/     # Send message (handles both modes)
│   │   └── twilio-inbound/   # Twilio webhook for rep messages
│   ├── chat/
│   │   ├── new/              # New chat entry (standalone/Instagram)
│   │   └── [id]/             # Live chat window
│   ├── embed/
│   │   └── chat/new/         # Embedded chat with mode selection
│   ├── layout.tsx
│   ├── page.tsx              # Home page
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── chat-app.tsx      # Base chat component (from shadcn)
│   │   ├── live-chat.tsx     # Real-time chat with Firestore
│   │   ├── mobile-gateway.tsx # Phone number entry form
│   │   └── mode-selection.tsx # AI vs Human selection
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── firebase.ts           # Client-side Firestore operations
│   ├── firebase-admin.ts     # Server-side Firestore operations
│   ├── twilio.ts             # Twilio SMS functions
│   ├── heygen.ts             # HeyGen API integration
│   ├── rep-mapping.ts        # Rep ID to phone number mapping
│   └── utils.ts              # Utility functions
└── types/
    └── index.ts              # TypeScript type definitions
```

## Firestore Collections

### `conversations` Collection

| Field | Type | Purpose |
|-------|------|---------|
| `repPhoneNumber` | String | Sales Rep's SMS anchor |
| `userMobileNumber` | String | User's persistent history anchor (REQUIRED) |
| `chatMode` | String | 'HUMAN' or 'AI' |
| `fallbackMode` | Boolean | TRUE if AI failed, using text-only mode |
| `userInstagramHandle` | String | Optional Instagram contact |
| `assessmentResults` | Map | Stored assessment data |
| `status` | String | 'active' or 'closed' |
| `createdAt` | Timestamp | Conversation start time |

### `messages` Subcollection

Located at `/conversations/{conversationId}/messages`

| Field | Type | Purpose |
|-------|------|---------|
| `sender` | String | 'USER', 'ADMIN', or 'AI' |
| `content` | String | Message content |
| `timestamp` | Timestamp | Time of message |

## Routes

| Route | Purpose | Flow |
|-------|---------|------|
| `/chat/new?repId=[...]` | Standalone/Instagram Link | Mobile Gateway → Human Chat |
| `/embed/chat/new?repId=[...]` | Website Embed | Mode Selection → Mobile Gateway → Chat |
| `/chat/[id]` | Live Chat Window | Real-time chat based on mode |

## API Endpoints

### POST `/api/init-chat`
Initialize a human chat session.

**Request:**
```json
{
  "repId": "string",
  "userMobileNumber": "string (E.164 format)",
  "userInstagramHandle": "string (optional)"
}
```

**Response:**
```json
{
  "conversationId": "string",
  "isExisting": "boolean"
}
```

### POST `/api/init-ai-chat`
Initialize an AI chat session.

**Request:**
```json
{
  "repId": "string",
  "userMobileNumber": "string (E.164 format)"
}
```

### POST `/api/send-message`
Send a message in an existing conversation.

**Request:**
```json
{
  "conversationId": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "success": "boolean",
  "messageId": "string",
  "aiResponse": "string (AI mode only)",
  "fallbackMode": "boolean (AI mode only)"
}
```

### POST `/api/twilio-inbound`
Webhook for incoming SMS from representatives.

**Content-Type:** `application/x-www-form-urlencoded`

## Environment Variables

```env
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase (Server)
FIREBASE_SERVICE_ACCOUNT_KEY=  # JSON string

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# HeyGen
HEYGEN_API_KEY=
HEYGEN_AVATAR_ID=
HEYGEN_VOICE_ID=

# Rep Configuration
DEFAULT_REP_PHONE_NUMBER=
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Fill in all required values
   ```

3. **Set up Firebase:**
   - Create a Firebase project
   - Enable Firestore
   - Create required indexes (see Firestore rules section)
   - Download service account key for server-side operations

4. **Set up Twilio:**
   - Create a Twilio account
   - Purchase a phone number
   - Configure webhook URL: `https://your-domain.com/api/twilio-inbound`

5. **Set up HeyGen (optional):**
   - Get API key from HeyGen dashboard
   - Configure avatar and voice IDs

6. **Run development server:**
   ```bash
   npm run dev
   ```

## Firestore Indexes Required

Create composite indexes for these queries:

1. `conversations`: `userMobileNumber` ASC, `repPhoneNumber` ASC, `status` ASC, `createdAt` DESC
2. `conversations`: `repPhoneNumber` ASC, `userMobileNumber` ASC, `chatMode` ASC, `status` ASC, `createdAt` DESC

## Deployment

This project is optimized for Vercel deployment:

```bash
vercel --prod
```

Ensure all environment variables are configured in the Vercel dashboard.

## Message Flow

### Human Chat Mode
1. User enters mobile number → `/api/init-chat` creates conversation
2. Rep notified via SMS
3. User sends message → `/api/send-message` forwards via Twilio
4. Rep replies via SMS → `/api/twilio-inbound` saves to Firestore
5. Frontend receives update via Firestore `onSnapshot`

### AI Chat Mode
1. User enters mobile number → `/api/init-ai-chat` creates conversation
2. User sends message → `/api/send-message` calls HeyGen API
3. On HeyGen success: AI response saved to Firestore
4. On HeyGen failure: `fallbackMode` enabled, text-only responses
5. Frontend receives update via Firestore `onSnapshot`

## Customization

### Adding New Reps
Edit `src/lib/rep-mapping.ts`:
```typescript
const repMapping: RepMapping = {
  "rep1": "+1234567890",
  "rep2": "+0987654321",
  default: process.env.DEFAULT_REP_PHONE_NUMBER || "+10000000000",
};
```

### Modifying AI Responses
Edit `src/lib/heygen.ts` to customize:
- `generateFallbackTextResponse()` for text-only mode responses
- `generateAIResponse()` for HeyGen API integration

### Styling
The project uses Tailwind CSS with shadcn/ui components. Customize:
- `src/app/globals.css` for global styles and CSS variables
- `tailwind.config.ts` for theme configuration
