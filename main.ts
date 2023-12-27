import { Instruction, parseInstruction } from "./instructionParser";
import * as elfinfo from "elfinfo";
import crypto from "crypto";
import fs from "fs";
import * as bitvm from "./bitvm";

/*function emitRiscv(
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
    case "SLTU"

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
*/

/* memory layout

  0 = always 0
  4..4*32 = x1..x32
  code page has been replaced with 32-bit jump offsets into bitvm instead of code
*/

export interface BitVMOpcode {
  opcode: bitvm.Instruction;
  pc?: number;
  label?: string;
  find_label?: string;
  find_riscv_pc?: number;
  find_target?: string; // addressA, addressB, or addressC -- where to write resolved label to in instruction
}

function reg2mem(reg: number) {
   return reg; // in future, * 4   
}

function tmp() { return 33; }
function tmp2() { return 34; }
function tmp3() { return 35; }

function emitBitvmOp(opcodes: BitVMOpcode[], op: number, addressA: number, addressB: number, addressC: number) {
   opcodes.push({ opcode: new bitvm.Instruction(op, addressA, addressB, addressC) });
}

function emitRiscvADD(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitRiscvADDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitRiscvSUB(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_SUB, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitRiscvXOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_XOR, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitRiscvXORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_XORI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitRiscvAND(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_AND, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitRiscvANDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitRiscvOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitRiscvORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ORI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitJAL(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), riscv_pc + 4);
   }
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0) }, find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
}

function emitJALR(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), riscv_pc + 4);
   }
   emitBitVmop(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(rs1), imm);
   emitBitVmop(opcodes, bitvm.ASM_JMP, tmp(), 0, 0);
}

function emitAUIPC(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), (riscv_pc + (imm << 12)) & 0xFFFFFFFF);
   }
}

function emitLUI(opcodes: BitVMOpcode[], rd: number, imm: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), (imm << 12) & 0xFFFFFFFF);
   }
}

function emitBEQ(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(rs1), reg2mem(rs2),  0),  find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
}

function emitBNE(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, reg2mem(rs1), reg2mem(rs2), 0), find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
}

function emitSLLI(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), 0);
      for (let i = 0; i < imm; i++) {
       emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rd), reg2mem(rd), reg2mem(rd));
      }   
    }
}

function emitSRLI(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), 0);
      for (let i = 0; i < imm; i++) {
       emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, reg2mem(rd), reg2mem(rd), 0);
      }   
    }
}

function emitSLT(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
    }
}

function emitSLTU(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
    }
}

function emitSLTIU(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), imm);
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rd), reg2mem(rs1), tmp());
    }
}

function emitSLTI(opcodes: bitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), imm);
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rd), reg2mem(rs1), tmp());
    }
}

function emitBLT(opcodes: bitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLT, tmp(), reg2mem(rs1), reg2mem(rs2));
      opcodes.push({ opcode: { type: bitvm.ASM_BEQ, addressA: tmp(), addressB: reg2mem(0), addressC: 0 }, find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
    }
}

function emitBLTU(opcodes: bitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, tmp(), reg2mem(rs1), reg2mem(rs2));
      opcodes.push({ opcode: { type: bitvm.ASM_BEQ, addressA: tmp(), addressB: reg2mem(0), addressC: 0 }, find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
    }
}

function emitBGE(opcodes: bitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLT, tmp(), reg2mem(rs1), reg2mem(rs2));
      opcodes.push({ opcode: { type: bitvm.ASM_BNE, addressA: tmp(), addressB: reg2mem(0), addressC: 0 }, find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
    }
}

function emitBGEU(opcodes: bitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, tmp(), reg2mem(rs1), reg2mem(rs2));
      opcodes.push({ opcode: { type: bitvm.ASM_BNE, addressA: tmp(), addressB: reg2mem(0), addressC: 0 }, find_riscv_pc: (riscv_pc + imm) & 0xFFFFFFFF, find_target: "addressC"});
    }
}

function emitECALL(opcodes: bitVMOpcode[]) {
    // tmp() acts as our status buffer, 0 = OK, 1 = not OK
    emitBitVmOp(opcodes, bitvm.ADDI, tmp(), reg2mem(0), 0);
    opcodes.push({ opcode: { type: bitvm.ASM_BEQ, addressA: reg2mem(0), addressB: reg2mem(0), addressC: 0 }, find_label: "_program_end", find_target: "addressC"});
}

function emitEBREAK(opcodes: bitVMOpcode[]) {
    emitBitVmOp(opcodes, bitvm.ADDI, tmp(), reg2mem(0), 1);
    opcodes.push({ opcode: { type: bitvm.ASM_BEQ, addressA: reg2mem(0), addressB: reg2mem(0), addressC: 0 }, find_label: "_program_end", find_target: "addressC"});
}



/*
  transpilations:

  risc-v SLL rd, rs1, rs2
     bitVM_ADDI(tmp(), reg2mem(rs1), 0) # result
     bitVM_ADDI(tmp(), reg2mem(rs2), 0) # shift amount
     
     _SLL_UNIQ_loop_start:
     # check if shift amount is zero
     bitVM_BEQ(reg2mem(0), tmp(), sll_UNIQ_loop_end)
     
     # Double the value by adding it to itself

     bitVM_ADD(tmp(), tmp(),  tmp())
     bitVM_SUBI(tmp2(), tmp2(), 1)
    
     bitVM_BEQ(reg2mem(0), reg2mem(0), sll_UNIQ_loop_start)
     
     sll_UNIQ_loop_end:
     if (rd != 0) 
       bitVM_ADDI(reg2mem(rd), tmp(), 0)
   
   risc-v SRL rd, rs1, rs2
     bitVM_ADDI(tmp(), reg2mem(rs1), 0) # result
     bitVM_ADDI(tmp(), reg2mem(rs2), 0) # shift amount
     
     _SRL_UNIQ_loop_start:
     # check if shift amount is zero
     bitVM_BEQ(reg2mem(0), tmp(), sll_UNIQ_loop_end)
     
     # Call RSHIFT1
     bitVM_RSHIFT1(tmp(), tmp())
     bitVM_SUBI(tmp2(), tmp2(), 1)
    
     bitVM_BEQ(reg2mem(0), reg2mem(0), srl_UNIQ_loop_start)
     
     srl_UNIQ_loop_end:
     if (rd != 0) 
       bitVM_ADDI(reg2mem(rd), tmp(), 0)

   risc-v SRA rd, rs1, rs2
     bitVM_ADDI(tmp(), reg2mem(rs1), 0) # result
     bitVM_ADDI(tmp2(), reg2mem(rs2), 0) # shift amount
     bitVM_ANDI(tmp3(), reg2mem(rs1), 0x80000000) # MSB
     
     _SRA_UNIQ_loop_start:
     # check if shift amount is zero
     bitVM_BEQ(reg2mem(0), tmp(), sra_UNIQ_loop_end)
     
     # Call RSHIFT1
     bitVM_RSHIFT1(tmp(), tmp())
     bitVM_OR(tmp(), tmp(), tmp3())  # add MSB
     bitVM_SUBI(tmp2(), tmp2(), 1)
    
     bitVM_BEQ(reg2mem(0), reg2mem(0), srl_UNIQ_loop_start)
     
     srl_UNIQ_loop_end:
     if (rd != 0) 
       bitVM_ADDI(reg2mem(rd), tmp(), 0)

    risc-v SRAI rd, rs1, imm:
    
     if (rd != 0): 
        bitVM_ADDI(reg2mem(rd), reg2mem(rs1), 0)
        bitVM_ANDI(tmp3(), reg2mem(rs1), 0x80000000) # MSB
        repeat imm times:  
          bitVM_RSHIFT1(reg2mem(rd), reg2mem(rd))
          bitVM_OR(reg2mem(rd), reg2mem(rs1), tmp3()) // extend with MSB
                 
*/
  
function emitInstr(opcodes: BitVMOpcode[], pc: number, parsed: Instruction) {
  switch (parsed.instructionName) {
    case "SLL":
      emitSLL(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
    case "SRL": {
      emitSRL(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    }
    case "SLLI": {
       emitSLLI(
        opcodes,
        parsed.instructionName,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;

    case "SRLI": {
      emitSRLI(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    case "SRA": {
      emitSRA(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "SRAI": {
      emitSRAI(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    // arithmetic
    case "ADD": {
      emitADD(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "ADDI": {
      emitADDI(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    case "SUB": {
      emitSUB(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "LUI": {
      emitLUI(opcodes, parsed.rd, parsed.unparsedInstruction);
      break;
    }
    case "AUIPC": {
      emitAUIPC(opcodes, parsed.rd, parsed.imm, pc);
      break;
    }
    case "OR": {
      emitOR(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
    }
    case "XOR": {
      emitXOR(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
    }
    case "AND": {
      emitAND(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    }
    case "ORI": {
      emitORI(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    case "XORI": {
      emitXORI(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    case "ANDI": {
      emitANDI(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.imm
      );
      break;
    }
    // compare
    case "SLT": {
      emitSLT(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }
    case "SLTU"

      emitSLTU(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    }

    case "SLTI": {
      emitSLTI(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }

    case "SLTIU": {
      emitSLTIU(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    }
    // branches
    case "BNE":
      emitBNE(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    case "BEQ":
      emitBEQ(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    case "BLT":
      emitBLT(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    case "BGE":
      emitBGE(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    case "BLTU":
      emitBLTU(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    case "BGEU":
      emitBGEU(opcodes, parsed.rs1, parsed.rs2, parsed.imm, pc);
      break;
    // jump & link
    case "JAL": {
      emitJAL(opcodes, parsed.rd, parsed.imm, pc);
      break;
    }
    case "JALR": {
      emitJALR(opcodes, parsed.rd, parsed.rs1, parsed.imm, pc);
      break;
    }
    // Synch (do nothing, single-thread)
    case "FENCE":
    case "FENCE.I":
      break;
    // environment
    case "EBREAK":
      emitEBREAK(opcodes);
      break;
    case "ECALL":
      emitECALL(opcodes);
      break;
    default:
      throw new Error("Unknown instruction: " + parsed.instructionName);
  }
}


function riscvToBitVM(pc_base: number, buf: Buffer): BitVMOpcode[] {
  let opcodes: BitVMOpcode[] = [];
  for (let i = 0; i < buf.length; i += 4) {
    const instr = buf.readUInt32LE(i);
    const parsed = parseInstruction(instr);
    const instrName = parsed.instructionName;

    console.log(parsed);
    emitInstr(opcodes, pc_base + i, parsed);
  }
  return opcodes;
}



/* phases:
   transpile
   add program counters
   resolve labels to pc (one instruction per pc location)
   emit instruction list & memory contents
   run in bitvm
*/
   
async function transpile(fileContents: Buffer) {
  const elfInfo = await elfinfo.open(fileContents);
  if (!elfInfo || !elfInfo.elf) {
    throw new Error("No ELF");
  }

  let context = {
     codepage: Buffer.alloc(0),
     code_addr: 0,
     datapage: Buffer.alloc(0),
     data_addr: 0
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
      context.codepage = data;
      context.code_addr = Number(seg.vaddr)
    } else if (
      seg.vaddr !== 0 &&
      seg.typeDescription == "Load" &&
      Number(seg.vaddr) < 0x20000000
    ) {
      if (Number(seg.vaddr) % 4096 !== 0) {
        throw new Error("Segment should be 4K-aligned");
      }
      const data = fileContents.slice(seg.offset, seg.offset + seg.filesz);
      context.datapage = data;
      context.data_addr = Number(seg.vaddr)
    }
   }
   console.log(context);
   console.log(riscvToBitVM(context.codepage));
}

transpile(fs.readFileSync(process.argv[2])).catch((err) => {
  console.log(err);
});
