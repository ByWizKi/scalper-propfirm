module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité
        'fix',      // Correction de bug
        'docs',     // Documentation
        'style',    // Formatage, missing semi colons, etc.
        'refactor', // Refactorisation du code
        'perf',     // Amélioration des performances
        'test',     // Ajout ou modification de tests
        'build',    // Build system ou dépendances externes
        'ci',       // Configuration CI
        'chore',    // Tâches de maintenance
        'revert',   // Annulation d'un commit précédent
      ],
    ],
    'subject-case': [0], // Désactiver la validation de la casse du sujet
  },
}

