"use server";

import { auth } from "@/auth";
import { GalleryItem } from "@/types";
import { sql } from "@/utils/db/client";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
  return session;
}

export interface GalleryItemInput {
  title: string;
  description: string | null;
  image_url: string;
  event_date: string | null;
}

export async function createGalleryItem(data: GalleryItemInput): Promise<void> {
  const session = await requireSession();
  await sql`
    INSERT INTO gallery_items (title, description, image_url, event_date, created_by)
    VALUES (${data.title}, ${data.description}, ${data.image_url}, ${data.event_date}::date, ${session.user?.email ?? null})
  `;
  revalidatePath("/dashboard/gallery");
}

export async function updateGalleryItem(id: string, data: GalleryItemInput): Promise<void> {
  await requireSession();
  await sql`
    UPDATE gallery_items SET
      title = ${data.title},
      description = ${data.description},
      image_url = ${data.image_url},
      event_date = ${data.event_date}::date
    WHERE id = ${id}::uuid
  `;
  revalidatePath("/dashboard/gallery");
}

export async function deleteGalleryItem(item: GalleryItem): Promise<void> {
  await requireSession();
  try {
    await del(item.image_url);
  } catch (error) {
    console.error("Error deleting gallery blob:", error);
  }
  await sql`DELETE FROM gallery_items WHERE id = ${item.id}::uuid`;
  revalidatePath("/dashboard/gallery");
}
