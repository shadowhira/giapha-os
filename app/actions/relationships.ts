"use server";

import { auth } from "@/auth";
import { Person, RelationshipType } from "@/types";
import { sql } from "@/utils/db/client";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
}

export interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
  note: string | null;
}

export interface RelationshipStats {
  biologicalChildren: number;
  maleBiologicalChildren: number;
  femaleBiologicalChildren: number;
  paternalGrandchildren: number;
  maternalGrandchildren: number;
  sonInLaw: number;
  daughterInLaw: number;
}

export async function getRelationshipData(
  personId: string,
): Promise<{ relationships: EnrichedRelationship[]; stats: RelationshipStats }> {
  const relsA = (await sql`
    SELECT r.id, r.type, r.note, to_jsonb(p) AS target
    FROM relationships r
    JOIN persons p ON p.id = r.person_b
    WHERE r.person_a = ${personId}::uuid
  `) as { id: string; type: RelationshipType; note: string | null; target: Person }[];

  const relsB = (await sql`
    SELECT r.id, r.type, r.note, to_jsonb(p) AS target
    FROM relationships r
    JOIN persons p ON p.id = r.person_a
    WHERE r.person_b = ${personId}::uuid
  `) as { id: string; type: RelationshipType; note: string | null; target: Person }[];

  const formattedRels: EnrichedRelationship[] = [];

  relsA.forEach((r) => {
    let direction: "parent" | "child" | "spouse" = "spouse";
    if (r.type === "marriage") direction = "spouse";
    else if (r.type === "biological_child" || r.type === "adopted_child")
      direction = "child";

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note,
    });
  });

  relsB.forEach((r) => {
    let direction: "parent" | "child" | "spouse" = "spouse";
    if (r.type === "marriage") direction = "spouse";
    else if (r.type === "biological_child" || r.type === "adopted_child")
      direction = "parent";

    formattedRels.push({
      id: r.id,
      type: r.type,
      direction,
      targetPerson: r.target,
      note: r.note,
    });
  });

  const childrenIds = formattedRels
    .filter((r) => r.direction === "child")
    .map((r) => r.targetPerson.id);

  if (childrenIds.length > 0) {
    const childrenMarriages = (await sql`
      SELECT r.id, r.person_a, r.person_b, r.note,
        to_jsonb(pa) AS person_a_data, to_jsonb(pb) AS person_b_data
      FROM relationships r
      JOIN persons pa ON pa.id = r.person_a
      JOIN persons pb ON pb.id = r.person_b
      WHERE r.type = 'marriage'
        AND (r.person_a = ANY(${childrenIds}::uuid[]) OR r.person_b = ANY(${childrenIds}::uuid[]))
    `) as {
      id: string;
      person_a: string;
      person_b: string;
      note: string | null;
      person_a_data: Person;
      person_b_data: Person;
    }[];

    childrenMarriages.forEach((m) => {
      const isAChild = childrenIds.includes(m.person_a);
      const childPerson = isAChild ? m.person_a_data : m.person_b_data;
      const spousePerson = isAChild ? m.person_b_data : m.person_a_data;

      if (spousePerson && childPerson) {
        const spouseGender = spousePerson.gender;
        let noteLabel = `Vợ/chồng của ${childPerson.full_name}`;
        if (spouseGender === "female")
          noteLabel = `Con dâu (vợ của ${childPerson.full_name})`;
        if (spouseGender === "male")
          noteLabel = `Con rể (chồng của ${childPerson.full_name})`;

        if (m.note) noteLabel += ` - ${m.note}`;

        formattedRels.push({
          id: m.id + "_inlaw",
          type: "marriage",
          direction: "child_in_law",
          targetPerson: spousePerson,
          note: noteLabel,
        });
      }
    });
  }

  const biologicalChildrenList = formattedRels.filter(
    (r) => r.direction === "child" && r.type === "biological_child",
  );
  const biologicalChildren = biologicalChildrenList.length;
  const maleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === "male",
  ).length;
  const femaleBiologicalChildren = biologicalChildrenList.filter(
    (c) => c.targetPerson.gender === "female",
  ).length;

  const daughterInLaw = formattedRels.filter(
    (r) => r.direction === "child_in_law" && r.targetPerson.gender === "female",
  ).length;
  const sonInLaw = formattedRels.filter(
    (r) => r.direction === "child_in_law" && r.targetPerson.gender === "male",
  ).length;

  let paternalGrandchildren = 0;
  let maternalGrandchildren = 0;

  if (childrenIds.length > 0) {
    const grandchildrenData = (await sql`
      SELECT id, person_a FROM relationships
      WHERE type IN ('biological_child', 'adopted_child')
        AND person_a = ANY(${childrenIds}::uuid[])
    `) as { id: string; person_a: string }[];

    const maleChildrenIds = formattedRels
      .filter((r) => r.direction === "child" && r.targetPerson.gender === "male")
      .map((r) => r.targetPerson.id);
    const femaleChildrenIds = formattedRels
      .filter((r) => r.direction === "child" && r.targetPerson.gender === "female")
      .map((r) => r.targetPerson.id);

    paternalGrandchildren = grandchildrenData.filter((g) =>
      maleChildrenIds.includes(g.person_a),
    ).length;
    maternalGrandchildren = grandchildrenData.filter((g) =>
      femaleChildrenIds.includes(g.person_a),
    ).length;
  }

  return {
    relationships: formattedRels,
    stats: {
      biologicalChildren,
      maleBiologicalChildren,
      femaleBiologicalChildren,
      paternalGrandchildren,
      maternalGrandchildren,
      sonInLaw,
      daughterInLaw,
    },
  };
}

export async function searchPersons(query: string, excludeId: string): Promise<Person[]> {
  const rows = await sql`
    SELECT * FROM persons
    WHERE full_name ILIKE ${"%" + query + "%"} AND id != ${excludeId}::uuid
    LIMIT 5
  `;
  return rows as unknown as Person[];
}

export async function getRecentPersons(excludeId: string): Promise<Person[]> {
  const rows = await sql`
    SELECT * FROM persons
    WHERE id != ${excludeId}::uuid
    ORDER BY created_at DESC
    LIMIT 10
  `;
  return rows as unknown as Person[];
}

export async function createRelationship(input: {
  personId: string;
  personGeneration: number | null;
  personIsInLaw: boolean;
  targetId: string;
  direction: "parent" | "child" | "spouse";
  relType: RelationshipType;
  note: string | null;
}): Promise<void> {
  await requireSession();
  const { personId, personGeneration, personIsInLaw, targetId, direction, relType, note } = input;

  let personA = personId;
  let personB = targetId;
  if (direction === "parent") {
    personA = targetId;
    personB = personId;
  } else if (direction === "child") {
    personA = personId;
    personB = targetId;
  }

  const type: RelationshipType = direction === "spouse" ? "marriage" : relType;

  await sql`
    INSERT INTO relationships (person_a, person_b, type, note)
    VALUES (${personA}::uuid, ${personB}::uuid, ${type}::public.relationship_type_enum, ${note})
  `;

  // Auto-update target person generation and is_in_law if currently missing
  try {
    const targetRows = await sql`
      SELECT generation, is_in_law FROM persons WHERE id = ${targetId}::uuid
    `;
    const targetPerson = targetRows[0] as { generation: number | null; is_in_law: boolean | null } | undefined;

    if (targetPerson && (targetPerson.generation == null || targetPerson.is_in_law == null)) {
      let newGeneration: number | null = targetPerson.generation;
      let newIsInLaw: boolean | null = targetPerson.is_in_law;

      if (targetPerson.generation == null && personGeneration != null) {
        if (direction === "child") newGeneration = personGeneration + 1;
        else if (direction === "parent") newGeneration = personGeneration - 1;
        else if (direction === "spouse") newGeneration = personGeneration;
      }

      if (targetPerson.is_in_law == null) {
        if (direction === "child" || direction === "parent") newIsInLaw = false;
        else if (direction === "spouse") newIsInLaw = personIsInLaw !== true;
      }

      if (newGeneration !== targetPerson.generation || newIsInLaw !== targetPerson.is_in_law) {
        await sql`
          UPDATE persons SET generation = ${newGeneration}, is_in_law = ${newIsInLaw}
          WHERE id = ${targetId}::uuid
        `;
      }
    }
  } catch (err) {
    console.error("Failed to auto-update target person properties", err);
  }

  revalidatePath("/dashboard/members");
}

export async function deleteRelationship(id: string): Promise<void> {
  await requireSession();
  await sql`DELETE FROM relationships WHERE id = ${id}::uuid`;
  revalidatePath("/dashboard/members");
}

export async function bulkAddChildren(input: {
  parentId: string;
  parentGeneration: number | null;
  spouseId: string | null;
  children: {
    name: string;
    gender: "male" | "female" | "other";
    birthYear: string;
    birthOrder: string;
  }[];
}): Promise<{ successCount: number; total: number }> {
  await requireSession();
  const { parentId, parentGeneration, spouseId, children } = input;

  let successCount = 0;

  for (const child of children) {
    const generation = parentGeneration != null ? parentGeneration + 1 : null;
    const birthYear = child.birthYear.trim() !== "" && !isNaN(parseInt(child.birthYear))
      ? parseInt(child.birthYear)
      : null;
    const birthOrder = child.birthOrder.trim() !== "" && !isNaN(parseInt(child.birthOrder))
      ? parseInt(child.birthOrder)
      : null;

    try {
      const rows = await sql`
        INSERT INTO persons (full_name, gender, is_in_law, generation, birth_year, birth_order)
        VALUES (${child.name.trim()}, ${child.gender}::public.gender_enum, false, ${generation}, ${birthYear}, ${birthOrder})
        RETURNING id
      `;
      const newChildId = (rows[0] as { id: string }).id;

      await sql`
        INSERT INTO relationships (person_a, person_b, type)
        VALUES (${parentId}::uuid, ${newChildId}::uuid, 'biological_child')
      `;

      if (spouseId && spouseId !== "unknown") {
        await sql`
          INSERT INTO relationships (person_a, person_b, type)
          VALUES (${spouseId}::uuid, ${newChildId}::uuid, 'biological_child')
        `;
      }

      successCount++;
    } catch (err) {
      console.error("Error inserting child:", child.name, err);
    }
  }

  revalidatePath("/dashboard/members");
  return { successCount, total: children.length };
}

export async function quickAddSpouse(input: {
  personId: string;
  personGeneration: number | null;
  personIsInLaw: boolean;
  personGender: "male" | "female" | "other";
  name: string;
  birthYear: string;
  note: string;
}): Promise<void> {
  await requireSession();
  const { personId, personGeneration, personIsInLaw, personGender, name, birthYear, note } = input;

  const newSpouseGender =
    personGender === "male" ? "female" : personGender === "female" ? "male" : "female";

  const parsedBirthYear = birthYear.trim() !== "" && !isNaN(parseInt(birthYear))
    ? parseInt(birthYear)
    : null;

  const rows = await sql`
    INSERT INTO persons (full_name, gender, is_in_law, generation, birth_year)
    VALUES (${name.trim()}, ${newSpouseGender}::public.gender_enum, ${personIsInLaw !== true}, ${personGeneration}, ${parsedBirthYear})
    RETURNING id
  `;
  const newSpouseId = (rows[0] as { id: string }).id;

  await sql`
    INSERT INTO relationships (person_a, person_b, type, note)
    VALUES (${personId}::uuid, ${newSpouseId}::uuid, 'marriage', ${note.trim() || null})
  `;

  revalidatePath("/dashboard/members");
}
