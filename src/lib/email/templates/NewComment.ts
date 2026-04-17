import { baseEmail, ctaButton, heading, para, taskInfo } from "./BaseEmail";

interface NewCommentProps {
  recipientName:  string;
  commenterName:  string;
  taskTitle:      string;
  commentText:    string;
  taskUrl:        string;
}

export function NewComment({ recipientName, commenterName, taskTitle, commentText, taskUrl }: NewCommentProps): string {
  return baseEmail(`New comment: ${taskTitle}`, `
    ${heading(`💬 New comment on your task`)}
    ${para(`Hi ${recipientName}, ${commenterName} has left a comment.`)}
    ${taskInfo("Task", taskTitle)}
    ${taskInfo("Comment", commentText.slice(0, 200))}
    ${ctaButton(taskUrl, "View Comment")}
  `);
}
