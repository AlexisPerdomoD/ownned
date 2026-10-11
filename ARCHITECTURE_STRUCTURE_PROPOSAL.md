# Propuesta de estructura del backend

## Objetivo

Hacer explícita la separación entre la lógica de aplicación y sus implementaciones, organizando los casos de uso por feature. Mantener repositorios completos por ahora: no separar interfaces de lectura y escritura.

La dirección sigue siendo una arquitectura hexagonal, con dominio selectivo: la aplicación define lo que necesita y los adaptadores implementan esos contratos. No implica migrar a microservicios ni reescribir el dominio.

## Estructura propuesta

```text
cmd/
  server/
  superusr/
  approot/

internal/
  domain/                      # Entidades, value objects y reglas de negocio
    usr.go
    group.go
    node.go
    document.go

  app/                          # Casos de uso, organizados por feature
    auth/
      login_usecase.go
      password_hasher.go       # Contrato PasswordHasher
      token_issuer.go          # Contrato TokenIssuer
    usr/                        # Conserva los nombres de tipos actuales: Usr, UsrRepository
      create_usecase.go
      get_usecase.go
      repository.go            # UsrRepository, UsrPwdRepository, etc.
    group/
      create_usecase.go
      update_usecase.go
      repository.go
    node/
      create_usecase.go
      repository.go
    document/
      create_usecase.go
      repository.go
      file_storage.go          # Contrato FileStorage, usado por esta feature
    comment/
      ...
    transaction/
      unit_of_work.go          # UnitOfWorkFactory genérico por conjunto de repositorios
    pagination/
      pagination.go            # Tipos de paginación compartidos por la aplicación
    apperror/
      error.go                 # Errores de aplicación

  adapter/                     # Implementaciones de los contratos de app
    inbound/
      http/
        httplog.go             # Logging propio del transporte HTTP
      grpc/
    outbound/
      postgres/
        usr_repository.go
        group_repository.go
        ...
        transaction.go
      sqlite/                  # Sólo si se implementa y se requiere
      auth/
        jwt.go
        argon2.go
      filestore/
        filesystem.go
        azure.go

  config/                      # Configuración de ejecución (env, HTTP, DB, etc.)
```

Los directorios de features y los archivos usan nombres singulares por convención. La primera etapa conserva nombres existentes como `Usr`, `UsrRepository` y `UsrRepository()`; los renombrados pueden evaluarse aparte. Los paquetes compartidos de `app` tienen su propio directorio (`app/pagination`, `app/apperror`), no archivos sueltos en la raíz de `app`.

## Dónde viven los contratos

- **Repositorios:** en la feature de aplicación que los consume (`app/usr`, `app/group`, etc.). Se conservan interfaces completas por repositorio; no se dividen en readers y writers en esta etapa.
- **Dependencias de aplicación no DB:** cada contrato vive en un archivo nombrado por la capacidad que representa, por ejemplo `password_hasher.go`, `token_issuer.go` o `file_storage.go`. Se evita un archivo genérico `port.go`.
- **Autenticación:** los casos de uso de autenticación y sus contratos (`PasswordHasher`, `TokenIssuer`) viven en `app/auth`. JWT y Argon2 son implementaciones en `adapter/outbound/auth`.
- **Almacenamiento de archivos:** el contrato que necesita documentos vive en `app/document/file_storage.go`; filesystem, Azure u otros backends lo implementan en `adapter/outbound/filestore`.
- **Capacidades compartidas:** paginación y errores usados por varios casos de uso viven en paquetes con nombre propio bajo `app/`. No se agrega un `platform` genérico; cada responsabilidad se ubica donde tiene sentido. El logging HTTP pertenece al adaptador HTTP.
- **Configuración:** `internal/config` carga y valida la configuración del proceso. No es configuración de negocio ni un paquete común para cualquier utilidad.
- **Dominio:** contiene tipos y reglas de negocio, no interfaces de persistencia, almacenamiento ni transporte.
- **Transporte:** HTTP y gRPC llaman a los casos de uso; sus requests, responses y detalles de protocolo no entran al dominio.

Así, los adaptadores dependen de los contratos de aplicación; la aplicación no importa PostgreSQL, Azure, HTTP ni gRPC.

## Transacciones y Unit of Work

`UnitOfWorkFactory` conserva el propósito del contrato actual, pero es genérico: el caso de uso define el conjunto de repositorios que necesita y la fábrica ejecuta la callback con ese conjunto ligado a una única transacción.

```go
type UnitOfWorkFactory[T any] interface {
    Do(ctx context.Context, fn func(T) error) error
}

// En app/usr/create_usecase.go, sólo si este flujo requiere transacción:
type CreateUsrTx interface {
    UsrRepository() UsrRepository
    UsrPwdRepository() UsrPwdRepository
    NodeRepository() NodeRepository
    GroupRepository() GroupRepository
    GroupNodeRepository() GroupNodeRepository
    GroupUsrRepository() GroupUsrRepository
}
```

El caso de uso depende de `UnitOfWorkFactory[CreateUsrTx]`. Cada caso de uso define su propio tipo de transacción en el mismo archivo, con sólo los getters y repositorios que necesita; no se crea un archivo transaccional compartido ni un contrato global con todos los repositorios. Los archivos de caso de uso conservan el sufijo `_usecase.go` para distinguirlos de `repository.go` y de los contratos nombrados por capacidad.

PostgreSQL implementa la fábrica genérica y provee el conjunto concreto para cada flujo; todos los repositorios recibidos por una callback usan el mismo `sql.Tx`. La implementación puede compartir internamente begin/commit/rollback y, si conviene, construir más repositorios, pero sólo expone al caso de uso el conjunto tipado que este declaró. La firma comunica que la callback es para operaciones de repositorio; Go no impide que el código capture y llame otra dependencia externa, así que esa separación también debe respetarse en la implementación del caso de uso.

En Go, una interfaz genérica como `UnitOfWorkFactory[T]` sí es válida; lo que no se puede declarar es un método genérico en una interfaz no genérica. `T` representa el contrato de repositorios definido por el flujo.

Una transacción de base de datos sólo garantiza atomicidad dentro de esa base. Operaciones combinadas con Azure/filesystem requieren compensación o un flujo de estados/reintentos; no quedan cubiertas por el Unit of Work.

## Guía de evolución

1. Organizar casos de uso gradualmente bajo `app/<feature>` y mover allí sus contratos de repositorio.
2. Mantener `domain` para tipos y reglas, trasladando fuera de él contratos técnicos como repositorios y paginación de consultas.
3. Renombrar y agrupar implementaciones bajo `adapter/inbound` y `adapter/outbound` sin cambiar su comportamiento.
4. Mantener la composición de dependencias en los `main` correspondientes de `cmd/`; no se propone un paquete `bootstrap` por ahora.
5. Introducir gRPC, Azure o SQLite sólo cuando exista el requerimiento. La estructura permite esos adaptadores, pero no afirma que sean reemplazos equivalentes: SQLite, por ejemplo, tendría que cubrir las capacidades PostgreSQL que use la aplicación.

La propuesta es una guía de ubicación y dependencias; no requiere mover todo en un único cambio.
