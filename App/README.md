# Weight Lifting Calculator

A React-based web application for calculating and tracking weight lifting exercises and workouts.

## Features

- Exercise tracking and management
- Workout planning and scheduling
- Muscle group targeting
- Progress monitoring
- Responsive design

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Weight-Lifting-Calculator.git
cd Weight-Lifting-Calculator/App
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to GitHub Pages

## Deployment to GitHub Pages

### Prerequisites

1. Your repository must be public (or you need GitHub Pro for private repos)
2. You must have push access to the repository

### Deployment Steps

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to GitHub Pages:**
```bash
npm run deploy
```

3. **Configure GitHub Pages:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Source", select "Deploy from a branch"
   - Select the `gh-pages` branch
   - Click "Save"

4. **Wait for deployment:**
   - GitHub will build and deploy your site
   - Your app will be available at: `https://yourusername.github.io/Weight-Lifting-Calculator/`

### Important Notes

- The app is configured to work from the `/Weight-Lifting-Calculator/` subdirectory
- Client-side routing is supported through the included 404.html and routing scripts
- Make sure to update the `base` URL in `vite.config.ts` if you change the repository name

### Troubleshooting

- If you get a 404 error, make sure the `gh-pages` branch exists and contains your built files
- Check that the base URL in `vite.config.ts` matches your repository name exactly
- Ensure all assets are using relative paths or the correct base URL

## Technology Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Icons:** Tabler Icons, Lucide React
- **Charts:** Recharts
- **Drag & Drop:** @dnd-kit

## Project Structure

```
src/
├── app/           # App-specific components and pages
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
└── assets/        # Static assets (images, SVGs)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
