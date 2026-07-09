"use server";

import { auth } from "@/auth";
import { sql } from "@/utils/db/client";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
  return session;
}

export interface CustomEventInput {
  name: string;
  event_date: string;
  location: string | null;
  content: string | null;
}

export async function createCustomEvent(data: CustomEventInput): Promise<void> {
  const session = await requireSession();
  await sql`
    INSERT INTO custom_events (name, event_date, location, content, created_by)
    VALUES (${data.name}, ${data.event_date}::date, ${data.location}, ${data.content}, ${session.user?.email ?? null})
  `;
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
}

export async function updateCustomEvent(id: string, data: CustomEventInput): Promise<void> {
  await requireSession();
  await sql`
    UPDATE custom_events SET
      name = ${data.name},
      event_date = ${data.event_date}::date,
      location = ${data.location},
      content = ${data.content}
    WHERE id = ${id}::uuid
  `;
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
}

export async function deleteCustomEvent(id: string): Promise<void> {
  await requireSession();
  await sql`DELETE FROM custom_events WHERE id = ${id}::uuid`;
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
}
