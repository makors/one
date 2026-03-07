import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// placeholder page, redirects handles auth
export default async function Page() {
  const user = await currentUser();

  if (user?.id) {
    return redirect("/dashboard")
  }

  return (
    <Show when="signed-out">
      <RedirectToSignIn />
    </Show>
  )
}
