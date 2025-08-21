FROM ghcr.io/joaofazolo/boca-docker/boca-jail:latest

USER root

# Instala compiladores e ferramentas essenciais
RUN apt-get update && apt-get install -y gcc g++ make libc6-dev binutils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y libc6-dev

RUN cp /usr/lib/x86_64-linux-gnu/libm-*.a /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp /usr/lib/x86_64-linux-gnu/libmvec.a /bocajail/usr/lib/x86_64-linux-gnu/
RUN cp /usr/lib/x86_64-linux-gnu/libm.so* /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp /usr/lib/x86_64-linux-gnu/libmvec.so* /bocajail/usr/lib/x86_64-linux-gnu/

# Cria estrutura de diretórios esperada dentro da jail
RUN mkdir -p /bocajail/usr/bin \
             /bocajail/usr/lib \
             /bocajail/usr/lib/gcc/x86_64-linux-gnu/11 \
             /bocajail/usr/lib/x86_64-linux-gnu \
             /bocajail/lib \
             /bocajail/lib64 \
             /bocajail/lib/x86_64-linux-gnu \
             /bocajail/tmp

# Copia os binários principais para a jail
RUN cp -v /usr/bin/gcc /usr/bin/gcc-11 /usr/bin/as /usr/bin/ld /bocajail/usr/bin/

# Copia o `cc1` para o mesmo caminho relativo dentro da jail
RUN mkdir -p /bocajail$(dirname $(gcc -print-prog-name=cc1)) && \
    cp -v $(gcc -print-prog-name=cc1) /bocajail$(dirname $(gcc -print-prog-name=cc1))/

# Copia o loader dinâmico (ld-linux) se ainda não existir
RUN mkdir -p /bocajail/lib64 && \
    cp -u /lib64/ld-linux-x86-64.so.2 /bocajail/lib64/ || true

# Copia TODAS as libs necessárias dos binários principais
RUN for bin in /usr/bin/gcc /usr/bin/gcc-11 /usr/bin/as /usr/bin/ld $(gcc -print-prog-name=cc1); do \
      echo "Copying libs for $bin"; \
      ldd $bin | grep "=> /" | awk '{print $3}' | \
        xargs -I '{}' cp --parents '{}' /bocajail/; \
    done

# Copia headers do sistema padrão
RUN mkdir -p /bocajail/usr/include && \
    cp -r /usr/include/* /bocajail/usr/include/

# Copia headers internos do GCC
RUN mkdir -p /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/include && \
    cp -r /usr/lib/gcc/x86_64-linux-gnu/11/include/* /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/include/

# Copia bibliotecas de startup (crt*.o)
RUN cp -v /usr/lib/x86_64-linux-gnu/crt*.o /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp -v /usr/lib/gcc/x86_64-linux-gnu/11/crt*.o /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/ || true

# Copia bibliotecas padrão do sistema para linking dinâmico
RUN cp -v /usr/lib/x86_64-linux-gnu/libm.so* /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp -v /usr/lib/x86_64-linux-gnu/libc.so* /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp -v /usr/lib/gcc/x86_64-linux-gnu/11/libgcc* /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/

# Copia bibliotecas para linking estático
RUN cp /usr/lib/x86_64-linux-gnu/libc.a /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp /usr/lib/x86_64-linux-gnu/libm.a /bocajail/usr/lib/x86_64-linux-gnu/ && \
    cp /usr/lib/gcc/x86_64-linux-gnu/11/libgcc.a /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/ && \
    cp /usr/lib/gcc/x86_64-linux-gnu/11/libgcc_eh.a /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/ && \
    cp /usr/lib/x86_64-linux-gnu/libpthread.a /bocajail/usr/lib/x86_64-linux-gnu/ || true

RUN cp -v /usr/lib/x86_64-linux-gnu/libc.a \
           /usr/lib/x86_64-linux-gnu/libm.a \
           /usr/lib/x86_64-linux-gnu/libc_nonshared.a \
           /bocajail/usr/lib/x86_64-linux-gnu/


# Copia plugin de LTO
RUN cp /usr/lib/gcc/x86_64-linux-gnu/11/liblto_plugin.so* /bocajail/usr/lib/gcc/x86_64-linux-gnu/11/

# Copia libs específicas do `as`
RUN cp /lib/x86_64-linux-gnu/libopcodes-*.so* /bocajail/lib/x86_64-linux-gnu/ && \
    cp /lib/x86_64-linux-gnu/libbfd-*.so* /bocajail/lib/x86_64-linux-gnu/ && \
    cp /lib/x86_64-linux-gnu/libz.so* /bocajail/lib/x86_64-linux-gnu/

# Evita erro do linux-vdso.so.1
RUN touch /bocajail/linux-vdso.so.1

# Ajusta permissões
RUN chmod -R 755 /bocajail && \
    chmod -R 777 /bocajail/tmp
RUN chmod -R 755 /bocajail/usr/lib/x86_64-linux-gnu/

RUN cp -v /usr/lib/x86_64-linux-gnu/*crt*.o /bocajail/usr/lib/x86_64-linux-gnu/ || true
