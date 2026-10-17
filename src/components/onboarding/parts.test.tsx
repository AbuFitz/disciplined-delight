import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Chip, ProgressMap, Row } from "./parts";
import { QUICK_STEPS } from "@/domain/onboarding";

describe("journey parts", () => {
  it("renders rows as real radio inputs inside labels, hidden only visually", () => {
    const html = renderToStaticMarkup(
      <Row name="intent" on title="Get stronger" text="Lift more" onChange={() => {}} />,
    );
    expect(html).toContain('type="radio"');
    expect(html).toContain("sr-only");
    expect(html).toContain('data-on="true"');
    expect(html.startsWith("<label")).toBe(true);
  });
  it("renders checkbox rows and chips as real checkboxes", () => {
    expect(
      renderToStaticMarkup(
        <Row type="checkbox" name="a" on={false} title="x" onChange={() => {}} />,
      ),
    ).toContain('type="checkbox"');
    expect(
      renderToStaticMarkup(
        <Chip name="k" on onChange={() => {}}>
          Dumbbells
        </Chip>,
      ),
    ).toContain('type="checkbox"');
  });
  it("maps progress to one tick per screen with a text equivalent", () => {
    const html = renderToStaticMarkup(<ProgressMap steps={QUICK_STEPS} current="days" />);
    expect((html.match(/class="jr-tick"/g) ?? []).length).toBe(QUICK_STEPS.length);
    expect(html).toContain("Step 4 of 8");
    expect(html).toContain('aria-current="step"');
    expect((html.match(/data-state="done"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("treats the optional personalise screen as part of the start step", () => {
    expect(
      renderToStaticMarkup(<ProgressMap steps={QUICK_STEPS} current="personalise" />),
    ).toContain("Step 8 of 8");
  });
});
