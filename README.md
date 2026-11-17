# Thymio · Magie

Un **tour de magie avec le Thymio 3** pour faire découvrir l'IMU, et en particulier la **gravité**: Thymio « lit dans la pensée » d'un volontaire. En réalité l'accéléromètre porte le nombre
(la façon dont le magicien tient le robot), la main du volontaire sous le robot le **fige**, et le gyroscope le fait tourner puis aller vers ce nombre.

Même base technique que [thymio3-draw](../thymio3-draw) et [thymio3-cards](../thymio3-cards): React + Vite + `thymio3-ts-api`, le tour tourne **sur le robot** (MicroPython), la page l'écoute, un robot virtuel jumeau
et un faux robot Bluetooth permettent de tout essayer sans matériel.

**La page en ligne: <https://francescomondada.github.io/thymio3-magic-imu/>** (publiée par GitHub Pages à chaque envoi sur `main`). Pour un vrai robot il faut un navigateur avec Web Bluetooth: Chrome ou Edge (ordinateur, Android), Samsung Internet, Bluefy sur iPhone et iPad; sans robot, le robot virtuel marche dans n'importe quel navigateur. Pour ouvrir la page sur d'autres tablettes ou téléphones: **Réglages → Lien vers l'application** affiche cette adresse en **code QR** plein écran (un code générique, un code pour Bluefy sur iOS).

**Essayé sur un vrai Thymio 3** le 16 novembre 2026, avec l'utilisateur: le tour entier a marché (voir « Statut » pour ce qui a été mesuré, et ce qui ne l'a pas été). Aussi essayé sans robot (robot virtuel, faux robot Bluetooth, tests).

## Le tour

Le plateau est `prediction-plate.pdf` (feuille A2, 594 × 420 mm): huit T, le **0 en bas**, puis **1 à 7 dans le sens des aiguilles d'une montre** (1 en bas à gauche, 2 à gauche, 3 en haut à gauche, **4 en haut**,
5 en haut à droite, 6 à droite, 7 en bas à droite). Thymio est posé **au centre, tourné vers le 0**.

| # | Ce que dit et fait le magicien | Ce que fait Thymio |
| --- | --- | --- |
| 1 | « Thymio sait lire dans la pensée. » | attend, à plat |
| 2 | Un volontaire pense à un nombre de 0 à 7 et le montre **avec la main** (pas de parole: Thymio a un micro) | attend |
| 3 | Le magicien prend Thymio et le montre au public, **debout, le dessus (boutons) vers lui et le dessous vers les spectateurs**, tourné comme le plateau qu'il regarde: **avant en haut = 4, avant à sa droite = 6, avant en bas = 0, avant à sa gauche = 2** (et les diagonales) | lit la gravité: il sait de quel côté est le bas, donc le nombre. Il attend que ce nombre reste le même une demi-seconde |
| 4 | « Pose ta main sous Thymio. » | ses capteurs du dessous voient la main: **le nombre est verrouillé** (cercle de LED qui tourne, petit bip). Plus rien ne peut le changer |
| 5 | Il pose Thymio **à plat** sur le plateau, tourné vers le 0 | il se sent posé (gravité par le dessous, une demi-seconde): prêt |
| 6 | Il appuie sur le **bouton du milieu** | **une seule rotation vers la droite**: un tour complet puis il continue de tourner dans le même sens jusqu'à son nombre (360° + n × 45°, gyroscope), en ralentissant pour s'arrêter dessus; **la première fois depuis le démarrage du programme, il se trompe**: il va un nombre trop loin (360° + (n + 1) × 45°), s'arrête 0,8 s, puis revient (vers la gauche) sur le bon nombre; ensuite il avance en ligne droite (gyroscope), puis **musique et clignotement** |
| 7 | « Le secret: la gravité, l'accéléromètre… » | de nouveau libre pour un autre volontaire |

## Comment le robot lit le nombre

L'accéléromètre du Thymio 3 donne `imu.get_acc()` = (ax, ay, az), brut, 16384 = 1 g. D'après le firmware (`accelerometer.c`, `gyroscope.c`: le robot **à plat sur ses roues lit az ≈ +16384**, `sequence.c`: robot sur le côté = |ay| grand),
l'accéléromètre lit le vecteur « **vers le haut** » dans le repère du robot: x vers l'avant, y vers la gauche, z vers le haut. Le robot tenu comme dans le tour a son dessous vers le public, son axe z est horizontal (az ≈ 0) et
(ax, ay) est la direction du haut dans le plan du robot. **C'est le modèle** (robot virtuel, tests); le premier essai sur un vrai robot (16 nov.) l'a trouvé tourné d'un demi-tour, voir plus bas:

| Le robot est tenu… | nombre | (ax, ay) |
| --- | --- | --- |
| avant en haut | 4 | (+, 0) |
| avant à droite (du magicien) | 6 | (0, −) |
| avant en bas | 0 | (−, 0) |
| avant à gauche | 2 | (0, +) |

Le nombre est l'angle de (ax, ay) en pas de 45°: `n = (4 + dirn × round((angle − theta4) / 45°)) mod 8`, avec `theta4 = 0` et `dirn = −1` dans le modèle. **Sur le vrai robot, la page envoie `theta4 = 180°` (écrit −180) et `dirn = +1`** (`REAL_TILT` dans `src/spec.js`): déduit du premier essai (16 nov.), où avant en haut se lisait 0 et avant à gauche se lisait 2 avec le modèle, donc (ax, ay) = (−, 0) pour 4 et (0, +) pour 2. Ce n'est pas une mesure des valeurs brutes: l'étalonnage les remesure. Pas de `math` sur le robot (l'`atan2` est écrit à la main, erreur < 0,1°).
**Une marge** (0,15 secteur, soit environ 7°) évite qu'un nombre clignote à la limite de deux secteurs; l'accéléromètre est lissé (0,4). Le robot est « debout » quand `|az| < 7000` (à 25° de la verticale), le nombre est
« stable » après 25 ticks (0,5 s) sur le même nombre, et un nombre stable compte encore 2 s après (le temps que la main arrive). À plat: `az > 15000` et |ax|, |ay| < 5000 pendant 0,5 s.

**Étalonnage en deux poses** (Réglages → « Étalonnage de l'inclinaison »): les signes des axes viennent de la lecture du firmware, **pas d'une mesure sur un robot**. Si le nombre lu est faux (miroir, ou décalé), on tient le robot debout, le dessus vers soi,
avant en haut (4), on appuie sur « Mesurer », puis avant **à sa droite** (6): la page calcule `theta4` et `dirn` (moyenne sur 1 s, refus si le robot n'est pas debout, bouge, ou si les deux poses ne sont pas à un quart de tour), les
garde sur l'appareil et **relance le mode** avec ces deux nombres, **dès que les deux mesures sont bonnes** (il n'y a pas de bouton « Appliquer »; la ligne « Étalonnage actuel » change).

## Les états du robot

`src/py/magic_mode.py`, une boucle de 20 ms (comme les autres modes):

| État | Entre quand | Sort quand |
| --- | --- | --- |
| `wait` | au départ, et après le spectacle | debout + main ≥ 0,2 s + un nombre stable → `locked` |
| `locked` | le nombre est figé | à plat 0,5 s → `ready` |
| `ready` | posé à plat | bouton du milieu → `spin`; pas à plat 0,2 s → `locked` |
| `spin` `drive` | le spectacle | soulevé 0,2 s (az < 10000) à n'importe quel moment: **arrêt**, retour à `locked`; sinon la suite |
| `finale` | l'arrivée | musique (11 notes, 3,6 s) et 12 clignotements, puis `wait` |

**Effacer**: le robot **retourné sur le dos** une demi-seconde (az < −13000, comme le geste « tout effacer » du mode Séquence du firmware) pendant `locked` ou `ready` oublie le nombre et revient à `wait` (un son grave). C'est le seul moyen de recommencer qui se fait sur le robot: le magicien a les mains prises et la page n'est pas faite pour être touchée.

Le bouton du milieu ne sert que dans `ready` (ailleurs il est ignoré, la page le dit). Le robot reste **noir** tant qu'il ne se passe rien; au verrouillage le cercle se remplit en tournant puis un halo bleu discret reste (vert quand il est prêt).

- **La main**: `thymio.GROUND(0/1).value()` (`prox.ground.delta` du firmware: blanc ≈ 950, noir ≈ 0, tout près), un des deux capteurs au-dessus du seuil (**300** par défaut, réglable 80–900; arrêt à 60 % du seuil).
- **Le tour**: `imu.reset_angle()`, puis **un seul** `rotate_deg_absolute(−(360 + 45 n), 500)` (le contrôleur d'angle du firmware, comme le mode Séquence de thymio3-cards): le robot tourne vers la droite à pleine vitesse, passe le tour complet sans s'arrêter et ralentit sur son nombre (il ne prend pas le chemin le plus court: 0 fait un tour, 4 un tour et demi, 7 un peu moins de deux tours). 0,3 s de pause avant l'avance.
- **L'avance**: la boucle de cap du firmware portée (`straight_controller.c`, comme thymio3-draw), vitesse 200, minuteur matériel. La durée vient de la **calibration « 15 cm » du robot** et de la perte au démarrage et au freinage mesurée par thymio3-draw
  (`TAU300_S = 0,115 s`): `t = distance / (vitesse × k) + 0,115 × vitesse / 300`. Distance par défaut **90 mm** (le robot, de 11 cm, a alors son avant au niveau de la barre du T; le centre de la barre est à 139 mm du centre du plateau), réglable de 30 à 200 mm.

## La page

Une barre fine en haut (le cerveau ouvre les réglages, l'état de la liaison, **Connecter Thymio**), puis trois parties. **Rien à toucher pendant le tour**: le magicien a les mains prises, la page se regarde, et **l'étape change toute seule** selon ce que fait le robot (couché → debout → main → posé → bouton → tour → fin).

1. **À dire au public** (en haut): la phrase de l'étape en cours, en grand, rien d'autre. Six étapes: *Présentation* (le robot est posé; la présentation et le volontaire en une seule phrase), *Thymio lit* (tenu debout; la phrase de la main s'y ajoute), *Garder le nombre* (il est gardé: le poser), *Le bouton*, *Le tour*, *Le secret* (la gravité, jusqu'à ce que le robot soit repris debout pour un autre volontaire).
2. **Ce que Thymio lit** (la plus grande, par icônes): le plateau en cadran (les huit nombres où ils sont sur le plateau), le robot au milieu **qui tourne comme on le tourne**, la **gravité** (flèche orange, toujours vers le bas) qui est ce qu'il sent, le gros nombre lu (bleu, plus vif quand il est stable), puis gardé (vert, cadenas), puis le résultat; dessous, **cinq icônes qui suivent le tour**: *Lecture* (robot debout), *Main* (qui devient un **cadenas** quand le nombre est gardé: c'est la validation), *Posé* (à plat), *Bouton*, *Show*. Chacune s'allume quand ça se passe et devient verte quand c'est fait.
3. **Étape en cours**: deux phrases sur ce que fait Thymio et pourquoi (la science de l'IMU), et les avertissements s'il y en a (main arrivée trop tôt, bouton ignoré, robot soulevé pendant le tour, connexion perdue).

**En paysage** (tablette ou ordinateur large, de 721 px de large et jusqu'à 900 px de haut; un iPad en paysage n'a que 600 à 800 px sous les barres du navigateur): deux colonnes, **la phrase et l'étape en cours à gauche, « Ce que Thymio lit » à droite**, pour que le cadran, le nombre et les **cinq icônes** tiennent dans l'écran sans défiler. Le cadran se règle sur la hauteur. Plus haut que 900 px, ou en portrait, c'est une seule colonne.

Sans robot connecté, la page est en **robot virtuel** et ajoute en bas un panneau **replié** pour répéter: tenir le robot debout à un nombre, poser la main, le poser à plat, le retourner sur le dos, appuyer, avec le plateau où le robot virtuel va vers son nombre (vitesse ×1 à ×10, sons par le navigateur). Une fois le vrai robot connecté, ce panneau disparaît.

**Réglages** (le cerveau, en haut à gauche, pour la mise en place): langue (français, anglais, italien, allemand; au départ la première langue du navigateur parmi ces quatre, sinon le français), thème; **le lien vers l'application** (deux boutons: code QR générique, code QR « iOS · Bluefy »; l'adresse est écrite dessous); **Recommencer**; **cacher le nombre à l'écran** (si le public voit l'écran: ni le nombre ni l'inclinaison); sons; distance; seuil de la main (avec la lecture en direct); l'étalonnage; **le secours** (« imposer un nombre »: si la main n'a pas marché, le robot repart avec ce nombre déjà gardé: le poser à plat et appuyer); le robot, le journal de la liaison, un test de la liaison, le programme Python.

## La page et le robot

```
 page  ◀─(stdout: lignes "@@…" de 100 octets)──  mode sur le robot (magic_xxxxxxxx.py)
 page  ──(relance le mode avec d'autres arguments)──▶
```

Contrairement aux pages Dessin et Cartes, **la page ne dit rien au mode pendant qu'il tourne**: le tour, c'est ses capteurs, il est autonome (une coupure Bluetooth ne l'arrête pas). Pour changer un réglage, imposer un nombre
ou recommencer, la page **relance** le mode: `import magic_x; magic_x.run(theta4, dirn, dist, hand, force, sound)` (un septième argument, `slip`, que la page n'envoie pas, éteint l'erreur de la première fois) (le module est installé une fois, `src/robot/robot-backend-core.js`).

`@@n ms état verrouillé nombre drapeaux ax ay az sol_g sol_d` toutes les 100 ms porte tout ce que la page montre (état 0 à 6, verrouillé −1 ou 0..7, nombre lu −1 ou 0..7, drapeaux 1 debout, 2 à plat, 4 main, 8 stable,
16 bouton). Les autres lignes (`@@lock`, `@@placed`, `@@lifted`, `@@go`, `@@phase`, `@@end`, `@@abort`, `@@ignored`, `@@cfg`, `@@hello`, `@@bat`, `@@bye`) disent ce qui s'est passé; **pour suivre le tour la page ne s'appuie sur aucune d'elles** (seuls les avertissements en dépendent): des lignes se perdent
en route sur un vrai robot (journal de thymio3-draw), donc une fin de spectacle dont `@@end` s'est perdu est reconnue au retour à `wait` (`src/store.js`).

## Robot virtuel, faux robot, tests

- `src/sim/*`: la physique (la même que `tests/fake_magic_robot.py`), le **mode réécrit en JavaScript** (`magic-mode.js`, ligne à ligne), le robot virtuel et son bruit d'accéléromètre.
- `?fakerobot` dans l'adresse remplace Bluetooth et le robot par un **faux robot** (`src/dev/fake-thymio.js`): téléversement du module, lanceur, arrêt avec son Traceback, lignes perdues (`window.fakeRobot.flags.lose`)…
  `window.fakeRobot.hold(n)`, `lay()`, `hand(true)`, `press()` jouent le côté du robot.
- `tests/test_magic_mode.py` fait tourner **le vrai script Python** sur un robot virtuel: les huit nombres lus (et les poses documentées, l'inclinaison hors du plan jusqu'à 24°, l'étalonnage, la marge), la main (seuil, un capteur suffit, trop tôt, trop longtemps avant), le verrou figé,
  la pose à plat, le bouton ignoré avant l'heure, le spectacle pour chaque nombre (cap final à 4° près, distance à 12 mm près, tour complet sur place), les notes de la musique, le robot soulevé au milieu du tour, un moteur faible, un firmware sans `play_tone`, sans `GROUND`, sans les autres LED, les lignes (cadence, remplissage à 100 octets), le nettoyage.
- `tests/magic.test.js`: le **jumeau JavaScript fait exactement ce que fait le Python**, ligne par ligne et à la milliseconde, sur 20 scénarios (`tests/golden-magic.json`, réécrit par `npm run golden` si le mode Python change).
- `tests/link.test.js`: la liaison complète contre le faux robot (module installé une fois, anciens modules effacés, lanceur, tour entier, relance avec d'autres arguments, nombre imposé, repli sur le mode entier, lignes d'événement toutes perdues, arrêt, test de la liaison).
- `tests/spec.test.js` (poses, étalonnage), `tests/protocol.test.js`, `tests/store.test.js` (le tour entier du robot virtuel jusqu'au store), `tests/i18n.test.js` (aucune clé manquante dans les quatre langues, la langue du navigateur).
- La page a été regardée dans un navigateur (ordinateur 1100 × 900, 800 × 900, téléphone 375 × 812 et 360 × 640, paysage 844 × 390 (là, les icônes demandent encore de défiler); **tablette en paysage 1024 × 600, 1133 × 700, 1180 × 820, 1366 × 900** (les icônes sont dans l'écran, mesuré en anglais, allemand, français, italien pour 1024 × 600), portrait 820 × 1180; clair et sombre; les quatre langues (étiquettes des cinq icônes à 360 et 375 px, réglages en allemand); robot virtuel et faux robot; étalonnage et connexion par le faux robot).

## Lancer, tester, déployer

```bash
npm install          # l'API Thymio vient de GitHub: github:Mobsya/thymio3-ts-api#main
npm run dev          # http://localhost:5173 (Web Bluetooth demande https ou localhost: Chrome, Edge, Bluefy sur iPhone)
npm test             # JavaScript (node --test), liaison, Python
npm run golden       # réécrit tests/golden-magic.json si le mode Python change
npm run build
```

Le dépôt est `FrancescoMondada/thymio3-magic-imu`; `.github/workflows/deploy.yml` (le même que celui des autres pages) publie la page sur GitHub Pages à chaque envoi sur `main`, une fois Pages activé dans les réglages du dépôt (source: GitHub Actions). L'image `AdobeStock_418124851.svg` (le cerveau, image de stock sous licence) **n'est pas dans le dépôt**; ses tracés sont dans `src/assets/brain.js`.

## Statut — à lire

**Essayé sur un vrai robot le 16 novembre 2026** par l'utilisateur, en deux temps. D'abord la lecture du nombre: les axes de l'accéléromètre étaient à l'envers du modèle (voir « Étalonnage »), corrigé par `REAL_TILT` puis confirmé (4, 2, 6 et 0 s'allument juste). Ensuite **le tour entier, avec l'erreur de la première fois: « tout ok »** (le retour de l'utilisateur, sans chiffres): la main sous le robot, le verrouillage, la pose à plat, le bouton, la rotation continue, l'erreur d'un nombre et le retour, l'avance, la musique et le clignotement.

**Rien n'a été relevé pendant l'essai**: je n'ai donc ni les lectures brutes de l'accéléromètre aux quatre poses, ni celles des capteurs du dessous avec une main et à vide (seuil de **300**, gardé), ni la durée réelle du tour, ni la distance parcourue en mm (**90**, gardée). Je ne sais pas non plus si la musique a joué par `snd.play_tone(freq, dixièmes)` (sa définition manque dans les sources que j'ai lues) ou par le son de repli du firmware (11): le mode ne le dit pas. À relever si l'on veut des chiffres: l'étalonnage affiche (ax, ay, az) en direct, le journal de la liaison garde tout ce que dit le robot.

Pas essayé, ou je ne sais pas: l'**étalonnage par les deux poses** appliqué tout seul (le réglage par défaut a suffi), l'**erreur éteinte** (`slip=0`, que la page n'envoie pas), le **geste « sur le dos »** (le retour « tout ok » ne dit pas s'il a servi), et les réglages **distance** et **seuil de la main** autres que leurs valeurs par défaut.

**Mes choix** (aucune remarque après le premier essai complet): la demi-seconde de stabilité, la phase de 0,2 s pour la main, la marge de 7° entre deux nombres, **le robot soulevé pendant le tour s'arrête** (retour à « verrouillé »), **le geste « sur le dos » pour effacer** (le magicien ne peut pas toucher la page), le retour tout seul à `wait` après la musique, les étapes qui changent seules (et la présentation et le volontaire réunis dans une phrase: rien ne bouge entre les deux), le **petit bip et le cercle qui tourne** au verrouillage (ils annoncent la lecture au public, mais c'est du théâtre que le magicien peut ne pas vouloir: Réglages → Sons), le halo bleu et vert (visible de côté), la musique, la vitesse du tour (500), **l'erreur de la première fois** (un nombre trop loin, **0,8 s** de pause, retour par le chemin court à la même vitesse; pas de réglage pour l'éteindre: seul `run(..., slip=0)` le fait; elle est « consommée » quand le robot s'est arrêté trop loin, donc un robot soulevé avant ça la refait au prochain essai, et **"Recommencer", un changement de réglage ou une reconnexion relancent le programme: elle revient**; le 7 va 2 tours), le bouton du milieu **seulement** quand le robot est à plat, le texte de la phrase 2 (« montre-le avec ta main » sur le plateau), tout le texte des phrases et des explications, **tous les textes sont de moi, dans les quatre langues** (français, anglais, italien, allemand): l'anglais, l'italien et l'allemand demandent la relecture d'un locuteur natif (le tutoiement, « tavola » et « Platte » pour le plateau, « Show » pour le spectacle).

Le **code QR du lien vers l'application** (Réglages) est le même que celui de [thymio3-cards](../thymio3-cards): il contient toujours l'adresse publiée ci-dessus (jamais celle de la page ouverte, pour qu'un essai sur `localhost` donne quand même un lien que les autres écrans atteignent; un fork change `APP_URL` dans `src/share.js`). **Pas essayé avec une caméra de téléphone**: les tests relisent le code avec un décodeur. Le code « Bluefy » (`bluefy://open?url=` + l'adresse) est la forme usuelle, **pas une forme confirmée** par la documentation de Bluefy: à essayer sur un iPad. Pas de code pour Chrome sur Android (le lien `intent://` n'est pas ouvert par l'appareil photo d'un Samsung).

Pas fait: le code QR de **configuration** (les autres pages en ont un: ici il n'y a presque rien à transmettre), un moyen de modifier le texte des phrases dans la page (elles sont dans `src/i18n.js`), un réglage pour éteindre l'erreur de la première fois.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `src/py/magic_mode.py` | Le tour en MicroPython, qui tourne sur le robot |
| `src/spec.js` | Constantes, lecture du nombre (`plateNumber`), étalonnage (`calibrate`), arguments du mode (`runArgs`), géométrie du plateau |
| `src/protocol.js` | Les lignes `@@` du robot |
| `src/share.js`, `src/qr.js`, `src/components/QrShow.jsx` | Le lien vers l'application (`APP_URL`, `APP_LINKS`), le code QR (`qrcode-generator`) et son affichage plein écran |
| `src/store.js` | Ce que la page sait du robot, l'étape en cours (`currentStep`) |
| `src/script.js`, `src/script-core.js` | Le mode comme module (réduit, nom à base de hash) |
| `src/robot/robot-backend-core.js`, `robot-backend.js` | Liaison Web Bluetooth: file d'opérations, module, lanceur, arrêt, repli, journal |
| `src/sim/*` | Physique du robot, mode en JavaScript, robot virtuel |
| `src/dev/fake-thymio.js`, `src/api.js` | Faux robot Bluetooth (`?fakerobot`); `api.js` choisit le vrai ou le faux |
| `src/App.jsx` | État, robot virtuel ou réel, relances, clavier, mise en page |
| `src/components/Say.jsx`, `Live.jsx`, `Dial.jsx`, `Explain.jsx` | Les trois parties, et le cadran du plateau |
| `src/components/Simulator.jsx`, `Settings.jsx`, `LinkInfo.jsx` | Le robot virtuel, les réglages (dont l'étalonnage), l'état de la liaison |
| `src/i18n.js`, `src/styles.css`, `src/icons.jsx`, `src/assets/brain.js` | Textes (FR, EN, IT, DE), style (couleurs en jetons, clair et sombre), icônes (le cerveau est `AdobeStock_418124851.svg`) |
| `tests/` | `node --test`, liaison, Python (`test_magic_mode.py`, `fake_magic_robot.py`) |
| `prediction-plate.pdf`, `scenario.txt` | Le plateau et le scénario de départ |
