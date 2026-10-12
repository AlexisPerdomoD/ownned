-- ============================
-- Schema
-- ============================
CREATE SCHEMA fs;

-- ============================
-- Extensions
-- ============================
CREATE EXTENSION ltree;

-- ============================
-- updated_at trigger
-- ============================
CREATE OR REPLACE FUNCTION fs.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Users
-- ============================
CREATE TABLE fs.usrs (
    id           UUID,
    role         VARCHAR(20) NOT NULL,
    firstname    text NOT NULL,
    lastname     text NOT NULL,
    username     text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT usrs_pk PRIMARY KEY (id),
    CONSTRAINT usrs_username_ux UNIQUE (username),
    CONSTRAINT usrs_role_check CHECK (role IN ('super_usr_role', 'normal_usr_role', 'limited_usr_role'))
);

CREATE TRIGGER trg_usrs_updated_at
BEFORE UPDATE ON fs.usrs
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

CREATE TABLE fs.usr_pwds (
    usr_id      UUID NOT NULL,
    pwd         BYTEA NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT usr_pwds_pk PRIMARY KEY (usr_id),
    CONSTRAINT usr_pwds_usr_fk FOREIGN KEY (usr_id) REFERENCES fs.usrs(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_usr_pwds_updated_at
BEFORE UPDATE ON fs.usr_pwds
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

-- ============================
-- Groups
-- ============================
CREATE TABLE fs.groups (
    id           UUID,
    usr_id       UUID NOT NULL,
    name         text NOT NULL,
    description  text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT groups_pk PRIMARY KEY (id),
    CONSTRAINT groups_usr_fk FOREIGN KEY (usr_id) REFERENCES fs.usrs(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON fs.groups
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

-- ============================
-- Group ↔ User
-- ============================
CREATE TABLE fs.group_usrs (
    group_id     UUID NOT NULL,
    usr_id       UUID NOT NULL,
    access       VARCHAR(20) NOT NULL,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT group_usrs_group_fk FOREIGN KEY (group_id) REFERENCES fs.groups(id) ON DELETE CASCADE,
    CONSTRAINT group_usrs_user_fk FOREIGN KEY (usr_id) REFERENCES fs.usrs(id) ON DELETE CASCADE,
    CONSTRAINT group_usrs_pk PRIMARY KEY (group_id, usr_id),
    CONSTRAINT group_usrs_access_check CHECK (access IN (
        'read_only_access', 
        'write_access', 
        'owner_access')
    )
);

CREATE INDEX idx_group_usrs_user
    ON fs.group_usrs(usr_id);

-- ============================
-- Nodes (tree)
-- ============================
CREATE TABLE fs.nodes (
    id           UUID,
    usr_id       UUID NOT NULL,
    name         text NOT NULL,
    description  text,
    path         ltree NOT NULL,
    type         VARCHAR(20) NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT nodes_pk PRIMARY KEY (id),
    CONSTRAINT nodes_usr_fk FOREIGN KEY (usr_id) REFERENCES fs.usrs(id) ON DELETE CASCADE,
    CONSTRAINT nodes_type_check CHECK (type IN ('folder', 'file'))
);

CREATE TRIGGER trg_nodes_updated_at
BEFORE UPDATE ON fs.nodes
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

-- Path indexes
CREATE INDEX idx_nodes_path_gist
    ON fs.nodes USING GIST (path);

-- (mejora join path)
CREATE INDEX idx_nodes_id_path
    ON fs.nodes(id, path);

-- Enforce unique name per folder
CREATE UNIQUE INDEX ux_nodes_parent_name
    ON fs.nodes (subpath(path, 0, nlevel(path)-1), name);

-- ============================
-- Node Comments
-- ============================
CREATE TABLE fs.node_comments (
    id           UUID,
    node_id      UUID NOT NULL,
    usr_id      UUID NOT NULL,
    content      text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT node_comments_pk PRIMARY KEY (id),
    CONSTRAINT node_comments_node_fk FOREIGN KEY (node_id) REFERENCES fs.nodes(id) ON DELETE CASCADE,
    CONSTRAINT node_comments_usr_fk FOREIGN KEY (usr_id) REFERENCES fs.usrs(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_node_comments_updated_a
BEFORE UPDATE ON fs.node_comments
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

CREATE INDEX idx_node_comments_node
    ON fs.node_comments(node_id);

-- ============================
-- Group ↔ Node
-- ============================
CREATE TABLE fs.group_nodes (
    group_id     UUID NOT NULL,
    node_id      UUID NOT NULL,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT group_nodes_group_fk FOREIGN KEY (group_id) REFERENCES fs.groups(id) ON DELETE CASCADE,
    CONSTRAINT group_nodes_node_fk FOREIGN KEY (node_id) REFERENCES fs.nodes(id) ON DELETE CASCADE,
    CONSTRAINT group_nodes_pk PRIMARY KEY (group_id, node_id)
);

CREATE INDEX idx_group_nodes_node
    ON fs.group_nodes(node_id);

CREATE INDEX idx_group_nodes_group
    ON fs.group_nodes(group_id);

-- ============================
-- Docs
-- ============================
CREATE TABLE fs.docs (
    id             UUID,
    node_id        UUID NOT NULL,
    title          text NOT NULL,
    filename       text NOT NULL,
    description    text,
    mime_type      text NOT NULL,
    size_in_bytes  bigint NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT docs_pk PRIMARY KEY (id),
    CONSTRAINT docs_node_id_ux UNIQUE (node_id),
    CONSTRAINT docs_size_in_bytes_check CHECK (size_in_bytes >= 0),
    CONSTRAINT docs_node_fk FOREIGN KEY (node_id) REFERENCES fs.nodes(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_docs_updated_at
BEFORE UPDATE ON fs.docs
FOR EACH ROW EXECUTE FUNCTION fs.set_updated_at();

CREATE INDEX idx_docs_node ON fs.docs(node_id);
CREATE INDEX idx_docs_mime_type ON fs.docs(mime_type);
