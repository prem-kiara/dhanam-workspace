import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  recipientName: string;
  commenterName: string;
  taskTitle:     string;
  commentText:   string;
  taskUrl:       string;
}

export function NewComment({ recipientName, commenterName, taskTitle, commentText, taskUrl }: Props) {
  return (
    <BaseEmail title="New Comment — Dhanam Workspace">
      <Heading>💬 New Comment on Task</Heading>
      <Paragraph>Hi {recipientName},</Paragraph>
      <Paragraph>
        <strong>{commenterName}</strong> commented on a task you&apos;re involved in.
      </Paragraph>
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", margin: "16px 0" }}>
        <TaskInfo label="Task" value={taskTitle} />
        <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: "1.5", fontStyle: "italic" }}>
            &ldquo;{commentText}&rdquo;
          </p>
        </div>
      </div>
      <CtaButton href={taskUrl}>Reply →</CtaButton>
    </BaseEmail>
  );
}
