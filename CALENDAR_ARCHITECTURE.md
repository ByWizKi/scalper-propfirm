# Architecture Polymorphe des Calendriers

## 📋 Vue d'ensemble

Cette application utilise une architecture polymorphe pour gérer les modals des calendriers. Cette approche permet de réutiliser le même code pour tous les types de calendriers (PnL, Dépenses, Retraits) tout en maintenant la flexibilité et la type-safety.

## 🏗️ Structure

### 1. Hook Générique : `useCalendarModal<T>`

**Fichier** : `src/hooks/use-calendar-modal.ts`

Hook personnalisé qui gère l'état d'une modal de calendrier de manière générique grâce aux **génériques TypeScript**.

```typescript
const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<PnlEntry>()
```

**Avantages** :
- ✅ Type-safe : Le type `T` est inféré automatiquement
- ✅ Réutilisable : Fonctionne avec n'importe quel type de données
- ✅ Simple : API claire avec `openModal`, `closeModal`, `isOpen`

### 2. Composant Générique : `CalendarDayDetailsDialog<T>`

**Fichier** : `src/components/calendar-day-details-dialog.tsx`

Composant polymorphe qui affiche les détails d'un jour sélectionné dans un calendrier.

```typescript
<CalendarDayDetailsDialog
  open={isOpen}
  onOpenChange={closeModal}
  selectedDate={selectedDay?.date || null}
  data={selectedDay?.items || null}
  formatTitle={(date) => `PnL du ${format(date, "d MMMM yyyy")}`}
  formatDescription={(items) => `Total: ${total}`}
  renderItem={(entry) => <div>...</div>}
/>
```

**Props** :
- `open` : État de la modal
- `onOpenChange` : Callback pour fermer
- `selectedDate` : Date sélectionnée
- `data` : Tableau d'items à afficher
- `formatTitle` : Fonction pour formater le titre
- `formatDescription` : Fonction pour formater la description
- `renderItem` : Fonction render prop pour chaque item

**Avantages** :
- ✅ Polymorphisme via render props
- ✅ Type-safety complète avec génériques
- ✅ Séparation des préoccupations (UI vs logique métier)
- ✅ Testable facilement

## 📊 Implémentation dans les Calendriers

### Calendrier PnL (`MonthlyCalendar`)

```typescript
const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<PnlEntry>()

// Dans le rendu :
onClick={() => openModal(day, dayEntries, dayTotal)}

// Modal :
<CalendarDayDetailsDialog
  formatTitle={(date) => `PnL du ${format(date, "d MMMM yyyy")}`}
  renderItem={(entry) => (
    <div>
      <TrendingUp />
      {formatCurrency(entry.amount)}
    </div>
  )}
/>
```

### Calendrier Dépenses (`ExpensesCalendar`)

```typescript
const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<ExpenseEntry>()

// Modal :
<CalendarDayDetailsDialog
  formatTitle={(date) => `Dépenses du ${format(date, "d MMMM yyyy")}`}
  renderItem={(expense) => (
    <div>
      {expense.name}
      -{formatCurrency(expense.pricePaid)}
    </div>
  )}
/>
```

### Calendrier Retraits (`WithdrawalsCalendar`)

```typescript
const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<Withdrawal>()

// Modal :
<CalendarDayDetailsDialog
  formatTitle={(date) => `Retraits du ${format(date, "d MMMM yyyy")}`}
  renderItem={(withdrawal) => {
    const netAmount = getNetWithdrawalAmount(...)
    return (
      <div>
        +{formatCurrency(withdrawal.amount)}
        Net: {formatCurrency(netAmount)}
      </div>
    )
  }}
/>
```

## 🎯 Principes de Design

### 1. **Polymorphisme via Génériques TypeScript**

Au lieu de créer 3 hooks et 3 composants différents, on utilise un seul hook et un seul composant avec des génériques `<T>`.

### 2. **Render Props Pattern**

Le composant `CalendarDayDetailsDialog` utilise des render props (`renderItem`, `formatTitle`, etc.) pour permettre à chaque calendrier de personnaliser l'affichage sans modifier le composant de base.

### 3. **Séparation des Préoccupations**

- **Hook** : Gestion de l'état (ouvert/fermé, données sélectionnées)
- **Composant Dialog** : Structure UI commune (Dialog, Header, Liste)
- **Calendriers** : Logique métier spécifique (formatage, calculs)

### 4. **Inversion de Contrôle**

Le calendrier parent contrôle :
- Comment formater le titre
- Comment formater la description
- Comment rendre chaque item

Le composant Dialog contrôle :
- La structure de la modal
- L'animation d'ouverture/fermeture
- Le layout de base

## ✅ Avantages de cette Architecture

1. **DRY (Don't Repeat Yourself)** : Pas de duplication de code
2. **Type-Safety** : TypeScript garantit la cohérence des types
3. **Maintenabilité** : Un seul endroit pour modifier la logique commune
4. **Extensibilité** : Facile d'ajouter de nouveaux calendriers
5. **Testabilité** : Les composants sont découplés et testables indépendamment
6. **Performance** : Pas de surcharge, juste du code TypeScript compilé

## 🔄 Flux de Données

```
Calendrier (PnL/Expenses/Withdrawals)
    ↓
useCalendarModal<T>() → { openModal, closeModal, isOpen, selectedDay }
    ↓
onClick → openModal(date, items, total)
    ↓
CalendarDayDetailsDialog<T>
    ↓
renderItem(item) → JSX spécifique au type
```

## 📝 Exemple d'Ajout d'un Nouveau Calendrier

```typescript
// 1. Définir le type
interface MyData {
  id: string
  value: number
}

// 2. Utiliser le hook
const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<MyData>()

// 3. Ajouter le onClick
onClick={() => openModal(day, dayData, total)}

// 4. Ajouter la modal
<CalendarDayDetailsDialog
  open={isOpen}
  onOpenChange={closeModal}
  selectedDate={selectedDay?.date || null}
  data={selectedDay?.items || null}
  formatTitle={(date) => `My Data for ${format(date, "d MMMM yyyy")}`}
  formatDescription={(items) => `Total: ${items.length} items`}
  renderItem={(item) => (
    <div key={item.id}>
      {item.value}
    </div>
  )}
/>
```

## 🎨 Patterns Utilisés

1. **Generic Programming** : Utilisation de `<T>` pour le polymorphisme
2. **Render Props** : Permet l'injection de JSX personnalisé
3. **Custom Hooks** : Encapsulation de la logique d'état
4. **Compound Components** : Dialog + Header + Content
5. **Inversion of Control** : Le parent contrôle le rendu

## 🚀 Résultat

- **3 calendriers** différents
- **1 hook** réutilisable
- **1 composant Dialog** réutilisable
- **100% type-safe**
- **0% duplication de code**

Cette architecture permet d'ajouter facilement de nouveaux calendriers sans toucher au code existant, tout en maintenant une cohérence visuelle et fonctionnelle à travers toute l'application.

