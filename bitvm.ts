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
            snapshot.instruction.addressA = snapshot.read(snapshot.instruction.addressB)
            // console.log(`Loading value: ${snapshot.read(snapshot.instruction.addressA)} from address ${snapshot.instruction.addressA } to address ${ snapshot.instruction.addressC}`);
            snapshot.write(snapshot.instruction.addressC, snapshot.read(snapshot.instruction.addressA))
            snapshot.pc += 1
            break
        case ASM_STORE:
            snapshot.instruction.addressC = snapshot.read(snapshot.instruction.addressB)
            // console.log(`Loading value: ${snapshot.read(snapshot.instruction.addressA)} from address ${snapshot.instruction.addressA } to address ${ snapshot.instruction.addressC}`);
            snapshot.write(snapshot.instruction.addressC, snapshot.read(snapshot.instruction.addressA)); 
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
