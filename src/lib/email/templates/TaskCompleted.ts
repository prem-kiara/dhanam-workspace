import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface TaskCompletedProps {
  ownerName:   string;
  completedBy: string;
  taskTitle:   string;
  taskUrl:     string;
}

export function TaskCompleted({ ownerName, completedBy, taskTitle, taskUrl }: TaskCompletedProps): string {
  return baseEmail(`Task completed: ${taskTitle}`, `
    ${heading(`✅ Task completed`)}
    ${para(`Hi ${ownerName}, ${completedBy} has marked a task as complete.`)}
    ${taskInfo("Task", taskTitle)}
    ${ctaButton(taskUrl, "View Task")}
  `);
}
