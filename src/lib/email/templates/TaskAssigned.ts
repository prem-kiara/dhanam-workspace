import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface TaskAssignedProps {
  assigneeName: string;
  assignerName: string;
  taskTitle:    string;
  taskUrl:      string;
}

export function TaskAssigned({ assigneeName, assignerName, taskTitle, taskUrl }: TaskAssignedProps): string {
  return baseEmail(`New task assigned: ${taskTitle}`, `
    ${heading(`📋 You've been assigned a task`)}
    ${para(`Hi ${assigneeName}, ${assignerName} has assigned you a new task.`)}
    ${taskInfo("Task", taskTitle)}
    ${ctaButton(taskUrl, "View Task")}
  `);
}
