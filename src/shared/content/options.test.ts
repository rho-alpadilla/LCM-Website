import { describe, expect, it } from "vitest";

import { manageableContentSections } from "./options";

describe("manageableContentSections", () => {
  it("shows only website areas allowed by the account permissions", () => {
    expect(
      manageableContentSections([
        "content.sermons.manage",
        "content.bulletins.manage",
      ]),
    ).toEqual([
      {
        id: "sermons",
        label: "Sermons",
        description: "Messages, series, and speakers",
        contentTypes: ["sermon"],
      },
      {
        id: "bulletins",
        label: "Bulletins",
        description: "Weekly bulletin posts and files",
        contentTypes: ["bulletin"],
      },
    ]);
  });
});
