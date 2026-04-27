import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // Default to current browser origin in production to avoid origin mismatches.
    // Keep env override available for custom split-domain deployments.
    baseURL:
        process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        (typeof window !== "undefined" ? window.location.origin : undefined)
})