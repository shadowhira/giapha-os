"use server";

import { auth } from "@/auth";
import { sql } from "@/utils/db/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Bạn cần đăng nhập để thực hiện thao tác này." };
  }

  const relationships = await sql`
    SELECT id FROM relationships
    WHERE person_a = ${memberId}::uuid OR person_b = ${memberId}::uuid
    LIMIT 1
  `;

  if (relationships.length > 0) {
    return {
      error:
        "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  await sql`DELETE FROM persons WHERE id = ${memberId}::uuid`;

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members");
}
