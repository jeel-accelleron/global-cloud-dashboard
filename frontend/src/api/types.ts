export interface RawWorkItem {
  id: number;
  rev?: number;
  url?: string;
  fields: Record<string, any>;
}

export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  assignedTo: string | null;
  priority: number | null;
  tags: string[];
  areaPath: string | null;
  iterationPath: string | null;
  createdDate: string | null;
  changedDate: string | null;
  startDate: string | null;
  dueDate: string | null;
  targetDate: string | null;
  finishDate: string | null;
  closedDate: string | null;
  raw: RawWorkItem;
}

export interface WorkItemListResponse {
  count: number;
  results: RawWorkItem[];
}

export interface WorkItemFilters {
  type?: string;
  state?: string;
  assigned_to?: string;
  area_path?: string;
  iteration_path?: string;
  tags?: string;
  top?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  streaming?: boolean;
}
