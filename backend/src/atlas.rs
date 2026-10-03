use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::Row;
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

/// Entity types Atlas currently knows how to place on the graph. Journal
/// entries and courses are deliberately left out for now — this is a first
/// slice of Atlas, not the whole vision, and those two can be added later by
/// copying the same query pattern used below.
const ENTITY_TYPES: [&str; 9] = [
    "note", "project", "task", "goal", "habit", "bookmark", "subject", "studioitem", "knowledge",
];

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AtlasNode {
    id: String,
    #[serde(rename = "type")]
    node_type: String,
    title: String,
    description: Option<String>,
    updated_at: PrismaDateTime,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AtlasEdge {
    id: String,
    source_type: String,
    source_id: String,
    target_type: String,
    target_id: String,
    /// "observed" | "connected" | "inferred" | "suggested" — see the
    /// AtlasConnection model doc-comment in schema.prisma for what each means.
    kind: String,
    label: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct AtlasGraph {
    nodes: Vec<AtlasNode>,
    edges: Vec<AtlasEdge>,
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    let truncated: String = s.chars().take(max).collect();
    format!("{truncated}…")
}

// ─── Graph ──────────────────────────────────────────────────────────────────

/// Returns every live node (non-archived Notes/Projects/Tasks/Goals/Habits,
/// plus all Bookmarks) and every edge between them — both the connections a
/// user drew explicitly and the ones already observable in existing data
/// (shared tags, note links, task dependencies, a goal's linked project).
pub async fn get_graph(State(st): State<AppState>) -> Result<Json<AtlasGraph>, AppError> {
    let mut nodes = Vec::new();

    // Notes — `content` stands in for a description, trimmed to a light preview.
    let rows = sqlx::query("SELECT id, title, content, updatedAt FROM Note WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        let content: String = r.try_get("content")?;
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "note".to_string(),
            title: r.try_get("title")?,
            description: if content.trim().is_empty() {
                None
            } else {
                Some(truncate(content.trim(), 180))
            },
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Projects
    let rows = sqlx::query("SELECT id, name, description, updatedAt FROM Project WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "project".to_string(),
            title: r.try_get("name")?,
            description: r.try_get::<Option<String>, _>("description")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Tasks
    let rows = sqlx::query("SELECT id, title, description, updatedAt FROM Task WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "task".to_string(),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("description")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Goals
    let rows = sqlx::query("SELECT id, title, description, updatedAt FROM Goal WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "goal".to_string(),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("description")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Habits
    let rows = sqlx::query("SELECT id, name, description, updatedAt FROM Habit WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "habit".to_string(),
            title: r.try_get("name")?,
            description: r.try_get::<Option<String>, _>("description")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Bookmarks — this table has no `archived` or `updatedAt` column.
    let rows = sqlx::query("SELECT id, title, description, createdAt FROM Bookmark")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "bookmark".to_string(),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("description")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        });
    }

    // Explore subjects — no archived/updatedAt-vs-createdAt quirks here,
    // this table was designed alongside Atlas from the start.
    let rows = sqlx::query(
        "SELECT id, title, summary, updatedAt FROM ExploreSubject WHERE archived = 0",
    )
    .fetch_all(&st.db)
    .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "subject".to_string(),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("summary")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // Studio items — same shape as Explore subjects.
    let rows = sqlx::query(
        "SELECT id, title, summary, updatedAt FROM StudioItem WHERE archived = 0",
    )
    .fetch_all(&st.db)
    .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: "studioitem".to_string(),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("summary")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    // First-class knowledge items — concepts, questions, papers, ideas,
    // inspirations, skills, things and places. They are deliberately lightweight
    // so the user can capture an intellectual object before deciding what it
    // should become.
    let rows = sqlx::query(
        "SELECT id, type, title, summary, updatedAt FROM KnowledgeItem WHERE archived = 0",
    )
    .fetch_all(&st.db)
    .await?;
    for r in &rows {
        nodes.push(AtlasNode {
            id: r.try_get("id")?,
            node_type: format!("knowledge:{}", r.try_get::<String, _>("type")?),
            title: r.try_get("title")?,
            description: r.try_get::<Option<String>, _>("summary")?,
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        });
    }

    let mut edges = Vec::new();

    // ── Explicit connections the user drew themselves ──────────────────────
    let rows = sqlx::query("SELECT * FROM AtlasConnection")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        edges.push(AtlasEdge {
            id: r.try_get("id")?,
            source_type: r.try_get("sourceType")?,
            source_id: r.try_get("sourceId")?,
            target_type: r.try_get("targetType")?,
            target_id: r.try_get("targetId")?,
            kind: r.try_get("kind")?,
            label: r.try_get::<Option<String>, _>("label")?,
        });
    }

    // ── Observed edges: relationships already present in existing data ─────

    // GoalProject — a goal explicitly attached to a project.
    let rows = sqlx::query("SELECT id, goalId, projectId FROM GoalProject")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        edges.push(AtlasEdge {
            id: format!("observed-goalproject-{}", r.try_get::<String, _>("id")?),
            source_type: "goal".to_string(),
            source_id: r.try_get("goalId")?,
            target_type: "project".to_string(),
            target_id: r.try_get("projectId")?,
            kind: "observed".to_string(),
            label: Some("linked project".to_string()),
        });
    }

    // NoteLink — explicit note-to-note links already made in Notes.
    let rows = sqlx::query("SELECT id, sourceNoteId, targetNoteId FROM NoteLink")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        edges.push(AtlasEdge {
            id: format!("observed-notelink-{}", r.try_get::<String, _>("id")?),
            source_type: "note".to_string(),
            source_id: r.try_get("sourceNoteId")?,
            target_type: "note".to_string(),
            target_id: r.try_get("targetNoteId")?,
            kind: "observed".to_string(),
            label: Some("linked note".to_string()),
        });
    }

    // TaskDependency — one task depending on another.
    let rows = sqlx::query("SELECT id, taskId, dependsOnId FROM TaskDependency")
        .fetch_all(&st.db)
        .await?;
    for r in &rows {
        edges.push(AtlasEdge {
            id: format!("observed-taskdep-{}", r.try_get::<String, _>("id")?),
            source_type: "task".to_string(),
            source_id: r.try_get("taskId")?,
            target_type: "task".to_string(),
            target_id: r.try_get("dependsOnId")?,
            kind: "observed".to_string(),
            label: Some("depends on".to_string()),
        });
    }

    // Shared tags — anything tagged the same way is "observed" to relate.
    // Star pattern per tag: the first item to hold the tag becomes the hub,
    // every other item sharing it links to the hub. Keeps edge count linear
    // in the number of taggings rather than quadratic, while still surfacing
    // the relationship.
    let tag_names: HashMap<String, String> = {
        let rows = sqlx::query("SELECT id, name FROM Tag").fetch_all(&st.db).await?;
        let mut map = HashMap::new();
        for r in &rows {
            map.insert(
                r.try_get::<String, _>("id")?,
                r.try_get::<String, _>("name")?,
            );
        }
        map
    };

    let taggings: [(&str, &str, &str); 5] = [
        ("NoteTag", "noteId", "note"),
        ("TaskTag", "taskId", "task"),
        ("GoalTag", "goalId", "goal"),
        ("HabitTag", "habitId", "habit"),
        ("BookmarkTag", "bookmarkId", "bookmark"),
    ];

    let mut by_tag: HashMap<String, Vec<(String, String)>> = HashMap::new();
    for (table, col, entity_type) in taggings {
        let sql = format!("SELECT tagId, {col} AS entityId FROM {table}");
        let rows = sqlx::query(&sql).fetch_all(&st.db).await?;
        for r in &rows {
            let tag_id: String = r.try_get("tagId")?;
            let entity_id: String = r.try_get("entityId")?;
            by_tag
                .entry(tag_id)
                .or_default()
                .push((entity_type.to_string(), entity_id));
        }
    }

    for (tag_id, items) in &by_tag {
        if items.len() < 2 {
            continue;
        }
        let Some(tag_name) = tag_names.get(tag_id) else {
            continue;
        };
        let (hub_type, hub_id) = &items[0];
        for (other_type, other_id) in &items[1..] {
            edges.push(AtlasEdge {
                id: format!("observed-tag-{tag_id}-{hub_id}-{other_id}"),
                source_type: hub_type.clone(),
                source_id: hub_id.clone(),
                target_type: other_type.clone(),
                target_id: other_id.clone(),
                kind: "observed".to_string(),
                label: Some(tag_name.clone()),
            });
        }
    }

    Ok(Json(AtlasGraph { nodes, edges }))
}

// ─── Explicit connections CRUD ──────────────────────────────────────────────

pub async fn list_connections(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<AtlasEdge>>, AppError> {
    let rows = match (params.get("entityType"), params.get("entityId")) {
        (Some(entity_type), Some(entity_id)) => {
            sqlx::query(
                "SELECT * FROM AtlasConnection \
                 WHERE (sourceType = ? AND sourceId = ?) OR (targetType = ? AND targetId = ?) \
                 ORDER BY createdAt DESC",
            )
            .bind(entity_type)
            .bind(entity_id)
            .bind(entity_type)
            .bind(entity_id)
            .fetch_all(&st.db)
            .await?
        }
        _ => {
            sqlx::query("SELECT * FROM AtlasConnection ORDER BY createdAt DESC")
                .fetch_all(&st.db)
                .await?
        }
    };

    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        out.push(AtlasEdge {
            id: r.try_get("id")?,
            source_type: r.try_get("sourceType")?,
            source_id: r.try_get("sourceId")?,
            target_type: r.try_get("targetType")?,
            target_id: r.try_get("targetId")?,
            kind: r.try_get("kind")?,
            label: r.try_get::<Option<String>, _>("label")?,
        });
    }
    Ok(Json(out))
}

pub async fn create_connection(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<AtlasEdge>), AppError> {
    let source_type = str_or(&body, "sourceType", "");
    let source_id = str_or(&body, "sourceId", "");
    let target_type = str_or(&body, "targetType", "");
    let target_id = str_or(&body, "targetId", "");
    let label = truthy_str(&body, "label");

    if source_type.is_empty() || source_id.is_empty() || target_type.is_empty() || target_id.is_empty() {
        return Err(AppError::BadRequest(
            "sourceType, sourceId, targetType and targetId are all required".to_string(),
        ));
    }
    if !ENTITY_TYPES.contains(&source_type.as_str()) || !ENTITY_TYPES.contains(&target_type.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Entity type must be one of: {}",
            ENTITY_TYPES.join(", ")
        )));
    }
    if source_type == target_type && source_id == target_id {
        return Err(AppError::BadRequest(
            "Can't connect something to itself".to_string(),
        ));
    }

    // Explicit connections made through the API are always "connected" —
    // "observed" is derived at read time in get_graph, and "inferred" /
    // "suggested" are reserved for a future automated pass, not user input.
    let kind = "connected";

    let existing: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM AtlasConnection \
         WHERE sourceType = ? AND sourceId = ? AND targetType = ? AND targetId = ? AND kind = ?",
    )
    .bind(&source_type)
    .bind(&source_id)
    .bind(&target_type)
    .bind(&target_id)
    .bind(kind)
    .fetch_one(&st.db)
    .await?;
    if existing > 0 {
        return Err(AppError::BadRequest(
            "This connection already exists".to_string(),
        ));
    }

    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO AtlasConnection (id, sourceType, sourceId, targetType, targetId, kind, label, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&source_type)
    .bind(&source_id)
    .bind(&target_type)
    .bind(&target_id)
    .bind(kind)
    .bind(&label)
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(AtlasEdge {
            id,
            source_type,
            source_id,
            target_type,
            target_id,
            kind: kind.to_string(),
            label,
        }),
    ))
}

pub async fn delete_connection(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM AtlasConnection WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Connection not found".to_string()));
    }
    sqlx::query("DELETE FROM AtlasConnection WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}


// ─── First-class knowledge items ─────────────────────────────────────────────

const KNOWLEDGE_TYPES: [&str; 8] = [
    "question", "concept", "paper", "idea", "inspiration", "skill", "thing", "place",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct KnowledgeItem {
    id: String,
    #[serde(rename = "type")]
    item_type: String,
    title: String,
    summary: Option<String>,
    content: String,
    source_url: Option<String>,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

fn knowledge_item_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<KnowledgeItem, sqlx::Error> {
    Ok(KnowledgeItem {
        id: r.try_get("id")?,
        item_type: r.try_get("type")?,
        title: r.try_get("title")?,
        summary: r.try_get::<Option<String>, _>("summary")?,
        content: r.try_get("content")?,
        source_url: r.try_get::<Option<String>, _>("sourceUrl")?,
        archived: r.try_get("archived")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

pub async fn list_knowledge_items(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<KnowledgeItem>>, AppError> {
    let rows = if let Some(item_type) = params.get("type") {
        sqlx::query(
            "SELECT * FROM KnowledgeItem WHERE archived = 0 AND type = ? ORDER BY updatedAt DESC",
        )
        .bind(item_type)
        .fetch_all(&st.db)
        .await?
    } else {
        sqlx::query("SELECT * FROM KnowledgeItem WHERE archived = 0 ORDER BY updatedAt DESC")
            .fetch_all(&st.db)
            .await?
    };

    let mut items = Vec::with_capacity(rows.len());
    for row in &rows {
        items.push(knowledge_item_from_row(row)?);
    }
    Ok(Json(items))
}

pub async fn create_knowledge_item(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<KnowledgeItem>), AppError> {
    let item_type = str_or(&body, "type", "idea").to_lowercase();
    let title = str_or(&body, "title", "").trim().to_string();
    let summary = truthy_str(&body, "summary");
    let content = str_or(&body, "content", "");
    let source_url = truthy_str(&body, "sourceUrl");

    if !KNOWLEDGE_TYPES.contains(&item_type.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Knowledge type must be one of: {}",
            KNOWLEDGE_TYPES.join(", ")
        )));
    }
    if title.is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    let id = gen_id();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO KnowledgeItem (id, type, title, summary, content, sourceUrl, archived, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&item_type)
    .bind(&title)
    .bind(&summary)
    .bind(&content)
    .bind(&source_url)
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    let row = sqlx::query("SELECT * FROM KnowledgeItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;

    Ok((StatusCode::CREATED, Json(knowledge_item_from_row(&row)?)))
}

pub async fn update_knowledge_item(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<KnowledgeItem>, AppError> {
    let existing = sqlx::query("SELECT * FROM KnowledgeItem WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?;
    if existing.is_none() {
        return Err(AppError::NotFound("Knowledge item not found".to_string()));
    }

    let title = truthy_str(&body, "title");
    let summary = truthy_str(&body, "summary");
    let content = truthy_str(&body, "content");
    let source_url = truthy_str(&body, "sourceUrl");
    let item_type = truthy_str(&body, "type");
    let archived = body.get("archived").and_then(|v| v.as_bool());

    let now = now_ms();
    sqlx::query(
        "UPDATE KnowledgeItem SET
         title = COALESCE(?, title),
         summary = COALESCE(?, summary),
         content = COALESCE(?, content),
         sourceUrl = COALESCE(?, sourceUrl),
         type = COALESCE(?, type),
         archived = COALESCE(?, archived),
         updatedAt = ?
         WHERE id = ?",
    )
    .bind(title)
    .bind(summary)
    .bind(content)
    .bind(source_url)
    .bind(item_type)
    .bind(archived)
    .bind(now)
    .bind(&id)
    .execute(&st.db)
    .await?;

    let row = sqlx::query("SELECT * FROM KnowledgeItem WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok(Json(knowledge_item_from_row(&row)?))
}

pub async fn delete_knowledge_item(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let result = sqlx::query("DELETE FROM KnowledgeItem WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Knowledge item not found".to_string()));
    }
    Ok(Json(serde_json::json!({ "success": true })))
}
