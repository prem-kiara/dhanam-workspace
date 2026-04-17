import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface WorkspaceInviteProps {
  inviteeName:   string;
  inviterName:   string;
  workspaceName: string;
  joinUrl:       string;
}

export function WorkspaceInvite({ inviteeName, inviterName, workspaceName, joinUrl }: WorkspaceInviteProps): string {
  return baseEmail(`Invited to ${workspaceName} — Dhanam Workspace`, `
    ${heading(`🗂 You've been invited to a workspace`)}
    ${para(`Hi ${inviteeName}, ${inviterName} has invited you to collaborate.`)}
    ${taskInfo("Workspace", workspaceName)}
    ${ctaButton(joinUrl, "Join Workspace")}
  `);
}
