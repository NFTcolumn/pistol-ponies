# Pistol Ponies Brand Guidelines

## Brand Colors

![Brand Color Palette](file:///Users/khornermarkets/.gemini/antigravity/brain/4d90bf8d-d77b-4d7d-9491-dd2b9a982220/uploaded_image_1769030089280.jpg)

### Primary Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Light Blue** | `#BDC3FF` | Primary background color (landing page, leaderboard) |
| **Pastel Azure** | `#84D1F5` | Accent color, secondary backgrounds |
| **Pastel Green** | `#80F8A4` | Success states, positive highlights |
| **Pastel Yellow** | `#FFFF83` | Warning states, special highlights |
| **Pastel Magenta** | `#F980C5` | Primary pink/magenta accent (logo, CTAs) |
| **Pastel Lavender** | `#CE85F6` | Secondary accent, decorative elements |

### Color Palette (Quick Reference)

```css
/* Brand Colors */
--light-blue: #BDC3FF;
--pastel-azure: #84D1F5;
--pastel-green: #80F8A4;
--pastel-yellow: #FFFF83;
--pastel-magenta: #F980C5;
--pastel-lavender: #CE85F6;
```

### Current Usage in Project

- **Background**: `#BDC3FF` (Light Blue) - Used on `index.html` and `leaderboard.html`
- **Accent Pink**: `#ff6b9d` - Currently used for titles and highlights (consider updating to `#F980C5` for consistency)
- **Teal Accent**: `#4ecdc4` - Used for buttons and interactive elements

### Design Notes

- All colors are pastel tones for a soft, playful aesthetic
- Colors work well on both light and dark backgrounds
- Maintain high contrast for text readability
- Use Inter font family for consistency with logo

## Typography

### Primary Font

**Press Start 2P**
- Official brand font
- Pixel/retro gaming aesthetic
- Use for logos, headings, and key brand elements

```html
<!-- Google Fonts Import -->
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

```css
/* Font Family */
font-family: 'Press Start 2P', cursive;
```

### Usage Guidelines

- **Primary Use**: Logo text, main headings, brand callouts
- **Secondary Font**: Inter (for body text and UI elements for readability)
- **Line Height**: Use increased line-height (1.6+) due to pixel font density
- **Font Size**: Generally use larger sizes (16px+) for readability
