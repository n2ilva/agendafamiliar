import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';

// Silenciar logs verbosos em produção/dev para reduzir ruído no console.
// Mantemos apenas warnings e errors.
// Em desenvolvimento preferimos ver os logs. Comentar a sobrescrita para habilitar logs.
// const noop = () => {};
// if (typeof console !== 'undefined') {
// 	console.log = noop;
// 	console.info = noop;
// 	console.debug = noop;
// }

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
