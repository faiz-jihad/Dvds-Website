# AZ Rayan DVDs — Design System & Homepage Direction

## 1. Project Overview

**Brand / Page Name:** AZ Rayan DVDs  
**Business:** DVD retail / online media store  
**Primary Goal:** Build a trustworthy, modern, easy-to-browse storefront that feels professional without losing the visual identity of a classic DVD shop.

The website should feel like a **real retail brand**, not a generic AI-generated e-commerce template. The visual direction should combine:

- Clean modern e-commerce layout
- Subtle physical-media / DVD references
- Strong product visibility
- Fast product discovery
- Clear purchase actions
- Consistent use of the brand colors

---

## 2. Brand Direction

### Brand Personality

AZ Rayan DVDs should feel:

- Professional
- Reliable
- Familiar
- Collectible
- Straightforward
- Slightly nostalgic, but not retro-heavy
- Modern enough for mobile-first shopping

Avoid:

- Overly futuristic visuals
- Excessive gradients
- Neon/glowing UI
- Glassmorphism everywhere
- Random 3D objects
- Over-animation
- Generic "AI startup" styling
- Too many competing colors

---

## 3. Logo Direction

The existing AZ Rayan logo remains the base identity.

### Logo Modification

The **outer circle of the logo** should be redesigned so it subtly resembles a **DVD disc**.

Recommended treatment:

- Keep the current central brand mark recognizable.
- Preserve the circular silhouette.
- Add a subtle inner disc ring.
- Include a small central DVD-style hole/ring.
- Keep the treatment minimal rather than photorealistic.
- The disc detail should still work at small sizes.
- Avoid metallic textures that reduce readability.
- Create both:
  - Full logo
  - Compact icon / favicon version

### Logo Usage

**Primary background:** White  
**Alternative background:** Black / very dark neutral

Maintain clear space around the logo equal to approximately the height of the inner logo symbol.

---

## 4. Core Colour Palette

The website uses the main colours from the AZ Rayan logo:

### Primary Blue

Used for:
- Main CTA
- Links
- Active navigation
- Selected states
- Brand accents

```css
--brand-blue: #1769E0;
--brand-blue-hover: #1256BA;
--brand-blue-soft: #EAF2FF;
```

### Brand Red

Used sparingly for:
- Sale badges
- Important promotional highlights
- Small emphasis details
- Price reductions

```css
--brand-red: #E62832;
--brand-red-hover: #C91D27;
--brand-red-soft: #FDECEE;
```

### Black

Used for:
- Main text
- Header/footer accents
- Premium contrast sections
- Icons

```css
--black: #111111;
--black-soft: #1B1B1B;
```

### White

Used for:
- Main page background
- Cards
- Navigation
- Product surfaces

```css
--white: #FFFFFF;
```

### Supporting Neutrals

```css
--gray-50: #F8F8F8;
--gray-100: #F2F2F2;
--gray-200: #E5E5E5;
--gray-500: #777777;
--gray-700: #444444;
--gray-900: #171717;
```

### Colour Balance

Recommended visual ratio:

- **White / Neutral:** 70%
- **Black / Dark Neutral:** 15%
- **Blue:** 10%
- **Red:** 5%

Blue should be the dominant brand accent.  
Red should support blue rather than compete with it.

---

## 5. Typography

Use clean, familiar retail typography.

### Recommended

**Headings:** `Manrope`, `Inter`, or `Plus Jakarta Sans`  
**Body:** `Inter`, `Arial`, or `system-ui`

Suggested configuration:

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type Scale

```text
Display / Hero: 48–64px desktop / 34–42px mobile
H1: 42–52px
H2: 30–38px
H3: 22–26px
Body Large: 18px
Body: 16px
Small: 14px
Micro / Label: 12px
```

Use:

- Strong weight for titles
- Regular body copy
- Tight but comfortable heading tracking
- Short paragraphs
- High contrast

Avoid exaggerated oversized typography that hides products.

---

## 6. Layout System

### Desktop

```text
Max width: 1280–1440px
Page padding: 32–48px
Section spacing: 80–120px
Grid: 12 columns
```

### Tablet

```text
Page padding: 24px
Section spacing: 64–80px
```

### Mobile

```text
Page padding: 16–20px
Section spacing: 48–64px
```

### Corners

Use restrained corner radius.

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
```

Product cards should not look overly rounded.

---

## 7. Homepage Structure

The homepage should prioritize browsing and purchasing.

---

### 7.1 Announcement Bar

A slim top strip.

Possible content:

> Free UK delivery on qualifying orders

or

> New titles added regularly

Design:

- Dark background
- White text
- 12–14px
- Maximum height around 34–38px

Do not turn this into a large promo banner.

---

### 7.2 Main Header

Desktop structure:

```text
[Logo]   Shop   New Releases   Best Sellers   Genres   Offers     [Search] [Account] [Basket]
```

Header requirements:

- White background
- Sticky after scrolling
- Thin neutral divider
- Clear hover states
- Basket quantity badge
- Large search affordance

The search function is especially important for DVD retail.

Search placeholder example:

> Search films, actors, genres...

---

## 8. Hero Section

The hero should introduce AZ Rayan DVDs immediately.

### Layout

Desktop:

```text
------------------------------------------------------
|                                                    |
|  Great films.                     Featured DVD     |
|  Real discs.                      cover montage    |
|  Delivered to your door.                           |
|                                                    |
|  Discover new releases, classics,                  |
|  and hard-to-find favourites.                      |
|                                                    |
|  [Shop DVDs] [Browse New Releases]                 |
|                                                    |
------------------------------------------------------
```

### Direction

The hero should use:

- White or very light neutral background
- Black typography
- Blue primary CTA
- Red used as a small accent only
- Real product cover imagery where possible

Optional subtle motif:

A very faint circular DVD-disc graphic behind the product artwork.

Do **not** use a giant gradient blob.

### Suggested Hero Copy

**Headline**

> Films worth owning.

Alternative:

> Your next favourite film is waiting.

**Supporting copy**

> Browse new releases, timeless classics and must-have DVDs from AZ Rayan DVDs.

**Primary CTA**

> Shop DVDs

**Secondary CTA**

> New Releases

---

## 9. Featured Categories

Immediately below the hero.

Suggested categories:

- New Releases
- Best Sellers
- Action
- Comedy
- Family
- Horror
- TV Series
- Classics

### Card Style

Use editorial category cards rather than generic icon tiles.

Each category card can contain:

- Cover collage / representative artwork
- Category title
- Small arrow
- Subtle hover zoom

Desktop: 4 columns  
Mobile: horizontal scroll or 2-column grid

---

## 10. New Releases Section

Section heading:

> New Releases

Secondary action:

> View all

### Product Card

Each DVD card contains:

```text
[DVD Cover]

NEW / SALE badge

Movie Title
Format / Edition
Price

[Add to Basket]
```

Example:

```text
The Film Title
DVD
£9.99
```

### Product Card Rules

- Product artwork should be dominant.
- Keep card background white.
- Use very light border.
- Avoid heavy shadows.
- Use black title.
- Use red only for sale/original price.
- Add button can use blue.

Hover:

- Slight cover elevation
- Border darkens subtly
- Add-to-cart button becomes more visible

---

## 11. Best Sellers

Use the same product system to maintain consistency.

Possible heading:

> Customer Favourites

Supporting line:

> Popular picks from our DVD collection.

This section can use a horizontal carousel on mobile.

---

## 12. Promotional Feature Banner

One strong mid-page promotional banner.

Example:

```text
-----------------------------------------------------
|  Build your movie collection                     |
|  Discover classics, box sets and fan favourites. |
|                                         [Explore] |
-----------------------------------------------------
```

Design:

- Black background
- White text
- Small blue/red brand details
- Optional DVD-disc motif on the right

Do not use multiple competing promotional banners.

---

## 13. Browse by Genre

Use a simple text-led grid.

```text
Action        Comedy        Drama
Horror        Family        Sci-Fi
Thriller      Romance       Documentary
```

Design:

- Neutral background
- Thin separators
- Arrow on hover
- Blue hover state

This should make navigation quick rather than decorative.

---

## 14. Why Shop With AZ Rayan DVDs

Compact trust section.

Recommended items:

### UK Delivery
Reliable delivery across the United Kingdom.

### Quality Products
Clear product descriptions and edition information.

### Secure Checkout
Simple and secure payment experience.

### Customer Support
Help when customers need it.

Use simple line icons.

Do not overstate claims that are not operationally guaranteed.

---

## 15. Newsletter / Updates

Optional.

Heading:

> Never miss a new release.

Copy:

> Get occasional updates on new DVDs, offers and featured titles.

Fields:

```text
[Email address                         ] [Subscribe]
```

Keep the form compact.

---

## 16. Footer

Recommended columns:

```text
AZ Rayan DVDs

SHOP
New Releases
Best Sellers
All DVDs
Offers

HELP
Contact Us
Delivery
Returns
FAQs

INFORMATION
About Us
Terms & Conditions
Privacy Policy
Refund Policy

FOLLOW
Social links
```

Bottom line:

```text
© AZ Rayan DVDs. All rights reserved.
```

Also include payment provider icons only when actually supported.

---

## 17. Product Detail Page Direction

Although the homepage is the first priority, the design system should support product pages.

Desktop layout:

```text
----------------------------------------------------
|                  | Movie Title                   |
|   Large Cover    |                               |
|                  | DVD                           |
|                  | £9.99                         |
|                  |                               |
|                  | Availability                  |
|                  | Quantity                      |
|                  | [Add to Basket]               |
----------------------------------------------------
```

Recommended product information:

- Title
- DVD / Blu-ray format if applicable
- Edition
- Release year
- Genre
- Runtime
- Age rating
- Region
- Language
- Condition if relevant
- Stock state
- Shipping information

For DVD retail, edition and region information should be easy to find.

---

## 18. Cart & Checkout

Cart should feel simple and trustworthy.

Each cart item:

```text
[Cover] Title
        Format
        Qty
        Price
        Remove
```

Order summary:

```text
Subtotal
Delivery
Total

[Proceed to Checkout]
```

Use:

- Blue for primary checkout action
- Red only for destructive actions like remove
- Clear total amount
- Minimal distraction

---

## 19. Stripe / Payment UI Considerations

The website should visually prepare users for a professional checkout experience.

Before checkout, display:

- Product total
- Delivery cost
- Final total
- Delivery information
- Refund/returns link

Do not expose Stripe technical implementation details in the customer-facing UI.

Use secure-payment wording only where accurate.

---

## 20. Components

Core reusable components:

```text
AnnouncementBar
Navbar
SearchBar
Hero
PrimaryButton
SecondaryButton
ProductCard
ProductGrid
ProductCarousel
CategoryCard
PromoBanner
TrustItem
Badge
Price
Rating
QuantitySelector
Breadcrumb
Pagination
NewsletterForm
Footer
CartDrawer
Modal
Toast
EmptyState
SkeletonLoader
```

---

## 21. Buttons

### Primary

Blue background with white text.

```css
background: var(--brand-blue);
color: #fff;
```

Hover:

```css
background: var(--brand-blue-hover);
```

### Secondary

White background, black border.

### Destructive

Reserved for removing/cancelling actions.

Use red.

### Button Rules

- Minimum height: 44px
- Clear text label
- Avoid pill buttons everywhere
- Use radius around 8px
- Strong focus state

---

## 22. Product Badges

Recommended:

```text
NEW
SALE
BEST SELLER
LOW STOCK
```

Rules:

- Compact
- Uppercase
- 11–12px
- No excessive badges
- Maximum 1–2 badges per product

Use blue for general badges and red for sale.

---

## 23. Imagery

Use actual DVD cover/product photography whenever available.

Image rules:

- Consistent aspect ratio
- Sharp and properly cropped
- Neutral backgrounds
- No random stock photography
- No fake cinematic AI characters
- Product should remain the visual hero

If lifestyle imagery is used, it should feel like genuine home-entertainment / movie-collection photography.

---

## 24. Motion & Interaction

Motion should be subtle.

Recommended:

- 150–250ms UI transitions
- Product image 1.02–1.04 scale on hover
- Smooth dropdowns
- Sticky header transition
- Cart drawer slide
- Gentle section reveal

Avoid:

- Constant floating objects
- Large parallax effects
- Cursor gimmicks
- Excessive scroll hijacking
- Complex page transitions

Customers are here to shop.

---

## 25. Responsive Behaviour

### Mobile Header

```text
[Menu] [AZ Rayan DVDs Logo] [Search] [Basket]
```

Menu opens as drawer.

### Mobile Product Grid

Default:

- 2 products per row
- 1 product per row on very small screens if needed

### Mobile Hero

Order:

```text
Headline
Description
CTA
Product imagery
```

Avoid hero sections taller than the user's entire first screen unless justified.

---

## 26. Accessibility

Minimum requirements:

- WCAG-friendly text contrast
- Keyboard-accessible menus
- Visible focus states
- Alt text for product images
- Buttons must have text or accessible labels
- Minimum touch target around 44×44px
- Do not convey important information using colour alone

---

## 27. SEO-Friendly Structure

Use semantic page hierarchy.

Homepage:

```text
H1 — AZ Rayan DVDs / main value proposition

H2 — New Releases
H2 — Best Sellers
H2 — Browse by Genre
H2 — Why Shop With Us
```

Product pages should have one H1 containing the product title.

Images should use descriptive alt text.

---

## 28. Homepage Wireframe

```text
┌───────────────────────────────────────────────────────┐
│                  ANNOUNCEMENT BAR                     │
├───────────────────────────────────────────────────────┤
│ LOGO    NAVIGATION            SEARCH ACCOUNT BASKET   │
├───────────────────────────────────────────────────────┤
│                                                       │
│   FILMS WORTH OWNING.             DVD PRODUCT         │
│   Discover new releases...        VISUAL / COLLAGE    │
│                                                       │
│   [SHOP DVDS] [NEW RELEASES]                          │
│                                                       │
├───────────────────────────────────────────────────────┤
│ FEATURED CATEGORIES                                   │
│ [NEW] [ACTION] [FAMILY] [CLASSICS]                    │
├───────────────────────────────────────────────────────┤
│ NEW RELEASES                           VIEW ALL        │
│ [DVD] [DVD] [DVD] [DVD]                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│         BUILD YOUR MOVIE COLLECTION                   │
│                 [EXPLORE]                             │
│                                                       │
├───────────────────────────────────────────────────────┤
│ CUSTOMER FAVOURITES                                   │
│ [DVD] [DVD] [DVD] [DVD]                               │
├───────────────────────────────────────────────────────┤
│ BROWSE BY GENRE                                       │
│ Action | Comedy | Horror | Family | Drama | More      │
├───────────────────────────────────────────────────────┤
│ UK DELIVERY | SECURE CHECKOUT | SUPPORT | QUALITY     │
├───────────────────────────────────────────────────────┤
│ NEWSLETTER                                            │
├───────────────────────────────────────────────────────┤
│ FOOTER                                                │
└───────────────────────────────────────────────────────┘
```

---

## 29. Design Tokens

```css
:root {
  --brand-blue: #1769E0;
  --brand-blue-hover: #1256BA;
  --brand-blue-soft: #EAF2FF;

  --brand-red: #E62832;
  --brand-red-hover: #C91D27;
  --brand-red-soft: #FDECEE;

  --black: #111111;
  --black-soft: #1B1B1B;

  --white: #FFFFFF;

  --gray-50: #F8F8F8;
  --gray-100: #F2F2F2;
  --gray-200: #E5E5E5;
  --gray-500: #777777;
  --gray-700: #444444;
  --gray-900: #171717;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --container: 1360px;

  --transition-fast: 150ms ease;
  --transition-normal: 220ms ease;
}
```

---

## 30. Final Visual Principle

The design should communicate:

> **AZ Rayan DVDs is a focused, dependable UK DVD retailer — not a generic marketplace.**

Every major design decision should support one of these goals:

1. Make DVDs easy to discover.
2. Make products easy to understand.
3. Make the store feel trustworthy.
4. Make checkout easy.
5. Keep AZ Rayan's Blue, Red, Black and White identity recognizable.

The DVD-inspired logo treatment should provide the distinctive brand detail. The rest of the interface should remain clean, restrained and product-first.
