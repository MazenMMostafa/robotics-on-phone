import type { ArduinoBlock } from "./types";
import { GenerationContext } from "./GenerationContext";
import { getGenerator, registerGenerator } from "./ArduinoBlockRegistry";

export function getField(block: ArduinoBlock, name: string, defaultValue = ""): string {
  return block.fields?.[name] ?? defaultValue;
}

export function getInputBlock(block: ArduinoBlock, name: string): ArduinoBlock | undefined {
  const input = block.inputs?.[name];
  if (input && typeof input === "object" && (input as Record<string, unknown>).block) {
    return (input as Record<string, unknown>).block as ArduinoBlock;
  }
  return undefined;
}

export function getInputValue(block: ArduinoBlock, name: string): string | undefined {
  const input = block.inputs?.[name];
  if (input && typeof input === "object" && (input as Record<string, unknown>).value !== undefined) {
    return String((input as Record<string, unknown>).value);
  }
  return undefined;
}

export function resolveInput(
  block: ArduinoBlock,
  name: string,
  ctx: GenerationContext,
  generateSubBlocks: (block?: ArduinoBlock) => string,
): string {
  const childBlock = getInputBlock(block, name);
  if (childBlock) {
    return generateExpression(childBlock, ctx, generateSubBlocks);
  }
  return getInputValue(block, name) ?? "0";
}

export function generateExpression(
  block: ArduinoBlock,
  ctx: GenerationContext,
  generateSubBlocks: (block?: ArduinoBlock) => string,
): string {
  const blockGen = getGenerator(block.type);
  if (!blockGen) {
    ctx.addInclude("Arduino.h");
    return `/* unsupported: ${block.type} */ 0`;
  }
  return blockGen(block, ctx, generateSubBlocks);
}

export function generateChain(
  block: ArduinoBlock | undefined,
  ctx: GenerationContext,
  generateSubBlocks: (block?: ArduinoBlock) => string,
): string {
  if (!block) return "";
  const blockGen = getGenerator(block.type);
  if (!blockGen) {
    if (block.next) {
      return ctx.indent + `// unknown block: ${block.type}\n` + generateChain(block.next, ctx, generateSubBlocks);
    }
    return ctx.indent + `// unknown block: ${block.type}`;
  }
  let code = blockGen(block, ctx, generateSubBlocks);
  if (block.next) {
    const nextCode = generateChain(block.next, ctx, generateSubBlocks);
    code += "\n" + nextCode;
  }
  return code;
}

registerGenerator("pin_mode", (block, ctx) => {
  const pin = getField(block, "PIN");
  const mode = getField(block, "MODE", "OUTPUT");
  ctx.addUsedPin(Number(pin));
  ctx.addInclude("Arduino.h");
  return `${ctx.indent}pinMode(${pin}, ${mode});`;
});

registerGenerator("pin_write", (block, ctx) => {
  const pin = getField(block, "PIN");
  const state = getField(block, "STATE", "HIGH");
  ctx.addUsedPin(Number(pin));
  ctx.addInclude("Arduino.h");
  return `${ctx.indent}digitalWrite(${pin}, ${state});`;
});

registerGenerator("pin_read", (block, ctx) => {
  const pin = getField(block, "PIN");
  ctx.addUsedPin(Number(pin));
  ctx.addInclude("Arduino.h");
  return `digitalRead(${pin})`;
});

registerGenerator("analog_read", (block, ctx) => {
  const pin = getField(block, "PIN");
  ctx.addUsedPin(Number(pin));
  ctx.addInclude("Arduino.h");
  return `analogRead(${pin})`;
});

registerGenerator("analog_write", (block, ctx, generateSubBlocks) => {
  const pin = getField(block, "PIN");
  const value = resolveInput(block, "VALUE", ctx, generateSubBlocks);
  ctx.addUsedPin(Number(pin));
  ctx.addInclude("Arduino.h");
  return `${ctx.indent}analogWrite(${pin}, ${value});`;
});

registerGenerator("delay", (block, ctx) => {
  const ms = getField(block, "MS");
  ctx.addInclude("Arduino.h");
  return `${ctx.indent}delay(${ms});`;
});

registerGenerator("create_variable", (block, ctx) => {
  const varName = getField(block, "VAR_NAME");
  if (varName) {
    ctx.addVariable(varName);
  }
  return "";
});

registerGenerator("set_variable", (block, ctx, generateSubBlocks) => {
  const varName = getField(block, "VAR_NAME");
  let value = "0";
  const childBlock = getInputBlock(block, "VALUE");
  if (childBlock) {
    value = generateExpression(childBlock, ctx, generateSubBlocks);
  }
  if (!ctx.hasVariable(varName)) {
    ctx.addVariable(varName);
  }
  return `${ctx.indent}${varName} = ${value};`;
});

registerGenerator("change_variable", (block, ctx, generateSubBlocks) => {
  const varName = getField(block, "VAR_NAME");
  let value = "1";
  const childBlock = getInputBlock(block, "VALUE");
  if (childBlock) {
    value = generateExpression(childBlock, ctx, generateSubBlocks);
  }
  if (!ctx.hasVariable(varName)) {
    ctx.addVariable(varName);
  }
  return `${ctx.indent}${varName} += ${value};`;
});

registerGenerator("get_variable", (block, ctx) => {
  const varName = getField(block, "VAR_NAME");
  if (!ctx.hasVariable(varName)) {
    ctx.addVariable(varName);
  }
  return varName;
});

registerGenerator("logic_compare", (block, ctx, generateSubBlocks) => {
  const op = getField(block, "OP", "EQ");
  const a = resolveInput(block, "A", ctx, generateSubBlocks);
  const b = resolveInput(block, "B", ctx, generateSubBlocks);
  const opMap: Record<string, string> = {
    EQ: "==",
    NEQ: "!=",
    LT: "<",
    GT: ">",
    LTE: "<=",
    GTE: ">=",
  };
  return `(${a} ${opMap[op] ?? "=="} ${b})`;
});

registerGenerator("logic_operation", (block, ctx, generateSubBlocks) => {
  const op = getField(block, "OP", "AND");
  const a = resolveInput(block, "A", ctx, generateSubBlocks);
  const b = resolveInput(block, "B", ctx, generateSubBlocks);
  const opMap: Record<string, string> = { AND: "&&", OR: "||" };
  return `(${a} ${opMap[op] ?? "&&"} ${b})`;
});

registerGenerator("logic_negate", (block, ctx, generateSubBlocks) => {
  const childBlock = getInputBlock(block, "BOOL");
  if (childBlock) {
    return `!(${generateExpression(childBlock, ctx, generateSubBlocks)})`;
  }
  return "!true";
});

registerGenerator("logic_boolean", (block) => {
  const val = getField(block, "BOOL", "TRUE");
  return val === "TRUE" ? "true" : "false";
});

registerGenerator("logic_null", () => {
  return "false";
});

registerGenerator("controls_if", (block, ctx, generateSubBlocks) => {
  const lines: string[] = [];
  const mutation = block.mutation ? JSON.parse(block.mutation) : {};
  const elseifCount = parseInt(mutation.elseif ?? "0", 10);
  const hasElse = mutation.else === "1";

  for (let i = 0; i <= elseifCount; i++) {
    const condBlock = getInputBlock(block, `IF${i}`);
    const doBlock = getInputBlock(block, `DO${i}`);
    const prefix = i === 0 ? "if" : " else if";
    let condition = "true";
    if (condBlock) {
      condition = generateExpression(condBlock, ctx, generateSubBlocks);
    }
    lines.push(`${ctx.indent}${prefix} (${condition}) {`);
    ctx.pushIndent();
    if (doBlock) {
      lines.push(generateChain(doBlock, ctx, generateSubBlocks));
    }
    ctx.popIndent();
    lines.push(`${ctx.indent}}`);
  }

  if (hasElse) {
    const elseBlock = getInputBlock(block, "ELSE");
    lines.push(`${ctx.indent} else {`);
    ctx.pushIndent();
    if (elseBlock) {
      lines.push(generateChain(elseBlock, ctx, generateSubBlocks));
    }
    ctx.popIndent();
    lines.push(`${ctx.indent}}`);
  }

  return lines.join("\n");
});

registerGenerator("controls_repeat", (block, ctx, generateSubBlocks) => {
  const times = resolveInput(block, "TIMES", ctx, generateSubBlocks);
  const doBlock = getInputBlock(block, "DO");
  const lines: string[] = [];
  lines.push(`${ctx.indent}for (int _count = 0; _count < ${times}; _count++) {`);
  ctx.pushIndent();
  if (doBlock) {
    lines.push(generateChain(doBlock, ctx, generateSubBlocks));
  }
  ctx.popIndent();
  lines.push(`${ctx.indent}}`);
  return lines.join("\n");
});

registerGenerator("controls_whileUntil", (block, ctx, generateSubBlocks) => {
  const mutation = block.mutation ? JSON.parse(block.mutation) : {};
  const mode = mutation.mode ?? "WHILE";
  const condBlock = getInputBlock(block, "WHILE");
  const doBlock = getInputBlock(block, "DO");
  const lines: string[] = [];
  let condition = "true";
  if (condBlock) {
    condition = generateExpression(condBlock, ctx, generateSubBlocks);
  }
  const whileCond = mode === "UNTIL" ? `!(${condition})` : condition;
  lines.push(`${ctx.indent}while (${whileCond}) {`);
  ctx.pushIndent();
  if (doBlock) {
    lines.push(generateChain(doBlock, ctx, generateSubBlocks));
  }
  ctx.popIndent();
  lines.push(`${ctx.indent}}`);
  return lines.join("\n");
});

registerGenerator("math_number", (block) => {
  return getField(block, "NUM", "0");
});

registerGenerator("math_arithmetic", (block, ctx, generateSubBlocks) => {
  const op = getField(block, "OP", "ADD");
  const a = resolveInput(block, "A", ctx, generateSubBlocks);
  const b = resolveInput(block, "B", ctx, generateSubBlocks);
  const opMap: Record<string, string> = {
    ADD: "+",
    MINUS: "-",
    MULTIPLY: "*",
    DIVIDE: "/",
    POWER: "pow",
  };
  const opStr = opMap[op] ?? "+";
  if (op === "POWER") {
    return `${opStr}(${a}, ${b})`;
  }
  return `(${a} ${opStr} ${b})`;
});

registerGenerator("math_random_int", (block, ctx, generateSubBlocks) => {
  const from = resolveInput(block, "FROM", ctx, generateSubBlocks);
  const to = resolveInput(block, "TO", ctx, generateSubBlocks);
  ctx.addInclude("Arduino.h");
  return `random(${from}, ${to} + 1)`;
});

registerGenerator("comment", (block) => {
  const text = getField(block, "TEXT", "");
  if (!text) return "";
  const lines = text.split("\n");
  return lines
    .map((l) => `// ${l}`)
    .join("\n");
});
