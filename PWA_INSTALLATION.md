# 📱 Installation de Scalper Propfirm en tant que PWA

Scalper Propfirm peut être installé sur votre téléphone ou tablette comme une application native pour une meilleure expérience utilisateur.

## 📲 Installation sur iOS (iPhone/iPad)

1. **Ouvrez Safari** (Safari uniquement, pas Chrome)
2. Naviguez vers `https://votre-domaine.com`
3. Appuyez sur le **bouton de partage** (icône carré avec une flèche vers le haut)
4. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**
5. Nommez l'application (par défaut: "Scalper Propfirm")
6. Appuyez sur **"Ajouter"**
7. L'icône apparaîtra sur votre écran d'accueil

### Caractéristiques iOS
- ✅ Fonctionne en mode plein écran (sans barre d'adresse)
- ✅ Icône sur l'écran d'accueil
- ✅ Cache hors ligne
- ✅ Expérience native

## 🤖 Installation sur Android

### Méthode 1: Via Chrome
1. **Ouvrez Chrome**
2. Naviguez vers `https://votre-domaine.com`
3. Appuyez sur le **menu** (3 points verticaux)
4. Sélectionnez **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
5. Confirmez en appuyant sur **"Installer"**
6. L'application sera ajoutée à votre écran d'accueil

### Méthode 2: Bannière automatique
1. Chrome affichera automatiquement une bannière en bas de l'écran
2. Appuyez sur **"Installer"** sur la bannière
3. L'application sera installée instantanément

### Caractéristiques Android
- ✅ Fonctionne en mode plein écran
- ✅ Icône sur l'écran d'accueil
- ✅ Cache hors ligne
- ✅ Notifications push (si activées)
- ✅ Expérience native indiscernable d'une app native

## 💻 Installation sur Desktop

### Chrome/Edge/Brave (Windows/Mac/Linux)
1. Ouvrez votre navigateur
2. Naviguez vers `https://votre-domaine.com`
3. Cliquez sur l'**icône d'installation** dans la barre d'adresse (à droite)
4. Ou Menu > **"Installer Scalper Propfirm"**
5. Confirmez l'installation
6. L'application sera disponible dans vos applications

## 🌟 Avantages de la PWA

### Performance
- ⚡ Chargement ultra-rapide
- 📦 Cache intelligent pour une utilisation hors ligne
- 🔄 Mises à jour automatiques

### Expérience utilisateur
- 📱 Interface mobile optimisée avec menu burger
- 🎨 Design responsive adapté à toutes les tailles d'écran
- 🌙 Support du mode sombre
- 🔒 Sécurité renforcée (HTTPS obligatoire)

### Accessibilité
- 📲 Accessible directement depuis l'écran d'accueil
- 🚀 Lancement instantané
- 💾 Moins d'utilisation de données grâce au cache
- 🔌 Fonctionne même avec une connexion limitée

## 🔧 Configuration technique

L'application est configurée pour fonctionner en mode **standalone** :
- Pas de barre d'adresse du navigateur
- Interface plein écran
- Expérience similaire à une application native

### Stratégie de cache
- **Network First** : Les données fraîches sont prioritaires
- **Cache Fallback** : Le cache est utilisé en cas d'échec réseau
- Les routes API ne sont jamais mises en cache pour garantir des données à jour

## ❓ Dépannage

### L'option d'installation n'apparaît pas
- Assurez-vous d'utiliser **HTTPS** (requis pour PWA)
- Vérifiez que vous utilisez un navigateur compatible (Chrome, Safari, Edge, Firefox)
- Essayez de recharger la page
- Sur iOS, utilisez **Safari** (pas Chrome)

### L'application ne fonctionne pas hors ligne
- Les API calls nécessitent toujours une connexion
- Seules les pages visitées sont mises en cache
- Naviguez dans l'app une première fois pour remplir le cache

### Comment désinstaller
- **iOS** : Maintenez l'icône appuyée > "Supprimer l'app"
- **Android** : Maintenez l'icône appuyée > "Désinstaller"
- **Desktop** : Paramètres de l'app > "Désinstaller"

## 📝 Notes

- Le service worker se met à jour automatiquement
- Les données sensibles ne sont jamais mises en cache
- L'application respecte votre vie privée

## 🆘 Support

En cas de problème, contactez le support à [support@scalper-propfirm.com](mailto:support@scalper-propfirm.com)

