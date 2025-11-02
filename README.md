# 🎵 INNATO Flute - Stonewhistle Explorations

Interactive web application for exploring and composing music with the INNATO flute.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Deploy naar Online
```bash
npm run deploy
```

## 📚 Documentatie

- **Eerste Setup:** `QUICK_START_SUPABASE.md`
- **Deployment:** `SIMPLE_DEPLOY.md`
- **Updates:** `QUICK_UPDATE_GUIDE.md`
- **Database Migraties:** `SUPABASE_MIGRATIONS.md`
- **Development Workflow:** `DEVELOPMENT_WORKFLOW.md`

## 🛠️ Tech Stack

- React + TypeScript
- Vite
- Supabase (optioneel, localStorage fallback)
- Web Audio API

## 📦 Project Structuur

```
src/
├── components/     # React components
├── lib/           # Services & utilities
├── styles/        # CSS
└── main.tsx       # Entry point

migrations/        # Database migrations
```

## 🎯 Features

- **Learn:** Basics, Practice, Lessons, Advanced techniques
- **Compose:** Create and save compositions
- **Community:** Share progressions and compositions
- **64 Chord Combinations:** Complete INNATO chord library

## 🔧 Environment Variables

Maak `.env.local` aan voor Supabase (optioneel):

```env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

## 📝 License

Stonewhistle INNATO Explorations
