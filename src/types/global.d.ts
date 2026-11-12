import {
  CartesianCoordinatesInterface,
  CelestialBodyType
} from '@interstellar-tools/types';

import { Interval } from '../lib/classes/Interval';

export {}; // Ensures this file is treated as a module

type NearestBodyType = CartesianCoordinatesInterface & {
  /** The body's id */
  id: string;
  /** The radius the body is drawn with, in pixels */
  size: number;
  name: string;
  category: string;
  /** Id of the parent body, set for satellites */
  parent: string | undefined;
};

/** A body label drawn in the current frame: its body, its text and its box, in canvas pixels. */
type LabelBoxType = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type CanvasRectType = {
  width: number;
  height: number;
};

/**
 * Declares global variables and properties on `globalThis` for simulation state management.
 *
 * These declarations allow consistent access to simulation flags across modules,
 * such as whether the simulation is paused or which celestial bodies are currently visible.
 */
declare global {
  interface globalThis {
    /**
     * Ids of the bodies listed in the "In view" panel, rebuilt every update.
     */
    BODIES_IN_VIEWPORT: Set<string>;

    /**
     * Flag indicating whether the simulation is currently paused.
     * `true` = paused, `false` = running.
     */
    PAUSE: boolean;
    INTERVAL_IN_VIEWPORT: Interval;
    LOCKED_CELESTIAL_BODY: CelestialBodyType | null;
    /** The body shown in the focus view (opened by clicking it), or `null`. */
    FOCUSED_CELESTIAL_BODY: CelestialBodyType | null;
    TRAJECTORY_TYPE: 'orbits' | 'trails';
    /** Trail points per body id, in trails mode. */
    TRAJECTORY_TRAILS: Record<string, CartesianCoordinatesInterface[]>;
    IS_ZOOMING_OR_PANNING: boolean; // Initialize
    ZOOM_PAN_TIMEOUT: number; // For delaying reactivation
    /** Screen positions of the bodies drawn in the current frame, keyed by body id. */
    NEAREST_BODIES: Record<string, NearestBodyType>;
    /** The body labels drawn in the current frame, none overlapping (#91). */
    LABEL_BOXES: LabelBoxType[];
    STARFIELD_BITMAP: ImageBitmap;
    LAST_CANVAS_SIZE: CanvasRectType;
  }

  /**
   * Ids of the bodies listed in the "In view" panel, rebuilt every update.
   */
  var BODIES_IN_VIEWPORT: Set<string>;
  /**
   * Flag indicating whether the simulation is currently paused.
   * `true` = paused, `false` = running.
   */
  var PAUSE: boolean;
  var INTERVAL_IN_VIEWPORT: Interval;
  var LOCKED_CELESTIAL_BODY: CelestialBodyType | null;
  /** The body shown in the focus view (opened by clicking it), or `null`. */
  var FOCUSED_CELESTIAL_BODY: CelestialBodyType | null;
  var TRAJECTORY_TYPE: 'orbits' | 'trails';
  /** Trail points per body id, in trails mode. */
  var TRAJECTORY_TRAILS: Record<string, CartesianCoordinatesInterface[]>;
  var IS_ZOOMING_OR_PANNING: boolean; // Initialize
  var ZOOM_PAN_TIMEOUT: number; // For delaying reactivation
  /** Screen positions of the bodies drawn in the current frame, keyed by body id. */
  var NEAREST_BODIES: Record<string, NearestBodyType>;
  /** The body labels drawn in the current frame, none overlapping (#91). */
  var LABEL_BOXES: LabelBoxType[];
  var STARFIELD_BITMAP: ImageBitmap;
  var LAST_CANVAS_SIZE: CanvasRectType;
}
