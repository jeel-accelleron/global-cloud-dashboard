import { api } from './client';
import type {
  RawWorkItem,
  WorkItem,
  WorkItemFilters,
  WorkItemListResponse,
} from './types';

function f(raw: RawWorkItem, key: string) {
  return raw.fields?.[key] ?? null;
}

export function normalize(raw: RawWorkItem): WorkItem {
  const assignedToObj = f(raw, 'System.AssignedTo');
  const assignedTo =
    typeof assignedToObj === 'string'
      ? assignedToObj
      : assignedToObj?.displayName ?? assignedToObj?.uniqueName ?? null;

  const tagsRaw = f(raw, 'System.Tags');
  const tags =
    typeof tagsRaw === 'string' && tagsRaw.length
      ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean)
      : [];

  return {
    id: raw.id,
    title: f(raw, 'System.Title') ?? `#${raw.id}`,
    type: f(raw, 'System.WorkItemType') ?? 'Unknown',
    state: f(raw, 'System.State') ?? 'Unknown',
    assignedTo,
    priority: f(raw, 'Microsoft.VSTS.Common.Priority'),
    tags,
    areaPath: f(raw, 'System.AreaPath'),
    iterationPath: f(raw, 'System.IterationPath'),
    createdDate: f(raw, 'System.CreatedDate'),
    changedDate: f(raw, 'System.ChangedDate'),
    startDate: f(raw, 'Microsoft.VSTS.Scheduling.StartDate'),
    dueDate: f(raw, 'Microsoft.VSTS.Scheduling.DueDate'),
    targetDate: f(raw, 'Microsoft.VSTS.Scheduling.TargetDate'),
    finishDate: f(raw, 'Microsoft.VSTS.Scheduling.FinishDate'),
    closedDate: f(raw, 'Microsoft.VSTS.Common.ClosedDate'),
    raw,
  };
}

const FILTER_KEY_MAP: Record<string, string> = {
  type: 'work_item_type',
};

export async function listWorkItems(filters: WorkItemFilters = {}): Promise<WorkItem[]> {
  const params: Record<string, any> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      const key = FILTER_KEY_MAP[k] ?? k;
      params[key] = v;
    }
  });
  if (!params.top) params.top = 200;
  const { data } = await api.get<WorkItemListResponse>('/', { params });
  return (data.results || []).map(normalize);
}

export async function searchWorkItems(q: string, top = 100): Promise<WorkItem[]> {
  const { data } = await api.get<WorkItemListResponse>('/search/', {
    params: { q, top },
  });
  return (data.results || []).map(normalize);
}

export async function recentlyUpdated(days = 7, top = 100): Promise<WorkItem[]> {
  const { data } = await api.get<WorkItemListResponse>('/updated-since/', {
    params: { days, top },
  });
  return (data.results || []).map(normalize);
}

export async function health(): Promise<boolean> {
  try {
    const { data } = await api.get('/health/');
    return data?.status === 'ok' || data?.status === 'healthy';
  } catch {
    return false;
  }
}

export interface TeamMember {
  displayName: string | null;
  uniqueName: string | null;
  imageUrl: string | null;
}

export interface TeamInfo {
  project: { name: string; description: string };
  team: { id: string; name: string; description: string } | null;
  admins: TeamMember[];
  members: TeamMember[];
}

export async function getTeam(team?: string): Promise<TeamInfo> {
  const { data } = await api.get<TeamInfo>('/team/', {
    params: team ? { team } : undefined,
  });
  return data;
}

export type ActivityRange = 'week' | 'month' | 'quarter' | 'half' | 'year';

export interface ProjectActivity {
  id: number;
  name: string;
  state: string | null;
  total: number;
  series: { date: string; count: number }[];
}

export interface ProjectActivityResponse {
  range: ActivityRange;
  bucket: 'day' | 'week' | 'month';
  buckets: string[];
  projects: ProjectActivity[];
}

export async function getProjectActivity(
  range: ActivityRange = 'month',
  bucket?: 'day' | 'week' | 'month'
): Promise<ProjectActivityResponse> {
  const { data } = await api.get<ProjectActivityResponse>('/projects/activity/', {
    params: bucket ? { range, bucket } : { range },
  });
  return data;
}
