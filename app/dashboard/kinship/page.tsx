import KinshipFinder from "@/components/KinshipFinder";
import { sql } from "@/utils/db/client";

export const metadata = {
  title: "Tra cứu danh xưng",
};

export default async function KinshipPage() {
  const persons = await sql`
    SELECT id, full_name, gender, birth_year, birth_order, generation, is_in_law, avatar_url
    FROM persons ORDER BY birth_year ASC NULLS LAST
  `;

  const relationships = await sql`SELECT type, person_a, person_b FROM relationships`;

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="title">Tra cứu danh xưng</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn hai thành viên để tự động tính cách gọi theo quan hệ gia phả
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <KinshipFinder
          persons={persons as unknown as Parameters<typeof KinshipFinder>[0]["persons"]}
          relationships={relationships as unknown as Parameters<typeof KinshipFinder>[0]["relationships"]}
        />
      </main>
    </div>
  );
}
