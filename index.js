/**
 * @format
 */

// Must be the very first import in the app. React Native Gesture Handler needs
// to install itself before any component that uses it is required, and React
// Navigation's native stack does use it.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';

import App from './App';
import { name as appName } from './app.json';
import './src/lib/pushBackground';

AppRegistry.registerComponent(appName, () => App);
