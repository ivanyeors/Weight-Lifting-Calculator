# Deployment Guide - GitHub Pages

This guide explains how to deploy your Weight Lifting Calculator app to GitHub Pages.

## Prerequisites

- GitHub repository with your project
- Node.js and npm installed locally
- Git configured with your GitHub credentials

## Deployment Process

The deployment workflow is triggered when you push to the `gh-pages` branch. This gives you full control over when your site gets updated.

### How It Works

1. **Build locally**: You build and test your app locally
2. **Push to gh-pages**: When ready to deploy, push to the `gh-pages` branch
3. **Automatic deployment**: GitHub Actions builds and deploys your site
4. **Site updates**: Your site becomes available at: `https://[username].github.io/[repository-name]/`

### Setup GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose the **gh-pages** branch
5. Click **Save**

## Manual Deployment

### Option 1: Using npm scripts

```bash
# Build and deploy in one command
npm run deploy
```

### Option 2: Using the deployment script

```bash
# Make sure you're in the App directory
cd App

# Run the deployment script
./deploy.sh
```

### Option 3: Step by step

```bash
# 1. Build the project
npm run build

# 2. Deploy to gh-pages branch
npx gh-pages -d out
```

## Workflow

1. **Develop**: Make changes to your code in the `main` branch
2. **Test**: Build and test locally with `npm run build`
3. **Deploy**: When ready, run `npm run deploy`
4. **Update**: The gh-pages branch gets updated and your site refreshes

## Configuration

Your `next.config.js` is already configured for GitHub Pages deployment with:

- `basePath`: Automatically set for production builds
- `output: 'export'`: Generates static files
- `trailingSlash: true`: Required for GitHub Pages
- `images.unoptimized: true`: Required for static export

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run lint`
- Verify your Next.js configuration

### Deployment Errors
- Ensure you have write access to the repository
- Check that the `gh-pages` package is installed
- Verify your GitHub token has the necessary permissions

### Site Not Loading
- Wait a few minutes after deployment (GitHub Pages can take time to update)
- Check the GitHub Actions tab for deployment status
- Verify the `gh-pages` branch contains the built files

## Custom Domain (Optional)

To use a custom domain:

1. Add your domain to the **Custom domain** field in GitHub Pages settings
2. Add a `CNAME` file in your `public` folder with your domain
3. Configure your DNS provider to point to GitHub Pages

## Support

If you encounter issues:
1. Check the GitHub Actions logs
2. Verify your repository settings
3. Ensure all configuration files are properly set up
