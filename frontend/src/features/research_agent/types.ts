export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  query?: string;
}

export interface ResearchReport {
  topic: string;
  title: string;
  reportMarkdown: string;
  sourcesCount: number;
  sources: ResearchSource[];
  elapsedSeconds?: number;
}
