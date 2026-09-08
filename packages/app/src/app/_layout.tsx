import { AnalyticsProvider, NavigationAnalytics } from '@backstage-app/analytics-api';
import { EntityPrefsProvider } from '@backstage-app/catalog-api';
import { BackstageProvider, PluginRegistryProvider, QueryProvider, useBackstage } from '@backstage-app/core';
import { ThemeProvider, useResolvedScheme, useTheme } from '@backstage-app/theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ColorValue, Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { registry } from '@/plugins';

SplashScreen.preventAutoHideAsync();

const EXPO_UI_ICON: SymbolViewProps['name'] = {
  ios: 'slider.horizontal.3',
  android: 'widgets',
  web: 'widgets',
};

const BACK_ICON: SymbolViewProps['name'] = {
  ios: 'chevron.left',
  android: 'arrow_back',
  web: 'arrow_back',
};

/** Header back button for hidden routes: pops history, or opens the route's fallback. */
function HeaderBackButton({ fallback, tintColor }: { fallback?: string; tintColor?: string }) {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/${fallback ?? ''}`);
    }
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={styles.backButton} testID="header-back">
      <SymbolView name={BACK_ICON} tintColor={tintColor} size={24} />
    </Pressable>
  );
}

function drawerIcon(name: SymbolViewProps['name']) {
  return function DrawerIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

/** Scopes the cached and persisted reads to the active instance. */
function CachedData({ children }: { children: React.ReactNode }) {
  const { instance } = useBackstage();
  return <QueryProvider cacheKey={instance?.id ?? ''}>{children}</QueryProvider>;
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
      {/* Inside the router, where the route hooks it reads have their store context. */}
      <NavigationAnalytics />
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
        {registry.plugins.flatMap((plugin) =>
          plugin.routes
            .filter((route) => route.hidden)
            .map((route) => (
              <Drawer.Screen
                key={route.name}
                name={route.name}
                options={{
                  title: route.title ?? plugin.name,
                  drawerItemStyle: styles.hiddenDrawerItem,
                  headerLeft: () => <HeaderBackButton fallback={route.backRoute} tintColor={colors.text} />,
                }}
              />
            ))
        )}
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
      <PluginRegistryProvider registry={registry}>
        <ThemeProvider>
          <BackstageProvider>
            <AnalyticsProvider>
              <CachedData>
                <EntityPrefsProvider>
                  <NavigationChrome />
                </EntityPrefsProvider>
              </CachedData>
            </AnalyticsProvider>
          </BackstageProvider>
        </ThemeProvider>
      </PluginRegistryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hiddenDrawerItem: {
    display: 'none',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
