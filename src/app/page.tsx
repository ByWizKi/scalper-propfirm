import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
  Upload,
  FileText,
  CheckCircle2,
  ArrowRight,
  Calculator,
} from "lucide-react"
import { AVAILABLE_PROPFIRMS, PROPFIRM_LABELS, PROPFIRM_LOGOS } from "@/lib/constants"

export default function Home() {
  const propfirms = AVAILABLE_PROPFIRMS.map((key) => ({
    key,
    label: PROPFIRM_LABELS[key],
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0a0f1a] dark:to-[#151b2e]">
      {/* Navigation */}
      <nav className="border-b border-slate-200/70 dark:border-[#1e293b]/70 bg-white/80 dark:bg-[#151b2e]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900 dark:text-slate-100" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Scalper Propfirm
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-md h-8 min-h-[36px] px-3 text-xs font-medium transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
              >
                Se connecter
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-lg h-8 min-h-[36px] px-3 text-xs bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm hover:shadow-md text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Gérez vos comptes propfirm
            <br />
            <span className="text-slate-600 dark:text-slate-300">en toute simplicité</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Plateforme professionnelle pour suivre vos comptes d&apos;évaluation et financés,
            gérer vos PnL, vos retraits et optimiser vos performances de trading.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-lg h-12 min-h-[48px] px-8 text-base font-medium transition-all duration-200 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm hover:shadow-md w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg h-12 min-h-[48px] px-8 text-base border border-slate-300 bg-transparent hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Fonctionnalités principales
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour gérer efficacement vos comptes propfirm
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Gestion de comptes
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Ajoutez et gérez tous vos comptes d&apos;évaluation et financés. Suivez leur statut,
              leurs règles spécifiques et leurs performances en temps réel.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Suivi PnL
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Enregistrez vos PnL quotidiennement avec un calendrier mensuel interactif. Visualisez
              vos performances et identifiez vos meilleurs jours de trading.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Gestion des retraits
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Gérez vos retraits avec calcul automatique des taxes selon la propfirm. Suivez vos
              cycles de trading et respectez les règles spécifiques à chaque propfirm.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Règles de validation
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Suivez votre progression pour valider vos comptes d&apos;évaluation. Visualisez en
              temps réel votre avancement sur les objectifs de profit, drawdown et cohérence.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <BarChart3 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Statistiques avancées
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Analysez vos performances avec des statistiques détaillées : ROI, moyenne quotidienne,
              meilleur jour, taux de réussite et bien plus encore.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Calculator className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Calculateurs
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Utilisez nos calculateurs pour planifier vos objectifs, estimer vos retraits et
              optimiser votre stratégie de trading.
            </p>
          </div>
        </div>
      </section>

      {/* Propfirms Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-slate-50/50 dark:bg-[#0a0f1a]/50">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Propfirms supportées
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Nous prenons en charge les principales propfirms avec leurs règles spécifiques
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {propfirms.map((propfirm) => (
            <div
              key={propfirm.key}
              className="rounded-xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-4 sm:p-6 text-center hover:shadow-md transition-shadow flex flex-col items-center justify-center"
            >
              <div className="mb-3 flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 p-2 overflow-hidden">
                <Image
                  src={PROPFIRM_LOGOS[propfirm.key]}
                  alt={propfirm.label}
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                  style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                  unoptimized
                />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {propfirm.label}
              </h4>
            </div>
          ))}
        </div>
      </section>

      {/* How to Add Data Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Comment ajouter vos données
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Plusieurs méthodes simples pour enregistrer vos PnL et vos trades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Method 1 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Saisie manuelle
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Ajoutez vos PnL quotidiennement via le formulaire dédié. Simple, rapide et précis.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Saisie jour par jour</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Ajout en masse possible</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Notes et détails optionnels</span>
              </li>
            </ul>
          </div>

          {/* Method 2 */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Import de trades
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Importez vos trades depuis vos fichiers CSV ou Excel. Gain de temps considérable pour
              les traders actifs.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Format CSV/Excel</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Import en masse</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Validation automatique</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-8 sm:p-12 text-center">
          <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à optimiser votre trading ?
          </h3>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines de traders qui utilisent Scalper Propfirm pour gérer leurs
            comptes propfirm efficacement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-lg h-12 min-h-[48px] px-8 text-base font-medium transition-all duration-200 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap"
            >
              Créer un compte gratuit
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg h-12 min-h-[48px] px-8 text-base border bg-white/10 border-white/20 text-white hover:bg-white/20 w-full sm:w-auto text-xs sm:text-sm px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © 2026 Scalper Propfirm. Tous droits réservés.
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-md h-8 min-h-[36px] px-3 text-xs font-medium transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-md h-8 min-h-[36px] px-3 text-xs font-medium transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                Inscription
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
