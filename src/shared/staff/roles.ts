export const roleOptions = [
  ["system_admin", "System Administrator"],
  ["pastor", "Pastor"],
  ["core_leader", "Core Leader"],
  ["content_publisher", "Content Publisher"],
  ["content_editor", "Content Editor"],
  ["prayer_warrior", "Prayer Warrior"],
] as const;

export type RoleCode = (typeof roleOptions)[number][0];

export const inviteRoleOptions = roleOptions.filter(
  ([code]) => code !== "core_leader",
);

export const roleLabel = new Map<string, string>(roleOptions);
