
export const ASM_ADD = 42 // *aC = (*aA + *aB) & (2^32-1)
export const ASM_SUB = 43 // *aC = (*aA + *aB) & (2^32-1)
//export const ASM_MUL = 44
export const ASM_JMP = 45 // pc = *aA
export const ASM_BEQ = 46 // if *aA == *aB: pc = aC
export const ASM_BNE = 47 // if *aA != *aB: pc = aC

// new
export const ASM_ADDI = 48 // *aC = (*aA + aB) & (2^32-1)
export const ASM_SUBI = 49 // *aC = (*aA - aB) & (2^32-1)
export const ASM_XORI = 50 // *aC = (*aA ^ aB) ^ (2^32-1)
export const ASM_XOR = 51  // *aC = (*aA ^ *aB) ^ (2^32-1)
export const ASM_OR = 52 // *aC = (*aA | *aB) ^ (2^32-1)
export const ASM_AND = 53 // *aC = (*aA & *aB) ^ (2^32-1)
export const ASM_ANDI = 54
export const ASM_ORI = 55
export const ASM_RSHIFT1 = 56
export const ASM_SLTU = 57
export const ASM_SLT = 58
export const ASM_SYSCALL = 59
export const ASM_LOAD = 60
export const ASM_WRITE = 61

export const LOG_TRACE_LEN = 24 // TODO: this should be 32
// Length of the trace
export const TRACE_LEN = 2 ** LOG_TRACE_LEN

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
            "42": "ASM_ADD",
            "43": "ASM_SUB",
            "44": "ASM_MUL",
            "45": "ASM_JMP",
            "46": "ASM_BEQ", 
            "47": "ASM_BNE",
            "48": "ASM_ADDI",
            "49": "ASM_SUBI",
            "50": "ASM_XORI",
            "51": "ASM_XOR",
            "52": "ASM_OR",
            "53": "ASM_AND",
            "54": "ASM_ANDI",
            "55": "ASM_ORI",
            "56": "ASM_RSHIFT1",
            "57": "ASM_SLTU",
            "58": "ASM_SLT",
            "59": "ASM_SYSCALL",
            "60": "ASM_LOAD",
            "61": "ASM_WRITE"
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
        return this.memory[address]
    }

    write(address: number, value: number) {
        if(address < 0) 
            throw `ERROR: address=${address} is negative`
        if(address >= this.memory.length) 
            throw `ERROR: address=${address} >= memory.length=${this.memory.length}`
        this.memory[address] = value
    }
}

const executeInstruction = (snapshot: Snapshot) => {
    /*  console.log(`PC: ${snapshot.pc},  Instruction: ${(snapshot.instruction+'').padEnd(9,' ')}`)
    for (let i = 0; i < 35; i++) {
      console.log('x' + i + " = " + (snapshot.read(i) >>> 0).toString(16));
    } */
    switch (snapshot.instruction.type) {
        case ASM_ADD:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) + snapshot.read(snapshot.instruction.addressB)) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_SUB:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) - snapshot.read(snapshot.instruction.addressB)) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_XOR:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) ^ snapshot.read(snapshot.instruction.addressB)) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_BEQ:
            if (snapshot.read(snapshot.instruction.addressA) == snapshot.read(snapshot.instruction.addressB)) {
                snapshot.pc = snapshot.instruction.addressC
            } else {
                snapshot.pc += 1
            }
            break
        case ASM_BNE:
            if (snapshot.read(snapshot.instruction.addressA) != snapshot.read(snapshot.instruction.addressB)) {
                snapshot.pc = snapshot.instruction.addressC
            } else {
                snapshot.pc += 1
            }
            break
        case ASM_JMP:
            snapshot.pc = snapshot.read(snapshot.instruction.addressA)
            break
        case ASM_ADDI:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) + snapshot.instruction.addressB) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_SUBI:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) - snapshot.instruction.addressB) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_XORI:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) ^ snapshot.instruction.addressB) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_AND:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) & snapshot.read(snapshot.instruction.addressB)) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_OR:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) | snapshot.read(snapshot.instruction.addressB)) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_ANDI:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) & snapshot.instruction.addressB) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_ORI:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) | snapshot.instruction.addressB) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_RSHIFT1:
            snapshot.write(
                snapshot.instruction.addressC,
                (snapshot.read(snapshot.instruction.addressA) >>> 1) & 0xFFFFFFFF
            )
            snapshot.pc += 1
            break
        case ASM_SLTU:
            snapshot.write(snapshot.instruction.addressC, snapshot.read(snapshot.instruction.addressA) >>> 0 < snapshot.read(snapshot.instruction.addressB) >>> 0 ? 1 : 0);
            snapshot.pc += 1
            break            
        case ASM_SLT:
            snapshot.write(snapshot.instruction.addressC, snapshot.read(snapshot.instruction.addressA) < snapshot.read(snapshot.instruction.addressB) ? 1 : 0);
            snapshot.pc += 1
            break            
        case ASM_LOAD:
            snapshot.write(snapshot.instruction.addressC, snapshot.read(snapshot.read(snapshot.instruction.addressA))); 
            snapshot.pc += 1
            break;
        case ASM_WRITE:
            snapshot.write(snapshot.read(snapshot.instruction.addressC), snapshot.read(snapshot.instruction.addressA)); 
            snapshot.pc += 1
            break;
        case ASM_SYSCALL:
            console.log("syscall called")
            snapshot.pc += 1
            break
        default:
            snapshot.pc += 1
            break
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
