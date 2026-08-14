# Isida AI - Voice Assistant

AI-powered voice assistant with conversation memory, speech recognition, and vision capabilities using Google's Gemini 2.0.

## 🎯 Features

- **Voice Input/Output** - Real-time speech recognition and text-to-speech
- **Conversation Memory** - Persistent chat history saved locally
- **Vision AI** - Upload images for multimodal AI analysis
- **Mobile Optimized** - Full iOS/Android support with audio initialization
- **Dark Theme** - Cyberpunk-inspired UI with smooth animations
- **Fast Response** - Powered by Gemini 2.0 Flash for instant replies

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Google AI API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
npm install
```

### Configuration

Create `.env.local`:

```env
GOOGLE_AI_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **AI Model:** Google Gemini 2.0 Flash
- **UI:** Tailwind CSS, Framer Motion
- **Icons:** Lucide React
- **Language:** TypeScript

## 📁 Project Structure

```
isida-ai/
├── app/
│   ├── api/           # API routes
│   ├── utils/         # Helper functions and services
│   ├── types/         # TypeScript interfaces
│   ├── __tests__/     # Unit tests
│   ├── page.tsx       # Main chat interface
│   └── layout.tsx     # Root layout
├── public/            # Static assets
└── package.json       # Dependencies
```

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT License - Ulagat (@ulacoder)

---

Built with Next.js and Google Gemini AI
