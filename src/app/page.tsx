import { redirect } from "next/navigation";

// Root "/" redirects to the Diary page
export default function Home() {
  redirect("/diary");
}
