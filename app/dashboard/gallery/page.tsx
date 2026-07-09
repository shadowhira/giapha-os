import { GalleryItem } from "@/types";
import { sql } from "@/utils/db/client";
import GalleryClient from "@/components/GalleryClient";

export const metadata = {
  title: "Phòng trưng bày | Gia Phả OS",
  description: "Lưu giữ và chia sẻ hình ảnh, kỷ niệm dòng họ",
};

export default async function GalleryPage() {
  const items = (await sql`
    SELECT * FROM gallery_items ORDER BY event_date DESC NULLS LAST
  `) as unknown as GalleryItem[];

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <GalleryClient initialItems={items} />
    </main>
  );
}
