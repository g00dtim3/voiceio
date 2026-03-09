"use client";

import { useParams } from "next/navigation";
import { TopicsScreen } from "@/features/topics";

// TODO: collectionId should come from route params or project config
const DEFAULT_COLLECTION_ID = "default";

export default function TopicsPage() {
  const params = useParams<{ projectId: string }>();

  return (
    <TopicsScreen
      projectId={params.projectId}
      collectionId={DEFAULT_COLLECTION_ID}
    />
  );
}
