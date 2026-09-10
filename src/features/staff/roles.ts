export const roleOptions = [
  ["system_admin", "System Administrator"],
  ["senior_pastor", "Senior Pastor"],
  ["associate_pastor", "Associate Pastor"],
  ["leader", "Leader"],
  ["core_leader", "Core Leader"],
  ["multimedia_head", "Multimedia Head"],
  ["multimedia_team", "Multimedia Team"],
  ["bulletin_head", "Bulletin Head"],
  ["bulletin_team", "Bulletin Team"],
  ["treasurer", "Treasurer"],
  ["prayer_warrior", "Prayer Warrior"],
] as const;

export type RoleCode = (typeof roleOptions)[number][0];

export const inviteRoleOptions = roleOptions.filter(
  ([code]) => code !== "core_leader",
);

export const roleLabel = new Map<string, string>(roleOptions);
