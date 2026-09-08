import {
  Button,
  Column,
  Host,
  Picker,
  Row,
  Slider,
  Spacer,
  Switch,
  Text,
  TextInput,
} from '@expo/ui';
import { MaxContentWidth, Spacing, useTheme } from '@backstage-app/theme';
import { ThemedText, ThemedView } from '@backstage-app/ui';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { WebBadge } from '@/components/web-badge';

const FLAVORS = [
  { label: 'Vanilla', value: 'vanilla' },
  { label: 'Chocolate', value: 'chocolate' },
  { label: 'Strawberry', value: 'strawberry' },
] as const;

type Flavor = (typeof FLAVORS)[number]['value'];

/**
 * Showcase of the universal `@expo/ui` components. They render as SwiftUI on
 * iOS, Jetpack Compose on Android, and plain React Native views on web.
 */
export default function ComponentsScreen() {
  const theme = useTheme();

  const [count, setCount] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [flavor, setFlavor] = useState<Flavor>('vanilla');
  const [name, setName] = useState('');

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Expo UI</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Native SwiftUI and Jetpack Compose{'\n'}components from @expo/ui.
          </ThemedText>
        </ThemedView>

        <Host matchContents style={styles.host}>
          <Column spacing={Spacing.four} alignment="start">
            <Column spacing={Spacing.two} alignment="start">
              <Text textStyle={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                Buttons
              </Text>
              <Row spacing={Spacing.two}>
                <Button variant="filled" onPress={() => setCount((c) => c + 1)}>
                  Increment
                </Button>
                <Button variant="outlined" onPress={() => setCount((c) => Math.max(0, c - 1))}>
                  Decrement
                </Button>
                <Button variant="text" onPress={() => setCount(0)} disabled={count === 0}>
                  Reset
                </Button>
              </Row>
              <Text textStyle={{ color: theme.textSecondary }}>{`Pressed ${count} times`}</Text>
            </Column>

            <Column spacing={Spacing.two} alignment="start">
              <Text textStyle={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                Switch
              </Text>
              <Switch label="Notifications" value={enabled} onValueChange={setEnabled} />
              <Text textStyle={{ color: theme.textSecondary }}>
                {enabled ? 'Notifications are on' : 'Notifications are off'}
              </Text>
            </Column>

            <Column spacing={Spacing.two} alignment="start">
              <Text textStyle={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                Slider
              </Text>
              <Slider value={volume} onValueChange={setVolume} min={0} max={1} step={0.05} />
              <Text textStyle={{ color: theme.textSecondary }}>
                {`Volume: ${Math.round(volume * 100)}%`}
              </Text>
            </Column>

            <Column spacing={Spacing.two} alignment="start">
              <Text textStyle={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                Picker
              </Text>
              <Picker selectedValue={flavor} onValueChange={setFlavor}>
                {FLAVORS.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
              <Text textStyle={{ color: theme.textSecondary }}>{`Selected: ${flavor}`}</Text>
            </Column>

            <Column spacing={Spacing.two} alignment="start">
              <Text textStyle={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                Text input
              </Text>
              <TextInput
                defaultValue={name}
                onChangeText={setName}
                placeholder="What is your name?"
                autoCapitalize="words"
                style={{ width: '100%' }}
              />
              <Text textStyle={{ color: theme.textSecondary }}>
                {name.length > 0 ? `Hello, ${name}!` : 'Type something above.'}
              </Text>
            </Column>

            <Spacer size={Spacing.two} />
          </Column>
        </Host>

        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  host: {
    paddingHorizontal: Spacing.four,
  },
});
