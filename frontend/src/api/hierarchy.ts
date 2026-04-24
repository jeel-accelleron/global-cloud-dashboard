import { api } from './client';
import { normalize } from './workItems';
import type { RawWorkItem, WorkItem } from './types';

export interface RawHierarchyNode {
  item: RawWorkItem;
  children: RawHierarchyNode[];
}

export interface HierarchyNode {
  item: WorkItem;
  children: HierarchyNode[];
}

function normalizeNode(raw: RawHierarchyNode): HierarchyNode {
  return {
    item: normalize(raw.item),
    children: (raw.children || []).map(normalizeNode),
  };
}

export async function getWorkItemHierarchy(
  id: number,
  maxDepth = 5
): Promise<HierarchyNode> {
  const { data } = await api.get<RawHierarchyNode>(`/${id}/hierarchy/`, {
    params: { max_depth: maxDepth },
  });
  return normalizeNode(data);
}
