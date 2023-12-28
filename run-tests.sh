for x in riscv-tests/isa/rv32ui-bitvm-*.dump; do
        npx ts-node --files main.ts riscv-tests/isa/$(basename -s .dump $x) 
done
