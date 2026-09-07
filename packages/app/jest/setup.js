// Reanimated and Worklets need their Jest environment set up before any component that
// animates is imported; gesture-handler ships its own mock setup.
require('react-native-gesture-handler/jestSetup');
require('react-native-reanimated').setUpTests();
