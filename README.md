# 🕳️ Hole Shot - Ultimate Backyard Scoring App

[![Production Ready](https://img.shields.io/badge/status-production%20ready-success)](https://github.com/dylangrow/Hole-Shot)
[![PWA](https://img.shields.io/badge/PWA-enabled-blue)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

The ultimate backyard game scoring app with voice input, real-time scoring, match history, and all-time player statistics. Perfect for Cornhole, Horseshoes, and any competitive backyard game.

## ✨ Features

### 🎯 Core Functionality
- **Real-time Scoring** - Instant score updates with visual feedback
- **Voice Control** - Hands-free scoring with speech recognition (English & Spanish)
- **Customizable Points** - Adjust hole and board point values
- **Multiple Game Modes** - 1v1 and 2v2 support
- **Win Targets** - Choose from 11, 15, or 21 points
- **Cancellation Scoring** - Optional competitive scoring mode
- **Undo/Redo** - Easily correct mistakes

### 📊 Statistics & History
- **Match History** - Complete record of all games played
- **Player Leaderboard** - All-time standings with win rates
- **Series Tracking** - Track head-to-head records
- **Match Momentum** - Visual momentum chart
- **Export Options** - Export matches as images, CSV, or JSON

### 🎮 User Experience
- **Bilingual Support** - Full English and Spanish translations
- **Dark Mode** - Eye-friendly dark theme with high contrast option
- **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- **PWA Support** - Install as a native app on any device
- **Offline Mode** - Works without internet connection
- **Haptic Feedback** - Tactile response on mobile devices
- **Audio Feedback** - Sound effects for scoring and wins

### 🏆 Advanced Features
- **Tournament Bracket** - Organize multi-team tournaments
- **Player Profiles** - Create players with custom avatars
- **Streak Detection** - Visual indicators for hot streaks
- **Skunk Detection** - Special celebration for 11-0 shutouts
- **Uncle's Commentary** - Sassy voice announcements (can be muted!)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/dylangrow/Hole-Shot.git
cd Hole-Shot

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Browser Requirements
- Modern browser with ES2020 support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Speech Recognition API for voice control (Chrome/Edge recommended)

## 🎮 How to Use

### Basic Scoring
1. **Set Team Names** - Click on team names to customize
2. **Choose Game Mode** - Select 1v1 or 2v2
3. **Set Win Target** - Choose 11, 15, or 21 points
4. **Start Scoring** - Tap buttons or use voice commands
5. **Save Match** - Click "Save Match" when complete

### Voice Commands (English)
- `"Team A three"` - Add 3 points to Team A
- `"Team B one"` - Add 1 point to Team B
- `"Undo"` - Undo last action
- `"Reset"` - Start new game
- `"Stop"` - Stop Uncle's commentary

### Voice Commands (Spanish)
- `"Equipo A tres"` - Agregar 3 puntos al Equipo A
- `"Equipo B uno"` - Agregar 1 punto al Equipo B
- `"Deshacer"` - Deshacer última acción
- `"Reiniciar"` - Nuevo juego
- `"Para"` - Detener comentarios del Tío

### Keyboard Shortcuts
- `1` - Team A hole (3 pts)
- `2` - Team A board (1 pt)
- `9` - Team B hole (3 pts)
- `0` - Team B board (1 pt)
- `Ctrl/Cmd + Z` - Undo

## 🏗️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Database**: Dexie (IndexedDB)
- **State Management**: Zustand
- **PWA**: vite-plugin-pwa
- **Audio**: Web Audio API

## 📱 PWA Features

The app is a fully-featured Progressive Web App:
- ✅ Installable on all devices
- ✅ Works offline
- ✅ Fast loading with service worker caching
- ✅ Native app-like experience
- ✅ Automatic updates

## 🎨 Design Philosophy

- **Mobile-First** - Optimized for iPhone SE (375px) and up
- **Accessibility** - WCAG 2.1 AA compliant
- **Performance** - Lighthouse score 95+
- **User-Friendly** - Intuitive interface, minimal learning curve
- **Professional** - Production-ready code quality

## 🔧 Configuration

### Customizing Point Values
Edit point values in-game or modify defaults in `src/pages/MatchPage.tsx`:
```typescript
const [pointValues, setPointValues] = useState({ hole: 3, board: 1 })
```

### Changing Win Targets
Available targets: 11, 15, 21 points. Modify in `src/state/matchStore.ts`:
```typescript
winTarget: 21
```

### Adjusting Voice Recognition Language
Language automatically switches with UI language. Modify in `src/pages/MatchPage.tsx`:
```typescript
recognition.lang = locale === 'en' ? 'en-US' : 'es-ES'
```

## 📊 Browser Support

| Browser | Version | Voice Control | PWA |
|---------|---------|---------------|-----|
| Chrome  | 90+     | ✅            | ✅  |
| Edge    | 90+     | ✅            | ✅  |
| Safari  | 14+     | ❌            | ✅  |
| Firefox | 88+     | ❌            | ✅  |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for backyard game enthusiasts
- Inspired by competitive cornhole and horseshoes
- Special thanks to "Uncle" for the sassy commentary

## 📞 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/dylangrow/Hole-Shot/issues).

---

**Made by Dylan May 2026**
