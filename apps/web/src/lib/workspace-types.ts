export type WorkspaceRow = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  fileCount: number;
};

export type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export type FileRow = {
  id: string;
  name: string;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  myRole: string;
  members: Member[];
  files: FileRow[];
};

export type Snapshot = { id: string; version: number; createdAt: string };
