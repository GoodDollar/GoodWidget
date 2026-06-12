## GoodDapp Civic (stitch)

name: GoodDapp Civic
colors:
surface: '#FFFFFF'
surface-dim: '#d8dadc'
surface-bright: '#f8f9fb'
surface-container-lowest: '#ffffff'
surface-container-low: '#f2f4f6'
surface-container: '#eceef0'
surface-container-high: '#e6e8ea'
surface-container-highest: '#e0e3e5'
on-surface: '#191c1e'
on-surface-variant: '#3e4851'
inverse-surface: '#2d3133'
inverse-on-surface: '#eff1f3'
outline: '#6e7882'
outline-variant: '#bdc8d3'
surface-tint: '#006493'
primary: '#006493'
on-primary: '#ffffff'
primary-container: '#00b0ff'
on-primary-container: '#004060'
inverse-primary: '#8dcdff'
secondary: '#006b5f'
on-secondary: '#ffffff'
secondary-container: '#6cf9e4'
on-secondary-container: '#007165'
tertiary: '#585d79'
on-tertiary: '#ffffff'
tertiary-container: '#a0a5c4'
on-tertiary-container: '#363a55'
error: '#F00505'
on-error: '#ffffff'
error-container: '#ffdad6'
on-error-container: '#93000a'
primary-fixed: '#cae6ff'
primary-fixed-dim: '#8dcdff'
on-primary-fixed: '#001e30'
on-primary-fixed-variant: '#004b70'
secondary-fixed: '#6cf9e4'
secondary-fixed-dim: '#49dcc8'
on-secondary-fixed: '#00201c'
on-secondary-fixed-variant: '#005047'
tertiary-fixed: '#dde1ff'
tertiary-fixed-dim: '#c0c5e5'
on-tertiary-fixed: '#151a33'
on-tertiary-fixed-variant: '#404560'
background: '#f8f9fb'
on-background: '#191c1e'
surface-variant: '#e0e3e5'
surface-alt: '#EDF5FC'
text-primary: '#0D182D'
text-secondary: '#4F606F'
text-muted: '#8F9BB3'
border: '#D0D9E4'
success: '#13C636'
warning: '#FFB020'
typography:
headline-xl:
fontFamily: DM Sans
fontSize: 40px
fontWeight: '700'
lineHeight: 48px
letterSpacing: -0.02em
headline-lg:
fontFamily: DM Sans
fontSize: 32px
fontWeight: '700'
lineHeight: 40px
letterSpacing: -0.01em
headline-md:
fontFamily: DM Sans
fontSize: 24px
fontWeight: '700'
lineHeight: 32px
headline-sm:
fontFamily: DM Sans
fontSize: 20px
fontWeight: '700'
lineHeight: 28px
body-lg:
fontFamily: DM Sans
fontSize: 18px
fontWeight: '400'
lineHeight: 28px
body-md:
fontFamily: DM Sans
fontSize: 16px
fontWeight: '400'
lineHeight: 24px
label-md:
fontFamily: DM Sans
fontSize: 14px
fontWeight: '500'
lineHeight: 20px
label-sm:
fontFamily: DM Sans
fontSize: 12px
fontWeight: '600'
lineHeight: 16px
letterSpacing: 0.02em
headline-lg-mobile:
fontFamily: DM Sans
fontSize: 28px
fontWeight: '700'
lineHeight: 36px
rounded:
sm: 0.25rem
DEFAULT: 0.5rem
md: 0.75rem
lg: 1rem
xl: 1.5rem
full: 9999px
spacing:
gap-xs: 4px
gap-sm: 8px
gap-md: 16px
gap-lg: 24px
gap-xl: 32px
margin-page: 40px
max-width-content: 1200px

---

## Brand & Style

The design system is rooted in a **Modern / Corporate** aesthetic that leans into "Civic Tech" — a blend of operational efficiency and public accessibility. It prioritizes clarity, trust, and inclusivity, ensuring that governance participation feels like a meaningful public service rather than a complex financial transaction.

The visual language uses expansive white space, a bright and optimistic primary blue, and structured information density to evoke a sense of organized accountability. It avoids the dark, high-contrast, or "neon" tropes of traditional DeFi, opting instead for a "SaaS-lite" feel that is friendly to non-technical community members.

## Colors

The palette is anchored by **Vibrant Blue (#00B0FF)**, used exclusively for primary actions, progress indicators, and active navigation states. To ensure a clean, "civic" atmosphere, the system utilizes a tiered background strategy: pure white surfaces for cards and content containers, and a light blue-tinted secondary background for sidebars and informational panels.

- **Primary:** High-energy blue for "Claim," "Vote," and "Submit."
- **Functional Accents:** Green is reserved for success and positive participation signals; Red is used sparingly for ineligible states or critical errors.
- **Surface Alt:** The specific light blue tint (#EDF5FC) provides subtle depth and distinguishes between the main reading area and supporting operational tools.

## Typography

The design system exclusively uses **DM Sans**. This choice provides a geometric, modern, and highly legible foundation that works across both dense data tables and long-form proposal descriptions.

- **Hierarchy:** Use bold weights (700) for all headlines to maintain a strong "editorial" feel for governance titles.
- **Labels:** Use medium (500) and semi-bold (600) weights for labels and metadata to ensure they remain distinct from body copy.
- **Responsive:** Headlines scale down on mobile to prevent awkward line breaks in long proposal titles while maintaining their relative visual weight.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main content area is capped at a comfortable reading width, while the background and header extend to the edge of the viewport.

- **Grid Model:** A 12-column grid is used for desktop.
- **The "Two-Thirds" Rule:** Active governance pages use a primary 8-column main area for proposal content and a 4-column sidebar for "Action & Stats" (voter eligibility, deadline countdown, etc.).
- **Spacing Rhythm:** Use 24px and 32px for major sectional gaps. 16px is the standard for internal card padding and between related UI elements like input fields and their labels.
- **Mobile Reflow:** The sidebar stacks below the main content, with the "Action CTA" pinned to a bottom sticky bar to ensure the voting trigger is always accessible.

## Elevation & Depth

This design system uses **Tonal Layering** supplemented by extremely soft, low-contrast shadows.

- **Base Layer:** The Neutral background (#F6F8FA) serves as the canvas.
- **Secondary Layer:** Sidebars and supporting panels use Surface Alt (#EDF5FC) to create structural zones without the use of heavy borders.
- **Primary Elevation:** Cards and Modals use Surface white (#FFFFFF) with a very diffuse shadow (e.g., `0px 4px 20px rgba(0, 176, 255, 0.05)`). Note the subtle blue tint in the shadow to maintain color harmony.
- **Interactive States:** Buttons and interactive cards may lift slightly on hover, increasing the shadow spread by 4-8px.

## Shapes

The shape language is friendly but disciplined. Rounded corners are used to soften the "institutional" feel of governance.

- **Cards & Containers:** Use a consistent 12px (`rounded-lg`) radius.
- **Primary Buttons:** Use a more pronounced 20px radius to make them stand out as the primary interactive touchpoints.
- **Pills & Tags:** Status chips (e.g., "Active," "Passed") use a full pill radius for immediate visual categorization as non-interactive status markers.
- **Inputs:** Follow the standard 8px-12px radius to match container styles.

## Components

### Buttons & Chips

- **Primary Button:** Solid #00B0FF with white text. 20px roundedness. Bold DM Sans.
- **Secondary Button:** Ghost or outlined using #00B0FF, or a solid tint using #EDF5FC with blue text.
- **Status Chips:** Full pill radius. Use Success, Warning, or Error colors at 10-15% opacity with high-contrast text of the same hue.

### Governance Specifics

- **Proposal Hero:** Uses the H1 typography level. Includes a metadata row directly beneath (Date, Author, Status) separated by dot dividers.
- **Voting Steppers:** Clean numeric input fields framed by plus/minus buttons. Use Surface Alt for the background of the stepper unit to distinguish it from the card.
- **Eligibility Banner:** A full-width component at the top of the action sidebar. If ineligible, it uses a Warning background; if eligible, it uses a soft Secondary (#1FC2AF) tint.
- **Results Progress Bars:** Thick, 12px height bars with rounded caps. The primary "Winning" option uses the Primary Blue, while others use Text Muted or Border colors to create clear hierarchy.

### Inputs & Cards

- **Input Fields:** 1px border (#D0D9E4), turning Primary Blue on focus. Labels always sit above the field in Label-sm typography.
- **Member Cards:** Minimalist blocks with 12px radius. Prioritize the user's avatar and "Points" count as the primary visual anchors.
