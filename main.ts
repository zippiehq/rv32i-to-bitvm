import { Instruction, parseInstruction } from "./instructionParser";
import {
  addProgramCounters,
  performAssembly,
  resolveNamesAndOffsets,
} from "./util";
import * as elfinfo from "elfinfo";
import crypto from "crypto";
import fs from "fs";

function emitRiscv(
  opcodes: EVMOpCode[],
  parsed: Instruction,
  startPc: number,
  pc: number,
  pageLength: number,
): void {
  switch (parsed.instructionName) {
    // shifts
    case "SLL":
    case "SRL": {
      Opcodes.emitSllSrl(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    }
    case "SLLW":
    case "SRLW": {
      Opcodes.emitSllwSrlw(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    }
    case "SLLI":
    case "SRLI": {
      Opcodes.emitSlliSrli(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    case "SLLIW":
    case "SRLIW": {
      Opcodes.emitSlliwSrliw(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    case "SRA": {
      Opcodes.emitSra(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "SRAW": {
      Opcodes.emitSraw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "SRAI": {
      Opcodes.emitSrai(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    case "SRAIW": {
      Opcodes.emitSraiw(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }

    // arithmetic
    case "ADD": {
      Opcodes.emitAdd(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "ADDW": {
      Opcodes.emitAddw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "ADDIW": {
      Opcodes.emitAddiw(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    case "ADDI": {
      Opcodes.emitAddi(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    case "SUB": {
      Opcodes.emitSub(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "SUBW": {
      Opcodes.emitSubw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "LUI": {
      Opcodes.emitLui(opcodes, parsed.rd, parsed.unparsedInstruction);
      break;
    }
    case "AUIPC": {
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(4, "0"),
      });
      Opcodes.emitAuipc(opcodes, parsed.rd, parsed.imm, true);
      break;
    }
    case "OR":
    case "XOR":
    case "AND": {
      Opcodes.emitAndOrXor(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    }
    case "ORI":
    case "XORI":
    case "ANDI": {
      Opcodes.emitAndOrXori(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    // compare
    case "SLT": {
      Opcodes.emitSlt(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }

    case "SLTU": {
      Opcodes.emitSltu(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }

    case "SLTI": {
      Opcodes.emitSlti(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }

    case "SLTIU": {
      Opcodes.emitSltiu(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    // branches
    case "BNE":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBne(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    case "BEQ":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBeq(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    case "BLT":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBlt(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    case "BGE":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBge(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    case "BLTU":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBltu(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    case "BGEU":
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitBgeu(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc, startPc, pageLength);
      break;
    // jump & link
    case "JAL": {
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitJal(opcodes, parsed.rd, parsed.imm, pc, startPc, pageLength);
      break;
    }
    case "JALR": {
      opcodes.push({
        opcode: "PUSH4",
        parameter: pc.toString(16).toUpperCase().padStart(8, "0"),
      });
      Opcodes.emitJalr(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    // Synch (do nothing, single-thread)
    case "FENCE":
    case "FENCE.I":
      break;
    // environment
    case "EBREAK":
      opcodes.push({ opcode: "INVALID", comment: "EBREAK" });
      break;
    case "ECALL":
      Opcodes.emitEcall(opcodes, pc);
      break;
    // loads
    case "LB":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLb(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LH":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLh(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LBU":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLbu(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LHU":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLhu(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LWU":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLwu(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LW":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLw(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    case "LD":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLd(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    // stores
    case "SB":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitSb(opcodes, parsed.rs1, parsed.rs2, parsed.imm);
      break;
    case "SH":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitSh(opcodes, parsed.rs1, parsed.rs2, parsed.imm);
      break;
    case "SW":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitSw(opcodes, parsed.rs1, parsed.rs2, parsed.imm);
      break;
    case "SD":
      Opcodes.emitSd(opcodes, parsed.rs1, parsed.rs2, parsed.imm);
      break;
    /* M extension */
    case "MUL":
      Opcodes.emitMul(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "MULH":
      Opcodes.emitMulh(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "MULHU":
      Opcodes.emitMulhu(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "MULHSU":
      Opcodes.emitMulhsu(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "MULW":
      Opcodes.emitMulw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "DIV":
      Opcodes.emitDiv(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "DIVW":
      Opcodes.emitDivw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "DIVU":
      Opcodes.emitDivu(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "DIVUW":
      Opcodes.emitDivuw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "REM":
      Opcodes.emitRem(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "REMU":
      Opcodes.emitRemu(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "REMW":
      Opcodes.emitRemw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "REMUW":
      Opcodes.emitRemuw(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    case "LR.W":
    case "LR.D":
      Opcodes.emitDirtyCheck(opcodes, pc);
      Opcodes.emitLr(opcodes, parsed.rd, parsed.rs1, pc, parsed.instructionName);
      break;
    case "SC.W":
    case "SC.D":
      Opcodes.emitSc(opcodes, parsed.rd, parsed.rs1, parsed.rs2, pc, parsed.instructionName);
      break;
    case "AMOADD.W":
      Opcodes.emitAmoaddW(opcodes, parsed.rd, parsed.rs1, parsed.rs2, pc, parsed.instructionName);
      break;
    case "UNIMPL":
      opcodes.push({ opcode: "INVALID" });
      break;
    default:
      throw new Error("Unknown instruction: " + parsed.instructionName);
  }
}

function printO(cycle: number, op: EVMOpCode) {
  const pc = op.pc;
  if (pc == undefined) {
    throw new Error("Missing pc");
  }
  console.log(
    cycle + "\t",
    pc.toString(16).toUpperCase() +
      "\t" +
      op.opcode +
      "\t" +
      (op.parameter ? op.parameter : "") +
      "\t " +
      (op.name ? ";; " + op.name : "") +
      (op.find_name ? ";; " + op.find_name : "") +
      "\t " +
      (op.comment ? " ;; # " + op.comment : "")
  );
}

async function transpile(fileContents: Buffer) {
  const elfInfo = await elfinfo.open(fileContents);
  if (!elfInfo || !elfInfo.elf) {
    throw new Error("No ELF");
  }

  for (let i = 0; i < elfInfo.elf.segments.length; i++) {
    const seg = elfInfo.elf.segments[i];
    if (
      seg.vaddr !== 0 &&
      seg.typeDescription == "Load" &&
      Number(seg.vaddr) >= 0x20000000
    ) {
      // ^^^^ XXX this is really lazy
      if (Number(seg.vaddr) % 4096 !== 0) {
        throw new Error("Segment should be 4K-aligned");
      }
      if (Number(seg.vaddr) !== 0x20000000) {
        throw new Error("Code segment should start at 0x20000000");
      }
      const data = fileContents.slice(seg.offset, seg.offset + seg.filesz);
      for (let page = 0; page < data.length; page += 1024) {
        const [code, opcodes] = await makePageCode(
          Number(seg.vaddr) + (page & (0xfffffc00 >>> 0)),
          data.slice(page, page + 1024)
        );
        context.pages.push({
          ethAddress: Address.fromString(
            "0x" + crypto.randomBytes(20).toString("hex")
          ),
          addr: Number(seg.vaddr) + page,
          code: code,
          opcodes: opcodes,
        });
      }
    } else if (
      seg.vaddr !== 0 &&
      seg.typeDescription == "Load" &&
      Number(seg.vaddr) < 0x20000000
    ) {
      if (Number(seg.vaddr) % 4096 !== 0) {
        throw new Error("Segment should be 4K-aligned");
      }
      const data = fileContents.slice(seg.offset, seg.offset + seg.filesz);
      for (let page = 0; page < data.length; page += 16384) {
        context.dataPages.push({
          ethAddress: Address.fromString(
            "0x" + crypto.randomBytes(20).toString("hex")
          ),
          addr: Number(seg.vaddr) + page,
          code: data.slice(page, page + 16384,
          opcodes: [],
        });
      }
    }
  }

  console.log(context);

}

transpile(fs.readFileSync(process.argv[2])).catch((err) => {
  console.log(err);
});
