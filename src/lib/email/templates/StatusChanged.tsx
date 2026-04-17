import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  ownerName:    string;
  changerName:  string;
  taskTitle:    string;
  oldStatus:    string;
  newStatus:    string;
  taskUrl:      string;
}

export function StatusChanged({ ownerName, changerName, taskTitle, oldStatus, newStatus, taskUrl }: Props) {
  return (
    <BaseEmail title="Task Status Updated — Dhanam Workspace">
      <Heading>📊 Task Status Updated</Heading>
      <Paragraph>Hi {ownerName},</Paragraph>
      <Paragraph>
        <strong>{changerName}</strong> has updated the status of a task you own.
      </Paragraph>
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", margin: "16px 0" }}>
        <TaskInfo label="Task"       value={taskTitle} />
        <TaskInfo label="Old Status" value={oldStatus} />
        <TaskInfo label="New Status" value={newStatus} />
      </div>
      <CtaButton href={taskUrl}>View Task →</CtaButton>
    </BaseEmail>
  );
}
