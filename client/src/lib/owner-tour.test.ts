import { describe, expect, it, vi } from "vitest";
import {
  OWNER_TOUR_STORAGE_KEY,
  OWNER_TOUR_STEPS,
  OWNER_GUIDE_TOUR_STORAGE_KEY,
  OWNER_GUIDE_TOUR_STEPS,
  clearOwnerTourCompleted,
  clearOwnerGuideTourCompleted,
  hasCompletedOwnerTour,
  hasCompletedOwnerGuideTour,
  markOwnerTourCompleted,
  markOwnerGuideTourCompleted,
  shouldAutoStartOwnerTour,
  shouldAutoStartOwnerGuideTour,
} from "@/lib/owner-tour";

describe("owner tour", () => {
  it("describes the owner-first path with lightweight steps", () => {
    expect(OWNER_TOUR_STEPS).toHaveLength(6);
    expect(OWNER_TOUR_STEPS.map((step) => step.id)).toEqual([
      "hero",
      "metrics",
      "xls-study",
      "api-masterclass",
      "files",
      "ze",
    ]);
    expect(OWNER_TOUR_STEPS[0]?.title).toContain("lucro");
  });

  it("describes a second tour for the platform and product mix", () => {
    expect(OWNER_GUIDE_TOUR_STEPS).toHaveLength(5);
    expect(OWNER_GUIDE_TOUR_STEPS.map((step) => step.id)).toEqual([
      "guide-hero",
      "guide-ingestion",
      "guide-products",
      "guide-swagger",
      "guide-close",
    ]);
    expect(OWNER_GUIDE_TOUR_STEPS[0]?.title).toContain("plataforma");
    expect(OWNER_GUIDE_TOUR_STEPS[2]?.description.toLowerCase()).toContain("doritos");
  });

  it("tracks first visit completion in storage", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(hasCompletedOwnerTour(storage)).toBe(false);
    expect(shouldAutoStartOwnerTour(storage)).toBe(true);

    markOwnerTourCompleted(storage);
    expect(storage.setItem).toHaveBeenCalledWith(OWNER_TOUR_STORAGE_KEY, "done");

    storage.getItem = vi.fn(() => "done");
    expect(hasCompletedOwnerTour(storage)).toBe(true);
    expect(shouldAutoStartOwnerTour(storage)).toBe(false);

    clearOwnerTourCompleted(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(OWNER_TOUR_STORAGE_KEY);
  });

  it("tracks the guide tour separately in storage", () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    expect(hasCompletedOwnerGuideTour(storage)).toBe(false);
    expect(shouldAutoStartOwnerGuideTour(storage)).toBe(true);

    markOwnerGuideTourCompleted(storage);
    expect(storage.setItem).toHaveBeenCalledWith(OWNER_GUIDE_TOUR_STORAGE_KEY, "done");

    storage.getItem = vi.fn(() => "done");
    expect(hasCompletedOwnerGuideTour(storage)).toBe(true);
    expect(shouldAutoStartOwnerGuideTour(storage)).toBe(false);

    clearOwnerGuideTourCompleted(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(OWNER_GUIDE_TOUR_STORAGE_KEY);
  });
});
