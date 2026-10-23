# Hierarchical Nodes – `ltree` usage

## Context

The application models **nodes** that behave like a **filesystem hierarchy** (folders and items).
Each node belongs to a tree and its position is determined by a **path**, not by recursive foreign keys.

Example structure:

```
root
root.users
root.users.123
root.users.123.settings
```

This structure is stored using the **`ltree` extension** in **PostgreSQL**.
Each row has a `path` column of type `ltree`.

Example table (simplified):

```sql
nodes
------
id   uuid
path ltree
```

The path encodes the **full ancestry chain**, which allows very efficient queries for:

- descendants
- ancestors
- subtree operations

without recursive queries.

---

# Key Operators

The following operators are the most important when querying hierarchical nodes.

## Descendant operator

```sql
path1 <@ path2
```

Meaning:

```
path1 is contained in path2
```

In tree terms:

```
path1 is a descendant of path2
```

Example:

```sql
root.users.123 <@ root.users
```

Result:

```
true
```

Typical usage:

```sql
SELECT *
FROM nodes
WHERE path <@ 'root.users';
```

Returns the entire subtree:

```
root.users
root.users.123
root.users.123.settings
```

This operator is also used for **subtree deletes**.

---

## Ancestor operator

```sql
path1 @> path2
```

Meaning:

```
path1 contains path2
```

In tree terms:

```
path1 is an ancestor of path2
```

Example:

```sql
root.users @> root.users.123
```

Typical query:

```sql
SELECT *
FROM nodes
WHERE path @> 'root.users.123';
```

Returns:

```
root
root.users
root.users.123
```

---

## Pattern matching

```sql
path ~ lquery
```

Matches paths using the `lquery` pattern language.

Example:

```sql
SELECT *
FROM nodes
WHERE path ~ 'root.*';
```

Meaning:

```
direct children of root
```

---

# Functions frequently used

## `nlevel(path)`

Returns the depth of a path.

Example:

```
nlevel('root.users.123') = 3
```

Useful to determine **direct children**.

Example:

```sql
SELECT *
FROM nodes
WHERE path <@ 'root.users'
AND nlevel(path) = nlevel('root.users') + 1;
```

---

## `subpath(path, start, length)`

Extracts a portion of the path.

Example:

```
subpath('root.users.123', 0, 2)
```

Result:

```
root.users
```

Useful when computing **parents or ancestors**.

---

# Common operations

## Get all descendants

```sql
SELECT *
FROM nodes
WHERE path <@ $path;
```

---

## Get ancestors

```sql
SELECT *
FROM nodes
WHERE path @> $path;
```

---

## Get direct children

```sql
SELECT *
FROM nodes
WHERE path <@ $path
AND nlevel(path) = nlevel($path) + 1;
```

---

## Delete a subtree

```sql
DELETE FROM nodes
WHERE path <@ (
    SELECT path
    FROM nodes
    WHERE id = $id
);
```

This deletes the node and **all its descendants**.

---

# Index

Efficient queries require a GiST index.

```sql
CREATE INDEX nodes_path_idx
ON nodes USING GIST (path);
```

---

# Summary

Most queries rely on three core concepts:

| operator | purpose          |
| -------- | ---------------- |
| `<@`     | find descendants |
| `@>`     | find ancestors   |
| `~`      | pattern match    |

Combined with:

```
nlevel()
```

to determine hierarchy depth.

This approach enables efficient **filesystem-like tree traversal** without recursive queries.
