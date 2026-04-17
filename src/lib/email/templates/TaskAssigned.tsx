import { BaseEmail, CtaButton, Paragraph, Heading, TaskInfo } from "./BaseEmail";

interface Props {
  assigneeName:  string;
  assignerName:  string;
  taskTitle:     string;
  taskPriority?: string;
  taskDueDate?:  string;
  taskUrl:       string;
}

export function TaskAssigned({ assigneeName, assignerName, taskTitle, taskPriority, taskDueDate, taskUrl }: Props) {
  return (
    <BaseEmail title="New Task Assigned — Dhanam Workspace">
      <Heading>📋 New Task Assigned</Heading>
      <Paragraph>Hi {assigneeName},</Paragraph>
      <Paragraph>
        <strong>{assignerName}</strong> has assigned you a new task in Dhanam Workspace.
      </Paragraph>

      <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", padding: "16px", margin: "16px 0" }}>
        <TaskInfo label="Task"     value={taskTitle} />
        {taskPriority && <TaskInfo label="Priority" value={taskPriority} />}
        {taskDueDate  && <TaskInfo label="Due Date" value={taskDueDate} />}
      </div>

      <CtaButton href={taskUrl}>View Task →</CtaButton>
    </BaseEmail>
  );
}
