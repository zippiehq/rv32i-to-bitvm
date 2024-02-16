import { Instruction, parseInstruction } from "./instructionParser";
import * as elfinfo from "elfinfo";
import crypto from "crypto";
import fs from "fs";
import * as bitvm from "./bitvm";

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
   find_target?: string; // addressA, addressB, or addressC -- where to write resolved label to in instruction
   comment?: string;
}

export interface Context {
   codepage: Buffer;
   code_addr: number;
   datapage: Buffer[];
   data_addr: number[];
}


function reg2mem(reg: number) {
   return reg * 4; // in future, * 4   
}

function tmp() { return 33 * 4; }
function tmp2() { return 34 * 4; }
function tmp3() { return 35 * 4; }

function emitBitvmOp(opcodes: BitVMOpcode[], op: number, addressA: number, addressB: number, addressC: number) {
   opcodes.push({ opcode: new bitvm.Instruction(op, addressA, addressB, addressC) });
}

function emitADD(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitADDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), imm, reg2mem(rd));
   }
}

function emitSUB(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SUB, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitXOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_XOR, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitXORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_XORI, reg2mem(rs1), imm, reg2mem(rd));
   }
}

function emitAND(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_AND, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitANDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rs1), imm, reg2mem(rd));
   }
}

function emitOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ORI, reg2mem(rs1), imm, reg2mem(rd));
   }
}

function emitJAL(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), riscv_pc + 4, reg2mem(rd));
   }
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitLBU(opcodes: BitVMOpcode[], rd: number, rs1: number, offset: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), reg2mem(rd));
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0xFF, reg2mem(rd)); // just to be sure someone didn't sneak in a uint32 value instead of a bit
   }
}

function emitLH(opcodes: BitVMOpcode[], rd: number, rs1: number, offset: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), reg2mem(rd));
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0xFF, reg2mem(rd)); // just to be sure someone didn't sneak in a uint32 value instead of a bit

      // next
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 1, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), tmp2());
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2()); // just to be sure someone didn't sneak in a uint32 value instead of a byte

      // shift 8 
      for (let i = 0; i < 1; i++) {
         emitBitvmOp(opcodes, bitvm.ASM_LSHIFT8, tmp2(), tmp2(), tmp2());
      }

      emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp2(), reg2mem(rd));

      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0x8000, tmp()); // get MSB
      emitBitvmOp(opcodes, bitvm.ASM_ADD, tmp(), tmp(), tmp()); // lshift

      emitBitvmOp(opcodes, bitvm.ASM_SUB, 0, tmp(), tmp()); // 
      emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp(), reg2mem(rd));
   }
}

function emitLB(opcodes: BitVMOpcode[], rd: number, rs1: number, offset: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), reg2mem(rd));
      // Load can return up to 32-bit
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0xFF, reg2mem(rd));
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0x80, tmp()); // get MSB
      emitBitvmOp(opcodes, bitvm.ASM_ADD, tmp(), tmp(), tmp()); // lshift

      emitBitvmOp(opcodes, bitvm.ASM_SUB, 0, tmp(), tmp()); // 
      emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp(), reg2mem(rd));
   }
}



function emitLHU(opcodes: BitVMOpcode[], rd: number, rs1: number, offset: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), reg2mem(rd));
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0xFF, reg2mem(rd)); // just to be sure someone didn't sneak in a uint32 value instead of a bit

      // next
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 1, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), tmp2());
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2()); // just to be sure someone didn't sneak in a uint32 value instead of a byte

      // shift 8 
      for (let i = 0; i < 1; i++) {
         emitBitvmOp(opcodes, bitvm.ASM_LSHIFT8, tmp2(), tmp2(), tmp2());
      }

      emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp2(), reg2mem(rd));
   }
}

function emitLW(opcodes: BitVMOpcode[], rd: number, rs1: number, offset: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset + 3, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), reg2mem(rd));
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0xFF, reg2mem(rd)); // just to be sure someone didn't sneak in a uint32 value instead of a bit
      // continue from here
      for(let i = 0; i < 3; i++){
         emitBitvmOp(opcodes, bitvm.ASM_SUBI, tmp(), 1, tmp());
         emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), tmp2());

         emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2()); // just to be sure someone didn't sneak in a uint32 value instead of a bit

         emitBitvmOp(opcodes, bitvm.ASM_LSHIFT8, reg2mem(rd), reg2mem(rd), reg2mem(rd));
         emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp2(), reg2mem(rd));
      }
   }
}

function emitSB(opcodes: BitVMOpcode[], rs1: number, rs2: number, offset: number) {
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());
   emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rs2), 0, tmp2());

   // first byte
   emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2());
   emitBitvmOp(opcodes, bitvm.ASM_STORE, tmp2(), tmp(), NaN);
}

function emitSH(opcodes: BitVMOpcode[], rs1: number, rs2: number, offset: number) {
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp()); // tmp is now rs1 + offset which is the memroy point where we want to store rs2[0:15]
   emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rs2), 0, tmp2()); // Move rs2 to tmp2, now we want to store tmp2 to the memory location in tmp.

   // first byte
   emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2()); // we get the last 8 bit and store it in tmp2
   emitBitvmOp(opcodes, bitvm.ASM_STORE, tmp2(), tmp(), NaN); // Finally wrote the last byte, now we have to write rs2[9:15]

   // second byte
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 1, tmp()); // We move 1 byte to write the second half.

   emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rs2), 0, tmp2()); // rs2 is the value we want to write, moved it to tmp2
   // shift right 8
   for (let i = 0; i < 1; i++) {
      emitBitvmOp(opcodes, bitvm.ASM_RSHIFT8, tmp2(), tmp2(), tmp2());
   }
   emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp2());
   emitBitvmOp(opcodes, bitvm.ASM_STORE, tmp2(), tmp(), NaN);
}

function emitSW(opcodes: BitVMOpcode[], rs1: number, rs2: number, offset: number) {
   // Calculate base address and store it in tmp() for memory access
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), offset, tmp());

   // Temporarily store rs2 value for manipulation
   emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rs2), 0, tmp2());

   for (let i = 0; i < 4; i++) {
       // Isolate the current byte from tmp2() and store it
       emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0xFF, tmp3()); // Use a new tmp register if necessary
       emitBitvmOp(opcodes, bitvm.ASM_STORE, tmp3(), tmp(), NaN);

       // Prepare for the next byte unless it's the last byte
       if (i < 3) {
           emitBitvmOp(opcodes, bitvm.ASM_RSHIFT8, tmp2(), tmp2(), tmp2());
           emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 1, tmp()); // Increment address for next byte
       }
   }
}


function emitJALR(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number, riscv_pc: number) {
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), imm, tmp());
   emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp(), 0xFFFFFFFE, tmp());
   emitBitvmOp(opcodes, bitvm.ASM_LOAD, NaN, tmp(), tmp());
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), riscv_pc + 4, reg2mem(rd));
   }
   emitBitvmOp(opcodes, bitvm.ASM_JMP, tmp(), 0, 0);
}

function emitAUIPC(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
      // imm is already << 12'ed
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), (riscv_pc + imm) & 0xFFFFFFFF, reg2mem(rd));
   }
}

function emitLUI(opcodes: BitVMOpcode[], rd: number, insn: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), ((insn & 0xfffff000) >>> 0), reg2mem(rd));
   }
}

function emitBEQ(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(rs1), reg2mem(rs2), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitBNE(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, reg2mem(rs1), reg2mem(rs2), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitSLLI(opcodes:BitVMOpcode[], rd: number, rs1: number, imm:number) {
   if (rd != 0) {
       emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, reg2mem(rd));

       // Calculate the number of times to apply ASM_LSHIFT8 based on the immediate value.
       const shiftsBy8 = Math.floor(imm / 8);
       for (let i = 0; i < shiftsBy8; i++) {
           emitBitvmOp(opcodes, bitvm.ASM_LSHIFT8, reg2mem(rd), 0, reg2mem(rd));
       }

       // Calculate any remaining shifts that are less than 8 bits.
       const remainingShifts = imm % 8;
       for (let i = 0; i < remainingShifts; i++) {
           emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rd), reg2mem(rd), reg2mem(rd));
       }
   }
}


function emitSRLI(opcodes:BitVMOpcode[], rd: number, rs1: number, imm:number) {
   if (rd != 0) {
       emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, reg2mem(rd));

       // Calculate the number of times to apply ASM_RSHIFT8 based on the immediate value.
       const shiftsBy8 = Math.floor(imm / 8);
       for (let i = 0; i < shiftsBy8; i++) {
           emitBitvmOp(opcodes, bitvm.ASM_RSHIFT8, reg2mem(rd), 0, reg2mem(rd));
       }

       // Calculate any remaining shifts that are less than 8 bits.
       const remainingShifts = imm % 8;
       for (let i = 0; i < remainingShifts; i++) {
           emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, reg2mem(rd), 0, reg2mem(rd));
       }
   }
}


function emitSRAI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, reg2mem(rd));
      for (let i = 0; i < imm; i++) {
         emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), 0x80000000, tmp3());
         emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, reg2mem(rd), 0, reg2mem(rd));
         emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), tmp3(), reg2mem(rd));
      }
   }
}

function emitSLT(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitSLTU(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rs1), reg2mem(rs2), reg2mem(rd));
   }
}

function emitSLTIU(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), imm, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rs1), tmp(), reg2mem(rd));
   }
}

function emitSLTI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), imm, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rs1), tmp(), reg2mem(rd));
   }
}

function emitBLT(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rs1), reg2mem(rs2), tmp());
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitBLTU(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rs1), reg2mem(rs2), tmp());
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitBGE(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rs1), reg2mem(rs2), tmp());
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitBGEU(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rs1), reg2mem(rs2), tmp());
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC" });
}

function emitECALL(opcodes: BitVMOpcode[]) {
   // tmp() acts as our status buffer, 0 = weird shit 1 = OK, 2 = not OK
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), 1, tmp());
   // if x10 / a0 is 0, finish program
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(10), reg2mem(0), 0), find_label: "_program_end", find_target: "addressC", comment: "ECALL" });
}

function emitEBREAK(opcodes: BitVMOpcode[]) {
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(0), 2, tmp());
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_program_end", find_target: "addressC" });
}

function emitSRA(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   const uniq = crypto.randomBytes(32).toString("hex");
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, tmp()); // result
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs2), 0, tmp2()); // shift amount
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0x1F, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SRA_" + uniq + "_loop_start" });
      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), tmp2(), 0), find_label: "_SRA_" + uniq + "_loop_end", find_target: "addressC" });

      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp(), 0x80000000, tmp3());
      emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, tmp(), 0, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_OR, tmp(), tmp3(), tmp()); // add MSB
      emitBitvmOp(opcodes, bitvm.ASM_SUBI, tmp2(), 1, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_SRA_" + uniq + "_loop_start", find_target: "addressC" });

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SRA_" + uniq + "_loop_end" });

      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 0, reg2mem(rd)); // result
   }
}

function emitSRL(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   const uniq = crypto.randomBytes(32).toString("hex");
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, tmp()); // result
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs2), 0, tmp2()); // shift amount
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0x1F, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SRL_" + uniq + "_loop_start" });
      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), tmp2(), 0), find_label: "_SRL_" + uniq + "_loop_end", find_target: "addressC" });

      emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, tmp(), 0, tmp());
      emitBitvmOp(opcodes, bitvm.ASM_SUBI, tmp2(), 1, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_SRL_" + uniq + "_loop_start", find_target: "addressC" });

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SRL_" + uniq + "_loop_end" });

      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 0, reg2mem(rd)); // result
   }
}

function emitSLL(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   const uniq = crypto.randomBytes(32).toString("hex");
   if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs1), 0, tmp()); // result
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rs2), 0, tmp2()); // shift amount
      emitBitvmOp(opcodes, bitvm.ASM_ANDI, tmp2(), 0x1F, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SLL_" + uniq + "_loop_start" });
      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), tmp2(), 0), find_label: "_SLL_" + uniq + "_loop_end", find_target: "addressC" });

      emitBitvmOp(opcodes, bitvm.ASM_ADD, tmp(), tmp(), tmp());
      emitBitvmOp(opcodes, bitvm.ASM_SUBI, tmp2(), 1, tmp2());

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_SLL_" + uniq + "_loop_start", find_target: "addressC" });

      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_SLL_" + uniq + "_loop_end" });

      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), 0, reg2mem(rd)); // result
   }
}

function emitInstr(opcodes: BitVMOpcode[], pc: number, parsed: Instruction, rawInstr: number) {
   switch (parsed.instructionName) {
      case "LW": {
         emitLW(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
      case "LBU": {
         emitLBU(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
      case "LB": {
         emitLB(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
      case "LH": {
         emitLH(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
      case "LHU": {
         emitLHU(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
      case "SW": {
         emitSW(
            opcodes,
            parsed.rs1,
            parsed.rs2,
            parsed.imm
         );
         break;
      }
      case "SB": {
         emitSB(
            opcodes,
            parsed.rs1,
            parsed.rs2,
            parsed.imm
         );
         break;
      }
      case "SH": {
         emitSH(
            opcodes,
            parsed.rs1,
            parsed.rs2,
            parsed.imm
         );
         break;
      }
      case "SLL":
         emitSLL(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.rs2
         );
         break;
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
            parsed.rd,
            parsed.rs1,
            parsed.imm
         );
         break;
      }
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
         break;
      }
      case "XOR": {
         emitXOR(
            opcodes,
            parsed.rd,
            parsed.rs1,
            parsed.rs2
         );
         break;
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
         emitORI
            (
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
      case "SLTU": {
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
      case "CSRRW":
         emitEBREAK(opcodes);
         break;
      case "UNKNOWN":
         console.log("Got unknown opcode, ignoring, pc = 0x" + pc.toString(16));;
         break;
      case "ECALL":
         emitECALL(opcodes);
         break;
      default:
         throw new Error("Unknown instruction: " + parsed.instructionName + " " + JSON.stringify(parsed) + " " + rawInstr.toString(16) + " pc = 0x" + pc.toString(16));
   }
}


function riscvToBitVM(pc_base: number, buf: Buffer): BitVMOpcode[] {
   let opcodes: BitVMOpcode[] = [];
   for (let i = 0; i < buf.length; i += 4) {
      const instr = buf.readUInt32LE(i);
      const parsed = parseInstruction(instr);
      const instrName = parsed.instructionName;

      // null-op for labels
      opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_riscv_pc_" + (pc_base + i), comment: JSON.stringify(parsed) });
      emitInstr(opcodes, pc_base + i, parsed, instr);
   }
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_program_end" });
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

   let context: Context = {
      codepage: Buffer.alloc(0),
      code_addr: 0,
      datapage: [],
      data_addr: []
   }

   for (let i = 0; i < elfInfo.elf.segments.length; i++) {
      const seg = elfInfo.elf.segments[i];
      if (
         seg.vaddr !== 0 &&
         seg.typeDescription == "Load" &&
         Number(seg.vaddr) < 0x110000
      ) {
         // ^^^^ XXX this is really lazy
         if (Number(seg.vaddr) % 4096 !== 0) {
            throw new Error("Segment should be 4K-aligned");
         }
         const data = fileContents.slice(seg.offset, seg.offset + seg.filesz);
         context.codepage = data;
         context.code_addr = Number(seg.vaddr)
      } else if (
         seg.vaddr !== 0 &&
         seg.typeDescription == "Load" &&
         Number(seg.vaddr) >= 0x110000
      ) {
         if (Number(seg.vaddr) % 4096 !== 0) {
            throw new Error("Segment should be 4K-aligned");
         }
         const data = fileContents.slice(seg.offset, seg.offset + seg.filesz);
         context.datapage.push(data);
         context.data_addr.push(Number(seg.vaddr))
      }
   }
   let assembly = riscvToBitVM(context.code_addr, context.codepage);
   // assign program counters
   for (let i = 0; i < assembly.length; i++) {
      assembly[i].pc = i;
   }
   const labelMap = new Map();
   assembly.forEach((a, i) => {
      if (!labelMap.has(a.label)) {
         labelMap.set(a.label, i);
      }
   });

   assembly.forEach(a => {
      if (a.find_label) {
         const j = labelMap.get(a.find_label);
         if (j === undefined) {
            throw "label not found " + a.find_label;
         }
         const pc = assembly[j].pc;
         if (pc === undefined) {
            throw "No PC!";
         }

         switch (a.find_target) {
            case "addressA":
               a.opcode.addressA = pc;
               break;
            case "addressB":
               a.opcode.addressB = pc;
               break;
            case "addressC":
               a.opcode.addressC = pc;
               break;
            default:
               throw "Unknown find_target " + a.find_target;
         }
      }
   });

   //   console.log(assembly)

   let memory = Array(1024 * 1024 * 16).fill(0);
   const assemblyMap = new Map(assembly.map(a => [a.label, a.pc as number]));
   for (let i = 0; i < context.codepage.length; i += 4) {
      const label = "_riscv_pc_" + (context.code_addr + i);
      const pc = assemblyMap.get(label);
      if (pc === undefined) {
         throw "code without bitvm assembly";
      }
      memory[context.code_addr + i] = pc;
   }

   // XXX switch to uint8
   for(let i = 0; i < context.datapage.length; i++){
      for (let j = 0; j < context.datapage[i].length; j += 1) {
         memory[context.data_addr[i] + j] = context.datapage[i].readUInt8(j) as number;
      }
   }
   let bitvm_code: bitvm.Instruction[] = [];
   for (let i = 0; i < assembly.length; i++) {
      bitvm_code.push(assembly[i].opcode);
   }
   let vm = new bitvm.VM(bitvm_code, memory);
   let result_snapshot = vm.run();
   console.log(process.argv[2] + " result code: " + result_snapshot.read(tmp()) + " " + result_snapshot.read(reg2mem(28)));
}

transpile(fs.readFileSync(process.argv[2])).catch((err) => {
   console.log(err);
});
