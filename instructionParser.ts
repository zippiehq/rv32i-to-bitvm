export interface Instruction {
  /** Unparsed number value of instruction **/
  unparsedInstruction: number;

  /** Register destination **/
  rd: number;
  /** Register source 1 **/
  rs1: number;
  /** Register source 2 **/
  rs2: number;

  /** Immediate Value */
  imm: number;

  /** Name of the instruction e.g. ADD, ADDI, LUI ... **/
  instructionName: string;
}

/**
 * Parses a instruction e.g. 0x058000ef. BigEndian encoding.
 * @param instruction The instruction encoded in big endian as a number
 */
export function parseInstruction(insn: number, addr = 0): Instruction {
  const opcode = insn & 0x7f;
  const rd = (insn >> 7) & 0x1f;
  const rs1 = (insn >> 15) & 0x1f,
    rs2 = (insn >> 20) & 0x1f;
  const funct3 = (insn >> 12) & 0x7,
    funct7 = (insn >> 25) & 0x7f;

  let imm = 0;
  let name = "UNKNOWN";

  switch (opcode) {
    case 0x03: {
      imm = insn >> 20;
      switch (funct3) {
        case 0x0: /* lb */ {
          name = "LB";
          break;
        }
        case 0x1: /* lh */ {
          name = "LH";
          break;
        }
        case 0x2: /* lw */ {
          name = "LW";
          break;
        }
        case 0x3: /* ld */ {
          name = "LD";
          break;
        }
        case 0x4: /* lbu */ {
          name = "LBU";
          break;
        }
        case 0x5: /* lhu */ {
          name = "LHU";
          break;
        }
        case 0x6: /* lwu */ {
          name = "LWU";
          break;
        }
      }
      break;
    }
    case 0x0f: {
      switch (funct3) {
        case 0x0: {
          name = "FENCE";
          break;
        }
        case 0x1: {
          name = "FENCE.I";
          break;
        }
      }
      break;
    }
    case 0x13: {
      imm = (insn & 0xfff00000) >> 20;
      let shamt = imm & 0x3f;
      switch (funct3) {
        case 0x0 /* addi */:
          name = "ADDI";
          break;
        case 0x1 /* slli */:
          name = "SLLI";
          imm = shamt;
          break;
        case 0x2 /* slti */:
          name = "SLTI";
          break;
        case 0x3 /* sltiu */:
          name = "SLTIU";
          break;
        case 0x4 /* xori */:
          name = "XORI";
          break;
        case 0x5:
          switch (funct7 >> 1) {
            case 0x00 /* srli */:
              name = "SRLI";
              imm = shamt;
              break;
            case 0x10 /* srai */:
              name = "SRAI";
              imm = shamt;
              break;
          }
          break;
        case 0x6 /* ori */:
          name = "ORI";
          break;
        case 0x7 /* andi */:
          name = "ANDI";
          break;
      }
      break;
    }
    case 0x17: /* auipc */ {
      imm = (insn & 0xfffff000);
      name = "AUIPC";
      break;
    }
    case 0x1b: {
      imm = insn >> 20;
      let shamt = imm & 0x1f;
      switch (funct3) {
        case 0x0 /* addiw */:
          name = "ADDIW";
          break;
        case 0x1 /* slliw */:
          imm = shamt;
          name = "SLLIW";
          break;
        case 0x5: {
          switch (funct7) {
            case 0x00 /* srliw */:
              imm = shamt;
              name = "SRLIW";
              break;
            case 0x20 /* sraiw */:
              imm = shamt;
              name = "SRAIW";
              break;
          }
        }
      }
      break;
    }
    case 0x23: {
      imm = ((insn & 0xfe000000) >> 20) | ((insn >> 7) & 0x1f);
      switch (funct3) {
        case 0x0 /* sb */:
          name = "SB";
          break;
        case 0x1 /* sh */:
          name = "SH";
          break;
        case 0x2 /* sw */:
          name = "SW";
          break;
        case 0x3 /* sd */:
          name = "SD";
          break;
      }
      break;
    }
    case 0x2f:
      {
        let funct5 = (funct7 & 0x7c) >> 2;
        if (funct3 == 0x2 && funct5 == 0x00) {
          /* amoadd.w */
          name = "AMOADD.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x01) {
          /* amoswap.w */
          name = "AMOSWAP.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x04) {
          /* amoxor.w */
          name = "AMOXOR.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x08) {
          /* amoor.w */
          name = "AMOOR.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x0c) {
          /* amoand.w */
          name = "AMOAND.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x10) {
          /* amomin.w */
          name = "AMOMIN.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x14) {
          /* amomax.w */
          name = "AMOMAX.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x18) {
          /* amominu.w */
          name = "AMOMINU.W";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x1c) {
          /* amomaxu.w */
          name = "AMOMAXU.W";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x00) {
          /* amoadd.d */
          name = "AMOADD.W";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x01) {
          /* amoswap.d */
          name = "AMOSWAP.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x04) {
          /* amoxor.d */
          name = "AMOXOR.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x08) {
          /* amoor.d */
          name = "AMOOR.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x0c) {
          /* amoand.d */
          name = "AMOAND.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x10) {
          /* amomin.d */
          name = "AMOMIN.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x14) {
          /* amomax.d */
          name = "AMOMAX.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x18) {
          /* amominu.d */
          name = "AMOMINU.D";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x1c) {
          /* amomaxu.d */
          name = "AMOMAXU.D";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x02) {
          name = "LR.W";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x02) {
          name = "LR.D";
          break;
        } else if (funct3 == 0x2 && funct5 == 0x03) {
          name = "SC.W";
          break;
        } else if (funct3 == 0x3 && funct5 == 0x03) {
          name = "SC.D";
          break;
        }
      }
      break;
    case 0x33: {
      if (funct3 == 0x0 && funct7 == 0x00) {
        /* add */
        name = "ADD";
        break;
      } else if (funct3 == 0x0 && funct7 == 0x01) {
        /* mul */
        name = "MUL";
        break;
      } else if (funct3 == 0x0 && funct7 == 0x20) {
        /* sub */
        name = "SUB";
        break;
      } else if (funct3 == 0x1 && funct7 == 0x00) {
        /* sll */
        name = "SLL";
        break;
      } else if (funct3 == 0x1 && funct7 == 0x01) {
        /* mulh */
        name = "MULH";
        break;
      } else if (funct3 == 0x2 && funct7 == 0x01) { 
        /* mulhsu */
        name = "MULHSU";
        break;
      } else if (funct3 == 0x2 && funct7 == 0x00) {
        /* slt */
        name = "SLT";
        break;
      } else if (funct3 == 0x3 && funct7 == 0x00) {
        /* sltu */
        name = "SLTU";
        break;
      } else if (funct3 == 0x3 && funct7 == 0x01) {
        /* mulhu */
        name = "MULHU";
        break;
      } else if (funct3 == 0x4 && funct7 == 0x00) {
        /* xor */
        name = "XOR";
        break;
      } else if (funct3 == 0x4 && funct7 == 0x01) {
        /* div */
        name = "DIV";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x00) {
        /* srl */
        name = "SRL";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x01) {
        /* divu */
        name = "DIVU";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x20) {
        /* sra */
        name = "SRA";
        break;
      } else if (funct3 == 0x6 && funct7 == 0x01) {
        /* rem */
        name = "REM";
        break;
      } else if (funct3 == 0x6 && funct7 == 0x00) {
        /* or */
        name = "OR";
        break;
      } else if (funct3 == 0x7 && funct7 == 0x00) {
        /* and */
        name = "AND";
        break;
      } else if (funct3 == 0x7 && funct7 == 0x01) {
        /* remu */
        name = "REMU";
        break;
      }
      break;
    }
    case 0x37 /* lui */:
      imm = (insn & 0xfffff000) >>> 0;
      name = "LUI";
      break;
    case 0x3b: {
      if (funct3 == 0x0 && funct7 == 0x00) {
        /* addw */
        name = "ADDW";
        break;
      } else if (funct3 == 0x0 && funct7 == 0x01) {
        /* mulw */
        name = "MULW";
        break;
      } else if (funct3 == 0x0 && funct7 == 0x20) {
        /* subw */
        name = "SUBW";
        break;
      } else if (funct3 == 0x1 && funct7 == 0x00) {
        /* sllw */
        name = "SLLW";
        break;
      } else if (funct3 == 0x4 && funct7 == 0x01) {
        /* divw */
        name = "DIVW";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x00) {
        /* srlw */
        name = "SRLW";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x01) {
        /* divuw */
        name = "DIVUW";
        break;
      } else if (funct3 == 0x5 && funct7 == 0x20) {
        /* sraw */
        name = "SRAW";
        break;
      } else if (funct3 == 0x6 && funct7 == 0x01) {
        /* remw */
        name = "REMW";
        break;
      } else if (funct3 == 0x7 && funct7 == 0x01) {
        /* remuw */
        name = "REMUW";
        break;
      }
      break;
    }
    case 0x63: {
      imm =
        ((insn & 0x80000000) >> 19) |
        ((insn & 0x80) << 4) |
        ((insn >> 20) & 0x7e0) |
        ((insn >> 7) & 0x1e);

      switch (funct3) {
        case 0x0 /* beq */:
          name = "BEQ";
          break;
        case 0x1 /* bne */:
          name = "BNE";
          break;
        case 0x4 /* blt */:
          name = "BLT";
          break;
        case 0x5 /* bge */:
          name = "BGE";
          break;
        case 0x6 /* bltu */:
          name = "BLTU";
          break;
        case 0x7 /* bgeu */:
          name = "BGEU";
          break;
      }
      break;
    }
    case 0x67:
      name = "JALR";
      imm = (insn & 0xfff00000) >> 20;
      break;
    case 0x6f: {
      name = "JAL";
      imm =
        ((insn & 0x80000000) >> 11) |
        (insn & 0xff000) |
        ((insn >> 9) & 0x800) |
        ((insn >> 20) & 0x7fe);
      break;
    }
    case 0x73: {
      imm = (insn & 0xfff00000) >> 20;
      switch (funct3) {
        case 0x0:
          if (rs2 == 0x0 && funct7 == 0x0) {
            /* ecall */
            name = "ECALL";
            break;
          } else if (rs2 == 0x1 && funct7 == 0x0) {
            /* ebreak */
            name = "EBREAK";
            break;
          }
          break;
        case 0x1:
          name = "CSRRW";
          break;
        case 0x2:
          name = "CSRRS";
          break;
        case 0x3:
          name = "CSRRC";
          break;
        case 0x5:
          name = "CSRRWI";
          break;
        case 0x6:
          name = "CSRRSI";
          break;
        case 0x7:
          name = "CSRRCI";
          break;
        // XXX more are here
      }
    }
  }

  const parsedInstruction: Instruction = {
    unparsedInstruction: insn,
    imm: imm,
    rd: rd,
    rs1: rs1,
    rs2: rs2,
    instructionName: name,
  };

  return parsedInstruction;
}
