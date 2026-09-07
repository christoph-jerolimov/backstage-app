import { Colors, useColorScheme } from '@backstage-app/core';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ColorValue, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { registry } from '@/plugins';

SplashScreen.preventAutoHideAsync();

const EXPO_UI_ICON: SymbolViewProps['name'] = {
  ios: 'slider.horizontal.3',
  android: 'widgets',
  web: 'widgets',
};

function drawerIcon(name: SymbolViewProps['name']) {
  return function DrawerIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Drawer
          initialRouteName="index"
          screenOptions={{
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
            drawerStyle: { backgroundColor: colors.background },
            drawerActiveTintColor: colors.text,
            drawerActiveBackgroundColor: colors.backgroundSelected,
            drawerInactiveTintColor: colors.textSecondary,
            sceneStyle: { backgroundColor: colors.background },
          }}>
          {registry.navItems().map((item) => (
            <Drawer.Screen
              key={item.route}
              name={item.route}
              options={{
                title: item.title,
                drawerLabel: item.title,
                drawerIcon: drawerIcon(item.icon),
              }}
            />
          ))}
          <Drawer.Screen
            name="components"
            options={{
              title: 'Expo UI',
              drawerLabel: 'Expo UI',
              drawerIcon: drawerIcon(EXPO_UI_ICON),
            }}
          />
        </Drawer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
