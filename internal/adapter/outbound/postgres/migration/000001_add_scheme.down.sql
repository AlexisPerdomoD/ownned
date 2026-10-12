-- ============================
-- Docs
-- ============================
DROP TRIGGER IF EXISTS trg_docs_updated_at ON fs.docs;
DROP TABLE IF EXISTS fs.docs;

-- ============================
-- Group ↔ Node
-- ============================
DROP INDEX IF EXISTS fs.idx_group_nodes_node;
DROP TABLE IF EXISTS fs.group_nodes;

-- ============================
-- Nodes (tree)
-- ============================
DROP INDEX IF EXISTS fs.ux_nodes_parent_name;
DROP INDEX IF EXISTS fs.idx_nodes_path_btree;
DROP INDEX IF EXISTS fs.idx_nodes_path_gist;

DROP TRIGGER IF EXISTS trg_nodes_updated_at ON fs.nodes;
DROP TABLE IF EXISTS fs.nodes;

-- ============================
-- Node Comments
-- ============================
DROP TRIGGER IF EXISTS trg_node_comments_updated_a ON fs.node_comments;
DROP TABLE IF EXISTS fs.node_comments;

-- ============================
-- Group ↔ User
-- ============================
DROP INDEX IF EXISTS fs.idx_group_usrs_user;
DROP TABLE IF EXISTS fs.group_usrs;

-- ============================
-- Groups
-- ============================
DROP TRIGGER IF EXISTS trg_groups_updated_at ON fs.groups;
DROP TABLE IF EXISTS fs.groups;

-- ============================
-- Users
-- ============================
DROP TABLE IF EXISTS fs.usr_pwds;
DROP TRIGGER IF EXISTS trg_usrs_updated_at ON fs.usrs;
DROP TABLE IF EXISTS fs.usrs;

-- ============================
-- Trigger function
-- ============================
DROP FUNCTION IF EXISTS fs.set_updated_at();

-- ============================
-- Extensions
-- ============================
DROP EXTENSION IF EXISTS ltree;

-- ============================
-- Schema
-- ============================
DROP SCHEMA IF EXISTS fs;
