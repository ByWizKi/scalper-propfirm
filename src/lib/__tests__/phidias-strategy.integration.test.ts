/**
 * Tests d'intégration pour la stratégie Phidias
 *
 * Scénarios testés :
 * 1. Comptes ÉVALUATION (EVAL) - 25K Static
 * 2. Comptes CASH (FUNDED) - 25K Static CASH
 * 3. Comptes LIVE (FUNDED) - Compte LIVE
 * 4. Toutes les tailles de compte disponibles
 * 5. Calculs de retraits pour chaque type
 * 6. Éligibilité à la validation
 * 7. Bonus et crédits LIVE
 */

import { PhidiasStrategy } from "../strategies/phidias-strategy"
import { getPhidiasAccountSubType, getPhidiasAccountSubTypeLabel } from "../phidias-account-type"
import { PropfirmStrategyFactory } from "../strategies/propfirm-strategy.factory"

describe("Phidias Strategy - Tests d'intégration", () => {
  let strategy: PhidiasStrategy

  beforeEach(() => {
    strategy = new PhidiasStrategy()
  })

  describe("Détection des types de comptes", () => {
    test("devrait détecter EVAL pour un compte d'évaluation", () => {
      const subType = getPhidiasAccountSubType("EVAL", "Compte Test", null)
      expect(subType).toBe("EVAL")
      expect(getPhidiasAccountSubTypeLabel(subType)).toBe("Évaluation")
    })

    test("devrait détecter CASH pour un compte financé avec 'cash' dans le nom", () => {
      const subType = getPhidiasAccountSubType("FUNDED", "Compte 25K Static CASH", null)
      expect(subType).toBe("CASH")
      expect(getPhidiasAccountSubTypeLabel(subType)).toBe("CASH")
    })

    test("devrait détecter LIVE pour un compte financé avec 'live' dans le nom", () => {
      const subType = getPhidiasAccountSubType("FUNDED", "Compte LIVE Phidias", null)
      expect(subType).toBe("LIVE")
      expect(getPhidiasAccountSubTypeLabel(subType)).toBe("LIVE")
    })

    test("devrait détecter CASH par défaut pour un compte FUNDED sans mot-clé", () => {
      const subType = getPhidiasAccountSubType("FUNDED", "Compte Phidias", null)
      expect(subType).toBe("CASH")
    })

    test("devrait détecter LIVE via les notes", () => {
      const subType = getPhidiasAccountSubType("FUNDED", "Compte Test", "Compte live Phidias")
      expect(subType).toBe("LIVE")
    })
  })

  describe("Compte 25K Static - ÉVALUATION (EVAL)", () => {
    const accountSize = 25000
    const accountType = "EVAL"
    const accountName = "Phidias 25K Static Eval"

    test("devrait retourner les règles correctes", () => {
      const rules = strategy.getAccountRules(accountSize, accountType, accountName, null)
      expect(rules).not.toBeNull()
      expect(rules?.profitTarget).toBe(1500)
      expect(rules?.maxDrawdown).toBe(500) // Perte statique
      expect(rules?.consistencyRule).toBe(0) // Pas de règle de cohérence
      expect(rules?.minTradingDays).toBe(0) // Pas de minimum de jours
    })

    test("devrait être éligible à la validation avec 1500$ de profit et pas de drawdown", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 800 },
        { date: new Date("2024-01-02"), amount: 700 },
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(true)
    })

    test("ne devrait pas être éligible si le profit target n'est pas atteint", () => {
      const pnlEntries = [{ date: new Date("2024-01-01"), amount: 1000 }]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(false)
    })

    test("ne devrait pas être éligible si la perte statique de 500$ est dépassée", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: -600 }, // Perte de 600$ > 500$
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(false)
    })

    test("devrait permettre une perte de 500$ exactement", () => {
      const pnlEntries = [{ date: new Date("2024-01-01"), amount: -500 }]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      // Même avec -500$, si le profit target n'est pas atteint, ce n'est pas éligible
      // Mais la perte de 500$ ne devrait pas bloquer si le profit target est atteint
      const pnlEntries2 = [
        { date: new Date("2024-01-01"), amount: -500 },
        { date: new Date("2024-01-02"), amount: 2000 }, // Total = 1500$
      ]

      const isEligible2 = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries2,
        accountType,
        accountName,
        null
      )

      expect(isEligible2).toBe(true)
    })

    test("ne devrait pas permettre de retrait pour un compte EVAL", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 2000 },
      ]

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        2000,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(available).toBe(0) // Pas de retrait pour EVAL
    })

    test("ne devrait pas avoir de bonus de validation pour EVAL", () => {
      const bonus = (strategy as any).getValidationBonus(accountSize, accountType, accountName, null)
      expect(bonus).toBe(0)
    })
  })

  describe("Compte 25K Static - CASH (FUNDED)", () => {
    const accountSize = 25000
    const accountType = "FUNDED"
    const accountName = "Phidias 25K Static CASH"

    test("devrait retourner les règles correctes", () => {
      const rules = strategy.getAccountRules(accountSize, accountType, accountName, null)
      expect(rules).not.toBeNull()
      expect(rules?.profitTarget).toBe(1500)
      expect(rules?.maxDrawdown).toBe(500)
    })

    test("devrait permettre le retrait dès J+1 avec profit", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 1000 },
      ]

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        1000,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(available).toBe(1000) // Tout le profit disponible
    })

    test("devrait permettre le retrait même avec un seul jour de trading", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 500 },
      ]

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        500,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(available).toBe(500) // Pas de restriction de jours minimum
    })

    test("devrait calculer le bonus de validation de 1000$ pour CASH validé", () => {
      const bonus = (strategy as any).getValidationBonus(accountSize, accountType, accountName, null)
      expect(bonus).toBe(1000)
    })

    test("devrait calculer le crédit LIVE de 500$ pour CASH validé", () => {
      const credit = (strategy as any).getLiveCredit(accountSize, accountType, accountName, null)
      expect(credit).toBe(500)
    })

    test("ne devrait pas être éligible à la validation (déjà financé)", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 2000 },
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(false) // CASH ne peut pas être validé
    })

    test("devrait appliquer la taxe de 20% sur les retraits", () => {
      const withdrawalRules = strategy.getWithdrawalRules(accountSize, accountType, accountName, null)
      expect(withdrawalRules.taxRate).toBe(0.2)
    })
  })

  describe("Compte LIVE (FUNDED)", () => {
    const accountSize = 25000 // Taille de base, mais le compte LIVE peut être plus grand
    const accountType = "FUNDED"
    const accountName = "Phidias LIVE Account"

    test("devrait retourner des règles minimales (pas d'évaluation)", () => {
      const rules = strategy.getAccountRules(accountSize, accountType, accountName, null)
      expect(rules).not.toBeNull()
      expect(rules?.profitTarget).toBe(0) // Pas d'objectif d'évaluation
      expect(rules?.maxDrawdown).toBe(0) // Pas de drawdown pour LIVE
    })

    test("devrait permettre le retrait chaque jour avec minimum 500$", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 1000 },
      ]

      const currentBalance = accountSize + 1000 // 26000
      const minBalance = accountSize + 100 // 25100
      const availableAfterMin = currentBalance - minBalance // 900

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        1000,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(available).toBe(900) // 1000 - 100 (solde min)
    })

    test("ne devrait pas permettre de retrait si le montant disponible < 500$", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 400 }, // Seulement 400$ de profit
      ]

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        400,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      // 400$ de profit, solde = 25400, min = 25100, disponible = 300$ < 500$
      expect(available).toBe(0)
    })

    test("devrait permettre le retrait si disponible >= 500$", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 600 }, // 600$ de profit
      ]

      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        600,
        0,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      // 600$ de profit, solde = 25600, min = 25100, disponible = 500$
      expect(available).toBe(500)
    })

    test("devrait respecter le solde minimum (solde initial + 100$)", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 2000 },
      ]

      // Retrait de 1000$
      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        2000,
        1000, // Déjà retiré 1000$
        pnlEntries,
        accountType,
        accountName,
        null
      )

      // Solde actuel = 25000 + 2000 - 1000 = 26000
      // Solde min = 25000 + 100 = 25100
      // Disponible = 26000 - 25100 = 900$
      expect(available).toBe(900)
    })

    test("ne devrait pas permettre de retrait si le solde tombe sous le minimum", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 500 },
      ]

      // Retrait de 400$ (ce qui laisserait seulement 100$ au-dessus du minimum)
      const available = strategy.calculateAvailableForWithdrawal(
        accountSize,
        500,
        400,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      // Solde actuel = 25000 + 500 - 400 = 25100
      // Solde min = 25100
      // Disponible = 0 (pas assez pour un retrait de 500$ min)
      expect(available).toBe(0)
    })

    test("devrait appliquer la taxe de 20% sur les retraits", () => {
      const withdrawalRules = strategy.getWithdrawalRules(accountSize, accountType, accountName, null)
      expect(withdrawalRules.taxRate).toBe(0.2)
    })

    test("ne devrait pas être éligible à la validation (déjà financé)", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 5000 },
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(false)
    })

    test("ne devrait pas avoir de bonus de validation pour LIVE", () => {
      const bonus = (strategy as any).getValidationBonus(accountSize, accountType, accountName, null)
      expect(bonus).toBe(0)
    })
  })

  describe("Autres tailles de compte (50K, 100K, 150K)", () => {
    const sizes = [50000, 100000, 150000]

    sizes.forEach((size) => {
      test(`devrait retourner des règles pour ${size}`, () => {
        const rules = strategy.getAccountRules(size, "EVAL", `Phidias ${size}`, null)
        expect(rules).not.toBeNull()
        expect(rules?.profitTarget).toBeGreaterThan(0)
        expect(rules?.maxDrawdown).toBeGreaterThan(0)
      })

      test(`devrait permettre la validation pour ${size} EVAL avec profit target atteint`, () => {
        const rules = strategy.getAccountRules(size, "EVAL", `Phidias ${size}`, null)
        if (!rules) return

        const pnlEntries = [
          { date: new Date("2024-01-01"), amount: rules.profitTarget },
        ]

        const isEligible = strategy.isEligibleForValidation(
          size,
          pnlEntries,
          "EVAL",
          `Phidias ${size}`,
          null
        )

        expect(isEligible).toBe(true)
      })
    })
  })

  describe("Scénarios de retraits complexes", () => {
    test("CASH: devrait permettre plusieurs retraits successifs", () => {
      const accountName = "Phidias 25K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 5000 },
      ]

      // Premier retrait de 2000$
      const available1 = strategy.calculateAvailableForWithdrawal(
        25000,
        5000,
        2000,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available1).toBe(3000) // 5000 (PnL) - 2000 (retraits) = 3000 disponible

      // Deuxième retrait de 1000$ supplémentaire (total retraits = 3000$)
      const available2 = strategy.calculateAvailableForWithdrawal(
        25000,
        5000,
        3000,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available2).toBe(2000) // 5000 (PnL) - 3000 (retraits) = 2000 disponible
    })

    test("LIVE: devrait calculer correctement avec retraits multiples", () => {
      const accountName = "Phidias LIVE"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 10000 },
      ]

      // Après retrait de 5000$
      const available = strategy.calculateAvailableForWithdrawal(
        25000,
        10000,
        5000,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      // Solde = 25000 + 10000 - 5000 = 30000
      // Min = 25100
      // Disponible = 30000 - 25100 = 4900$
      expect(available).toBe(4900)
    })

    test("LIVE: ne devrait pas permettre de retrait si le solde serait sous le minimum", () => {
      const accountName = "Phidias LIVE"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 1000 },
      ]

      // Tentative de retrait qui laisserait le solde sous le minimum
      const available = strategy.calculateAvailableForWithdrawal(
        25000,
        1000,
        900, // Retrait qui laisserait seulement 100$ au-dessus du minimum
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      // Solde = 25000 + 1000 - 900 = 25100
      // Min = 25100
      // Disponible = 0 (pas assez pour un retrait de 500$ min)
      expect(available).toBe(0)
    })
  })

  describe("Intégration avec PropfirmStrategyFactory", () => {
    test("devrait créer la stratégie Phidias via la factory", () => {
      const strategy = PropfirmStrategyFactory.getStrategy("PHIDIAS")
      expect(strategy).toBeInstanceOf(PhidiasStrategy)
      expect(strategy.getName()).toBe("Phidias")
    })

    test("devrait retourner les règles via la factory", () => {
      const strategy = PropfirmStrategyFactory.getStrategy("PHIDIAS")
      const rules = strategy.getAccountRules(25000, "EVAL", "Test", null)
      expect(rules?.profitTarget).toBe(1500)
    })
  })

  describe("Scénarios de validation avec différents PnL", () => {
    const accountSize = 25000
    const accountType = "EVAL"
    const accountName = "Phidias 25K Eval"

    test("devrait valider avec profit exact de 1500$", () => {
      const pnlEntries = [{ date: new Date("2024-01-01"), amount: 1500 }]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(true)
    })

    test("devrait valider avec profit supérieur à 1500$", () => {
      const pnlEntries = [{ date: new Date("2024-01-01"), amount: 2000 }]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(true)
    })

    test("devrait valider même avec des pertes intermédiaires si le total est >= 1500$", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: -200 },
        { date: new Date("2024-01-02"), amount: 1700 }, // Total = 1500$
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(true)
    })

    test("ne devrait pas valider si la perte statique de 500$ est dépassée à un moment", () => {
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: -600 }, // Perte de 600$ > 500$
        { date: new Date("2024-01-02"), amount: 2100 }, // Total = 1500$ mais perte dépassée
      ]

      const isEligible = strategy.isEligibleForValidation(
        accountSize,
        pnlEntries,
        accountType,
        accountName,
        null
      )

      expect(isEligible).toBe(false)
    })
  })

  describe("Comptes CASH 50K, 100K, 150K (Fundamental/Swing)", () => {
    test("50K CASH: devrait respecter le seuil minimum de 52 600$", () => {
      const accountName = "Phidias 50K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 2500 }, // Seulement 2500$ de profit
      ]

      // Balance = 50 000 + 2500 = 52 500$ < 52 600$ (seuil minimum)
      const available = strategy.calculateAvailableForWithdrawal(
        50000,
        2500,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(0) // Pas de retrait possible si sous le seuil
    })

    test("50K CASH: devrait permettre le retrait si le seuil minimum est atteint", () => {
      const accountName = "Phidias 50K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 3000 }, // 3000$ de profit
      ]

      // Balance = 50 000 + 3000 = 53 000$ >= 52 600$ (seuil minimum)
      // Disponible = 53 000 - 50 100 (solde min) = 2 900$
      // Max retrait = 2 000$ par période
      const available = strategy.calculateAvailableForWithdrawal(
        50000,
        3000,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(2000) // Limité à 2 000$ par période
    })

    test("50K CASH: devrait respecter le solde minimum après retrait (50 100$)", () => {
      const accountName = "Phidias 50K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 5000 },
      ]

      // Après retrait de 1000$, balance = 54 000$
      // Balance >= 52 600$ (seuil minimum) ✓
      // Disponible = 54 000 - 50 100 (solde min) = 3 900$
      // Max retrait = 2 000$ par période
      const available = strategy.calculateAvailableForWithdrawal(
        50000,
        5000,
        1000,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(2000) // Limité à 2 000$ par période (max retrait)
    })

    test("50K CASH: ne devrait pas permettre de retrait si balance sous le seuil minimum", () => {
      const accountName = "Phidias 50K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 5000 },
      ]

      // Après retrait de 3000$, balance = 52 000$
      // Balance < 52 600$ (seuil minimum) → pas de retrait possible
      const available = strategy.calculateAvailableForWithdrawal(
        50000,
        5000,
        3000,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(0) // Pas de retrait si sous le seuil minimum
    })

    test("100K CASH: devrait respecter le seuil minimum de 103 700$", () => {
      const accountName = "Phidias 100K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 3500 }, // Seulement 3500$ de profit
      ]

      // Balance = 100 000 + 3500 = 103 500$ < 103 700$ (seuil minimum)
      const available = strategy.calculateAvailableForWithdrawal(
        100000,
        3500,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(0) // Pas de retrait possible si sous le seuil
    })

    test("100K CASH: devrait permettre le retrait avec limite de 2 500$ par période", () => {
      const accountName = "Phidias 100K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 5000 },
      ]

      // Balance = 100 000 + 5000 = 105 000$ >= 103 700$ (seuil minimum)
      // Disponible = 105 000 - 100 100 (solde min) = 4 900$
      // Max retrait = 2 500$ par période
      const available = strategy.calculateAvailableForWithdrawal(
        100000,
        5000,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(2500) // Limité à 2 500$ par période
    })

    test("150K CASH: devrait respecter le seuil minimum de 154 500$", () => {
      const accountName = "Phidias 150K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 4400 }, // Seulement 4400$ de profit
      ]

      // Balance = 150 000 + 4400 = 154 400$ < 154 500$ (seuil minimum)
      const available = strategy.calculateAvailableForWithdrawal(
        150000,
        4400,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(0) // Pas de retrait possible si sous le seuil
    })

    test("150K CASH: devrait permettre le retrait avec limite de 2 750$ par période", () => {
      const accountName = "Phidias 150K CASH"
      const pnlEntries = [
        { date: new Date("2024-01-01"), amount: 6000 },
      ]

      // Balance = 150 000 + 6000 = 156 000$ >= 154 500$ (seuil minimum)
      // Disponible = 156 000 - 150 100 (solde min) = 5 900$
      // Max retrait = 2 750$ par période
      const available = strategy.calculateAvailableForWithdrawal(
        150000,
        6000,
        0,
        pnlEntries,
        "FUNDED",
        accountName,
        null
      )

      expect(available).toBe(2750) // Limité à 2 750$ par période
    })

    test("50K CASH: devrait avoir des règles de cycles de 10 jours", () => {
      const withdrawalRules = strategy.getWithdrawalRules(50000, "FUNDED", "Phidias 50K CASH", null)
      expect(withdrawalRules.requiresCycles).toBe(true)
      expect(withdrawalRules.cycleRequirements?.daysPerCycle).toBe(10)
      expect(withdrawalRules.cycleRequirements?.minDailyProfit).toBe(150) // 150$ pour 50K
    })

    test("100K CASH: devrait avoir minDailyProfit de 200$", () => {
      const withdrawalRules = strategy.getWithdrawalRules(100000, "FUNDED", "Phidias 100K CASH", null)
      expect(withdrawalRules.cycleRequirements?.minDailyProfit).toBe(200) // 200$ pour 100K
    })

    test("150K CASH: devrait avoir minDailyProfit de 250$", () => {
      const withdrawalRules = strategy.getWithdrawalRules(150000, "FUNDED", "Phidias 150K CASH", null)
      expect(withdrawalRules.cycleRequirements?.minDailyProfit).toBe(250) // 250$ pour 150K
    })
  })

  describe("Calculs de buffer et taxes", () => {
    test("ne devrait pas avoir de buffer pour Phidias", () => {
      const buffer = strategy.calculateBuffer(25000)
      expect(buffer).toBe(0)
    })

    test("devrait appliquer 20% de taxe pour tous les types de comptes Phidias", () => {
      const evalRules = strategy.getWithdrawalRules(25000, "EVAL", "Test", null)
      const cashRules = strategy.getWithdrawalRules(25000, "FUNDED", "Test CASH", null)
      const liveRules = strategy.getWithdrawalRules(25000, "FUNDED", "Test LIVE", null)

      expect(evalRules.taxRate).toBe(0.2)
      expect(cashRules.taxRate).toBe(0.2)
      expect(liveRules.taxRate).toBe(0.2)
    })
  })
})

