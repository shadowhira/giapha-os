"use server";

import { auth } from "@/auth";
import { Relationship } from "@/types";
import { sql } from "@/utils/db/client";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload shape cho file backup JSON.
 * Các field DB-managed (created_at, updated_at) được giữ để tham khảo
 * nhưng sẽ bị loại bỏ khi import lại.
 */
interface PersonExport {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
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
  // DB-managed fields (kept in export for traceability, stripped on import)
  created_at?: string;
  updated_at?: string;
}

interface RelationshipExport {
  id?: string;
  type: string;
  person_a: string;
  person_b: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CustomEventExport {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonExport[];
  relationships: RelationshipExport[];
  custom_events?: CustomEventExport[];
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizePerson(
  p: PersonExport,
): Omit<PersonExport, "created_at" | "updated_at"> {
  return {
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    death_lunar_year: p.death_lunar_year ?? null,
    death_lunar_month: p.death_lunar_month ?? null,
    death_lunar_day: p.death_lunar_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null,
    phone_number: p.phone_number ?? null,
    occupation: p.occupation ?? null,
    current_residence: p.current_residence ?? null,
  };
}

function sanitizeRelationship(
  r: RelationshipExport,
): Omit<RelationshipExport, "id" | "created_at" | "updated_at"> {
  return {
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
    note: r.note ?? null,
  };
}

function sanitizeCustomEvent(
  e: CustomEventExport,
): Omit<CustomEventExport, "created_by"> {
  return {
    id: e.id,
    name: e.name,
    content: e.content ?? null,
    event_date: e.event_date,
    location: e.location ?? null,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportData(
  exportRootId?: string,
): Promise<BackupPayload | { error: string }> {
  await requireSession();

  let exportPersons: PersonExport[];
  let exportRels: RelationshipExport[];
  let exportCustomEvents: CustomEventExport[];

  try {
    exportPersons = (await sql`
      SELECT id, full_name, gender, birth_year, birth_month, birth_day,
        death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day,
        is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note,
        phone_number, occupation, current_residence, created_at, updated_at
      FROM persons ORDER BY created_at ASC
    `) as unknown as PersonExport[];

    exportRels = (await sql`
      SELECT id, type, person_a, person_b, note, created_at, updated_at
      FROM relationships ORDER BY created_at ASC
    `) as unknown as RelationshipExport[];

    exportCustomEvents = (await sql`
      SELECT id, name, content, event_date, location, created_by
      FROM custom_events ORDER BY event_date ASC
    `) as unknown as CustomEventExport[];
  } catch (error) {
    return { error: "Lỗi tải dữ liệu: " + (error as Error).message };
  }

  // If a root person is selected, filter the export to only their subtree
  if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
    const includedPersonIds = new Set<string>([exportRootId]);

    const childrenMap = new Map<string, string[]>();
    const spouseMap = new Map<string, string[]>();

    exportRels.forEach((r) => {
      if (r.type === "biological_child" || r.type === "adopted_child") {
        if (!childrenMap.has(r.person_a)) childrenMap.set(r.person_a, []);
        childrenMap.get(r.person_a)!.push(r.person_b);
      } else if (r.type === "marriage") {
        if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
        if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
        spouseMap.get(r.person_a)!.push(r.person_b);
        spouseMap.get(r.person_b)!.push(r.person_a);
      }
    });

    const findDescendants = (parentId: string) => {
      const children = childrenMap.get(parentId) || [];
      children.forEach((childId) => {
        if (!includedPersonIds.has(childId)) {
          includedPersonIds.add(childId);
          findDescendants(childId);
        }
      });
    };
    findDescendants(exportRootId);

    const descendantsArray = Array.from(includedPersonIds);
    descendantsArray.forEach((personId) => {
      const spouses = spouseMap.get(personId) || [];
      spouses.forEach((spouseId) => {
        includedPersonIds.add(spouseId);
      });
    });

    exportPersons = exportPersons.filter((p) => includedPersonIds.has(p.id));
    exportRels = exportRels.filter(
      (r) =>
        includedPersonIds.has(r.person_a) && includedPersonIds.has(r.person_b),
    );
    // custom_events are not person-scoped, so export all when subtree is selected
  }

  return {
    version: 4, // v4: person_details_private merged into persons
    timestamp: new Date().toISOString(),
    persons: exportPersons,
    relationships: exportRels,
    custom_events: exportCustomEvents,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(
  importPayload:
    | BackupPayload
    | {
        persons: PersonExport[];
        relationships: Relationship[];
        custom_events?: CustomEventExport[];
      },
) {
  await requireSession();

  if (!importPayload?.persons || !importPayload?.relationships) {
    return { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON." };
  }

  if (importPayload.persons.length === 0) {
    return {
      error: "File backup trống — không có thành viên nào để phục hồi.",
    };
  }

  try {
    // 1. Xoá dữ liệu cũ (thứ tự tôn trọng ràng buộc khoá ngoại)
    await sql`DELETE FROM custom_events`;
    await sql`DELETE FROM relationships`;
    await sql`DELETE FROM persons`;

    // 2. Insert persons (sanitized — chỉ giữ các field schema hiện tại)
    const persons = importPayload.persons.map(sanitizePerson);
    for (const p of persons) {
      await sql`
        INSERT INTO persons (
          id, full_name, gender, birth_year, birth_month, birth_day,
          death_year, death_month, death_day,
          death_lunar_year, death_lunar_month, death_lunar_day,
          is_deceased, is_in_law, birth_order, generation, other_names,
          avatar_url, note, phone_number, occupation, current_residence
        ) VALUES (
          ${p.id}::uuid, ${p.full_name}, ${p.gender}::public.gender_enum, ${p.birth_year}, ${p.birth_month}, ${p.birth_day},
          ${p.death_year}, ${p.death_month}, ${p.death_day},
          ${p.death_lunar_year}, ${p.death_lunar_month}, ${p.death_lunar_day},
          ${p.is_deceased}, ${p.is_in_law}, ${p.birth_order}, ${p.generation}, ${p.other_names},
          ${p.avatar_url}, ${p.note}, ${p.phone_number}, ${p.occupation}, ${p.current_residence}
        )
      `;
    }

    // 3. Insert relationships (bỏ tự-quan-hệ để tránh vi phạm ràng buộc no_self_relationship)
    const relationships = importPayload.relationships
      .filter((r) => r.person_a !== r.person_b)
      .map(sanitizeRelationship);

    for (const r of relationships) {
      await sql`
        INSERT INTO relationships (type, person_a, person_b, note)
        VALUES (${r.type}::public.relationship_type_enum, ${r.person_a}::uuid, ${r.person_b}::uuid, ${r.note})
      `;
    }

    // 4. Insert custom_events (nếu có, bỏ created_by)
    const customEvents = (importPayload.custom_events ?? []).map(sanitizeCustomEvent);
    for (const e of customEvents) {
      await sql`
        INSERT INTO custom_events (id, name, content, event_date, location)
        VALUES (${e.id}::uuid, ${e.name}, ${e.content}, ${e.event_date}::date, ${e.location})
      `;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/data");

    return {
      success: true,
      imported: {
        persons: persons.length,
        relationships: relationships.length,
        custom_events: customEvents.length,
      },
    };
  } catch (error) {
    return { error: "Lỗi khi import dữ liệu: " + (error as Error).message };
  }
}
