import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  ownerName:     string;
  completedBy:   string;
  taskTitle:     string;
  taskUrl:       string;
}

export function TaskCompleted({ ownerName, completedBy, taskTitle, taskUrl }: Props) {
  return (
    <BaseEmail title="Task Completed — Dhanam Workspace">
      <Heading>✅ Task Completed</Heading>
      <Paragraph>Hi {ownerName},</Paragraph>
      <Paragraph>
        Great news! <strong>{completedBy}</strong> has marked a task as done.
      </Paragraph>
      <div style={{ backgroundColor: "#ecfdf5", borderRadius: "12px", padding: "16px", margin: "16px 0", border: "1px solid #d1fae5" }}>
        <TaskInfo label="Task" value={taskTitle} />
      </div>
      <CtaButton href={taskUrl}>View Task →</CtaButton>
    </BaseEmail>
  );
}
