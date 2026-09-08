/**
 * The analytics vocabulary Backstage speaks, declared to match `@backstage/core-plugin-api`
 * field for field so an event this app produces is one a Backstage analytics implementation
 * already understands.
 *
 * Upstream is declared rather than re-exported — unlike `@backstage-app/errors` and
 * `@backstage-app/types`, which are pure re-exports. `@backstage/core-plugin-api` peer-depends
 * on `react-dom` and `react-router-dom` and pins `react` to `^17 || ^18`; this app is React 19
 * on React Native with no DOM and no react-router. Every type here erases at compile time, so
 * matching the shape costs nothing at runtime.
 */

/**
 * Contextual metadata every event carries, naming where it was captured.
 */
export type CommonAnalyticsContext = {
  /** The nearest known parent plugin where the event was captured. */
  pluginId: string;
  /** The route the user was on when the event was captured. */
  routeRef: string;
  /** The nearest known parent extension where the event was captured. */
  extension: string;
};

/**
 * The analytics context envelope: the common fields plus anything a nested context adds.
 */
export type AnalyticsContextValue = CommonAnalyticsContext & {
  [param in string]: string | boolean | number | undefined;
};

/**
 * Additional dimensions or metrics specific to one event.
 */
export type AnalyticsEventAttributes = {
  [attribute in string]: string | boolean | number;
};

/**
 * An event worth tracking, describing something a user did.
 */
export type AnalyticsEvent = {
  /**
   * What kind of thing happened. Keep metadata out of this string — it belongs in the
   * context or the attributes. Examples: `navigate`, `click`, `search`, `filter`.
   */
  action: string;
  /**
   * What the action was taken on: the path of the page viewed, the URL of the link
   * clicked, the value filtered by.
   */
  subject: string;
  /** An optional number an analytics tool could aggregate, such as a position or a duration. */
  value?: number;
  /** Optional extra dimensions or metrics forwarded to the analytics system. */
  attributes?: AnalyticsEventAttributes;
  /** Where the event was captured: the plugin, route and extension around it. */
  context: AnalyticsContextValue;
};

/**
 * What a component captures events through. Obtained from `useAnalytics()`, which fills in
 * the `context` from the analytics contexts enclosing the component.
 */
export type AnalyticsTracker = {
  captureEvent: (
    action: string,
    subject: string,
    options?: { value?: number; attributes?: AnalyticsEventAttributes }
  ) => void;
};

/**
 * Receives fully-formed events and is responsible for getting them somewhere.
 *
 * `captureEvent` returns `void` and must not throw: a delivery problem is the
 * implementation's to absorb, never the calling component's to handle.
 */
export type AnalyticsApi = {
  captureEvent(event: AnalyticsEvent): void;
};
