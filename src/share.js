// The link to the application, for the QR code that opens it on the other screens (tablets, phones) of a room.
// The codes always hold the published address, never the address the page is on now: a magician testing on `localhost` still gives a link
// that the other screens can reach. A fork has to change APP_URL.
export const APP_URL = 'https://francescomondada.github.io/thymio3-magic-imu/';

// What the QR code of the application can hold, by the browser it should open in. `web`: the plain address, opened by the camera's own
// choice of browser (Chrome or Samsung Internet on Android, both with Web Bluetooth). `ios`: the custom scheme of Bluefy, the browser with
// Web Bluetooth for iPhone and iPad, that must be installed; Bluefy's own documentation does not give the form of its link, so `open?url=`
// with the encoded address is the usual one and the thing to check on an iPad first (the same link as in thymio3-cards).
// There is no code for Chrome on Android: an `intent://` link naming Chrome is not opened by the camera of a Samsung (it takes anything that is
// not a web link for text), and a link that only some scanners open is worse than none.
export const APP_LINKS = {
  web: APP_URL,
  ios: `bluefy://open?url=${encodeURIComponent(APP_URL)}`,
};
