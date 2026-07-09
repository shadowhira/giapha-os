"use server";

import { auth } from "@/auth";
import { Gender, Person } from "@/types";
import { sql } from "@/utils/db/client";
import { revalidatePath } from "next/cache";

export interface PersonInput {
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  avatar_url: string | null;
  note: string | null;
  phone_number: string | null;
  occupation: string | null;
  current_residence: string | null;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
}

export async function getAllPersons(): Promise<Person[]> {
  const rows = await sql`SELECT * FROM persons ORDER BY birth_year ASC NULLS LAST`;
  return rows as unknown as Person[];
}

export async function getPerson(id: string): Promise<Person | null> {
  const rows = await sql`SELECT * FROM persons WHERE id = ${id}::uuid`;
  return (rows[0] as unknown as Person) ?? null;
}

export async function createPerson(data: PersonInput): Promise<Person> {
  await requireSession();
  const rows = await sql`
    INSERT INTO persons (
      full_name, gender, birth_year, birth_month, birth_day,
      death_year, death_month, death_day,
      death_lunar_year, death_lunar_month, death_lunar_day,
      is_deceased, is_in_law, birth_order, generation, other_names,
      avatar_url, note, phone_number, occupation, current_residence
    ) VALUES (
      ${data.full_name}, ${data.gender}::public.gender_enum, ${data.birth_year}, ${data.birth_month}, ${data.birth_day},
      ${data.death_year}, ${data.death_month}, ${data.death_day},
      ${data.death_lunar_year}, ${data.death_lunar_month}, ${data.death_lunar_day},
      ${data.is_deceased}, ${data.is_in_law}, ${data.birth_order}, ${data.generation}, ${data.other_names},
      ${data.avatar_url}, ${data.note}, ${data.phone_number}, ${data.occupation}, ${data.current_residence}
    )
    RETURNING *
  `;
  revalidatePath("/dashboard/members");
  return rows[0] as unknown as Person;
}

export async function updatePerson(id: string, data: PersonInput): Promise<Person> {
  await requireSession();
  const rows = await sql`
    UPDATE persons SET
      full_name = ${data.full_name},
      gender = ${data.gender}::public.gender_enum,
      birth_year = ${data.birth_year},
      birth_month = ${data.birth_month},
      birth_day = ${data.birth_day},
      death_year = ${data.death_year},
      death_month = ${data.death_month},
      death_day = ${data.death_day},
      death_lunar_year = ${data.death_lunar_year},
      death_lunar_month = ${data.death_lunar_month},
      death_lunar_day = ${data.death_lunar_day},
      is_deceased = ${data.is_deceased},
      is_in_law = ${data.is_in_law},
      birth_order = ${data.birth_order},
      generation = ${data.generation},
      other_names = ${data.other_names},
      avatar_url = ${data.avatar_url},
      note = ${data.note},
      phone_number = ${data.phone_number},
      occupation = ${data.occupation},
      current_residence = ${data.current_residence}
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${id}`);
  return rows[0] as unknown as Person;
}

export async function updatePersonAvatar(id: string, avatarUrl: string): Promise<void> {
  await requireSession();
  await sql`UPDATE persons SET avatar_url = ${avatarUrl} WHERE id = ${id}::uuid`;
  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${id}`);
}

export async function applyLineageUpdates(
  updates: {
    id: string;
    generation: number | null;
    birth_order: number | null;
    is_in_law: boolean;
  }[],
): Promise<void> {
  await requireSession();
  for (const u of updates) {
    await sql`
      UPDATE persons SET generation = ${u.generation}, birth_order = ${u.birth_order}, is_in_law = ${u.is_in_law}
      WHERE id = ${u.id}::uuid
    `;
  }
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/lineage");
}
