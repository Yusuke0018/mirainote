import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebaseAdmin";

const requestSchema = z.object({ email: z.string().min(1).max(320).email() });

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailToUid(email: string) {
  const normalized = normalizeEmail(email);
  const hash = Buffer.from(normalized).toString("base64url");
  return `email:${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = requestSchema.parse(body);
    const normalized = normalizeEmail(email);
    const uid = emailToUid(normalized);
    const token = await getAdminAuth().createCustomToken(uid, { email: normalized });
    return NextResponse.json({ token, uid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "無効なメールアドレスです" },
        { status: 400 },
      );
    }
    console.error("Failed to create email-login token", error);
    return NextResponse.json(
      { error: "サインイン用トークンの発行に失敗しました" },
      { status: 500 },
    );
  }
}
