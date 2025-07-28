# Vocalytics Insight - Call Transcription & Analysis Platform

A comprehensive AI-powered call analysis platform that provides real-time transcription, speaker diarization, anomaly detection, and quality scoring for audio calls.

## 🎯 Project Overview

Vocalytics Insight is a modern web application designed to help businesses and individuals analyze their call recordings with advanced AI capabilities. The platform offers:

- **Real-time Audio Transcription**: Convert audio files to text using OpenAI's Whisper API
- **Speaker Diarization**: Automatically identify and separate different speakers in conversations
- **Anomaly Detection**: Identify unusual patterns, emotions, and behaviors during calls
- **Quality Scoring**: AI-powered assessment of call quality and effectiveness
- **Comprehensive Analysis**: Detailed insights and actionable suggestions for improvement
- **Call History**: Track and manage all your transcribed calls in one place

## ✨ Key Features

- 🎤 **Audio Upload**: Drag-and-drop or click-to-upload audio files
- 🔍 **Multi-language Support**: Supports English, Hindi, Tamil, and mixed language conversations
- 📊 **Interactive Dashboard**: Real-time transcription progress and analysis results
- 🎨 **Dark/Light Theme**: Toggle between themes for comfortable viewing
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🔄 **Real-time Updates**: Live progress tracking and status updates
- 📈 **Analytics Dashboard**: Visual representation of call metrics and insights

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **TanStack Query** - Data fetching and state management

### UI/UX
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons
- **Framer Motion** - Smooth animations and transitions

### Backend & Database
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - Edge Functions for serverless API
  - Real-time subscriptions
  - Authentication and authorization

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd vocalytics-insight-88
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Supabase Setup**
   - Create a new Supabase project
   - Run the database migrations in `supabase/migrations/`
   - Deploy the Edge Function in `supabase/functions/transcribe-audio/`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
vocalytics-insight-88/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── AudioUploader.tsx
│   │   ├── CallHistory.tsx
│   │   ├── CallTranscriptionDashboard.tsx
│   │   └── ...
│   ├── pages/              # Page components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── integrations/       # External service integrations
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🌐 Deployment

### Using Lovable
1. Open your [Lovable Project](https://lovable.dev/projects/5c288b80-b374-49b7-8e4d-101fe130d376)
2. Click on Share → Publish

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your preferred hosting platform
3. Configure environment variables on your hosting platform

## 🔗 Custom Domain Setup

To connect a custom domain:
1. Navigate to Project > Settings > Domains
2. Click "Connect Domain"
3. Follow the DNS configuration instructions

For detailed instructions, see: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the [Lovable documentation](https://docs.lovable.dev)

---

**Built with ❤️ using modern web technologies**
