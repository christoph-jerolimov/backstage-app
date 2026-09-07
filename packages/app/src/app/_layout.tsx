import { BackstageProvider, ThemeProvider, useResolvedScheme, useTheme } from '@backstage-app/core';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
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

/** Builds the navigation theme and drawer from the active theme tokens. */
function NavigationChrome() {
  const scheme = useResolvedScheme();
  const colors = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    dark: scheme === 'dark',
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.backgroundElement,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
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
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <BackstageProvider>
          <NavigationChrome />
        </BackstageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
