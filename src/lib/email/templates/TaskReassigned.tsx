import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  assigneeName: string;
  fromName:     string;
  taskTitle:    string;
  taskUrl:      string;
}

export function TaskReassigned({ assigneeName, fromName, taskTitle, taskUrl }: Props) {
  return (
    <BaseEmail title="Task Reassigned — Dhanam Workspace">
      <Heading>🔄 Task Reassigned to You</Heading>
      <Paragraph>Hi {assigneeName},</Paragraph>
      <Paragraph>
        <strong>{fromName}</strong> has reassigned the following task to you.
      </Paragraph>
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", margin: "16px 0" }}>
        <TaskInfo label="Task" value={taskTitle} />
      </div>
      <CtaButton href={taskUrl}>Open Task →</CtaButton>
    </BaseEmail>
  );
}
