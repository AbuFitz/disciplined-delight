import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExerciseMedia, ExerciseMediaThumb } from "./exercise-media";
import type { MediaItem } from "@/domain/catalogue";

const base: MediaItem = {
  id: "m1",
  kind: "animation",
  url: "/motion.webp",
  poster: "/poster.webp",
  thumb: "/thumb.webp",
  isMain: true,
  licence: { id: "test", short: "Test", url: "https://example.test" },
  author: "Artist",
};
describe("exercise media", () => {
  it("renders a poster and explicit motion control before hydration", () => {
    const html = renderToStaticMarkup(<ExerciseMedia item={base} alt="Squat demonstration" />);
    expect(html).toContain('src="/poster.webp"');
    expect(html).toContain("Play demo");
    expect(html).toContain('alt="Squat demonstration"');
  });
  it("keeps catalogue cards static even when motion exists", () => {
    const html = renderToStaticMarkup(<ExerciseMediaThumb item={base} />);
    expect(html).toContain('src="/thumb.webp"');
    expect(html).not.toContain("motion.webp");
  });
});
