"use server";

import { auth } from "@/auth";
import { del, put } from "@vercel/blob";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  await requireSession();
  const file = formData.get("file") as File | null;
  if (!file) return { url: null, error: "Không có tệp nào được tải lên." };

  try {
    const blob = await put(`avatars/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: blob.url, error: null };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { url: null, error: (error as Error).message };
  }
}

export async function uploadGalleryImage(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  await requireSession();
  const file = formData.get("file") as File | null;
  if (!file) return { url: null, error: "Không có tệp nào được tải lên." };

  try {
    const blob = await put(`gallery/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: blob.url, error: null };
  } catch (error) {
    console.error("Error uploading gallery image:", error);
    return { url: null, error: (error as Error).message };
  }
}

export async function deleteBlob(url: string): Promise<void> {
  await requireSession();
  try {
    await del(url);
  } catch (error) {
    console.error("Error deleting blob:", error);
  }
}
