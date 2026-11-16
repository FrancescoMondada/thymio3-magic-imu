// The texts of the page, in French and English. Every key exists in both (tests/i18n.test.js). The lines "à dire au public" are the script of
// the trick: change them here to make the trick your own.
export const LANGS = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
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
      'Le gyroscope mesure la vitesse de rotation : en l’additionnant, Thymio connaît son angle. Il fait un tour complet, continue jusqu’au bon angle, puis avance tout droit et joue sa musique.',
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
    progress: { read: 'Lecture', hand: 'Main', locked: 'Gardé', placed: 'Posé', button: 'Bouton', show: 'Spectacle' },
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
    about: 'Un tour de magie pour découvrir l’IMU de Thymio 3 : l’accéléromètre (la gravité) transporte le nombre, la main sous le robot le fige, le gyroscope le fait tourner vers lui. Rien n’a encore été essayé avec un vrai robot : voir le fichier LISEZMOI.',
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
      'The gyroscope measures how fast it turns: adding it up, Thymio knows its angle. It makes a full turn, goes on to the right angle, then drives straight and plays its music.',
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
    about: 'A magic trick to discover the IMU of Thymio 3: the accelerometer (gravity) carries the number, the hand under the robot freezes it, the gyroscope turns it towards it. Nothing has been tried with a real robot yet: see the README.',
  },
};

export const I18N = { fr, en };

export function detectLang() {
  try {
    const kept = localStorage.getItem('magic.lang');
    if (kept && I18N[kept]) return kept;
  } catch { /* private mode */ }
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'fr';
  const id = String(nav).slice(0, 2).toLowerCase();
  return I18N[id] ? id : 'fr';
}
