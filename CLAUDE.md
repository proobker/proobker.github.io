# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Run locally**: Open `index.html` directly in a web browser (no build step required).
- **Deploy to GitHub Pages**: 
  1. Ensure you're on the `main` branch.
  2. Push changes to GitHub (the repository is already configured for GitHub Pages).
  3. Go to **Settings → Pages** in your repo and verify the source is set to `main` branch and `/ (root)`.
  4. The site will be published at `https://proobker.github.io/` (or your custom domain if configured).

## Code Architecture & Structure

### Overview
This is a static personal portfolio website built with HTML5, CSS3, and Vanilla JavaScript. It features a responsive design with smooth scrolling, reveal animations, and dynamic GitHub integration.

### File Structure
- `index.html`: Semantic HTML5 structure with clearly defined sections (home, about, projects, skills, credentials, GitHub, contact).
- `styles.css`: Contains all styling, including:
  - CSS variables for color scheme (`--bg`, `--text`, `--electric`, etc.) and layout.
  - Responsive design using viewport units and media queries (implicit in the container width).
  - Styling for components: header, navigation, project cards, skill sections, etc.
  - Animation and transition definitions for hover effects and reveal animations.
- `script.js`: Handles interactivity:
  - Mobile navigation toggle (hamburger menu).
  - Scroll-based header styling (scrolled state).
  - Reveal animations using `IntersectionObserver` for elements with `.reveal` class.
  - Active section highlighting in navigation based on scroll position.
  - GitHub API integration to fetch and display user stats and recent repositories (with fallback data).
  - Dynamic year update in footer.
- `assets/`: Contains static assets:
  - Profile image (`Rabi-Dahal-Profile.png`).
  - Favicons in multiple formats (`favicon.svg`, `.png`).
  - Apple touch icon.
  - Open Graph preview image (`og-preview-card.jpg`).

### Key Architectural Decisions
1. **No Build Toolchain**: The site is intentionally kept simple with no transpilation, bundling, or linting setup to reduce complexity and deployment friction.
2. **Progressive Enhancement**: Core content is accessible without JavaScript; enhancements (animations, GitHub data) are added as a layer.
3. **Responsive Design**: Layout adapts to different screen sizes using flexible containers (`width: min(1120px, 92vw)`) and mobile-specific navigation.
4. **Performance Conscious**:
   - Uses `defer` on script.js to avoid blocking HTML parsing.
   - Implements efficient intersection thresholds for animations.
   - Includes fallback content for GitHub API to ensure UI remains functional offline or during API issues.
5. **Accessibility**:
   - Semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
   - Proper ARIA labels and controls for mobile navigation (`aria-expanded`, `aria-controls`).
   - Sufficient color contrast (dark background with light text).
   - Logical tab order and focus management.

### Common Development Tasks
- **Editing Content**: Update text directly in `index.html` sections.
- **Styling Changes**: Modify variables in `:root` of `styles.css` for theme adjustments; adjust specific component styles below.
- **Adding Animations**: Add `.reveal` class to elements and they will animate on scroll via the IntersectionObserver in `script.js`.
- **Updating GitHub Fallbacks**: Modify the `fallbackRepos` array in `script.js` to change the displayed repositories when API is unavailable.
- **Adding Sections**: 
  1. Add a new section in `index.html` with an `id` (e.g., `<section id="new-section" class="section container">`).
  2. Add corresponding navigation link in both desktop and mobile menus.
  3. The section observer in `script.js` will automatically handle active state on scroll.
  4. Add reveal animations by including `.reveal` class on elements within the section.

### Deployment Notes
- The repository is configured to deploy from the `main` branch root (`/`) to GitHub Pages.
- A `CNAME` file is present for custom domain (`rabidahal.me`) configuration.
- When making changes, commit and push to `main`; GitHub Actions will automatically build and deploy (though no build step exists, GitHub Pages serves the static files directly).