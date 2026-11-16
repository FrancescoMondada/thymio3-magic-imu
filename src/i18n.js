// The texts of the page, in French, English, Italian and German. Every key exists in all four (tests/i18n.test.js). The lines "à dire au public" are the script of
// the trick: change them here to make the trick your own.
export const LANGS = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'it', label: 'Italiano' },
  { id: 'de', label: 'Deutsch' },
];

const fr = {
  app: { title: 'Thymio · Magie', subtitle: 'Lire dans la pensée avec la gravité' },
  head: {
    connect: 'Connecter Thymio', disconnect: 'Déconnecter', connecting: 'Connexion…', lost: 'Connexion perdue', demo: 'Robot virtuel', device: 'Thymio',
    battery: 'Batterie', settings: 'Réglages', themeLight: 'Clair', themeDark: 'Sombre',
    noBluetooth: 'Ce navigateur ne sait pas parler à Thymio. Utilise Chrome (ordinateur ou Android) ou Bluefy (iPhone, iPad).',
    start: 'Le robot démarre…',
  },
  say: {
    title: 'À dire au public',
    lines: [
      'Voici Thymio, un petit robot. Il a un capteur très spécial : il sait lire dans la pensée ! J’ai besoin d’un volontaire. Pense à un nombre entre 0 et 7, ceux du plateau, et montre-le avec ta main, sans le dire : Thymio a un micro !',
      'Est-ce que Thymio aurait pu connaître ce nombre ? Je ne lui ai rien dit. Regardez, je le tiens simplement comme ça… Pose ta main sous Thymio : c’est avec ta main qu’il lit dans ta pensée.',
      'C’est fait : il a lu ! Je le pose au centre du plateau, tourné vers le 0.',
      'J’appuie sur son bouton, et Thymio se concentre…',
      'Il tourne sur lui-même, de plus en plus lentement… il s’arrête sur ton nombre, et il y va !',
      'Le secret ? Thymio sent la gravité ! Son accéléromètre sent où est le bas, comme une bille dans un bol. En le tenant debout, je lui ai donné ton nombre par l’inclinaison. Ta main, sous lui, lui a fait garder le nombre. Et pour tourner, il utilise son gyroscope.',
    ],
  },
  steps: {
    names: ['Présentation', 'Thymio lit', 'Garder le nombre', 'Le bouton', 'Le tour', 'Le secret'],
    explain: [
      'Thymio attend, posé à plat. Dans Thymio, une « IMU » réunit deux capteurs : un accéléromètre et un gyroscope.',
      'Thymio mesure la gravité avec son accéléromètre : il sent de quel côté est le bas, donc comment on le tient. Chaque huitième de tour (45°) donne un autre nombre. Quand une main est sous lui, ses capteurs infrarouges la voient et il garde le nombre.',
      'Le nombre est gardé : plus rien ne peut le changer. Thymio attend d’être posé à plat : il le sent parce que la gravité passe maintenant par son dessous. Pour effacer le nombre, retourne Thymio sur le dos.',
      'Thymio se sent posé à plat. Il attend qu’on appuie sur son bouton du milieu.',
      'Le gyroscope mesure la vitesse de rotation : en l’additionnant, Thymio connaît son angle. Il fait un tour complet et continue jusqu’au bon angle. La première fois, il va un nombre trop loin, s’arrête un instant, puis revient au bon nombre. Ensuite il avance tout droit et joue sa musique.',
      'Le téléphone dans ta poche utilise la même gravité pour savoir quand tourner son écran. Prends Thymio debout pour un autre volontaire.',
    ],
  },
  live: {
    title: 'Ce que Thymio lit', reads: 'Thymio lit', lockedLabel: 'Nombre gardé', resultLabel: 'Le nombre était', hiddenLabel: 'Nombre caché',
    dial: 'Plateau de prédiction : le nombre que Thymio lit', gravity: 'gravité',
    caption: {
      idle: 'Thymio n’est pas connecté', notUpright: 'Thymio est posé', unsteady: 'Thymio hésite…', steady: 'Nombre stable', handWait: 'Main détectée…',
      locked: 'Nombre gardé', ready: 'Prêt : appuie sur le bouton', spin: 'Thymio se concentre…', drive: 'Il y va !', finale: 'Et voilà !', after: 'Spectacle terminé',
    },
    progress: { read: 'Lecture', hand: 'Main', locked: 'Gardé', placed: 'Posé', button: 'Bouton', show: 'Show' },
  },
  notice: {
    unsteady: 'La main est arrivée avant que Thymio ait un nombre stable. Tiens-le immobile une seconde, puis la main.',
    nolock: 'Bouton ignoré : aucun nombre n’est gardé. Passe d’abord par la main.',
    notflat: 'Bouton ignoré : Thymio n’est pas posé à plat. Pose-le sur le plateau.',
    'abort-lifted': 'Thymio a été soulevé pendant le tour : il s’est arrêté. Pose-le à plat et appuie à nouveau sur le bouton.',
    error: 'Le robot a signalé une erreur :',
    reconnect: 'La connexion avec Thymio est perdue. Reconnecte-le avec le bouton en haut.',
  },
  explain: { title: 'Étape en cours', forced: 'Nombre imposé par la page (la main n’a pas servi)' },
  sim: {
    title: 'Robot virtuel', hint: 'Répète le tour sans robot : tiens Thymio debout à un nombre, pose la main, pose-le à plat, appuie sur le bouton.',
    hold: 'Tenir debout à', lay: 'Poser à plat', flip: 'Retourner sur le dos', hand: 'Main sous le robot', press: 'Bouton du milieu', speed: 'Vitesse', plate: 'Le plateau',
    held: 'Tenu debout', laid: 'À plat', handOn: 'Retirer la main', handOff: 'Poser la main',
  },
  set: {
    title: 'Réglages', close: 'Fermer', language: 'Langue', theme: 'Thème',
    show: 'Spectacle', restart: 'Recommencer', restartHint: 'Efface le nombre et remet le programme du robot au départ. Sur le robot: le retourner sur le dos une demi-seconde efface aussi le nombre.', hide: 'Cacher le nombre à l’écran', hideHint: 'Si le public peut voir cet écran : le nombre et l’inclinaison ne sont plus montrés.', yes: 'Oui', no: 'Non',
    sound: 'Sons du robot', soundHint: 'Le petit bip de la lecture et la musique de la fin.',
    dist: 'Distance jusqu’au nombre', distUnit: 'mm', distHint: 'Le robot s’arrête à cette distance du centre du plateau (le plateau A2 : environ 140 mm jusqu’aux barres).',
    hand: 'Seuil de la main', handHint: 'Le robot voit une main quand un de ses capteurs du dessous dépasse ce nombre. La lecture en direct est ci-dessous.', handNow: 'Lecture maintenant',
    needsRobot: 'Avec le robot connecté, le changement est envoyé au robot (il redémarre, le nombre est effacé).',
    calib: 'Étalonnage de l’inclinaison',
    calibHint: 'À refaire avec un vrai robot si le nombre lu est faux (miroir ou décalé). Tiens-le debout comme pendant le tour, le dessus (les boutons) vers toi et le dessous vers le public, comme le plateau que tu regardes : avant en haut = 4, à ta gauche = 2, à ta droite = 6. Bien immobile. Dès que les deux mesures sont bonnes, c’est appliqué.',
    calibNow: 'Étalonnage actuel', calibDefault: 'par défaut (réglé d’après le premier essai sur un robot)', calibAngle: 'angle du 4', calibSense: 'sens',
    calibStep4: '1. Avant en haut (nombre 4)', calibStep6: '2. Avant vers ta droite (nombre 6)', measure: 'Mesurer', measuring: 'Mesure…', measured: 'mesuré',
    calibLive: 'Lecture maintenant', calibDone: 'Étalonnage appliqué : le robot redémarre.', calibReset: 'Revenir au défaut', calibDemo: 'L’étalonnage demande un vrai robot connecté.',
    calibErr: { vertical: 'Le robot n’est pas assez debout : tiens-le droit, le dessus vers toi, le dessous vers le public.', quarter: 'Les deux positions ne sont pas à un quart de tour l’une de l’autre.', still: 'Le robot bougeait trop : recommence, plus immobile.' },
    force: 'Secours : imposer un nombre', forceHint: 'Si la main n’a pas marché : le robot repart avec ce nombre déjà verrouillé. Pose-le à plat, tourné vers le 0, et appuie sur le bouton.',
    forceNumber: 'Imposer le', forceDemo: 'Avec le robot virtuel, il suffit de choisir le nombre à l’écran.',
    robot: 'Robot', device: 'Nom', firmware: 'Micrologiciel', batteryRow: 'Batterie', mode: 'Programme du robot', modeUp: 'en marche', modeDown: 'arrêté',
    log: 'Journal de la liaison', logHint: 'Tout ce qui passe entre la page et le robot. À copier si quelque chose ne marche pas.', logEmpty: 'Rien pour l’instant.',
    logCopy: 'Copier le journal', logClear: 'Effacer', copied: 'Copié', test: 'Tester la liaison', testing: 'Test en cours…',
    testHint: 'Envoie un tout petit programme qui fait clignoter les LED du dessus en vert.',
    script: 'Programme du robot', scriptHint: 'Le Python qui tourne sur Thymio (il est installé une seule fois, la page le renvoie si on le change).', show2: 'Afficher', hide2: 'Masquer', copy: 'Copier', download: 'Télécharger',
    lastError: 'Dernière erreur',
    about: 'Un tour de magie pour découvrir l’IMU de Thymio 3 : l’accéléromètre (la gravité) transporte le nombre, la main sous le robot le fige, le gyroscope le fait tourner vers lui. Essayé avec un vrai robot : voir le fichier LISEZMOI.',
  },
};

const en = {
  app: { title: 'Thymio · Magic', subtitle: 'Mind reading with gravity' },
  head: {
    connect: 'Connect Thymio', disconnect: 'Disconnect', connecting: 'Connecting…', lost: 'Connection lost', demo: 'Virtual robot', device: 'Thymio',
    battery: 'Battery', settings: 'Settings', themeLight: 'Light', themeDark: 'Dark',
    noBluetooth: 'This browser cannot talk to Thymio. Use Chrome (computer or Android) or Bluefy (iPhone, iPad).',
    start: 'The robot is starting…',
  },
  say: {
    title: 'To say to the audience',
    lines: [
      'This is Thymio, a little robot. It has a very special sensor: it can read minds! I need a volunteer. Think of a number from 0 to 7, the ones on the plate, and show it with your hand, without saying it: Thymio has a microphone!',
      'Could Thymio have known this number? I told it nothing. Look, I am just holding it like this… Put your hand under Thymio: it reads your mind through your hand.',
      'Done: it has read it! I put it in the middle of the plate, facing 0.',
      'I press its button, and Thymio concentrates…',
      'It spins around, slower and slower… it stops on your number, and goes to it!',
      'The secret? Thymio feels gravity! Its accelerometer feels where down is, like a marble in a bowl. By holding it upright I gave it your number through the tilt. Your hand under it made it keep the number. And to turn, it uses its gyroscope.',
    ],
  },
  steps: {
    names: ['Introduction', 'Thymio reads', 'Keep the number', 'The button', 'The turn', 'The secret'],
    explain: [
      'Thymio waits, lying flat. Inside Thymio, an “IMU” combines two sensors: an accelerometer and a gyroscope.',
      'Thymio measures gravity with its accelerometer: it feels which way is down, so how it is held. Every eighth of a turn (45°) gives another number. When a hand is under it, its infrared sensors see it and it keeps the number.',
      'The number is kept: nothing can change it any more. Thymio waits to be put down flat: it feels it because gravity now goes through its underside. To erase the number, turn Thymio on its back.',
      'Thymio feels it is lying flat. It waits for its middle button to be pressed.',
      'The gyroscope measures how fast it turns: adding it up, Thymio knows its angle. It makes a full turn and goes on to the right angle. The first time, it goes one number too far, stops for a moment, then comes back to the right number. Then it drives straight and plays its music.',
      'The phone in your pocket uses the same gravity to know when to turn its screen. Pick Thymio up for another volunteer.',
    ],
  },
  live: {
    title: 'What Thymio reads', reads: 'Thymio reads', lockedLabel: 'Number kept', resultLabel: 'The number was', hiddenLabel: 'Number hidden',
    dial: 'Prediction plate: the number Thymio reads', gravity: 'gravity',
    caption: {
      idle: 'Thymio is not connected', notUpright: 'Thymio is lying down', unsteady: 'Thymio is hesitating…', steady: 'Steady number', handWait: 'Hand detected…',
      locked: 'Number kept', ready: 'Ready: press the button', spin: 'Thymio is concentrating…', drive: 'Off it goes!', finale: 'There it is!', after: 'Show over',
    },
    progress: { read: 'Reading', hand: 'Hand', locked: 'Kept', placed: 'Put down', button: 'Button', show: 'Show' },
  },
  notice: {
    unsteady: 'The hand came before Thymio had a steady number. Hold it still for a second, then the hand.',
    nolock: 'Button ignored: no number is kept. Go through the hand first.',
    notflat: 'Button ignored: Thymio is not lying flat. Put it on the plate.',
    'abort-lifted': 'Thymio was lifted during the turn: it stopped. Put it down flat and press the button again.',
    error: 'The robot reported an error:',
    reconnect: 'The connection to Thymio is lost. Connect it again with the button at the top.',
  },
  explain: { title: 'Current step', forced: 'Number set by the page (the hand was not used)' },
  sim: {
    title: 'Virtual robot', hint: 'Rehearse without a robot: hold Thymio upright at a number, put the hand under it, put it down flat, press the button.',
    hold: 'Hold upright at', lay: 'Put down flat', flip: 'Turn on its back', hand: 'Hand under the robot', press: 'Middle button', speed: 'Speed', plate: 'The plate',
    held: 'Held upright', laid: 'Flat', handOn: 'Remove the hand', handOff: 'Put the hand',
  },
  set: {
    title: 'Settings', close: 'Close', language: 'Language', theme: 'Theme',
    show: 'Show', restart: 'Start over', restartHint: 'Clears the number and starts the robot’s program again. On the robot: turning it on its back for half a second also clears the number.', hide: 'Hide the number on screen', hideHint: 'If the audience can see this screen: the number and the tilt are no longer shown.', yes: 'Yes', no: 'No',
    sound: 'Robot sounds', soundHint: 'The little beep of the reading and the music at the end.',
    dist: 'Distance to the number', distUnit: 'mm', distHint: 'The robot stops this far from the middle of the plate (the A2 plate: about 140 mm to the bars).',
    hand: 'Hand threshold', handHint: 'The robot sees a hand when one of its sensors under it goes above this number. The live reading is below.', handNow: 'Reading now',
    needsRobot: 'With the robot connected, the change is sent to the robot (it restarts, the number is cleared).',
    calib: 'Tilt calibration',
    calibHint: 'Do it again with a real robot if the number it reads is wrong (mirrored or shifted). Hold it upright as during the trick, top (the buttons) towards you and underside towards the audience, like the plate you look at: front up = 4, to your left = 2, to your right = 6. Very still. As soon as both measures are good, it is applied.',
    calibNow: 'Current calibration', calibDefault: 'default (set from the first test on a robot)', calibAngle: 'angle of 4', calibSense: 'sense',
    calibStep4: '1. Front up (number 4)', calibStep6: '2. Front to your right (number 6)', measure: 'Measure', measuring: 'Measuring…', measured: 'measured',
    calibLive: 'Reading now', calibDone: 'Calibration applied: the robot restarts.', calibReset: 'Back to default', calibDemo: 'Calibration needs a real robot, connected.',
    calibErr: { vertical: 'The robot is not upright enough: hold it straight, top towards you, underside towards the audience.', quarter: 'The two positions are not a quarter turn apart.', still: 'The robot was moving too much: try again, holding it more still.' },
    force: 'Rescue: set a number', forceHint: 'If the hand did not work: the robot restarts with this number already locked. Put it down flat, facing 0, and press the button.',
    forceNumber: 'Set', forceDemo: 'With the virtual robot, just choose the number on the screen.',
    robot: 'Robot', device: 'Name', firmware: 'Firmware', batteryRow: 'Battery', mode: 'Robot program', modeUp: 'running', modeDown: 'stopped',
    log: 'Link journal', logHint: 'Everything that goes between the page and the robot. Copy it if something does not work.', logEmpty: 'Nothing yet.',
    logCopy: 'Copy the journal', logClear: 'Clear', copied: 'Copied', test: 'Test the link', testing: 'Testing…',
    testHint: 'Sends a tiny program that blinks the top LEDs green.',
    script: 'Robot program', scriptHint: 'The Python that runs on Thymio (it is installed once, the page sends it again when it changes).', show2: 'Show', hide2: 'Hide', copy: 'Copy', download: 'Download',
    lastError: 'Last error',
    about: 'A magic trick to discover the IMU of Thymio 3: the accelerometer (gravity) carries the number, the hand under the robot freezes it, the gyroscope turns it towards it. Tried with a real robot: see the README (in French).',
  },
};

const it = {
  app: { title: 'Thymio · Magia', subtitle: 'Leggere nel pensiero con la gravità' },
  head: {
    connect: 'Collega Thymio', disconnect: 'Disconnetti', connecting: 'Connessione…', lost: 'Collegamento perso', demo: 'Robot virtuale', device: 'Thymio',
    battery: 'Batteria', settings: 'Impostazioni', themeLight: 'Chiaro', themeDark: 'Scuro',
    noBluetooth: 'Questo browser non sa parlare con Thymio. Usa Chrome (computer o Android) o Bluefy (iPhone, iPad).',
    start: 'Il robot si avvia…',
  },
  say: {
    title: 'Da dire al pubblico',
    lines: [
      'Ecco Thymio, un piccolo robot. Ha un sensore molto speciale: sa leggere nel pensiero! Ho bisogno di un volontario. Pensa a un numero da 0 a 7, quelli della tavola, e mostralo con la mano, senza dirlo: Thymio ha un microfono!',
      'Thymio avrebbe potuto conoscere questo numero? Non gli ho detto niente. Guardate, lo tengo semplicemente così… Appoggia la mano sotto Thymio: è con la tua mano che legge nel tuo pensiero.',
      'Fatto: ha letto! Lo appoggio al centro della tavola, rivolto verso lo 0.',
      'Premo il suo pulsante, e Thymio si concentra…',
      'Gira su se stesso, sempre più lentamente… si ferma sul tuo numero, e ci va!',
      'Il segreto? Thymio sente la gravità! Il suo accelerometro sente dov’è il basso, come una biglia in una ciotola. Tenendolo in piedi, gli ho dato il tuo numero con l’inclinazione. La tua mano, sotto di lui, gli ha fatto tenere il numero. E per girare usa il suo giroscopio.',
    ],
  },
  steps: {
    names: ['Presentazione', 'Thymio legge', 'Tenere il numero', 'Il pulsante', 'Il giro', 'Il segreto'],
    explain: [
      'Thymio aspetta, appoggiato in piano. Dentro Thymio, una “IMU” riunisce due sensori: un accelerometro e un giroscopio.',
      'Thymio misura la gravità con il suo accelerometro: sente da che parte è il basso, quindi come lo si tiene. Ogni ottavo di giro (45°) dà un altro numero. Quando una mano è sotto di lui, i suoi sensori a infrarossi la vedono e lui tiene il numero.',
      'Il numero è memorizzato: niente può più cambiarlo. Thymio aspetta di essere appoggiato in piano: lo sente perché ora la gravità passa dal suo lato inferiore. Per cancellare il numero, gira Thymio sulla schiena.',
      'Thymio sente di essere appoggiato in piano. Aspetta che si prema il suo pulsante centrale.',
      'Il giroscopio misura la velocità di rotazione: sommandola, Thymio conosce il suo angolo. Fa un giro completo e continua fino all’angolo giusto. La prima volta va un numero troppo lontano, si ferma un istante, poi torna al numero giusto. Poi avanza dritto e suona la sua musica.',
      'Il telefono che hai in tasca usa la stessa gravità per sapere quando girare lo schermo. Riprendi Thymio in piedi per un altro volontario.',
    ],
  },
  live: {
    title: 'Cosa legge Thymio', reads: 'Thymio legge', lockedLabel: 'Numero memorizzato', resultLabel: 'Il numero era', hiddenLabel: 'Numero nascosto',
    dial: 'Tavola di previsione: il numero che Thymio legge', gravity: 'gravità',
    caption: {
      idle: 'Thymio non è collegato', notUpright: 'Thymio è appoggiato', unsteady: 'Thymio esita…', steady: 'Numero stabile', handWait: 'Mano rilevata…',
      locked: 'Numero memorizzato', ready: 'Pronto: premi il pulsante', spin: 'Thymio si concentra…', drive: 'Ci va!', finale: 'Ecco fatto!', after: 'Spettacolo finito',
    },
    progress: { read: 'Lettura', hand: 'Mano', locked: 'Fissato', placed: 'Posato', button: 'Tasto', show: 'Show' },
  },
  notice: {
    unsteady: 'La mano è arrivata prima che Thymio avesse un numero stabile. Tienilo fermo un secondo, poi la mano.',
    nolock: 'Pulsante ignorato: nessun numero è memorizzato. Passa prima dalla mano.',
    notflat: 'Pulsante ignorato: Thymio non è appoggiato in piano. Mettilo sulla tavola.',
    'abort-lifted': 'Thymio è stato sollevato durante il giro: si è fermato. Appoggialo in piano e premi di nuovo il pulsante.',
    error: 'Il robot ha segnalato un errore:',
    reconnect: 'Il collegamento con Thymio è perso. Ricollegalo con il pulsante in alto.',
  },
  explain: { title: 'Passo in corso', forced: 'Numero imposto dalla pagina (la mano non è servita)' },
  sim: {
    title: 'Robot virtuale', hint: 'Prova il trucco senza robot: tieni Thymio in piedi a un numero, metti la mano, appoggialo in piano, premi il pulsante.',
    hold: 'Tenere in piedi a', lay: 'Appoggiare in piano', flip: 'Girare sulla schiena', hand: 'Mano sotto il robot', press: 'Pulsante centrale', speed: 'Velocità', plate: 'La tavola',
    held: 'In piedi', laid: 'In piano', handOn: 'Togliere la mano', handOff: 'Mettere la mano',
  },
  set: {
    title: 'Impostazioni', close: 'Chiudi', language: 'Lingua', theme: 'Tema',
    show: 'Spettacolo', restart: 'Ricomincia', restartHint: 'Cancella il numero e riavvia il programma del robot. Sul robot: girarlo sulla schiena per mezzo secondo cancella anch’esso il numero.', hide: 'Nascondere il numero sullo schermo', hideHint: 'Se il pubblico può vedere questo schermo: il numero e l’inclinazione non vengono più mostrati.', yes: 'Sì', no: 'No',
    sound: 'Suoni del robot', soundHint: 'Il piccolo bip della lettura e la musica finale.',
    dist: 'Distanza fino al numero', distUnit: 'mm', distHint: 'Il robot si ferma a questa distanza dal centro della tavola (la tavola A2: circa 140 mm fino alle barre).',
    hand: 'Soglia della mano', handHint: 'Il robot vede una mano quando uno dei suoi sensori inferiori supera questo numero. La lettura in diretta è qui sotto.', handNow: 'Lettura adesso',
    needsRobot: 'Con il robot collegato, la modifica viene inviata al robot (si riavvia, il numero viene cancellato).',
    calib: 'Calibrazione dell’inclinazione',
    calibHint: 'Da rifare con un robot vero se il numero letto è sbagliato (a specchio o sfasato). Tienilo in piedi come durante il trucco, con il lato superiore (i pulsanti) verso di te e il lato inferiore verso il pubblico, come la tavola che guardi: davanti in alto = 4, alla tua sinistra = 2, alla tua destra = 6. Ben fermo. Appena le due misure sono buone, viene applicata.',
    calibNow: 'Calibrazione attuale', calibDefault: 'predefinita (regolata sul primo test con un robot)', calibAngle: 'angolo del 4', calibSense: 'senso',
    calibStep4: '1. Davanti in alto (numero 4)', calibStep6: '2. Davanti verso la tua destra (numero 6)', measure: 'Misura', measuring: 'Misura…', measured: 'misurato',
    calibLive: 'Lettura adesso', calibDone: 'Calibrazione applicata: il robot si riavvia.', calibReset: 'Torna alla predefinita', calibDemo: 'La calibrazione richiede un robot vero collegato.',
    calibErr: { vertical: 'Il robot non è abbastanza in piedi: tienilo dritto, il lato superiore verso di te, il lato inferiore verso il pubblico.', quarter: 'Le due posizioni non distano un quarto di giro l’una dall’altra.', still: 'Il robot si muoveva troppo: ricomincia, tenendolo più fermo.' },
    force: 'Soccorso: imporre un numero', forceHint: 'Se la mano non ha funzionato: il robot riparte con questo numero già memorizzato. Appoggialo in piano, rivolto verso lo 0, e premi il pulsante.',
    forceNumber: 'Imponi il', forceDemo: 'Con il robot virtuale basta scegliere il numero sullo schermo.',
    robot: 'Robot', device: 'Nome', firmware: 'Firmware', batteryRow: 'Batteria', mode: 'Programma del robot', modeUp: 'in esecuzione', modeDown: 'fermo',
    log: 'Registro del collegamento', logHint: 'Tutto ciò che passa tra la pagina e il robot. Da copiare se qualcosa non funziona.', logEmpty: 'Niente per ora.',
    logCopy: 'Copia il registro', logClear: 'Cancella', copied: 'Copiato', test: 'Prova il collegamento', testing: 'Prova in corso…',
    testHint: 'Invia un programmino che fa lampeggiare in verde i LED superiori.',
    script: 'Programma del robot', scriptHint: 'Il Python che gira su Thymio (si installa una sola volta, la pagina lo rinvia se cambia).', show2: 'Mostra', hide2: 'Nascondi', copy: 'Copia', download: 'Scarica',
    lastError: 'Ultimo errore',
    about: 'Un trucco di magia per scoprire l’IMU del Thymio 3: l’accelerometro (la gravità) porta il numero, la mano sotto il robot lo blocca, il giroscopio lo fa girare verso di esso. Provato con un robot vero: vedi il file LISEZMOI (in francese).',
  },
};

const de = {
  app: { title: 'Thymio · Magie', subtitle: 'Gedanken lesen mit der Schwerkraft' },
  head: {
    connect: 'Thymio verbinden', disconnect: 'Trennen', connecting: 'Verbinde…', lost: 'Verbindung verloren', demo: 'Simulation', device: 'Thymio',
    battery: 'Batterie', settings: 'Einstellungen', themeLight: 'Hell', themeDark: 'Dunkel',
    noBluetooth: 'Dieser Browser kann nicht mit Thymio sprechen. Nimm Chrome (Computer oder Android) oder Bluefy (iPhone, iPad).',
    start: 'Der Roboter startet…',
  },
  say: {
    title: 'Für das Publikum',
    lines: [
      'Das ist Thymio, ein kleiner Roboter. Er hat einen ganz besonderen Sensor: Er kann Gedanken lesen! Ich brauche einen Freiwilligen. Denk dir eine Zahl von 0 bis 7 aus, eine von der Platte, und zeig sie mit deiner Hand, ohne sie zu sagen: Thymio hat ein Mikrofon!',
      'Hätte Thymio diese Zahl kennen können? Ich habe ihm nichts gesagt. Schaut, ich halte ihn einfach so… Leg deine Hand unter Thymio: Mit deiner Hand liest er in deinen Gedanken.',
      'Geschafft: Er hat gelesen! Ich lege ihn in die Mitte der Platte, zur 0 gedreht.',
      'Ich drücke seinen Knopf, und Thymio konzentriert sich…',
      'Er dreht sich um sich selbst, immer langsamer… er bleibt bei deiner Zahl stehen und fährt hin!',
      'Das Geheimnis? Thymio spürt die Schwerkraft! Sein Beschleunigungssensor spürt, wo unten ist, wie eine Murmel in einer Schüssel. Indem ich ihn aufrecht hielt, habe ich ihm deine Zahl über die Neigung gegeben. Deine Hand unter ihm hat ihn die Zahl behalten lassen. Und zum Drehen benutzt er sein Gyroskop.',
    ],
  },
  steps: {
    names: ['Vorstellung', 'Thymio liest', 'Zahl merken', 'Der Knopf', 'Die Drehung', 'Das Geheimnis'],
    explain: [
      'Thymio wartet, flach hingelegt. In Thymio vereint eine „IMU“ zwei Sensoren: einen Beschleunigungssensor und ein Gyroskop.',
      'Thymio misst die Schwerkraft mit seinem Beschleunigungssensor: Er spürt, wo unten ist, also wie man ihn hält. Jedes Achtel einer Drehung (45°) ergibt eine andere Zahl. Liegt eine Hand unter ihm, sehen seine Infrarotsensoren sie und er behält die Zahl.',
      'Die Zahl ist gemerkt: Nichts kann sie mehr ändern. Thymio wartet darauf, flach hingelegt zu werden: Er spürt es, weil die Schwerkraft jetzt durch seine Unterseite geht. Um die Zahl zu löschen, dreh Thymio auf den Rücken.',
      'Thymio spürt, dass er flach liegt. Er wartet darauf, dass man seinen mittleren Knopf drückt.',
      'Das Gyroskop misst, wie schnell er sich dreht: Zählt man das zusammen, kennt Thymio seinen Winkel. Er macht eine ganze Drehung und dreht sich weiter bis zum richtigen Winkel. Beim ersten Mal dreht er sich eine Zahl zu weit, bleibt einen Moment stehen und dreht dann zur richtigen Zahl zurück. Danach fährt er geradeaus und spielt seine Musik.',
      'Das Handy in deiner Tasche nutzt dieselbe Schwerkraft, um zu wissen, wann es den Bildschirm drehen soll. Nimm Thymio wieder aufrecht für einen anderen Freiwilligen.',
    ],
  },
  live: {
    title: 'Was Thymio liest', reads: 'Thymio liest', lockedLabel: 'Zahl gemerkt', resultLabel: 'Die Zahl war', hiddenLabel: 'Zahl verborgen',
    dial: 'Vorhersageplatte: die Zahl, die Thymio liest', gravity: 'Schwerkraft',
    caption: {
      idle: 'Thymio ist nicht verbunden', notUpright: 'Thymio liegt', unsteady: 'Thymio zögert…', steady: 'Stabile Zahl', handWait: 'Hand erkannt…',
      locked: 'Zahl gemerkt', ready: 'Bereit: Drücke den Knopf', spin: 'Thymio konzentriert sich…', drive: 'Er fährt hin!', finale: 'Und fertig!', after: 'Vorführung beendet',
    },
    progress: { read: 'Lesen', hand: 'Hand', locked: 'Gemerkt', placed: 'Flach', button: 'Knopf', show: 'Show' },
  },
  notice: {
    unsteady: 'Die Hand kam, bevor Thymio eine stabile Zahl hatte. Halte ihn eine Sekunde ruhig, dann die Hand.',
    nolock: 'Knopf ignoriert: Keine Zahl ist gemerkt. Geh zuerst über die Hand.',
    notflat: 'Knopf ignoriert: Thymio liegt nicht flach. Lege ihn auf die Platte.',
    'abort-lifted': 'Thymio wurde während der Drehung hochgehoben: Er hat angehalten. Lege ihn flach hin und drücke den Knopf noch einmal.',
    error: 'Der Roboter hat einen Fehler gemeldet:',
    reconnect: 'Die Verbindung zu Thymio ist verloren. Verbinde ihn neu mit dem Knopf oben.',
  },
  explain: { title: 'Aktueller Schritt', forced: 'Zahl von der Seite vorgegeben (die Hand wurde nicht gebraucht)' },
  sim: {
    title: 'Virtueller Roboter', hint: 'Übe das Kunststück ohne Roboter: Halte Thymio aufrecht bei einer Zahl, leg die Hand darunter, leg ihn flach hin, drücke den Knopf.',
    hold: 'Aufrecht halten bei', lay: 'Flach hinlegen', flip: 'Auf den Rücken drehen', hand: 'Hand unter dem Roboter', press: 'Mittlerer Knopf', speed: 'Geschwindigkeit', plate: 'Die Platte',
    held: 'Aufrecht gehalten', laid: 'Flach', handOn: 'Hand wegnehmen', handOff: 'Hand hinlegen',
  },
  set: {
    title: 'Einstellungen', close: 'Schliessen', language: 'Sprache', theme: 'Design',
    show: 'Vorführung', restart: 'Neu starten', restartHint: 'Löscht die Zahl und startet das Programm des Roboters neu. Am Roboter: Ihn eine halbe Sekunde auf den Rücken zu drehen löscht die Zahl ebenfalls.', hide: 'Zahl auf dem Bildschirm verbergen', hideHint: 'Wenn das Publikum diesen Bildschirm sehen kann: Die Zahl und die Neigung werden nicht mehr angezeigt.', yes: 'Ja', no: 'Nein',
    sound: 'Töne des Roboters', soundHint: 'Der kleine Piepton beim Lesen und die Musik am Schluss.',
    dist: 'Strecke bis zur Zahl', distUnit: 'mm', distHint: 'Der Roboter hält in diesem Abstand von der Mitte der Platte an (die A2-Platte: etwa 140 mm bis zu den Balken).',
    hand: 'Handschwelle', handHint: 'Der Roboter sieht eine Hand, wenn einer seiner Sensoren an der Unterseite über diese Zahl steigt. Der aktuelle Messwert steht unten.', handNow: 'Messwert jetzt',
    needsRobot: 'Ist der Roboter verbunden, wird die Änderung an ihn gesendet (er startet neu, die Zahl wird gelöscht).',
    calib: 'Kalibrierung der Neigung',
    calibHint: 'Mit einem echten Roboter neu machen, wenn die gelesene Zahl falsch ist (gespiegelt oder verschoben). Halte ihn aufrecht wie beim Kunststück, die Oberseite (die Tasten) zu dir und die Unterseite zum Publikum, wie die Platte, die du anschaust: vorne oben = 4, zu deiner Linken = 2, zu deiner Rechten = 6. Ganz ruhig. Sobald beide Messungen gut sind, wird sie übernommen.',
    calibNow: 'Aktuelle Kalibrierung', calibDefault: 'Standard (nach dem ersten Test an einem Roboter eingestellt)', calibAngle: 'Winkel der 4', calibSense: 'Richtung',
    calibStep4: '1. Vorne oben (Zahl 4)', calibStep6: '2. Vorne nach deiner Rechten (Zahl 6)', measure: 'Messen', measuring: 'Messe…', measured: 'gemessen',
    calibLive: 'Messwert jetzt', calibDone: 'Kalibrierung übernommen: Der Roboter startet neu.', calibReset: 'Zurück zum Standard', calibDemo: 'Die Kalibrierung braucht einen echten, verbundenen Roboter.',
    calibErr: { vertical: 'Der Roboter steht nicht aufrecht genug: Halte ihn gerade, die Oberseite zu dir, die Unterseite zum Publikum.', quarter: 'Die beiden Positionen liegen nicht eine Vierteldrehung auseinander.', still: 'Der Roboter hat sich zu stark bewegt: Versuche es noch einmal, ruhiger.' },
    force: 'Notlösung: eine Zahl vorgeben', forceHint: 'Wenn die Hand nicht funktioniert hat: Der Roboter startet mit dieser bereits gemerkten Zahl neu. Lege ihn flach hin, zur 0 gedreht, und drücke den Knopf.',
    forceNumber: 'Zahl vorgeben:', forceDemo: 'Beim virtuellen Roboter genügt es, die Zahl auf dem Bildschirm zu wählen.',
    robot: 'Roboter', device: 'Name', firmware: 'Firmware', batteryRow: 'Batterie', mode: 'Programm des Roboters', modeUp: 'läuft', modeDown: 'angehalten',
    log: 'Verbindungsprotokoll', logHint: 'Alles, was zwischen Seite und Roboter geht. Kopieren, wenn etwas nicht funktioniert.', logEmpty: 'Noch nichts.',
    logCopy: 'Protokoll kopieren', logClear: 'Löschen', copied: 'Kopiert', test: 'Verbindung testen', testing: 'Test läuft…',
    testHint: 'Sendet ein winziges Programm, das die oberen LEDs grün blinken lässt.',
    script: 'Programm des Roboters', scriptHint: 'Das Python, das auf Thymio läuft (es wird nur einmal installiert, die Seite sendet es erneut, wenn es sich ändert).', show2: 'Zeigen', hide2: 'Verbergen', copy: 'Kopieren', download: 'Herunterladen',
    lastError: 'Letzter Fehler',
    about: 'Ein Zaubertrick, um die IMU des Thymio 3 zu entdecken: Der Beschleunigungssensor (die Schwerkraft) trägt die Zahl, die Hand unter dem Roboter hält sie fest, das Gyroskop dreht ihn zu ihr. Mit einem echten Roboter ausprobiert: siehe die Datei LISEZMOI (auf Französisch).',
  },
};

export const I18N = { fr, en, it, de };

export function detectLang() {
  try {
    const kept = localStorage.getItem('magic.lang');
    if (kept && I18N[kept]) return kept;
  } catch { /* private mode */ }
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'fr';
  const id = String(nav).slice(0, 2).toLowerCase();
  return I18N[id] ? id : 'fr';
}
