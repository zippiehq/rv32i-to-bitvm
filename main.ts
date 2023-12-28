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

function reg2mem(reg: number) {
   return reg; // in future, * 4   
}

function tmp() { return 33; }
function tmp2() { return 34; }
function tmp3() { return 35; }

function emitBitvmOp(opcodes: BitVMOpcode[], op: number, addressA: number, addressB: number, addressC: number) {
   opcodes.push({ opcode: new bitvm.Instruction(op, addressA, addressB, addressC) });
}

function emitADD(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitADDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitSUB(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_SUB, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitXOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_XOR, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitXORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_XORI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitAND(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_AND, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitANDI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ANDI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitOR(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_OR, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
   }
}

function emitORI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
   if (rd != 0) { 
     emitBitvmOp(opcodes, bitvm.ASM_ORI, reg2mem(rd), reg2mem(rs1), imm);
   }
}

function emitJAL(opcodes: BitVMOpcode[], rd: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), riscv_pc + 4);
   }
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_riscv_pc" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitJALR(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number, riscv_pc: number) {
   if (rd != 0) {
     emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(0), riscv_pc + 4);
   }
   emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(rs1), imm);
   emitBitvmOp(opcodes, bitvm.ASM_JMP, tmp(), 0, 0);
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
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(rs1), reg2mem(rs2),  0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitBNE(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
   opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, reg2mem(rs1), reg2mem(rs2), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitSLLI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), 0);
      for (let i = 0; i < imm; i++) {
       emitBitvmOp(opcodes, bitvm.ASM_ADD, reg2mem(rd), reg2mem(rd), reg2mem(rd));
      }   
    }
}

function emitSRLI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, reg2mem(rd), reg2mem(rs1), 0);
      for (let i = 0; i < imm; i++) {
       emitBitvmOp(opcodes, bitvm.ASM_RSHIFT1, reg2mem(rd), reg2mem(rd), 0);
      }   
    }
}

function emitSLT(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
    }
}

function emitSLTU(opcodes: BitVMOpcode[], rd: number, rs1: number, rs2: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rd), reg2mem(rs1), reg2mem(rs2));
    }
}

function emitSLTIU(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), imm);
      emitBitvmOp(opcodes, bitvm.ASM_SLTU, reg2mem(rd), reg2mem(rs1), tmp());
    }
}

function emitSLTI(opcodes: BitVMOpcode[], rd: number, rs1: number, imm: number) {
    if (rd != 0) {
      emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), imm);
      emitBitvmOp(opcodes, bitvm.ASM_SLT, reg2mem(rd), reg2mem(rs1), tmp());
    }
}

function emitBLT(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    emitBitvmOp(opcodes, bitvm.ASM_SLT, tmp(), reg2mem(rs1), reg2mem(rs2));
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitBLTU(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    emitBitvmOp(opcodes, bitvm.ASM_SLTU, tmp(), reg2mem(rs1), reg2mem(rs2));
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_ " + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitBGE(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    emitBitvmOp(opcodes, bitvm.ASM_SLT, tmp(), reg2mem(rs1), reg2mem(rs2));
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitBGEU(opcodes: BitVMOpcode[], rs1: number, rs2: number, imm: number, riscv_pc: number) {
    emitBitvmOp(opcodes, bitvm.ASM_SLTU, tmp(), reg2mem(rs1), reg2mem(rs2));
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BNE, tmp(), reg2mem(0), 0), find_label: "_riscv_pc_" + ((riscv_pc + imm) & 0xFFFFFFFF), find_target: "addressC"});
}

function emitECALL(opcodes: BitVMOpcode[]) {
    // tmp() acts as our status buffer, 0 = weird shit 1 = OK, 2 = not OK
    emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), 1);
    // if x10 / a0 is 0, finish program
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(10), reg2mem(0), 0), find_label: "_program_end", find_target: "addressC", comment: "ECALL"});
}

function emitEBREAK(opcodes: BitVMOpcode[]) {
    emitBitvmOp(opcodes, bitvm.ASM_ADDI, tmp(), reg2mem(0), 2);
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_BEQ, reg2mem(0), reg2mem(0), 0), find_label: "_program_end", find_target: "addressC"});
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
    /* case "SLL":
      emitSLL(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      ); */
    /* case "SRL": {
      emitSRL(
        opcodes,
        parsed.rd,
        parsed.rs1,
        parsed.rs2
      );
      break;
    } */
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
    /* case "SRA": {
      emitSRA(opcodes, parsed.rd, parsed.rs1, parsed.rs2);
      break;
    } */
    /*
    case "SRAI": {
      emitSRAI(opcodes, parsed.rd, parsed.rs1, parsed.imm);
      break;
    } */
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

    // null-op for labels
    opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_riscv_pc_" + (pc_base + i), comment: JSON.stringify(parsed) });    
    emitInstr(opcodes, pc_base + i, parsed);
  }
  opcodes.push({ opcode: new bitvm.Instruction(bitvm.ASM_ADDI, reg2mem(0), reg2mem(0), 0), label: "_program_end"});
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
      context.datapage = data;
      context.data_addr = Number(seg.vaddr)
    }
   }
   let assembly = riscvToBitVM(context.code_addr, context.codepage);
   // assign program counters
   for (let i = 0; i < assembly.length; i++) {
      assembly[i].pc = i;
   }
   for (let i = 0; i < assembly.length; i++) {
      if (assembly[i].find_label) { 
         let j = 0;
         for (; j < assembly.length; j++) {
            if (assembly[j].label === assembly[i].find_label) {
               break;
            }
         }
         if (j == assembly.length) {
           throw "label not found " + assembly[i].find_label;
         }
         
         if (assembly[j].pc === undefined) {
           throw "No PC!";
         }
         if (assembly[i].find_target === "addressA") {
           assembly[i].opcode.addressA = assembly[j].pc as number
         } else if (assembly[i].find_target === "addressB") {
           assembly[i].opcode.addressB = assembly[j].pc as number
         } else if (assembly[i].find_target === "addressC") {
           assembly[i].opcode.addressC = assembly[j].pc as number
         } else throw "Unknown find_target " + assembly[i].find_target;
      } 
   }

   let memory = Array(16*1024*1024).fill(0);
   for (let i = 0; i < context.codepage.length; i += 4) {
      for (let j = 0; j < assembly.length; j++) {
          if (assembly[j].label == ("_riscv_pc_" + (context.code_addr + i))) {
             memory[context.code_addr + i] = assembly[j].pc;
          }
      }
   }   
   
   for (let i = 0; i < context.datapage.length; i += 4) {
       memory[context.data_addr + i] = context.datapage.readUInt32LE(i);
   }
   let bitvm_code: bitvm.Instruction[] = [];
   for (let i = 0; i < assembly.length; i++) {
      bitvm_code.push(assembly[i].opcode);
   }

   let vm = new bitvm.VM(bitvm_code, memory);
   let result_snapshot = vm.run();
   console.log(process.argv[2] + " result code: " + result_snapshot.read(tmp()));
}

transpile(fs.readFileSync(process.argv[2])).catch((err) => {
  console.log(err);
});
