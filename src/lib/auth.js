import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../generated/prisma/client";
import { nextCookies } from "better-auth/next-js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { getVerificationEmailTemplate, getPasswordResetEmailTemplate } from "./emailTemplates";

const prisma = new PrismaClient();

function parseTrustedOrigins(value) {
    if (!value) return [];
    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function getOriginFromUrl(url) {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function resolveBaseUrl() {
    const candidates = [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_AUTH_BASE_URL,
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        process.env.URL,
        process.env.DEPLOY_PRIME_URL,
        process.env.DEPLOY_URL,
    ].filter(Boolean);

    if (candidates.length > 0) {
        return candidates[0];
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}

const baseURL = resolveBaseUrl();
const trustedOriginEnv = [
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    process.env.BETTER_AUTH_TRUSTED_ORIGIN,
    process.env.TRUSTED_ORIGINS,
]
    .filter(Boolean)
    .join(",");

const trustedOrigins = Array.from(
    new Set(
        [
            getOriginFromUrl(baseURL),
            getOriginFromUrl(process.env.BETTER_AUTH_URL),
            getOriginFromUrl(process.env.NEXT_PUBLIC_AUTH_BASE_URL),
            getOriginFromUrl(process.env.NEXT_PUBLIC_BETTER_AUTH_URL),
            getOriginFromUrl(process.env.URL),
            getOriginFromUrl(process.env.DEPLOY_PRIME_URL),
            getOriginFromUrl(process.env.DEPLOY_URL),
            "http://localhost:3000",
            ...parseTrustedOrigins(trustedOriginEnv),
        ].filter(Boolean)
    )
);

export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins,
    
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            const html = getPasswordResetEmailTemplate(user.name || user.email, url);
            void sendPasswordResetEmail({
                to: user.email,
                subject: "Reset your password",
                html,
            });
        },
        onPasswordReset: async ({ user }, request) => {
            console.log(`✅ Password for user ${user.email} has been successfully reset.`);
        },
    },

    emailVerification: {
        sendVerificationEmail: async ({ user, url }, request) => {
            const html = getVerificationEmailTemplate(user.name || user.email, url);
            console.log("📧 Sending verification email to:", user.email);
            void sendVerificationEmail({
                to: user.email,
                subject: "Verify your email address",
                html,
            });
        },
        sendOnSignUp: true,
    },

    socialProviders: {
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID || "", 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "" 
        },
        github: { 
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || ""
        }
    },
    plugins: [nextCookies()],
});