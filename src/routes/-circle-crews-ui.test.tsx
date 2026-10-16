import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Crew } from "@/data/circle-crews";
import type { CirclePerson } from "@/data/circle";
import { CreateCrew, CrewDetail } from "./circle_.crews";

const people: CirclePerson[] = [
  {
    user_id: "person-2",
    username: "amina",
    display_name: "Amina",
    avatar_path: null,
    relationship: "connected",
  },
  {
    user_id: "person-3",
    username: "bilal",
    display_name: "Bilal",
    avatar_path: null,
    relationship: "connected",
  },
];

const invitation: Crew = {
  id: "crew-1",
  name: "Saturday Standard",
  purpose: "Show up for one deliberate session before the weekend disappears.",
  owner_id: "person-1",
  owner_username: "owner",
  owner_display_name: "Owner",
  my_role: "member",
  my_status: "pending",
  active_count: 1,
  pending_count: 0,
  created_at: "2026-10-16T12:00:00Z",
  updated_at: "2026-10-16T12:00:00Z",
};

describe("Circle crews UI", () => {
  it("renders real connections as explicit optional invite controls", () => {
    const html = renderToStaticMarkup(
      <CreateCrew connections={people} onCancel={() => {}} onCreated={async () => {}} />,
    );
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).toContain("Amina");
    expect(html).toContain("Bilal");
    expect(html).toContain("everyone accepts for themselves");
  });

  it("tells an invitee exactly what joining does and does not share", () => {
    const html = renderToStaticMarkup(
      <CrewDetail crew={invitation} connections={people} parentRefresh={async () => {}} />,
    );
    expect(html).toContain("Joining shares only the roll calls you write here");
    expect(html).toContain("workouts, food, weight, Mind entries or Salah");
    expect(html).toContain("Accept");
    expect(html).toContain("Decline");
  });
});
