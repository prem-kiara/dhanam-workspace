import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  inviteeName:    string;
  inviterName:    string;
  workspaceName:  string;
  joinUrl:        string;
}

export function WorkspaceInvite({ inviteeName, inviterName, workspaceName, joinUrl }: Props) {
  return (
    <BaseEmail title="Workspace Invite — Dhanam Workspace">
      <Heading>🗂 You&apos;re Invited to a Workspace</Heading>
      <Paragraph>Hi {inviteeName},</Paragraph>
      <Paragraph>
        <strong>{inviterName}</strong> has invited you to join the <strong>{workspaceName}</strong> workspace on Dhanam Workspace.
      </Paragraph>
      <div style={{ backgroundColor: "#faf5ff", borderRadius: "12px", padding: "16px", margin: "16px 0", border: "1px solid #e9d5ff" }}>
        <TaskInfo label="Workspace" value={workspaceName} />
        <TaskInfo label="Invited by" value={inviterName} />
      </div>
      <Paragraph>Click the button below to sign in and accept the invitation.</Paragraph>
      <CtaButton href={joinUrl}>Join Workspace →</CtaButton>
    </BaseEmail>
  );
}
