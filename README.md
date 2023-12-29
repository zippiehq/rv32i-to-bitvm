**This is a (not very developer friendly) rv32i to BitVM (some mods to be done on BitVM bitcoin script side still!) transpiler **

Need: wget, node, npm, yarn, linux/ubuntu container

0. Clone this repo:

git clone https://github.com/zippiehq/rv32i-to-bitvm

cd rv32i-to-bitvm

1. Get a toolchain: (still in rv32i-to-bitvm/ )

wget https://github.com/stnolting/riscv-gcc-prebuilt/releases/download/rv32i-4.0.0/riscv32-unknown-elf.gcc-12.1.0.tar.gz

mkdir -p toolchain

cd toolchain

tar xf ../riscv32-unknown-elf.gcc-12.1.0.tar.gz

cd ..

export PATH=$PWD/toolchain/bin:$PATH

2. get & build the riscv test suite:

git clone https://github.com/zippiehq/riscv-tests -b bitvm

cd riscv-tests

git submodule init

git submodule update

./configure --with-xlen=32

cd isa

make XLEN=32 rv32ui

cd ../..

3. install npm dependendencies:

yarn

4. run tests

bash run-tests.sh

fence_i test doesn't work
