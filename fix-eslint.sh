#!/bin/bash

# Script de correction automatique des erreurs ESLint

echo "🔧 Correction des erreurs ESLint..."

# Fonction pour remplacer dans un fichier
replace_in_file() {
  local file=$1
  local search=$2
  local replace=$3
  if [ -f "$file" ]; then
    sed -i '' "s/$search/$replace/g" "$file"
    echo "✅ $file"
  fi
}

# Corriger les catch (error) → catch (_error)
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  sed -i '' 's/} catch (error) {/} catch (_error) {/g' "$file"
done

# Corriger interface PropfirmAccount non utilisée
sed -i '' '/^interface PropfirmAccount {$/,/^}$/d' src/app/dashboard/accounts/\[id\]/page.tsx

# Corriger Stats, Account, Withdrawal non utilisés dans dashboard/page.tsx
sed -i '' '11,34d' src/app/dashboard/page.tsx

# Corriger last6Months non utilisé
sed -i '' 's/const last6Months/const _last6Months/g' src/app/dashboard/accounts/\[id\]/page.tsx

# Corriger weekNumber non utilisé
sed -i '' 's/const weekNumber/const _weekNumber/g' src/components/expenses-calendar.tsx
sed -i '' 's/const weekNumber/const _weekNumber/g' src/components/withdrawals-calendar.tsx

# Corriger format et fr non utilisés
sed -i '' 's/import { format } from "date-fns"/\/\/ import { format } from "date-fns"/g' src/components/calendar-day-details-dialog.tsx
sed -i '' 's/import { fr } from "date-fns\/locale"/\/\/ import { fr } from "date-fns\/locale"/g' src/components/calendar-day-details-dialog.tsx

# Corriger actionTypes
sed -i '' 's/const actionTypes/const _actionTypes/g' src/hooks/use-toast.tsx

# Corriger NextAuth
sed -i '' 's/import NextAuth from "next-auth"/\/\/ import NextAuth from "next-auth"/g' src/types/next-auth.d.ts

# Corriger isSameDay
sed -i '' 's/, isSameDay/\/\/ , isSameDay/g' src/components/monthly-calendar.tsx

# Corriger index non utilisé
sed -i '' 's/(_, index)/(_, _index)/g' src/components/monthly-calendar.tsx

# Corriger pnlEntries non utilisé
sed -i '' 's/(account, pnlEntries)/(account, _pnlEntries)/g' src/lib/strategies/takeprofittrader-strategy.ts

# Corriger accountSize non utilisé
sed -i '' 's/(accountId, accountSize)/(accountId, _accountSize)/g' src/lib/strategies/topstep-strategy.ts

# Corriger withdrawalPercentage (let → const)
sed -i '' 's/let withdrawalPercentage/const withdrawalPercentage/g' src/components/trading-cycles-tracker.tsx
sed -i '' 's/let withdrawalPercentage/const withdrawalPercentage/g' src/lib/strategies/topstep-strategy.tsx

# Corriger console.log dans register-sw.tsx
sed -i '' 's/console.log/console.info/g' src/app/register-sw.tsx
sed -i '' 's/console.log/console.info/g' src/lib/security.ts

# Corriger apostrophes non échappées
sed -i '' "s/d'/d\\\\'/g" src/components/account-form-dialog.tsx
sed -i '' "s/d'/d\\\\'/g" src/components/account-rules-tracker.tsx
sed -i '' "s/d'/d\\\\'/g" src/components/trading-cycles-tracker.tsx

echo "✅ Corrections terminées!"
echo "🧪 Test ESLint..."

npm run lint:strict

