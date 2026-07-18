import { describe, it, expect } from "vitest";
import { GenerationContext } from "../../../services/codegen/arduino/GenerationContext";
import type { ArduinoBlock } from "../../../services/codegen/arduino/types";
import { generateChain, generateExpression, getField, getInputBlock, getInputValue, resolveInput } from "../../../services/codegen/arduino/BlockGenerators";

import "../../../services/codegen/arduino/BlockGenerators";

function makeCtx(): GenerationContext {
  return new GenerationContext();
}

function gen(block: ArduinoBlock, ctx?: GenerationContext): string {
  const c = ctx ?? makeCtx();
  const generateSubBlocks = (subBlock?: ArduinoBlock): string => {
    if (!subBlock) return "";
    return generateChain(subBlock, c, generateSubBlocks);
  };
  return generateChain(block, c, generateSubBlocks);
}

function val(block: ArduinoBlock, ctx?: GenerationContext): string {
  const c = ctx ?? makeCtx();
  const generateSubBlocks = (subBlock?: ArduinoBlock): string => {
    if (!subBlock) return "";
    return generateChain(subBlock, c, generateSubBlocks);
  };
  return generateExpression(block, c, generateSubBlocks);
}

describe("BlockGenerators - pin_mode", () => {
  it("should generate pinMode with OUTPUT", () => {
    const code = gen({ type: "pin_mode", fields: { PIN: "13", MODE: "OUTPUT" } });
    expect(code).toContain("pinMode(13, OUTPUT);");
  });

  it("should generate pinMode with INPUT_PULLUP", () => {
    const code = gen({ type: "pin_mode", fields: { PIN: "2", MODE: "INPUT_PULLUP" } });
    expect(code).toContain("pinMode(2, INPUT_PULLUP);");
  });

  it("should default mode to OUTPUT", () => {
    const code = gen({ type: "pin_mode", fields: { PIN: "13" } });
    expect(code).toContain("pinMode(13, OUTPUT);");
  });

  it("should track used pins", () => {
    const ctx = makeCtx();
    gen({ type: "pin_mode", fields: { PIN: "9", MODE: "OUTPUT" } }, ctx);
    expect(ctx.usedPins.has(9)).toBe(true);
  });
});

describe("BlockGenerators - pin_write", () => {
  it("should generate digitalWrite HIGH", () => {
    const code = gen({ type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } });
    expect(code).toContain("digitalWrite(13, HIGH);");
  });

  it("should generate digitalWrite LOW", () => {
    const code = gen({ type: "pin_write", fields: { PIN: "13", STATE: "LOW" } });
    expect(code).toContain("digitalWrite(13, LOW);");
  });

  it("should default state to HIGH", () => {
    const code = gen({ type: "pin_write", fields: { PIN: "13" } });
    expect(code).toContain("digitalWrite(13, HIGH);");
  });
});

describe("BlockGenerators - pin_read", () => {
  it("should generate digitalRead expression", () => {
    const code = val({ type: "pin_read", fields: { PIN: "2" } });
    expect(code).toBe("digitalRead(2)");
  });
});

describe("BlockGenerators - analog_read", () => {
  it("should generate analogRead expression", () => {
    const code = val({ type: "analog_read", fields: { PIN: "A0" } });
    expect(code).toBe("analogRead(A0)");
  });
});

describe("BlockGenerators - analog_write", () => {
  it("should generate analogWrite with value input", () => {
    const block: ArduinoBlock = {
      type: "analog_write",
      fields: { PIN: "9" },
      inputs: { VALUE: { block: { type: "math_number", fields: { NUM: "128" } } } },
    };
    const code = gen(block);
    expect(code).toContain("analogWrite(9, 128);");
  });

  it("should default value to 0 when no input", () => {
    const code = gen({ type: "analog_write", fields: { PIN: "9" } });
    expect(code).toContain("analogWrite(9, 0);");
  });
});

describe("BlockGenerators - delay", () => {
  it("should generate delay with ms", () => {
    const code = gen({ type: "delay", fields: { MS: "1000" } });
    expect(code).toContain("delay(1000);");
  });
});

describe("BlockGenerators - create_variable", () => {
  it("should declare a variable in context", () => {
    const ctx = makeCtx();
    gen({ type: "create_variable", fields: { VAR_NAME: "ledPin" } }, ctx);
    expect(ctx.hasVariable("ledPin")).toBe(true);
  });

  it("should generate empty string (no inline code)", () => {
    const code = gen({ type: "create_variable", fields: { VAR_NAME: "myVar" } });
    expect(code).toBe("");
  });

  it("should not error on empty VAR_NAME", () => {
    const code = gen({ type: "create_variable", fields: {} });
    expect(code).toBe("");
  });
});

describe("BlockGenerators - set_variable", () => {
  it("should generate assignment with value input", () => {
    const block: ArduinoBlock = {
      type: "set_variable",
      fields: { VAR_NAME: "myVar" },
      inputs: { VALUE: { block: { type: "math_number", fields: { NUM: "42" } } } },
    };
    const code = gen(block);
    expect(code).toContain("myVar = 42;");
  });

  it("should default value to 0", () => {
    const code = gen({ type: "set_variable", fields: { VAR_NAME: "myVar" } });
    expect(code).toContain("myVar = 0;");
  });

  it("should auto-declare variable", () => {
    const ctx = makeCtx();
    gen({ type: "set_variable", fields: { VAR_NAME: "autoVar" } }, ctx);
    expect(ctx.hasVariable("autoVar")).toBe(true);
  });
});

describe("BlockGenerators - change_variable", () => {
  it("should generate increment by default", () => {
    const code = gen({ type: "change_variable", fields: { VAR_NAME: "counter" } });
    expect(code).toContain("counter += 1;");
  });

  it("should generate increment with custom value", () => {
    const block: ArduinoBlock = {
      type: "change_variable",
      fields: { VAR_NAME: "counter" },
      inputs: { VALUE: { block: { type: "math_number", fields: { NUM: "5" } } } },
    };
    const code = gen(block);
    expect(code).toContain("counter += 5;");
  });

  it("should auto-declare variable", () => {
    const ctx = makeCtx();
    gen({ type: "change_variable", fields: { VAR_NAME: "autoVar" } }, ctx);
    expect(ctx.hasVariable("autoVar")).toBe(true);
  });
});

describe("BlockGenerators - get_variable", () => {
  it("should return variable name", () => {
    const code = val({ type: "get_variable", fields: { VAR_NAME: "myVar" } });
    expect(code).toBe("myVar");
  });

  it("should auto-declare variable if not declared", () => {
    const ctx = makeCtx();
    val({ type: "get_variable", fields: { VAR_NAME: "myVar" } }, ctx);
    expect(ctx.hasVariable("myVar")).toBe(true);
  });
});

describe("BlockGenerators - logic_compare", () => {
  it("should generate EQ comparison", () => {
    const block: ArduinoBlock = {
      type: "logic_compare", fields: { OP: "EQ" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "10" } } },
        B: { block: { type: "math_number", fields: { NUM: "20" } } },
      },
    };
    const code = val(block);
    expect(code).toBe("(10 == 20)");
  });

  it("should generate NEQ comparison", () => {
    const block: ArduinoBlock = {
      type: "logic_compare", fields: { OP: "NEQ" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "5" } } },
        B: { block: { type: "math_number", fields: { NUM: "5" } } },
      },
    };
    const code = val(block);
    expect(code).toBe("(5 != 5)");
  });

  it("should generate LT/GT/LTE/GTE", () => {
    const ops = [
      ["LT", "<"],
      ["GT", ">"],
      ["LTE", "<="],
      ["GTE", ">="],
    ];
    for (const [op, expected] of ops) {
      const block: ArduinoBlock = {
        type: "logic_compare", fields: { OP: op },
        inputs: {
          A: { block: { type: "math_number", fields: { NUM: "1" } } },
          B: { block: { type: "math_number", fields: { NUM: "2" } } },
        },
      };
      expect(val(block)).toBe(`(1 ${expected} 2)`);
    }
  });

  it("should default to EQ when OP is unknown", () => {
    const block: ArduinoBlock = {
      type: "logic_compare", fields: { OP: "UNKNOWN" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "1" } } },
        B: { block: { type: "math_number", fields: { NUM: "2" } } },
      },
    };
    expect(val(block)).toBe("(1 == 2)");
  });
});

describe("BlockGenerators - logic_operation", () => {
  it("should generate AND", () => {
    const block: ArduinoBlock = {
      type: "logic_operation", fields: { OP: "AND" },
      inputs: {
        A: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        B: { block: { type: "logic_boolean", fields: { BOOL: "FALSE" } } },
      },
    };
    expect(val(block)).toBe("(true && false)");
  });

  it("should generate OR", () => {
    const block: ArduinoBlock = {
      type: "logic_operation", fields: { OP: "OR" },
      inputs: {
        A: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        B: { block: { type: "logic_boolean", fields: { BOOL: "FALSE" } } },
      },
    };
    expect(val(block)).toBe("(true || false)");
  });

  it("should default to AND when OP is unknown", () => {
    const block: ArduinoBlock = {
      type: "logic_operation", fields: { OP: "XOR" },
      inputs: {
        A: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        B: { block: { type: "logic_boolean", fields: { BOOL: "FALSE" } } },
      },
    };
    expect(val(block)).toBe("(true && false)");
  });
});

describe("BlockGenerators - logic_negate", () => {
  it("should negate boolean input", () => {
    const block: ArduinoBlock = {
      type: "logic_negate",
      inputs: { BOOL: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } } },
    };
    expect(val(block)).toBe("!(true)");
  });

  it("should return !true when no input", () => {
    expect(val({ type: "logic_negate" })).toBe("!true");
  });
});

describe("BlockGenerators - logic_boolean", () => {
  it("should generate true", () => {
    expect(val({ type: "logic_boolean", fields: { BOOL: "TRUE" } })).toBe("true");
  });

  it("should generate false", () => {
    expect(val({ type: "logic_boolean", fields: { BOOL: "FALSE" } })).toBe("false");
  });

  it("should default to true", () => {
    expect(val({ type: "logic_boolean", fields: {} })).toBe("true");
  });
});

describe("BlockGenerators - logic_null", () => {
  it("should generate false", () => {
    expect(val({ type: "logic_null" })).toBe("false");
  });
});

describe("BlockGenerators - controls_if", () => {
  it("should generate simple if statement", () => {
    const block: ArduinoBlock = {
      type: "controls_if",
      inputs: {
        IF0: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        DO0: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("if (true) {");
    expect(code).toContain("digitalWrite(13, HIGH);");
    expect(code).toContain("}");
  });

  it("should generate if-else if-else", () => {
    const block: ArduinoBlock = {
      type: "controls_if",
      mutation: JSON.stringify({ elseif: "1", else: "1" }),
      inputs: {
        IF0: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        DO0: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
        IF1: { block: { type: "logic_boolean", fields: { BOOL: "FALSE" } } },
        DO1: { block: { type: "pin_write", fields: { PIN: "13", STATE: "LOW" } } },
        ELSE: { block: { type: "delay", fields: { MS: "500" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("if (true) {");
    expect(code).toContain("else if (false) {");
    expect(code).toContain("else {");
    expect(code).toContain("delay(500);");
  });

  it("should default condition to true when IF0 missing", () => {
    const block: ArduinoBlock = {
      type: "controls_if",
      inputs: {
        DO0: { block: { type: "delay", fields: { MS: "100" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("if (true) {");
  });
});

describe("BlockGenerators - controls_repeat", () => {
  it("should generate for loop", () => {
    const block: ArduinoBlock = {
      type: "controls_repeat",
      inputs: {
        TIMES: { block: { type: "math_number", fields: { NUM: "5" } } },
        DO: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("for (int _count = 0; _count < 5; _count++) {");
    expect(code).toContain("digitalWrite(13, HIGH);");
  });

  it("should default TIMES to 0 when missing", () => {
    const block: ArduinoBlock = { type: "controls_repeat" };
    const code = gen(block);
    expect(code).toContain("_count < 0");
  });
});

describe("BlockGenerators - controls_whileUntil", () => {
  it("should generate while loop", () => {
    const block: ArduinoBlock = {
      type: "controls_whileUntil",
      mutation: JSON.stringify({ mode: "WHILE" }),
      inputs: {
        WHILE: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        DO: { block: { type: "delay", fields: { MS: "100" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("while (true) {");
    expect(code).toContain("delay(100);");
  });

  it("should generate until loop (negated condition)", () => {
    const block: ArduinoBlock = {
      type: "controls_whileUntil",
      mutation: JSON.stringify({ mode: "UNTIL" }),
      inputs: {
        WHILE: { block: { type: "logic_boolean", fields: { BOOL: "FALSE" } } },
        DO: { block: { type: "delay", fields: { MS: "100" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("while (!(false)) {");
  });

  it("should default to WHILE mode", () => {
    const block: ArduinoBlock = {
      type: "controls_whileUntil",
      inputs: {
        DO: { block: { type: "delay", fields: { MS: "100" } } },
      },
    };
    const code = gen(block);
    expect(code).toContain("while (true) {");
  });
});

describe("BlockGenerators - math_number", () => {
  it("should return the number", () => {
    expect(val({ type: "math_number", fields: { NUM: "42" } })).toBe("42");
  });

  it("should default to 0", () => {
    expect(val({ type: "math_number", fields: {} })).toBe("0");
  });
});

describe("BlockGenerators - math_arithmetic", () => {
  it("should generate ADD", () => {
    const block: ArduinoBlock = {
      type: "math_arithmetic", fields: { OP: "ADD" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "1" } } },
        B: { block: { type: "math_number", fields: { NUM: "2" } } },
      },
    };
    expect(val(block)).toBe("(1 + 2)");
  });

  it("should generate MINUS", () => {
    const block: ArduinoBlock = {
      type: "math_arithmetic", fields: { OP: "MINUS" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "5" } } },
        B: { block: { type: "math_number", fields: { NUM: "3" } } },
      },
    };
    expect(val(block)).toBe("(5 - 3)");
  });

  it("should generate MULTIPLY", () => {
    const block: ArduinoBlock = {
      type: "math_arithmetic", fields: { OP: "MULTIPLY" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "2" } } },
        B: { block: { type: "math_number", fields: { NUM: "3" } } },
      },
    };
    expect(val(block)).toBe("(2 * 3)");
  });

  it("should generate DIVIDE", () => {
    const block: ArduinoBlock = {
      type: "math_arithmetic", fields: { OP: "DIVIDE" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "10" } } },
        B: { block: { type: "math_number", fields: { NUM: "2" } } },
      },
    };
    expect(val(block)).toBe("(10 / 2)");
  });

  it("should generate POWER (pow function)", () => {
    const block: ArduinoBlock = {
      type: "math_arithmetic", fields: { OP: "POWER" },
      inputs: {
        A: { block: { type: "math_number", fields: { NUM: "2" } } },
        B: { block: { type: "math_number", fields: { NUM: "3" } } },
      },
    };
    expect(val(block)).toBe("pow(2, 3)");
  });
});

describe("BlockGenerators - math_random_int", () => {
  it("should generate random() expression", () => {
    const block: ArduinoBlock = {
      type: "math_random_int",
      inputs: {
        FROM: { block: { type: "math_number", fields: { NUM: "1" } } },
        TO: { block: { type: "math_number", fields: { NUM: "10" } } },
      },
    };
    expect(val(block)).toBe("random(1, 10 + 1)");
  });

  it("should default to 0", () => {
    expect(val({ type: "math_random_int" })).toBe("random(0, 0 + 1)");
  });
});

describe("BlockGenerators - comment", () => {
  it("should generate single-line comment", () => {
    const code = gen({ type: "comment", fields: { TEXT: "This is a comment" } });
    expect(code).toBe("// This is a comment");
  });

  it("should generate multi-line comment", () => {
    const code = gen({ type: "comment", fields: { TEXT: "Line 1\nLine 2" } });
    expect(code).toBe("// Line 1\n// Line 2");
  });

  it("should return empty for no text", () => {
    const code = gen({ type: "comment", fields: {} });
    expect(code).toBe("");
  });
});

describe("BlockGenerators - generateChain", () => {
  it("should handle undefined block", () => {
    const ctx = makeCtx();
    const generateSubBlocks = () => "";
    expect(generateChain(undefined, ctx, generateSubBlocks)).toBe("");
  });

  it("should chain multiple statements", () => {
    const block: ArduinoBlock = {
      type: "pin_mode",
      fields: { PIN: "13", MODE: "OUTPUT" },
      next: {
        type: "pin_write",
        fields: { PIN: "13", STATE: "HIGH" },
      },
    };
    const code = gen(block);
    expect(code).toContain("pinMode(13, OUTPUT);");
    expect(code).toContain("digitalWrite(13, HIGH);");
  });

  it("should handle unknown block type gracefully", () => {
    const ctx = makeCtx();
    const generateSubBlocks = () => "";
    const result = generateChain({ type: "nonexistent_block_type", fields: {} }, ctx, generateSubBlocks);
    expect(result).toContain("// unknown block: nonexistent_block_type");
  });

  it("should chain after unknown block", () => {
    const block: ArduinoBlock = {
      type: "nonexistent_block_type",
      fields: {},
      next: { type: "another_nonexistent_type", fields: {} },
    };
    const ctx = makeCtx();
    const generateSubBlocks = () => "";
    const result = generateChain(block, ctx, generateSubBlocks);
    expect(result).toContain("// unknown block: nonexistent_block_type");
    expect(result).toContain("// unknown block: another_nonexistent_type");
  });
});

describe("BlockGenerators - helper functions", () => {
  it("getField should return field value or default", () => {
    const block: ArduinoBlock = { type: "test", fields: { A: "1", B: "" } };
    expect(getField(block, "A")).toBe("1");
    expect(getField(block, "B")).toBe("");
    expect(getField(block, "C", "default")).toBe("default");
    expect(getField({ type: "test" }, "A", "d")).toBe("d");
  });

  it("getInputBlock should return block or undefined", () => {
    const block: ArduinoBlock = {
      type: "test",
      inputs: {
        VAL: { block: { type: "math_number", fields: { NUM: "42" } } },
        STR: { value: "hello" },
      },
    };
    expect(getInputBlock(block, "VAL")?.type).toBe("math_number");
    expect(getInputBlock(block, "STR")).toBeUndefined();
    expect(getInputBlock(block, "NONEXISTENT")).toBeUndefined();
  });

  it("getInputValue should return value or undefined", () => {
    const block: ArduinoBlock = {
      type: "test",
      inputs: {
        VAL: { block: { type: "math_number", fields: { NUM: "42" } } },
        STR: { value: "hello" },
      },
    };
    expect(getInputValue(block, "STR")).toBe("hello");
    expect(getInputValue(block, "VAL")).toBeUndefined();
    expect(getInputValue(block, "NONEXISTENT")).toBeUndefined();
  });

  it("resolveInput should follow block or use value", () => {
    const ctx = makeCtx();
    const generateSubBlocks = () => "";
    const block: ArduinoBlock = {
      type: "test",
      inputs: {
        WITH_BLOCK: { block: { type: "math_number", fields: { NUM: "42" } } },
        WITH_VALUE: { value: "100" },
      },
    };
    expect(resolveInput(block, "WITH_BLOCK", ctx, generateSubBlocks)).toBe("42");
    expect(resolveInput(block, "WITH_VALUE", ctx, generateSubBlocks)).toBe("100");
    expect(resolveInput(block, "MISSING", ctx, generateSubBlocks)).toBe("0");
  });
});

describe("BlockGenerators - indentation", () => {
  it("should indent nested blocks in if statement", () => {
    const block: ArduinoBlock = {
      type: "controls_if",
      inputs: {
        IF0: { block: { type: "logic_boolean", fields: { BOOL: "TRUE" } } },
        DO0: { block: { type: "pin_write", fields: { PIN: "13", STATE: "HIGH" } } },
      },
    };
    const code = gen(block);
    const lines = code.split("\n");
    expect(lines[0]).toContain("if (true) {");
    expect(lines[1]).toContain("  digitalWrite(13, HIGH);");
    expect(lines[2]).toContain("}");
  });

  it("should indent blocks in repeat loop", () => {
    const block: ArduinoBlock = {
      type: "controls_repeat",
      inputs: {
        TIMES: { block: { type: "math_number", fields: { NUM: "3" } } },
        DO: { block: { type: "delay", fields: { MS: "100" } } },
      },
    };
    const code = gen(block);
    const lines = code.split("\n");
    expect(lines[0]).toContain("for (int _count = 0;");
    expect(lines[1]).toContain("  delay(100);");
    expect(lines[2]).toContain("}");
  });
});
