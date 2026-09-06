# Backstage App

A universal [Expo](https://expo.dev) app written in TypeScript. It uses
[Expo Router](https://docs.expo.dev/router/introduction) for file-based
navigation and [`@expo/ui`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
for native SwiftUI (iOS) and Jetpack Compose (Android) components.

Planning happens with [OpenSpec](https://github.com/Fission-AI/OpenSpec):
specs live in `openspec/`, and the `/opsx:*` slash commands drive the
spec-driven workflow from Claude Code.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

> `@expo/ui` ships native code, so the **Expo UI** tab needs a
> [development build](https://docs.expo.dev/develop/development-builds/introduction/)
> on iOS and Android. On web the components fall back to plain React Native views.

## Project layout

- `src/app/` — screens, one file per route (`index.tsx`, `explore.tsx`, `components.tsx`)
- `src/components/` — shared UI, including the native and web tab bars
- `src/constants/theme.ts` — colors, fonts, and spacing tokens
- `openspec/` — OpenSpec specs and change proposals

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run ios` / `npm run android` / `npm run web` | Start and open on a platform |
| `npm run lint` | Run ESLint via `expo lint` |
| `npx tsc --noEmit` | Typecheck |
| `npm run reset-project` | Move the starter screens aside and start from a blank `app/` |

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo UI reference](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
- [Expo Router](https://docs.expo.dev/router/introduction)
- [OpenSpec](https://github.com/Fission-AI/OpenSpec)
