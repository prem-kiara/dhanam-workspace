import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface TaskReassignedProps {
  assigneeName: string;
  fromName:     string;
  taskTitle:    string;
  taskUrl:      string;
}

export function TaskReassigned({ assigneeName, fromName, taskTitle, taskUrl }: TaskReassignedProps): string {
  return baseEmail(`Task reassigned to you: ${taskTitle}`, `
    ${heading(`🔄 A task has been reassigned to you`)}
    ${para(`Hi ${assigneeName}, ${fromName} has reassigned the following task to you.`)}
    ${taskInfo("Task", taskTitle)}
    ${ctaButton(taskUrl, "View Task")}
  `);
}
