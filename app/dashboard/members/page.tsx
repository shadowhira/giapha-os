import { MemberListProvider } from "@/context/MemberListContext";
import MembersViews from "@/components/MembersViews";
import MemberDetailModal from "@/components/modal/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import { sql } from "@/utils/db/client";

import { ViewMode } from "@/components/ViewToggle";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string; avatar?: string }>;
}
export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { view, rootId, avatar } = await searchParams;
  const initialView = view as ViewMode | undefined;
  const initialShowAvatar = avatar !== "hide";

  const [persons, relationships] = (await Promise.all([
    sql`SELECT * FROM persons ORDER BY birth_year ASC NULLS LAST`,
    sql`SELECT * FROM relationships`,
  ])) as unknown as [Person[], Relationship[]];

  // Prepare map and roots for tree views
  const personsMap = new Map();
  persons.forEach((p) => personsMap.set(p.id, p));

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child",
      )
      .map((r) => r.person_b),
  );

  let finalRootId = rootId;

  // If no rootId is provided, fallback to the earliest created person
  if (!finalRootId || !personsMap.has(finalRootId)) {
    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    if (rootsFallback.length > 0) {
      finalRootId = rootsFallback[0].id;
    } else if (persons.length > 0) {
      finalRootId = persons[0].id; // ultimate fallback
    }
  }

  return (
    <MemberListProvider
      initialView={initialView}
      initialRootId={finalRootId}
      initialShowAvatar={initialShowAvatar}
    >
      <ViewToggle />
      <MembersViews persons={persons} relationships={relationships} canEdit={true} />

      <MemberDetailModal />
    </MemberListProvider>
  );
}
