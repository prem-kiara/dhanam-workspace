import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface StatusChangedProps {
  ownerName:   string;
  changerName: string;
  taskTitle:   string;
  oldStatus:   string;
  newStatus:   string;
  taskUrl:     string;
}

export function StatusChanged({ ownerName, changerName, taskTitle, oldStatus, newStatus, taskUrl }: StatusChangedProps): string {
  return baseEmail(`Status updated: ${taskTitle}`, `
    ${heading(`📊 Task status has been updated`)}
    ${para(`Hi ${ownerName}, ${changerName} has updated the status of a task.`)}
    ${taskInfo("Task", taskTitle)}
    ${taskInfo("Previous Status", oldStatus)}
    ${taskInfo("New Status", newStatus)}
    ${ctaButton(taskUrl, "View Task")}
  `);
}
