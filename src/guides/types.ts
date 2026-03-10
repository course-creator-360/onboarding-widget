export interface CodeTab {
  tab: string;
  language: string;
  code: string;
  filename?: string;
  framework?: string;
  highlights?: string;
}

export interface CodeBlock {
  type: 'codeblock';
  title?: string;
  tabs: CodeTab[];
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ListContent {
  type: 'list';
  items: string[];
}

export interface NoteContent {
  type: 'note';
  text: string;
}

export type Content = CodeBlock | TextContent | ListContent | NoteContent;

export interface GuideSection {
  id: string;
  title: string;
  frameworks?: string[];
  content: Content[];
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  framework: string;
  sections: GuideSection[];
}
