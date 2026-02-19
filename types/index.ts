export type BriefItem = {
  id: string;
  title: string;
  status: "in-progress" | "blocked" | "done";
};

export type MoodItem = {
  id: string;
  label: string;
  imageUrl: string;
};

export type TypeSpecimen = {
  id: string;
  name: string;
  family: string;
  weights: string[];
};

export type ProjectRoom = {
  id: string;
  name: string;
  client?: string;
  status: "discovery" | "design" | "review" | "shipped";
};

