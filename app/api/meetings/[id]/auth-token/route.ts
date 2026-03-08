import { NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import getAuthToken from "@/lib/get-auth-token"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const user = await currentUser()
    const dispatcherSessionId =
      request.headers.get("x-dispatcher-session-id") ?? "default"

    const authToken = await getAuthToken(id, {
      role: "viewer",
      name: user?.fullName ?? user?.username ?? "One Dispatcher",
      cacheKey: `dispatcher:${user?.id ?? "unknown"}:${dispatcherSessionId}`,
    })

    if (!authToken) {
      return NextResponse.json(
        { error: "Meeting auth token missing from Cloudflare response" },
        { status: 502 }
      )
    }

    return NextResponse.json({ authToken })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch meeting auth token",
      },
      { status: 500 }
    )
  }
}
