// BitVM instruction set
export const ASM_ADD	 = 1
export const ASM_SUB	 = 2
export const ASM_MUL	 = 3
export const ASM_AND	 = 4
export const ASM_OR 	 = 5
export const ASM_XOR	 = 6
export const ASM_ADDI	 = 7
export const ASM_SUBI	 = 8
export const ASM_ANDI	 = 9
export const ASM_ORI	 = 10
export const ASM_XORI	 = 11
export const ASM_JMP	 = 12
export const ASM_BEQ	 = 13
export const ASM_BNE	 = 14
export const ASM_RSHIFT1 = 15
export const ASM_SLTU	 = 16
export const ASM_SLT	 = 17
export const ASM_SYSCALL = 18
export const ASM_LOAD	 = 19
export const ASM_STORE	 = 20

export const LOG_TRACE_LEN = 24 // TODO: this should be 32
// Length of the trace
export const TRACE_LEN = 2 ** LOG_TRACE_LEN

export const U32_SIZE = 2 ** 32
// Map positive and negative n to an unsigned u32
export const toU32 = (n: number): number => {
    return (U32_SIZE + (n % U32_SIZE)) % U32_SIZE;
}

export class Instruction {
    type: number;
    addressA: number;
    addressB: number;
    addressC: number;
    
    constructor(type: number, addressA: number, addressB: number, addressC: number) {
        this.type = type;
        this.addressA = addressA;
        this.addressB = addressB;
        this.addressC = addressC;
    }


    toString() {
        let lookup: Record<string, string> = {
            "1"  : "ASM_ADD",
            "2"  : "ASM_SUB",
            "3"  : "ASM_MUL",
            "4"  : "ASM_AND",
            "5"  : "ASM_OR",
            "6"  : "ASM_XOR",
            "7"  : "ASM_ADDI",
            "8"  : "ASM_SUBI",
            "9"  : "ASM_ANDI",
            "10" : "ASM_ORI",
            "11" : "ASM_XORI",
            "12" : "ASM_JMP",
            "13" : "ASM_BEQ",
            "14" : "ASM_BNE",
            "15" : "ASM_RSHIFT1",
            "16" : "ASM_SLTU",
            "17" : "ASM_SLT",
            "18" : "ASM_SYSCALL",
            "19" : "ASM_LOAD",
            "20" : "ASM_STORE",
        }
        let type = lookup["" + this.type];
        return `${type} ${this.addressA} ${this.addressB} ${this.addressC}`
    }
}
//export const compileProgram = source => source.map(instruction => new Instruction(...instruction))

class Snapshot {
    pc: number
    memory: number[]
    stepCount = 0
    instruction: Instruction

    constructor(memory: number[], instruction: Instruction, pc = 0) {
        this.memory = memory
        this.instruction = instruction
        this.pc = pc
    }

    read(address: number): number {
        if(address < 0) 
            throw `ERROR: address=${address} is negative`
        if(address >= this.memory.length) 
            throw `ERROR: address=${address} >= memory.length=${this.memory.length}`
        return this.memory[address];
    }

    write(address: number, value: number) {
        if(address < 0) 
            throw `ERROR: address=${address} is negative`
        if(address >= this.memory.length) 
            throw `ERROR: address=${address} >= memory.length=${this.memory.length}`
        this.memory[address] = value;
    }
}

const executeInstruction = (s: Snapshot) => {
    /*  console.log(`PC: ${snapshot.pc},  Instruction: ${(snapshot.instruction+'').padEnd(9,' ')}`)
    for (let i = 0; i < 35; i++) {
      console.log('x' + i + " = " + (snapshot.read(i) >>> 0).toString(16));
    } */
    switch (s.instruction.type) {
        case ASM_ADD:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) + s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_SUB:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) - s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_MUL:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) * s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_AND:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) & s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_OR:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) | s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_XOR:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) ^ s.read(s.instruction.addressB))
            )
            s.pc += 1
            break
        case ASM_ADDI:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) + s.instruction.addressB)
            )
            s.pc += 1
            break
        case ASM_SUBI:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) - s.instruction.addressB)
            )
            s.pc += 1
            break
        case ASM_ANDI:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) & s.instruction.addressB)
            )
            s.pc += 1
            break
        case ASM_ORI:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) | s.instruction.addressB)
            )
            s.pc += 1
            break
        case ASM_XORI:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) ^ s.instruction.addressB)
            )
            s.pc += 1
            break
        case ASM_BEQ:
            if (s.read(s.instruction.addressA) == s.read(s.instruction.addressB)) {
                s.pc = s.instruction.addressC
            } else {
                s.pc += 1
            }
            break
        case ASM_BNE:
            if (s.read(s.instruction.addressA) != s.read(s.instruction.addressB)) {
                s.pc = s.instruction.addressC
            } else {
                s.pc += 1
            }
            break
        case ASM_JMP:
            s.pc = s.read(s.instruction.addressA)
            break
        case ASM_RSHIFT1:
            s.write(
                s.instruction.addressC,
                toU32(s.read(s.instruction.addressA) >>> 1)
            )
            s.pc += 1
            break
        case ASM_SLTU:
            s.write(s.instruction.addressC, s.read(s.instruction.addressA) >>> 0 < s.read(s.instruction.addressB) >>> 0 ? 1 : 0);
            s.pc += 1
            break            
        case ASM_SLT:
            // Binary OR with each value to cast them to 32-bit integer and then back to a sign-extended number.
            s.write(s.instruction.addressC, (s.read(s.instruction.addressA) | 0 ) < ( s.read(s.instruction.addressB) | 0 ) ? 1 : 0);
            s.pc += 1
            break
        case ASM_LOAD:
            s.instruction.addressA = s.read(s.instruction.addressB)
            // console.log(`Loading value: ${snapshot.read(snapshot.instruction.addressA)} from address ${snapshot.instruction.addressA } to address ${ snapshot.instruction.addressC}`);
            s.write(s.instruction.addressC, s.read(s.instruction.addressA))
            s.pc += 1
            break
        case ASM_STORE:
            s.instruction.addressC = s.read(s.instruction.addressB)
            // console.log(`Loading value: ${snapshot.read(snapshot.instruction.addressA)} from address ${snapshot.instruction.addressA } to address ${ snapshot.instruction.addressC}`);
            s.write(s.instruction.addressC, s.read(s.instruction.addressA))
            s.pc += 1
            break;
        case ASM_SYSCALL:
            console.log("syscall called")
            s.pc += 1
            break
        default:
            throw `Unsupported instruction type ${s.instruction.type}`
            // s.pc += 1
            // break
    }
}


export class VM {
    program
    memoryEntries

    constructor(program: Instruction[], memoryEntries: number[]) {
        this.program = program,
        this.memoryEntries = memoryEntries
    }

    // essentially if length runs out, machine halts
    run(maxSteps = TRACE_LEN) {
        const snapshot = new Snapshot(this.memoryEntries, this.program[0])
        while (snapshot.pc < this.program.length && snapshot.stepCount < maxSteps) {
            snapshot.instruction = this.program[snapshot.pc]
            executeInstruction(snapshot)
            snapshot.stepCount++
            if (snapshot.stepCount == maxSteps) {
               throw "hit max steps"
            }
        }
        return snapshot
    }
}
