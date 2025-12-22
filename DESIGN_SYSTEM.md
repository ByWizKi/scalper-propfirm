# Design System - Scalper Propfirm

## Palette de couleurs

### Mode clair

#### Couleurs primaires
- **Primary**: `#6366f1` (Indigo-500) - Couleur principale pour les boutons et actions
- **Primary Hover**: `#4f46e5` (Indigo-600) - État hover
- **Secondary**: `#8b5cf6` (Violet-500) - Couleur secondaire
- **Accent**: `#06b6d4` (Cyan-500) - Couleur d'accent

#### Couleurs de surface
- **Background**: `#fafbfc` (Slate-50) - Fond principal
- **Foreground**: `#0f172a` (Slate-900) - Texte principal
- **Card**: `#ffffff` - Fond des cartes
- **Muted**: `#f1f5f9` (Slate-100) - Fond des éléments secondaires
- **Border**: `#e2e8f0` (Slate-200) - Bordures

#### Couleurs de statut
- **Success**: `#10b981` (Emerald-500)
- **Warning**: `#f59e0b` (Amber-500)
- **Error**: `#ef4444` (Red-500)
- **Info**: `#3b82f6` (Blue-500)

### Mode sombre

#### Couleurs primaires
- **Primary**: `#818cf8` (Indigo-400) - Plus clair pour le contraste
- **Primary Hover**: `#a5b4fc` (Indigo-300)
- **Secondary**: `#a78bfa` (Violet-400)
- **Accent**: `#22d3ee` (Cyan-400)

#### Couleurs de surface
- **Background**: `#0f172a` (Slate-900) - Fond principal sombre
- **Foreground**: `#f8fafc` (Slate-50) - Texte principal clair
- **Card**: `#1e293b` (Slate-800) - Fond des cartes
- **Muted**: `#1e293b` (Slate-800) - Fond des éléments secondaires
- **Border**: `#1e293b` (Slate-800) - Bordures

#### Couleurs de statut
- **Success**: `#34d399` (Emerald-400)
- **Warning**: `#fbbf24` (Amber-400)
- **Error**: `#f87171` (Red-400)
- **Info**: `#60a5fa` (Blue-400)

## Typographie

### Police principale
- **Inter** - Police sans-serif moderne et lisible
  - Utilisée pour tout le texte de l'interface
  - Optimisée pour l'affichage à l'écran
  - Support des ligatures et variantes OpenType

### Police monospace
- **JetBrains Mono** - Police monospace pour le code
  - Utilisée pour les éléments de code, logs, etc.
  - Optimisée pour la lisibilité du code

## Utilisation dans Tailwind

Les couleurs sont disponibles via les variables CSS et peuvent être utilisées avec les classes Tailwind :

```tsx
// Couleurs primaires
<div className="bg-primary text-primary-foreground">
<div className="bg-secondary text-secondary-foreground">

// Couleurs de surface
<div className="bg-card text-card-foreground">
<div className="bg-muted text-muted-foreground">

// Couleurs de statut
<div className="bg-success text-success-foreground">
<div className="bg-warning text-warning-foreground">
<div className="bg-error text-error-foreground">
<div className="bg-info text-info-foreground">

// Bordures
<div className="border-border">
```

## Migration depuis l'ancien système

L'ancien système utilisait principalement `zinc` pour les couleurs neutres. Le nouveau système utilise `slate` qui offre un meilleur contraste et une apparence plus moderne.

Les composants existants continueront de fonctionner, mais il est recommandé de migrer progressivement vers les nouvelles couleurs pour une meilleure cohérence visuelle.

