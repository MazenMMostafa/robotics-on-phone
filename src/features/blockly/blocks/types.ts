export interface BlockDefinition {
  type: string;
  message0?: string;
  message1?: string;
  args0?: unknown[];
  args1?: unknown[];
  output?: string | null;
  previousStatement?: string | null;
  nextStatement?: string | null;
  colour?: string;
}
